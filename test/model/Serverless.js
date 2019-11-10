'use strict';

class Serverless {
  constructor() {
    this.service = {
      custom: {},
      provider: {}
    }
  }

  forStage(stage) {
    this.service.provider.stage = stage;
    return this;
  }

  forRegion(region) {
    this.service.provider.region = region;
    return this;
  }

  withApiGatewayThrottlingConfig({ throttlingEnabled, maxRequestsPerSecond, maxConcurrentRequests } = {}) {
    this.service.custom.apiGatewayThrottling = {
      enabled: throttlingEnabled,
      maxRequestsPerSecond,
      maxConcurrentRequests
    };
    return this;
  }
}

module.exports = Serverless;
