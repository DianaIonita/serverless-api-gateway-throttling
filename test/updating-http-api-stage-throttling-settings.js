'use strict';

const given = require('./steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const expect = require('chai').expect;
const { updateHttpApi } = require('../src/updateHttpApiStageThrottling');

const API_GATEWAY_V1 = 'APIGateway';
const API_GATEWAY_V2 = 'ApiGatewayV2';
const UPDATE_STAGE = 'updateStage';
const region = 'eu-west-1';

describe('Updating stage throttling settings for a HTTP API', () => {
    let serverless, settings, requestsToAws, httpApiId, apiGatewayRequest;
    let globalThrottlingSettings = { maxRequestsPerSecond: 1000, maxConcurrentRequests: 500 };

    describe('when there are no http endpoints with custom throttling configuration', () => {
        before(async () => {
            serverless = given.aServerlessInstance()
                .forRegion(region)
                .withApiGatewayThrottlingConfig(globalThrottlingSettings)
                .withFunction(given.aServerlessFunction('list-items'));
            settings = new ApiGatewayThrottlingSettings(serverless);

            httpApiId = await given.aDeployedHttpApiId(serverless, settings)

            await when_updating_http_api_throttling_settings(settings, serverless);

            requestsToAws = serverless.getRequestsToAws();
        });

        it('should send a single request to AWS SDK to update stage', () => {
            expect(requestsToAws.filter(r => r.awsService == API_GATEWAY_V1)).to.have.lengthOf(0);

            const request = requestsToAws.filter(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            expect(request).to.have.lengthOf(1);
        });

        describe('the request sent to AWS SDK to update stage', () => {
            before(() => {
                apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            });

            it('should contain the HTTP Api Id', () => {
                expect(apiGatewayRequest.properties.ApiId).to.equal(httpApiId);
            });

            it('should contain the stage name', () => {
                expect(apiGatewayRequest.properties.StageName).to.equal(settings.defaultHttpApiStage);
            });

            it('should not specify route settings', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.be.empty;
            });

            it('should set the rate limit at stage level', () => {
                expect(apiGatewayRequest.properties.DefaultRouteSettings.ThrottlingRateLimit).to.equal(globalThrottlingSettings.maxRequestsPerSecond);
            });

            it('should set the burst limit at stage level', () => {
                expect(apiGatewayRequest.properties.DefaultRouteSettings.ThrottlingBurstLimit).to.equal(globalThrottlingSettings.maxConcurrentRequests);
            });
        });
    });

    describe('when there are some endpoints with custom throttling configuration', () => {
        before(async () => {
            serverless = given.aServerlessInstance()
                .forRegion(region)
                .withApiGatewayThrottlingConfig(globalThrottlingSettings)
                .withFunction(given.aServerlessFunction('list-items')
                    .withHttpApiEndpoint('get', '/items', { maxRequestsPerSecond: 200, maxConcurrentRequests: 100 }))
                .withFunction(given.aServerlessFunction('create-item')
                    .withHttpApiEndpoint('post', '/item/{itemId}', { maxRequestsPerSecond: 100, maxConcurrentRequests: 50 }))
                .withFunction(given.aServerlessFunction('delete-item')
                    .withHttpApiEndpoint('delete', '/item/{itemId}'));

            settings = new ApiGatewayThrottlingSettings(serverless);

            httpApiId = await given.aDeployedHttpApiId(serverless, settings)

            await when_updating_http_api_throttling_settings(settings, serverless);

            requestsToAws = serverless.getRequestsToAws();
        });

        it('should send a single request to AWS SDK to update stage', () => {
            expect(requestsToAws.filter(r => r.awsService == API_GATEWAY_V1)).to.have.lengthOf(0);

            const request = requestsToAws.filter(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            expect(request).to.have.lengthOf(1);
        });

        describe('the request sent to AWS SDK to update stage', () => {
            before(() => {
                apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            });

            it('should contain the Http Api Id', () => {
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

            it('should set the burst and rate limit for exactly three endpoints', () => {
                expect(Object.keys(apiGatewayRequest.properties.RouteSettings)).to.have.lengthOf(3);
            })

            it('should set the burst and rate limit for the list-items endpoint', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                    ['GET /items']: {
                        ThrottlingBurstLimit: 100,
                        ThrottlingRateLimit: 200
                    }
                });
            });

            it('should set the burst and rate limit for the create-item endpoint', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                    ['POST /item/{itemId}']: {
                        ThrottlingBurstLimit: 50,
                        ThrottlingRateLimit: 100
                    }
                });
            });

            it('should set the burst and rate limit for the delete-item endpoint', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                    ['DELETE /item/{itemId}']: {
                        ThrottlingBurstLimit: globalThrottlingSettings.maxConcurrentRequests,
                        ThrottlingRateLimit: globalThrottlingSettings.maxRequestsPerSecond
                    }
                });
            });
        });
    });

    describe('when there\'s a function with two http endpoints with custom throttling configuration', () => {
        before(async () => {
            serverless = given.aServerlessInstance()
                .forRegion(region)
                .withApiGatewayThrottlingConfig(globalThrottlingSettings)
                .withFunction(given.aServerlessFunction('list-items')
                    .withHttpApiEndpoint('get', '/items', { maxRequestsPerSecond: 200, maxConcurrentRequests: 100 })
                    .withHttpApiEndpoint('get', '/older/items', { maxRequestsPerSecond: 100, maxConcurrentRequests: 80 }));

            settings = new ApiGatewayThrottlingSettings(serverless);

            httpApiId = await given.aDeployedHttpApiId(serverless, settings)

            await when_updating_http_api_throttling_settings(settings, serverless);

            requestsToAws = serverless.getRequestsToAws();
        });

        it('should send a single request to AWS SDK to update stage', () => {
            expect(requestsToAws.filter(r => r.awsService == API_GATEWAY_V1)).to.have.lengthOf(0);

            const request = requestsToAws.filter(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            expect(request).to.have.lengthOf(1);
        });

        describe('the request sent to AWS SDK to update stage', () => {
            before(() => {
                apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            });

            it('should contain the Http Api Id', () => {
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

            it('should set the burst and rate limit for exactly two endpoints', () => {
                expect(Object.keys(apiGatewayRequest.properties.RouteSettings)).to.have.lengthOf(2);
            })

            it('should set the burst and rate limit for the first http api endpoint', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                    ['GET /items']: {
                        ThrottlingBurstLimit: 100,
                        ThrottlingRateLimit: 200
                    }
                });
            });

            it('should set the burst and rate limit for the second http api endpoint', () => {
                expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                    ['GET /older/items']: {
                        ThrottlingBurstLimit: 80,
                        ThrottlingRateLimit: 100
                    }
                });
            });
        });
    });

    describe('when there\'s an endpoint with http method ANY with custom throttling configuration', () => {
        before(async () => {
            serverless = given.aServerlessInstance()
                .forRegion(region)
                .withApiGatewayThrottlingConfig(globalThrottlingSettings)
                .withFunction(given.aServerlessFunction('do-anything-to-item')
                    .withHttpApiEndpoint('any', '/item', { maxRequestsPerSecond: 500, maxConcurrentRequests: 250 }));

            settings = new ApiGatewayThrottlingSettings(serverless);

            httpApiId = await given.aDeployedHttpApiId(serverless, settings)

            await when_updating_http_api_throttling_settings(settings, serverless);

            requestsToAws = serverless.getRequestsToAws();
            apiGatewayRequest = requestsToAws.find(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
        });

        it('should send a single request to AWS SDK to update stage', () => {
            const request = requestsToAws.filter(r => r.awsService == API_GATEWAY_V2 && r.method == UPDATE_STAGE);
            expect(request).to.have.lengthOf(1);
        });

        it(`should set the burst and rate limit for the ANY method`, () => {
            expect(apiGatewayRequest.properties.RouteSettings).to.deep.include({
                [`ANY /item`]: {
                    ThrottlingBurstLimit: 250,
                    ThrottlingRateLimit: 500
                }
            });
        });
    });
});

const when_updating_http_api_throttling_settings = async (settings, serverless) => {
    return await updateHttpApi(settings, serverless);
}
