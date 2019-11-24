'use strict';

const given = require('../test/steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const updateStageThrottling = require('../src/updateStageThrottling');
const expect = require('chai').expect;

const apiGatewayService = 'APIGateway', updateStageMethod = 'updateStage';
const stage = 'devstage', region = 'eu-west-1';

describe('Updating stage throttling', () => {
  let serverless, settings, requestsToAws, restApiId, apiGatewayRequest;

  describe('when throttling settings are not provided', () => {
    before(async () => {
      serverless = given.a_serverless_instance();
      await when_updating_stage_throttling_settings(null, serverless);

      requestsToAws = serverless.getRequestsToAws();
    });

    it('should not make calls to the AWS SDK', () => {
      expect(requestsToAws).to.be.empty;
    });
  });

  describe('when throttling is enabled for the stage', () => {
    describe('and there are no http endpoints with custom throttling configuration', () => {
      before(async () => {
        serverless = given.a_serverless_instance()
          .forStage(stage).forRegion(region)
          .withApiGatewayThrottlingConfig({ throttlingEnabled: true, maxRequestsPerSecond: 1000, maxConcurrentRequests: 500 })
          .withFunction(given.a_serverless_function('list-items'));
        settings = new ApiGatewayThrottlingSettings(serverless);

        restApiId = await given.a_deployed_rest_api_id(serverless, settings)

        await when_updating_stage_throttling_settings(settings, serverless);

        requestsToAws = serverless.getRequestsToAws();
      });

      describe('the request sent to AWS SDK to update stage', () => {
        before(() => {
          apiGatewayRequest = requestsToAws.find(r => r.awsService == apiGatewayService && r.method == updateStageMethod);
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
            value: '1000'
          });
        });

        it('should set the burst limit', () => {
          expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
            op: 'replace',
            path: '/*/*/throttling/burstLimit',
            value: '500'
          });
        });
      });
    });
  });
});

const when_updating_stage_throttling_settings = async (settings, serverless) => {
  return await updateStageThrottling(settings, serverless);
}
