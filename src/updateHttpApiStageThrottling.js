const isEmpty = require('lodash.isempty');
const { httpApiEventOf } = require('./lib');

const updateHttpApi = async (settings, serverless) => {
    const httpApiRouteSettings = {};
    for (const httpApiEndpointSettings of settings.httpApiEndpointSettings) {
        httpApiRouteSettings = {
            ...httpApiRouteSettings,
            ...createRouteSettingsForHttpApiEndpoint(httpApiEndpointSettings, serverless),
        }
    }
}

const createRouteSettingsForHttpApiEndpoint = (endpointSettings, serverless) => {
    let lambda = serverless.service.getFunction(endpointSettings.functionName);
    if (isEmpty(lambda.events)) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Lambda ${endpointSettings.functionName} has not defined events.`);
        return;
    }
    const httpApiEvent = httpApiEventOf(lambda, endpointSettings);
    if (isEmpty(httpEvent)) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Lambda ${endpointSettings.functionName} has not defined any HTTP API events.`);
        return;
    }

    let { path, method } = httpApiEvent;

    let routeSettings = {};
    if (method.toUpperCase() == 'ANY') {
        let httpMethodsToConfigureThrottlingFor = ['GET', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'];
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
        [`${method} ${path}`]: {
            ThrottlingBurstLimit: endpointSettings.maxConcurrentRequests,
            ThrottlingRateLimit: endpointSettings.maxRequestsPerSecond
        }
    }
    return route;
}

module.exports = {
    updateHttpApi
}
