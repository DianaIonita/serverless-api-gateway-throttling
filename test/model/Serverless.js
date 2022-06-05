'use strict';

class Serverless {
  stackName = 'serverless-stack-name';
  constructor() {
    this._recordedAwsRequests = [];
    this._logMessages = [];
    this.cli = {
      log: (logMessage) => {
        this._logMessages.push(logMessage);
      }
    };

    this.service = {
      custom: {},
      provider: {
        compiledCloudFormationTemplate: {
          Resources: []
        }
      },
      getFunction(functionName) {
        return this.functions[functionName];
      }
    }
    this.providers = {
      aws: {
        naming: {
          getStackName: (stage) => {
            if (stage != this.service.provider.stage) {
              throw new Error('[Serverless Test Model] Something went wrong getting the Stack Name');
            }
            return this.stackName;
          }
        },
        request: () => { return { Stacks: [{ Outputs: [] }] } }
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

  withApiGatewayThrottlingConfig({ maxRequestsPerSecond, maxConcurrentRequests, disabled } = {}) {
    this.service.custom.apiGatewayThrottling = {
      maxRequestsPerSecond,
      maxConcurrentRequests,
      disabled
    };
    return this;
  }

  withFunction(serverlessFunction) {
    if (!this.service.functions) {
      this.service.functions = {};
    }
    let functionName = Object.keys(serverlessFunction)[0];
    this.service.functions[functionName] = serverlessFunction[functionName];

    if (serverlessFunction.events && serverlessFunction.events.find(e => e.http)) {
      // when a function with an http endpoint is defined, serverless creates an ApiGatewayRestApi resource
      this.service.provider.compiledCloudFormationTemplate.Resources['ApiGatewayRestApi'] = {};
    }

    if (serverlessFunction.events && serverlessFunction.events.find(e => e.httpApi)) {
      // when a function with an httpApi endpoint is defined, serverless creates a HttpApi resource
      this.service.provider.compiledCloudFormationTemplate.Resources['HttpApi'] = {};
    }
    return this;
  }

  withPredefinedRestApiId(restApiId) {
    if (!this.service.provider.apiGateway) {
      this.service.provider.apiGateway = {}
    }
    this.service.provider.apiGateway.restApiId = restApiId;
    return this;
  }

  withARestApiInCloudFormation() {
    this.service.provider.compiledCloudFormationTemplate.Resources['ApiGatewayRestApi'] = {};
    return this;
  }

  withDeployedRestApiId(restApiId, settings) {
    this.setDeployedRestApiId(restApiId, settings);
    return this;
  }

  recordAwsRequests() {
    this.providers.aws.request =
      async (awsService, method, properties, stage, region) => {
        this._recordedAwsRequests.push({ awsService, method, properties, stage, region });
      }
    return this;
  }

  setDeployedRestApiId(restApiId, settings) {
    this.providers.aws.request =
      async (awsService, method, properties, stage, region) => {
        this._recordedAwsRequests.push({ awsService, method, properties, stage, region });
        if (awsService == 'CloudFormation'
          && method == 'describeStacks'
          && properties.StackName == this.stackName
          && stage == settings.stage
          && region == settings.region) {
          return {
            Stacks: [{
              Outputs: [{
                OutputKey: 'RestApiIdForApigThrottling',
                OutputValue: restApiId
              }]
            }]
          };
        }
      }
  }

  withPredefinedHttpApiId(httpApiId) {
    if (!this.service.provider.httpApi) {
      this.service.provider.httpApi = {}
    }
    this.service.provider.httpApi.id = httpApiId;
    return this;
  }

  withAHttpApiInCloudFormation() {
    this.service.provider.compiledCloudFormationTemplate.Resources['HttpApi'] = {};
    return this;
  }

  setDeployedHttpApiId(httpApiId, settings) {
    this.providers.aws.request =
      async (awsService, method, properties, stage, region) => {
        this._recordedAwsRequests.push({ awsService, method, properties, stage, region });
        if (awsService == 'CloudFormation'
          && method == 'describeStacks'
          && properties.StackName == this.stackName
          && stage == settings.stage
          && region == settings.region) {
          return {
            Stacks: [{
              Outputs: [{
                OutputKey: 'HttpApiIdForApigThrottling',
                OutputValue: httpApiId
              }]
            }]
          };
        }
      }
  }

  getRequestsToAws() {
    return this._recordedAwsRequests;
  }
}

module.exports = Serverless;
