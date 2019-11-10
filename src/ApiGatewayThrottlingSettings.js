const get = require('lodash.get');

const DEFAULT_THROTTLING_ENABLED = true;
const DEFAULT_MAX_REQUESTS_PER_SECOND = 10000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5000;

const isApiGatewayEndpoint = event => {
  return event.http ? true : false;
}

class ApiGatewayEndpointThrottlingSettings {
  constructor(customFunctionName, functionName, event, globalSettings) {
    // TODO needed?
    this.customFunctionName = customFunctionName;
    this.functionName = functionName;

    if (typeof (event.http) === 'string') {
      let parts = event.http.split(' ');
      this.method = parts[0];
      this.path = parts[1];
    }
    else {
      this.path = event.http.path;
      this.method = event.http.method;
    }

    let throttlingConfig = event.http.throttling;

    if (!throttlingConfig) {
      throttlingConfig = {
        enabled: globalSettings.throttlingEnabled
      }
    }

    this.throttlingEnabled = throttlingConfig.enabled;
    this.maxRequestsPerSecond = throttlingConfig.maxRequestsPerSecond || globalSettings.maxRequestsPerSecond;
    this.maxConcurrentRequests = throttlingConfig.maxConcurrentRequests || globalSettings.maxConcurrentRequests;
  }
}

class ApiGatewayThrottlingSettings {
  constructor(serverless, options) {
    if (!get(serverless, 'service.custom.apiGatewayThrottling')) {
      // TODO warning that settings not defined
      return;
    }
    if (options) {
      this.stage = options.stage || serverless.service.provider.stage;
      this.region = options.region || serverless.service.provider.region;
    } else {
      this.stage = serverless.service.provider.stage;
      this.region = serverless.service.provider.region;
    }

    this.throttlingEnabled = serverless.service.custom.apiGatewayThrottling.enabled || DEFAULT_THROTTLING_ENABLED;
    this.maxRequestsPerSecond = serverless.service.custom.apiGatewayThrottling.maxRequestsPerSecond || DEFAULT_MAX_REQUESTS_PER_SECOND;
    this.maxConcurrentRequests = serverless.service.custom.apiGatewayThrottling.maxConcurrentRequests || DEFAULT_MAX_CONCURRENT_REQUESTS;

    this.endpointSettings = [];

    for (let functionName in serverless.service.functions) {
      let functionSettings = serverless.service.functions[functionName];
      for (let event in functionSettings.events) {
        if (isApiGatewayEndpoint(functionSettings.events[event])) {
          this.endpointSettings.push(new ApiGatewayEndpointThrottlingSettings(functionSettings.name, functionName, functionSettings.events[event], this))
        }
      }
    }
  }
}

module.exports = ApiGatewayThrottlingSettings;
