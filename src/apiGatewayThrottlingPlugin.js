'use strict';

const ApiGatewayThrottlingSettings = require('./ApiGatewayThrottlingSettings');
const updateStageThrottling = require('./updateStageThrottling');
const { restApiExists, outputRestApiIdTo } = require('./restApiId');

class ApiGatewayThrottlingPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'before:package:initialize': this.createSettings.bind(this),
      'before:package:finalize': this.updateCloudFormationTemplate.bind(this),
      'after:aws:deploy:finalize:cleanup': this.updateStage.bind(this),
    };

    this.defineValidationSchema(serverless);
  }

  createSettings() {
    this.settings = new ApiGatewayThrottlingSettings(this.serverless, this.options);
  }

  updateCloudFormationTemplate() {
    this.thereIsARestApi = restApiExists(this.serverless);
    if (!this.thereIsARestApi) {
      this.serverless.cli.log(`[serverless-api-gateway-caching] No REST API found. Throttling settings will be ignored.`);
      return;
    }

    outputRestApiIdTo(this.serverless);
  }

  updateStage() {
    if (!this.settings) {
      this.createSettings();
    }

    this.thereIsARestApi = restApiExists(this.serverless);
    if (!this.thereIsARestApi) {
      this.serverless.cli.log('[serverless-api-gateway-throttling] No Rest API found. Throttling settings will be ignored.');
      return;
    }

    return updateStageThrottling(this.settings, this.serverless);
  }

  defineValidationSchema() {
    if (!this.serverless.configSchemaHandler
      || !this.serverless.configSchemaHandler.defineCustomProperties
      || !this.serverless.configSchemaHandler.defineFunctionEventProperties) {
      return;
    }

    const customThrottlingSchema = {
      type: 'object',
      properties: {
        apiGatewayThrottling: {
          properties: {
            maxRequestsPerSecond: { type: 'number' },
            maxConcurrentRequests: { type: 'number' }
          }
        }
      }
    }
    this.serverless.configSchemaHandler.defineCustomProperties(customThrottlingSchema);

    const httpEventThrottlingSchema = {
      type: 'object',
      properties: {
        throttling: {
          properties: {
            maxRequestsPerSecond: { type: 'number' },
            maxConcurrentRequests: { type: 'number' }
          }
        }
      }
    }
    this.serverless.configSchemaHandler.defineFunctionEventProperties('aws', 'http', httpEventThrottlingSchema);
  }
}

module.exports = ApiGatewayThrottlingPlugin;
