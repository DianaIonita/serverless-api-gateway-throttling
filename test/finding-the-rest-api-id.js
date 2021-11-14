const APP_ROOT = '..';
const given = require(`${APP_ROOT}/test/steps/given`);
const expect = require('chai').expect;
const { restApiExists, retrieveRestApiId } = require(`${APP_ROOT}/src/restApiId`);
const ApiGatewayThrottlingSettings = require(`${APP_ROOT}/src/ApiGatewayThrottlingSettings`);

describe('Finding the REST API', () => {
  let result;

  describe('when the REST API ID has already been defined in serverless configuration', () => {
    before(async () => {
      let serverless = given
        .a_serverless_instance()
        .withPredefinedRestApiId(given.a_rest_api_id());
      settings = new ApiGatewayThrottlingSettings(serverless);

      result = await restApiExists(serverless, settings);
    });

    it('should return that the REST API exists', () => {
      expect(result).to.be.true;
    });
  });

  describe('when the CloudFormation stack has already been deployed and it output a RestApiIdForApigThrottling', () => {
    let restApiId, serverless, settings;
    before(async () => {
      serverless = given
        .a_serverless_instance();

      settings = new ApiGatewayThrottlingSettings(serverless);
      restApiId = given.a_deployed_rest_api_id(serverless, settings);

      result = await restApiExists(serverless, settings);
    });

    it('should return that the REST API exists', () => {
      expect(result).to.be.true;
    });

    it('should return the value of the REST API id', async () => {
      const retrievedRestApiId = await retrieveRestApiId(serverless, settings);
      expect(retrievedRestApiId).to.equal(restApiId);
    });
  });

  describe('when the REST API has not been defined in serverless configuration', () => {
    describe('and there are HTTP handler functions', () => {
      before(async () => {
        let functionWithHttpEndpoint = given
          .a_serverless_function('get-cat-by-paw-id')
          .withHttpEndpoint('get', '/cat/{pawId}');
        serverless = given
          .a_serverless_instance()
          .withFunction(functionWithHttpEndpoint);
        settings = new ApiGatewayThrottlingSettings(serverless);

        result = await restApiExists(serverless, settings);
      });

      it('should return that the REST API does exist', () => {
        expect(result).to.be.true;
      });
    });

    describe('and there are no HTTP handler functions', () => {
      before(async () => {
        serverless = given.a_serverless_instance();
        settings = new ApiGatewayThrottlingSettings(serverless);
        given.the_rest_api_id_is_not_set_for_deployment(serverless, settings);

        result = await restApiExists(serverless, settings);
      });

      it('should return that the REST API does not exist', () => {
        expect(result).to.be.false;
      });
    });
  });
});
