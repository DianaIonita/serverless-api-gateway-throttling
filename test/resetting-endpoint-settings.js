'use strict';

const given = require('../test/steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const resetEndpointSettings = require('../src/resetEndpointSpecificSettings');
const expect = require('chai').expect;

const API_GATEWAY = 'APIGateway', UPDATE_STAGE = 'updateStage';
const stage = 'devstage', region = 'eu-west-1';

describe('Resetting endpoint settings', () => {
  let serverless, settings, requestsToAws, restApiId, apiGatewayRequest;

  describe('when there are no http endpoints', () => {
    before(async () => {
      serverless = given.a_serverless_instance()
        .forStage(stage).forRegion(region)
        .withFunction(given.a_serverless_function('list-items'));
      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.a_deployed_rest_api_id(serverless, settings)

      await when_resetting_endpoint_settings(settings, serverless);

      requestsToAws = serverless.getRequestsToAws();
    });

    it('should no requests to AWS SDK to update stage', () => {
      const request = requestsToAws.filter(r => r.awsService == API_GATEWAY && r.method == UPDATE_STAGE);
      expect(request).to.have.lengthOf(0);
    });
  });

  describe('when there are some HTTP endpoints', () => {
    before(async () => {
      serverless = given.a_serverless_instance()
        .forStage(stage).forRegion(region)
        .withApiGatewayThrottlingConfig()
        .withFunction(given.a_serverless_function('list-items')
          .withHttpEndpoint('get', '/items'))
        .withFunction(given.a_serverless_function('create-item')
          .withHttpEndpoint('post', '/item/{itemId}'))
        .withFunction(given.a_serverless_function('delete-item')
          .withHttpEndpoint('delete', '/item/{itemId}'));

      settings = new ApiGatewayThrottlingSettings(serverless);

      restApiId = await given.a_deployed_rest_api_id(serverless, settings)

      await when_resetting_endpoint_settings(settings, serverless);

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

      it('should specify one patch operation for each http endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.have.lengthOf(3);
      });

      it('should reset the configuration of the list-items endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'remove',
          path: '/~1items/GET',
          value: ''
        });
      });

      it('should reset the configuration of the create-item endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'remove',
          path: '/~1item~1{itemId}/POST',
          value: ''
        });
      });

      it('should reset the configuration of the delete-item endpoint', () => {
        expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
          op: 'remove',
          path: '/~1item~1{itemId}/DELETE',
          value: ''
        });
      });
    });
  });
});

const when_resetting_endpoint_settings = async (settings, serverless) => {
  return await resetEndpointSettings(settings, serverless);
}
