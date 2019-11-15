'use strict';

class Serverless {
  constructor() {
    this.service = {
      custom: {},
      provider: {
        compiledCloudFormationTemplate: {
          Resources: []
        }
      }
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

  withFunction(serverlessFunction) {
    if (!this.service.functions) {
      this.service.functions = {};
    }
    let functionName = Object.keys(serverlessFunction)[0];
    this.service.functions[functionName] = serverlessFunction[functionName];

    // when a function with an http endpoint is defined, serverless creates an ApiGatewayRestApi resource
    this.service.provider.compiledCloudFormationTemplate.Resources['ApiGatewayRestApi'] = {};
    return this;
  }

  withPredefinedRestApiId(restApiId) {
    if (!this.service.provider.apiGateway) {
      this.service.provider.apiGateway = {}
    }
    this.service.provider.apiGateway.restApiId = restApiId;
    return this;
  }
}

module.exports = Serverless;
