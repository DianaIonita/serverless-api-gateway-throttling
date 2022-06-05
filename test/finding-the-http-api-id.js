const given = require('../test/steps/given');
const expect = require('chai').expect;
const { httpApiExists, retrieveHttpApiId } = require('../src/httpApiId');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');

describe('Finding the HTTP API', () => {
    let result;

    describe('when the HTTP API ID has already been defined in serverless configuration', () => {
        before(async () => {
            let serverless = given
                .aServerlessInstance()
                .withPredefinedHttpApiId(given.aHttpApiId());
            settings = new ApiGatewayThrottlingSettings(serverless);

            result = await httpApiExists(serverless, settings);
        });

        it('should return that the HTTP API exists', () => {
            expect(result).to.be.true;
        });
    });

    describe('when the CloudFormation stack has already been deployed and it output a HttpApiIdForApigThrottling', () => {
        let httpApiId, serverless, settings;
        before(async () => {
            serverless = given
                .aServerlessInstance();

            settings = new ApiGatewayThrottlingSettings(serverless);
            httpApiId = given.aDeployedHttpApiId(serverless, settings);

            result = await httpApiExists(serverless, settings);
        });

        it('should return that the HTTP API exists', () => {
            expect(result).to.be.true;
        });

        it('should return the value of the HTTP API id', async () => {
            const retrievedHttpApiId = await retrieveHttpApiId(serverless, settings);
            expect(retrievedHttpApiId).to.equal(httpApiId);
        });
    });

    describe('when the HTTP API Id is part of the compiledCloudFormationTemplate because the serverless configuration includes HTTP API endpoints', () => {
        let httpApiId;
        before(async () => {
            httpApiId = given.aHttpApiId();
            serverless = given
                .aServerlessInstance()
                .withAHttpApiInCloudFormation(httpApiId)
            settings = new ApiGatewayThrottlingSettings(serverless);

            result = await httpApiExists(serverless, settings);
        });

        it('should return that the HTTP API does exist', () => {
            expect(result).to.be.true;
        });
    });

    describe('when the HTTP API ID has not been defined anywhere', () => {
        before(async () => {
            let serverless = given
                .aServerlessInstance()
            settings = new ApiGatewayThrottlingSettings(serverless);

            result = await httpApiExists(serverless, settings);
        });

        it('should return that the HTTP API does not exist', () => {
            expect(result).to.be.false;
        });
    });
});
