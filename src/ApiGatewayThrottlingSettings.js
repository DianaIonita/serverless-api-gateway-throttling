'use strict';

const get = require('lodash.get');
const isEmpty = require('lodash.isempty');

const DEFAULT_MAX_REQUESTS_PER_SECOND = 10000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5000;
const DEFAULT_HTTP_API_STAGE = '$default';

const isApiGatewayEndpoint = event => {
  return event.http ? true : false;
}

const isHttpApiEndpoint = event => {
  return event.httpApi ? true : false;
}

class ApiGatewayEndpointThrottlingSettings {
  constructor(functionName, event, eventType, globalSettings) {
    this.functionName = functionName;

    if (typeof (event[eventType]) === 'string') {
      let parts = event[eventType].split(' ');
      this.method = parts[0];
      this.path = parts[1];
    }
    else {
      this.path = event[eventType].path;
      this.method = event[eventType].method;
    }

    const throttlingDisabled = get(event[eventType].throttling, 'disabled') == true;
    if (throttlingDisabled) {
      // https://github.com/DianaIonita/serverless-api-gateway-throttling/issues/5
      // -1 disables for a specific endpoint
      this.maxConcurrentRequests = -1;
      this.maxRequestsPerSecond = -1;
    }
    else {
      this.maxRequestsPerSecond = get(event[eventType].throttling, 'maxRequestsPerSecond', globalSettings.maxRequestsPerSecond);
      this.maxConcurrentRequests = get(event[eventType].throttling, 'maxConcurrentRequests', globalSettings.maxConcurrentRequests);
    }
  }
}
class ApiGatewayThrottlingSettings {
  constructor(serverless, options) {
    if (!get(serverless, 'service.custom.apiGatewayThrottling')) {
      serverless.cli.log('[serverless-api-gateway-throttling] Warning: throttling settings not found, the plugin won\'t perform any actions.');
      return;
    }
    if (options) {
      this.stage = options.stage || serverless.service.provider.stage;
      this.region = options.region || serverless.service.provider.region;
    } else {
      this.stage = serverless.service.provider.stage;
      this.region = serverless.service.provider.region;
    }
    this.maxRequestsPerSecond = serverless.service.custom.apiGatewayThrottling.maxRequestsPerSecond || DEFAULT_MAX_REQUESTS_PER_SECOND;
    this.maxConcurrentRequests = serverless.service.custom.apiGatewayThrottling.maxConcurrentRequests || DEFAULT_MAX_CONCURRENT_REQUESTS;
    this.defaultHttpApiStage = DEFAULT_HTTP_API_STAGE;

    this.restEndpointSettings = [];
    this.httpApiEndpointSettings = [];

    for (let functionName in serverless.service.functions) {
      let functionSettings = serverless.service.functions[functionName];
      if (isEmpty(functionSettings.events)) {
        continue;
      }
      for (let event of functionSettings.events) {
        if (isApiGatewayEndpoint(event)) {
          this.restEndpointSettings.push(new ApiGatewayEndpointThrottlingSettings(functionName, event, 'http', this))
        }
        if (isHttpApiEndpoint(event)) {
          this.httpApiEndpointSettings.push(new ApiGatewayEndpointThrottlingSettings(functionName, event, 'httpApi', this))
        }
      }
    }
  }
}

module.exports = ApiGatewayThrottlingSettings;
