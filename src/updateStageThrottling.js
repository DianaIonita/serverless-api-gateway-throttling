'use strict';

const isEmpty = require('lodash.isempty');
const { retrieveRestApiId } = require('./restApiId');
const MAX_PATCH_OPERATIONS_PER_STAGE_UPDATE = 80;

String.prototype.replaceAll = function (search, replacement) {
  let target = this;

  return target
    .split(search)
    .join(replacement);
};

const escapeJsonPointer = path => {
  return path
    .replaceAll('~', '~0')
    .replaceAll('/', '~1')
    .replaceAll('{', '\{')
    .replaceAll('}', '\}');
}

const createPatchForStage = (settings) => {
  const operation = settings.throttlingEnabled ? 'replace' : 'remove';
  let patch = [{
    op: operation,
    path: '/*/*/throttling/rateLimit',
    value: `${settings.maxRequestsPerSecond}`
  },
  {
    op: operation,
    path: '/*/*/throttling/burstLimit',
    value: `${settings.maxConcurrentRequests}`
  }];

  return patch;
}

const createPatchForEndpoint = (endpointSettings, serverless) => {

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

const updateStageThrottling = async (settings, serverless) => {
  if (!settings) {
    return;
  }

  const restApiId = await retrieveRestApiId(serverless, settings);

  let patchOps = createPatchForStage(settings);

  for (const endpointSettings of settings.endpointSettings) {
    const endpointPatch = createPatchForEndpoint(endpointSettings, serverless);
    patchOps = patchOps.concat(endpointPatch);
  }

  const { stage, region } = settings;

  const params = {
    restApiId,
    stageName: stage,
    patchOperations: patchOps
  }

  await updateStageFor(serverless, params, stage, region);
}

module.exports = updateStageThrottling;
