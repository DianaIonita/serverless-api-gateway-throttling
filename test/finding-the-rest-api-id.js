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
        .aServerlessInstance()
        .withPredefinedRestApiId(given.aRestApiId());
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
        .aServerlessInstance();

      settings = new ApiGatewayThrottlingSettings(serverless);
      restApiId = given.aDeployedRestApiId(serverless, settings);

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

  describe('when the REST API Id is part of the compiledCloudFormationTemplate because the serverless configuration includes REST endpoints', () => {
    let restApiId;
    before(async () => {
      restApiId = given.aRestApiId();
      serverless = given
        .aServerlessInstance()
        .withARestApiInCloudFormation(restApiId)
      settings = new ApiGatewayThrottlingSettings(serverless);

      result = await restApiExists(serverless, settings);
    });

    it('should return that the REST API does exist', () => {
      expect(result).to.be.true;
    });
  });

  describe('when the REST API ID has not been defined anywhere', () => {
    before(async () => {
      let serverless = given
        .aServerlessInstance()
      settings = new ApiGatewayThrottlingSettings(serverless);

      result = await restApiExists(serverless, settings);
    });

    it('should return that the REST API does not exist', () => {
      expect(result).to.be.false;
    });
  });
});
