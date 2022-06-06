'use strict';

const given = require('./steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const ApiGatewayThrottlingPlugin = require('../src/apiGatewayThrottlingPlugin');
const expect = require('chai').expect;

const API_GATEWAY_V1 = 'APIGateway';
const API_GATEWAY_V2 = 'ApiGatewayV2';
const UPDATE_STAGE = 'updateStage';
const restApiStage = 'default';
const region = 'eu-west-1';

describe('Updating stage throttling settings for a HTTP API', () => {
    let serverless, settings, requestsToAws, httpApiId, restApiId, apiGatewayRequest;
    let globalThrottlingSettings = { maxRequestsPerSecond: 1000, maxConcurrentRequests: 500 };

    describe('when there are some http api endpoints and some rest endpoints with custom throttling configuration', () => {
        before(async () => {
            restApiId = given.aRestApiId();
            httpApiId = given.aHttpApiId();
            serverless = given.aServerlessInstance()
                .forStage(restApiStage).forRegion(region)
                .withPredefinedHttpApiId(httpApiId)
                .withPredefinedRestApiId(restApiId)
                .withApiGatewayThrottlingConfig(globalThrottlingSettings)
                .withFunction(given.aServerlessFunction('list-items')
                    .withHttpApiEndpoint('get', '/items', { maxRequestsPerSecond: 200, maxConcurrentRequests: 100 }))
                .withFunction(given.aServerlessFunction('get-item')
                    .withRestEndpoint('get', '/item', { maxRequestsPerSecond: 400, maxConcurrentRequests: 300 }))
                .recordAwsRequests();
            settings = new ApiGatewayThrottlingSettings(serverless);

            const plugin = new ApiGatewayThrottlingPlugin(serverless);
            await plugin.updateStage();

            requestsToAws = serverless.getRequestsToAws();
        });

        it('should send a single request to AWS SDK to update stage for ApiGateway V1', () => {
            const request = requestsToAws.filter(r => r.awsService == API_GATEWAY_V1 && r.method == UPDATE_STAGE);
            expect(request).to.have.lengthOf(1);
        });

        it('should send a single request to AWS SDK to update stage for ApiGateway V2', () => {
            const request = requestsToAws.filter(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            expect(request).to.have.lengthOf(1);
        });

        describe('the request sent to AWS SDK to update stage for the Rest API', () => {
            before(() => {
                apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            });

            it('should contain the HTTP Api Id', () => {
                expect(apiGatewayRequest.properties.ApiId).to.equal(httpApiId);
            });

            it('should contain the stage name', () => {
                expect(apiGatewayRequest.properties.StageName).to.equal(settings.defaultHttpApiStage);
            });

            it('should set the rate limit at stage level', () => {
                expect(apiGatewayRequest.properties.DefaultRouteSettings.ThrottlingRateLimit).to.equal(globalThrottlingSettings.maxRequestsPerSecond);
            });

            it('should set the burst limit at stage level', () => {
                expect(apiGatewayRequest.properties.DefaultRouteSettings.ThrottlingBurstLimit).to.equal(globalThrottlingSettings.maxConcurrentRequests);
            });

            it('should set the burst and rate limit for exactly one endpoint', () => {
                expect(Object.keys(apiGatewayRequest.properties.RouteSettings)).to.have.lengthOf(1);
            })

            it('should set the burst and rate limit for the list-items endpoint', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                    ['GET /items']: {
                        ThrottlingBurstLimit: 100,
                        ThrottlingRateLimit: 200
                    }
                });
            });
        });

        describe('the request sent to AWS SDK to update stage for the REST API', () => {
            before(() => {
                apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY_V1 && r.method == UPDATE_STAGE);
            });

            it('should contain the REST Api Id', () => {
                expect(apiGatewayRequest.properties.restApiId).to.equal(restApiId);
            });

            it('should contain the stage name', () => {
                expect(apiGatewayRequest.properties.stageName).to.equal(restApiStage);
            });

            it('should specify two patch operations for each rest endpoint and two patch operations for the stage', () => {
                expect(apiGatewayRequest.properties.patchOperations).to.have.lengthOf(4);
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

            it('should set the rate limit for the get-item endpoint', () => {
                expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
                    op: 'replace',
                    path: '/~1item/GET/throttling/rateLimit',
                    value: '400'
                });
            });

            it('should set the burst limit for the get-item endpoint', () => {
                expect(apiGatewayRequest.properties.patchOperations).to.deep.include({
                    op: 'replace',
                    path: '/~1item/GET/throttling/burstLimit',
                    value: '300'
                });
            });
        });
    });
});
