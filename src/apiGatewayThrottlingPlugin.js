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
      'before:package:finalize': this.outputRestApiId.bind(this),
      'after:aws:deploy:finalize:cleanup': this.updateStage.bind(this),
    };
  }

  createSettings() {
    this.settings = new ApiGatewayThrottlingSettings(this.serverless, this.options);
  }

  outputRestApiId() {
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
}

module.exports = ApiGatewayThrottlingPlugin;
