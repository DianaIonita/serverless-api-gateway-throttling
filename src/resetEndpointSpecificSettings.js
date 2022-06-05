'use strict';

const isEmpty = require('lodash.isempty');
const { httpEventOf, patchPathFor } = require('./lib');
const { retrieveRestApiId } = require('./restApiId');
const MAX_PATCH_OPERATIONS_PER_STAGE_UPDATE = 80;

const patchForMethod = (path, method) => {
  let patchPath = patchPathFor(path, method);
  let patch = [{
    op: 'remove',
    path: `/${patchPath}`,
    value: ""
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
      patch = patch.concat(patchForMethod(path, methodWithThrottlingSettings));
    };
  }
  else {
    patch = patch.concat(patchForMethod(path, method));
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
    serverless.cli.log(`[serverless-api-gateway-throttling] Resetting API Gateway endpoint settings (${parseInt(index) + 1} of ${paramsInChunks.length}).`);
    await serverless.providers.aws.request('APIGateway', 'updateStage', paramsInChunks[index], stage, region);
  }

  serverless.cli.log(`[serverless-api-gateway-throttling] Done resetting API Gateway endpoint settings.`);
}

const resetEndpointSpecificSettings = async (settings, serverless) => {
  if (isEmpty(settings)) {
    return;
  }

  const restApiId = await retrieveRestApiId(serverless, settings);

  let patchOps = [];

  for (const restEndpointSettings of settings.restEndpointSettings) {
    const endpointPatch = createPatchForEndpoint(restEndpointSettings, serverless);
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

module.exports = resetEndpointSpecificSettings;
