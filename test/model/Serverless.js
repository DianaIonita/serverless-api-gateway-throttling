'use strict';

class Serverless {
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
  }

  forStage(stage) {
    this.service.provider.stage = stage;
    return this;
  }

  forRegion(region) {
    this.service.provider.region = region;
    return this;
  }

  withApiGatewayThrottlingConfig({ maxRequestsPerSecond, maxConcurrentRequests } = {}) {
    this.service.custom.apiGatewayThrottling = {
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

  setDeployedRestApiId(restApiId, settings) {
    const stackName = 'serverless-stack-name';
    this.providers = {
      aws: {
        naming: {
          getStackName: (stage) => {
            if (stage != settings.stage) {
              throw new Error('[Serverless Test Model] Something went wrong getting the Stack Name');
            }
            return stackName;
          }
        },
        request: async (awsService, method, properties, stage, region) => {
          this._recordedAwsRequests.push({ awsService, method, properties, stage, region });
          if (awsService == 'CloudFormation'
            && method == 'describeStacks'
            && properties.StackName == stackName
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
    }
  }

  getRequestsToAws() {
    return this._recordedAwsRequests;
  }
}

module.exports = Serverless;
