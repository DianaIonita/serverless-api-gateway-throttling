const isEmpty = require('lodash.isempty');
const { retrieveRestApiId } = require('./restApiId');
const { httpEventOf, patchPathFor } = require('./lib');
const MAX_PATCH_OPERATIONS_PER_STAGE_UPDATE = 80;

const updateRestApi = async (settings, serverless) => {
    const restApiId = await retrieveRestApiId(serverless, settings);

    let restApiPatchOps = createPatchForStage(settings);

    for (const restEndpointSettings of settings.restEndpointSettings) {
        const endpointPatch = createPatchForRestEndpoint(restEndpointSettings, serverless);
        restApiPatchOps = restApiPatchOps.concat(endpointPatch);
    }

    const { stage, region } = settings;

    const params = {
        restApiId,
        stageName: stage,
        patchOperations: restApiPatchOps
    }

    await updateStageFor(serverless, params, stage, region);
}

const updateStageFor = async (serverless, params, stage, region) => {
    const chunkSize = MAX_PATCH_OPERATIONS_PER_STAGE_UPDATE;
    const { patchOperations } = params;
    const paramsInChunks = [];
    if (patchOperations.length > chunkSize) {
        for (let i = 0; i < patchOperations.length; i += chunkSize) {
            paramsInChunks.push({
                restApiId: params.restApiId,
                stageName: params.stageName,
                patchOperations: patchOperations.slice(i, i + chunkSize)
            });
        }
    }
    else {
        paramsInChunks.push(params);
    }

    for (let index in paramsInChunks) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Updating API Gateway throttling settings (${parseInt(index) + 1} of ${paramsInChunks.length}).`);
        await serverless.providers.aws.request('APIGateway', 'updateStage', paramsInChunks[index], stage, region);
    }

    serverless.cli.log(`[serverless-api-gateway-throttling] Done updating API Gateway throttling settings.`);
}

const createPatchForRestEndpoint = (endpointSettings, serverless) => {
    let lambda = serverless.service.getFunction(endpointSettings.functionName);
    if (isEmpty(lambda.events)) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Lambda ${endpointSettings.functionName} has not defined events.`);
        return;
    }
    const httpEvent = httpEventOf(lambda, endpointSettings);
    if (isEmpty(httpEvent)) {
        serverless.cli.log(`[serverless-api-gateway-throttling] Lambda ${endpointSettings.functionName} has not defined any HTTP events.`);
        return;
    }

    let { path, method } = httpEvent;

    let patch = [];
    if (method.toUpperCase() == 'ANY') {
        let httpMethodsToConfigureThrottlingFor = ['GET', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'];
        for (let methodWithThrottlingSettings of httpMethodsToConfigureThrottlingFor) {
            patch = patch.concat(patchForMethod(path, methodWithThrottlingSettings, endpointSettings));
        };
    }
    else {
        patch = patch.concat(patchForMethod(path, method, endpointSettings));
    }
    return patch;
}

const createPatchForStage = (settings) => {
    let patch = [{
        op: 'replace',
        path: '/*/*/throttling/rateLimit',
        value: `${settings.maxRequestsPerSecond}`
    },
    {
        op: 'replace',
        path: '/*/*/throttling/burstLimit',
        value: `${settings.maxConcurrentRequests}`
    }];

    return patch;
}

const patchForMethod = (path, method, endpointSettings) => {
    let patchPath = patchPathFor(path, method);
    let patch = [{
        op: 'replace',
        path: `/${patchPath}/throttling/rateLimit`,
        value: `${endpointSettings.maxRequestsPerSecond}`
    },
    {
        op: 'replace',
        path: `/${patchPath}/throttling/burstLimit`,
        value: `${endpointSettings.maxConcurrentRequests}`
    }]
    return patch;
}

module.exports = {
    updateRestApi
} 
