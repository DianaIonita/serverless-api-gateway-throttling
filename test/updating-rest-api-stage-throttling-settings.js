'use strict';

const given = require('./steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const updateStageThrottling = require('../src/updateStageThrottling');
const expect = require('chai').expect;

const API_GATEWAY = 'APIGateway', UPDATE_STAGE = 'updateStage';
const stage = 'devstage', region = 'eu-west-1';

describe('Updating stage throttling settings for a REST API', () => {
  let serverless, settings, requestsToAws, restApiId, apiGatewayRequest;
  let globalThrottlingSettings = { maxRequestsPerSecond: 1000, maxConcurrentRequests: 500 };

  describe('when throttling settings are not defined', () => {
    before(async () => {
      serverless = given.aServerlessInstance();
      await when_updating_stage_throttling_settings({}, serverless);

      requestsToAws = serverless.getRequestsToAws();
    });

    it('should not make calls to the AWS SDK', () => {
      expect(requestsToAws).to.be.empty;
    });
  });

  describe('when there are no http endpoints with custom throttling configuration', () => {
    before(async () => {
      serverless = given.aServerlessInstance()
        .forStage(stage).forRegion(region)
        .withApiGatewayThrottlingConfig(globalThrottlingSettings)
        .withFunction(given.aServerlessFunction('list-items'));
      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.aDeployedRestApiId(serverless, settings)

      await when_updating_stage_throttling_settings(settings, serverless);

      requestsToAws = serverless.getRequestsToAws();
    });

    it('should send a single request to AWS SDK to update stage', () => {
      const request = requestsToAws.filter(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      expect(request).to.have.lengthOf(1);
    });

    describe('the request sent to AWS SDK to update stage', () => {
      before(() => {
        apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      });

      it('should contain the Rest Api Id', () => {
        expect(apiGatewayRequest.properties.restApiId).to.equal(restApiId);
      });

      it('should contain the stage name', () => {
        expect(apiGatewayRequest.properties.stageName).to.equal(stage);
      });

      it('should specify exactly two patch operations', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.have.lengthOf(2);
      });

      it('should set the rate limit', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/*/*/throttling/rateLimit',
          value: `${globalThrottlingSettings.maxRequestsPerSecond}`
        });
      });

      it('should set the burst limit', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/*/*/throttling/burstLimit',
          value: `${globalThrottlingSettings.maxConcurrentRequests}`
        });
      });
    });
  });

  describe('when there are some endpoints with custom throttling configuration', () => {
    before(async () => {
      serverless = given.aServerlessInstance()
        .forStage(stage).forRegion(region)
        .withApiGatewayThrottlingConfig(globalThrottlingSettings)
        .withFunction(given.aServerlessFunction('list-items')
          .withRestEndpoint('get', '/items', { maxRequestsPerSecond: 200, maxConcurrentRequests: 100 }))
        .withFunction(given.aServerlessFunction('create-item')
          .withRestEndpoint('post', '/item/{itemId}', { maxRequestsPerSecond: 100, maxConcurrentRequests: 50 }))
        .withFunction(given.aServerlessFunction('delete-item')
          .withRestEndpoint('delete', '/item/{itemId}'));

      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.aDeployedRestApiId(serverless, settings)

      await when_updating_stage_throttling_settings(settings, serverless);

      requestsToAws = serverless.getRequestsToAws();
    });

    it('should send a single request to AWS SDK to update stage', () => {
      const request = requestsToAws.filter(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      expect(request).to.have.lengthOf(1);
    });

    describe('the request sent to AWS SDK to update stage', () => {
      before(() => {
        apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      });

      it('should contain the Rest Api Id', () => {
        expect(apiGatewayRequest.properties.restApiId).to.equal(restApiId);
      });

      it('should contain the stage name', () => {
        expect(apiGatewayRequest.properties.stageName).to.equal(stage);
      });

      it('should specify two patch operations for each http endpoint and two patch operations for the stage', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.have.lengthOf(8);
      });

      it('should set the rate limit for the stage', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/*/*/throttling/rateLimit',
          value: `${globalThrottlingSettings.maxRequestsPerSecond}`
        });
      });

      it('should set the burst limit for the stage', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/*/*/throttling/burstLimit',
          value: `${globalThrottlingSettings.maxConcurrentRequests}`
        });
      });

      it('should set the rate limit for the list-items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1items/GET/throttling/rateLimit',
          value: '200'
        });
      });

      it('should set the burst limit for the list-items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1items/GET/throttling/burstLimit',
          value: '100'
        });
      });

      it('should set the rate limit for the create-item endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1item~1{itemId}/POST/throttling/rateLimit',
          value: '100'
        });
      });

      it('should set the burst limit for the create-item endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1item~1{itemId}/POST/throttling/burstLimit',
          value: '50'
        });
      });
    });
  });

  describe('when there\'s a function with two http endpoints with custom throttling configuration', () => {
    before(async () => {
      serverless = given.aServerlessInstance()
        .forStage(stage).forRegion(region)
        .withApiGatewayThrottlingConfig(globalThrottlingSettings)
        .withFunction(given.aServerlessFunction('list-items')
          .withRestEndpoint('get', '/items', { maxRequestsPerSecond: 200, maxConcurrentRequests: 100 })
          .withRestEndpoint('get', '/older/items', { maxRequestsPerSecond: 100, maxConcurrentRequests: 80 }));

      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.aDeployedRestApiId(serverless, settings)

      await when_updating_stage_throttling_settings(settings, serverless);

      requestsToAws = serverless.getRequestsToAws();
    });

    it('should send a single request to AWS SDK to update stage', () => {
      const request = requestsToAws.filter(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      expect(request).to.have.lengthOf(1);
    });

    describe('the request sent to AWS SDK to update stage', () => {
      before(() => {
        apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      });

      it('should contain the Rest Api Id', () => {
        expect(apiGatewayRequest.properties.restApiId).to.equal(restApiId);
      });

      it('should contain the stage name', () => {
        expect(apiGatewayRequest.properties.stageName).to.equal(stage);
      });

      it('should specify two patch operations for each http endpoint and two patch operations for the stage', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.have.lengthOf(6);
      });

      it('should set the rate limit for the stage', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/*/*/throttling/rateLimit',
          value: `${globalThrottlingSettings.maxRequestsPerSecond}`
        });
      });

      it('should set the burst limit for the stage', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/*/*/throttling/burstLimit',
          value: `${globalThrottlingSettings.maxConcurrentRequests}`
        });
      });

      it('should set the rate limit for the GET /items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1items/GET/throttling/rateLimit',
          value: '200'
        });
      });

      it('should set the burst limit for the GET /items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1items/GET/throttling/burstLimit',
          value: '100'
        });
      });

      it('should set the rate limit for the GET /older/items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1older~1items/GET/throttling/rateLimit',
          value: '100'
        });
      });

      it('should set the burst limit for the GET /older/items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: '/~1older~1items/GET/throttling/burstLimit',
          value: '80'
        });
      });
    });
  });

  describe('when there\'s an endpoint with http method ANY with custom throttling configuration', () => {
    before(async () => {
      serverless = given.aServerlessInstance()
        .forStage(stage).forRegion(region)
        .withApiGatewayThrottlingConfig(globalThrottlingSettings)
        .withFunction(given.aServerlessFunction('do-anything-to-item')
          .withRestEndpoint('any', '/item', { maxRequestsPerSecond: 500, maxConcurrentRequests: 250 }));

      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.aDeployedRestApiId(serverless, settings)

      await when_updating_stage_throttling_settings(settings, serverless);

      requestsToAws = serverless.getRequestsToAws();
      apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
    });

    it('should send a single request to AWS SDK to update stage', () => {
      const request = requestsToAws.filter(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      expect(request).to.have.lengthOf(1);
    });

    let allMethods = ['GET', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'];
    for (let method of allMethods) {
      it(`should set the rate limit for the ${method} method`, () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: `/~1item/${method}/throttling/rateLimit`,
          value: '500'
        });
      });

      it(`should set the burst limit for the ${method} method`, () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'replace',
          path: `/~1item/${method}/throttling/burstLimit`,
          value: '250'
        });
      });
    }
  });

  describe('when there are many, many http endpoints with custom throttling configuration', () => {
    let requestsToAwsToUpdateStage;
    before(async () => {
      let functions = given.functionsWithCustomThrottlingConfiguration(50, { maxRequestsPerSecond: 300, maxConcurrentRequests: 200 });

      serverless = given.aServerlessInstance()
        .forStage(stage).forRegion(region)
        .withApiGatewayThrottlingConfig(globalThrottlingSettings);

      for (let func of functions) {
        serverless = serverless.withFunction(func)
      }

      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.aDeployedRestApiId(serverless, settings)

      await when_updating_stage_throttling_settings(settings, serverless);

      requestsToAws = serverless.getRequestsToAws();
      requestsToAwsToUpdateStage = requestsToAws.filter(r => r.method == UPDATE_STAGE && r.awsService == API_GATEWAY);
    });

    it('should send two requests to update stage', () => {
      expect(requestsToAwsToUpdateStage).to.have.lengthOf(2);
    });

    describe('each request to update stage', () => {
      let firstRequestToUpdateStage, secondRequestToUpdateStage;
      before(() => {
        firstRequestToUpdateStage = requestsToAwsToUpdateStage[0];
        secondRequestToUpdateStage = requestsToAwsToUpdateStage[1];
      });

      it('should specify the Rest Api Id', () => {
        expect(firstRequestToUpdateStage.properties.restApiId).to.equal(restApiId);
        expect(secondRequestToUpdateStage.properties.restApiId).to.equal(restApiId);
      });

      it('should specify the stage name', () => {
        expect(firstRequestToUpdateStage.properties.stageName).to.equal(stage);
        expect(secondRequestToUpdateStage.properties.stageName).to.equal(stage);
      });

      it('should not contain more than 80 patch operations', () => {
        expect(firstRequestToUpdateStage.properties.patchOperations).to.have.length.at.most(80);
        expect(secondRequestToUpdateStage.properties.patchOperations).to.have.length.at.most(80);
      });
    });
  });
});

const when_updating_stage_throttling_settings = async (settings, serverless) => {
  return await updateStageThrottling(serverless, settings);
}
