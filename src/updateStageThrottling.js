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

const httpEventOf = (lambda, endpointSettings) => {
  let httpEvents = lambda.events.filter(e => e.http != undefined)
    .map(e => {
      if (typeof (e.http) === 'string') {
        let parts = e.http.split(' ');
        return {
          method: parts[0],
          path: parts[1]
        }
      } else {
        return {
          method: e.http.method,
          path: e.http.path
        }
      }
    });

  return httpEvents.filter(e => e.path = endpointSettings.path || "/" + e.path === endpointSettings.path)
    .filter(e => e.method.toUpperCase() == endpointSettings.method.toUpperCase())[0];
}

const patchPathFor = (path, method) => {
  let escapedPath = escapeJsonPointer(path);
  if (!escapedPath.startsWith('~1')) {
    escapedPath = `~1${escapedPath}`;
  }
  let patchPath = `${escapedPath}/${method.toUpperCase()}`;
  return patchPath;
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

const createPatchForEndpoint = (endpointSettings, serverless) => {
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
  if (isEmpty(settings)) {
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
