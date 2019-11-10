'use strict';

const { retrieveRestApiId } = require('./restApiId');

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

const updateStageThrottling = async (settings, serverless) => {
  let restApiId = await retrieveRestApiId(serverless, settings);

  let patchOps = createPatchForStage(settings);

  // let endpointsWithCachingEnabled = settings.endpointSettings.filter(e => e.cachingEnabled);
  // if (settings.cachingEnabled && isEmpty(endpointsWithCachingEnabled)) {
  //   serverless.cli.log(`[serverless-api-gateway-caching] [WARNING] API Gateway caching is enabled but none of the endpoints have caching enabled`);
  // }

  // for (let endpointSettings of settings.endpointSettings) {
  //   let endpointPatch = createPatchForEndpoint(endpointSettings, serverless);
  //   patchOps = patchOps.concat(endpointPatch);
  // }

  let params = {
    restApiId,
    stageName: settings.stage,
    patchOperations: patchOps
  }

  await updateStageFor(serverless, params, settings.stage, settings.region);
}

module.exports = updateStageThrottling;
