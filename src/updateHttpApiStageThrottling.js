const isEmpty = require('lodash.isempty');
const { retrieveHttpApiId } = require('./httpApiId');
const { httpApiEventOf } = require('./lib');

const updateHttpApi = async (settings, serverless) => {
    const httpApiId = await retrieveHttpApiId(serverless, settings);

    let httpApiRouteSettings = {};
    for (const httpApiEndpointSettings of settings.httpApiEndpointSettings) {
        httpApiRouteSettings = {
            ...httpApiRouteSettings,
            ...createRouteSettingsForHttpApiEndpoint(httpApiEndpointSettings, serverless),
        }
    }

    const { defaultHttpApiStage, region } = settings;

    const params = {
        ApiId: httpApiId,
        StageName: defaultHttpApiStage,
        DefaultRouteSettings: createRouteSettingsForStage(settings),
        RouteSettings: httpApiRouteSettings
    }

    serverless.cli.log(`[serverless-api-gateway-throttling] Updating API Gateway HTTP API throttling settings...`);
    await serverless.providers.aws.request('ApiGatewayV2', 'updateStage', params, { region });
    serverless.cli.log(`[serverless-api-gateway-throttling] Done updating API Gateway HTTP API throttling settings.`);
}

const createRouteSettingsForStage = (settings) => {
    return {
        ThrottlingBurstLimit: settings.maxConcurrentRequests,
        ThrottlingRateLimit: settings.maxRequestsPerSecond
    }
}

const createRouteSettingsForHttpApiEndpoint = (endpointSettings, serverless) => {
    let lambda = serverless.service.getFunction(endpointSettings.functionName);
    if (isEmpty(lambda.events)) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Lambda ${endpointSettings.functionName} has not defined events.`);
        return;
    }
    const httpApiEvent = httpApiEventOf(lambda, endpointSettings);
    if (isEmpty(httpApiEvent)) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Lambda ${endpointSettings.functionName} has not defined any HTTP API events.`);
        return;
    }

    let { path, method } = httpApiEvent;

    let routeSettings = {};
    if (method.toUpperCase() == 'ANY') {
        let httpMethodsToConfigureThrottlingFor = ['ANY']; //In ApiGatewaV2(HTTP), For Method type ANY, the Throttling route should also have ANY method.
        for (let methodWithThrottlingSettings of httpMethodsToConfigureThrottlingFor) {
            routeSettings = {
                ...routeSettings,
                ...routeSettingsForMethod(path, methodWithThrottlingSettings, endpointSettings)
            }
        };
    }
    else {
        routeSettings = {
            ...routeSettings,
            ...routeSettingsForMethod(path, method, endpointSettings),
        }
    }
    return routeSettings;
}

const routeSettingsForMethod = (path, method, endpointSettings) => {
    const route = {
        [`${method.toUpperCase()} ${path}`]: {
            ThrottlingBurstLimit: endpointSettings.maxConcurrentRequests,
            ThrottlingRateLimit: endpointSettings.maxRequestsPerSecond
        }
    }
    return route;
}

module.exports = {
    updateHttpApi
}
