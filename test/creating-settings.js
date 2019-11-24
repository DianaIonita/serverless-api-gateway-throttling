'use strict';

const given = require('./steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const expect = require('chai').expect;

describe.only('Creating settings', () => {
  let throttlingSettings, serverless;

  describe('when there are no settings for API Gateway throttling', () => {
    before(() => {
      serverless = given.a_serverless_instance();
      throttlingSettings = createSettingsFor(serverless);
    });

    it('should not return anything', () => {
      expect(throttlingSettings).to.be.empty;
    });

    it('should log a warning message that no throttling settings will be applied', () => {
      expect(serverless._logMessages).to.have.lengthOf(1);
      expect(serverless._logMessages[0]).to.equal('[serverless-api-gateway-throttling] Warning: throttling settings not found, the plugin won\'t perform any actions.');
    });
  });

  describe('when the max requests per second setting is omitted', () => {
    before(() => {
      serverless = given.a_serverless_instance()
        .withApiGatewayThrottlingConfig({ maxConcurrentRequests: 2000 });

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should set max concurrent requests', () => {
      expect(throttlingSettings.maxConcurrentRequests).to.equal(2000);
    });

    it('should set the default max requests per second', () => {
      expect(throttlingSettings.maxRequestsPerSecond).to.equal(10000);
    });
  });

  describe('when the max concurrent requests setting is omitted', () => {
    before(() => {
      serverless = given.a_serverless_instance()
        .withApiGatewayThrottlingConfig({ maxRequestsPerSecond: 300 });

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should set max requests per second', () => {
      expect(throttlingSettings.maxRequestsPerSecond).to.equal(300);
    });

    it('should set the default max concurrent requests', () => {
      expect(throttlingSettings.maxConcurrentRequests).to.equal(5000);
    });
  });

  describe('when all settings have been defined', () => {
    before(() => {
      serverless = given.a_serverless_instance()
        .withApiGatewayThrottlingConfig({ maxRequestsPerSecond: 400, maxConcurrentRequests: 200 });

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should set max requests per second', () => {
      expect(throttlingSettings.maxRequestsPerSecond).to.equal(400);
    });

    it('should set max concurrent requests', () => {
      expect(throttlingSettings.maxConcurrentRequests).to.equal(200);
    });
  });

  describe('when there are settings defined for API Gateway throttling', () => {
    const globalThrottlingConfig = {
      maxRequestsPerSecond: 2000,
      maxConcurrentRequests: 1000
    };

    describe('and there are functions', () => {
      describe('and none of them are http endpoints', () => {
        before(() => {
          serverless = given.a_serverless_instance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.a_serverless_function('list-items'))
            .withFunction(given.a_serverless_function('get-item'));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should not have throttling settings for non-http endpoints', () => {
          expect(throttlingSettings.endpointSettings).to.be.empty;
        });
      });

      describe('and there are some http endpoints', () => {
        before(() => {
          serverless = given.a_serverless_instance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.a_serverless_function('count-items-cron-job'))
            .withFunction(given.a_serverless_function('list-items')
              .withHttpEndpoint('get', '/items'))
            .withFunction(given.a_serverless_function('get-item')
              .withHttpEndpoint('get', '/item/{itemId}', { maxRequestsPerSecond: 500, maxConcurrentRequests: 200 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should create throttling settings for all http endpoints', () => {
          expect(throttlingSettings.endpointSettings).to.have.lengthOf(2);
        });

        it('should not create throttling settings for the function without an http endpoint', () => {
          expect(throttlingSettings.endpointSettings.find(e => e.functionName == 'count-items-cron-job')).to.not.exist;
        });

        describe('for the http endpoint without custom throttling settings', () => {
          let endpointSettings;
          before(() => {
            endpointSettings = throttlingSettings.endpointSettings.find(e => e.functionName == 'list-items');
          });

          it('should inherit maxRequestsPerSecond from global settings', () => {
            expect(endpointSettings.maxRequestsPerSecond).to.equal(globalThrottlingConfig.maxRequestsPerSecond);
          });

          it('should inherit maxConcurrentRequests from global settings', () => {
            expect(endpointSettings.maxConcurrentRequests).to.equal(globalThrottlingConfig.maxConcurrentRequests);
          });
        });

        describe('for the http endpoint with custom maxRequestsPerSecond and maxConcurrentRequests settings', () => {
          let endpointSettings;
          before(() => {
            endpointSettings = throttlingSettings.endpointSettings.find(e => e.functionName == 'get-item');
          });

          it('maxRequestsPerSecond should be set', () => {
            expect(endpointSettings.maxRequestsPerSecond).to.equal(500);
          });

          it('maxConcurrentRequests should be set', () => {
            expect(endpointSettings.maxConcurrentRequests).to.equal(200);
          });
        });
      });

      describe('and one function has defined many http endpoints', () => {
        before(() => {
          serverless = given.a_serverless_instance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.a_serverless_function('list-items')
              .withHttpEndpoint('get', '/items', { maxRequestsPerSecond: 500, maxConcurrentRequests: 200 })
              .withHttpEndpoint('get', '/all-items', { maxRequestsPerSecond: 100, maxConcurrentRequests: 50 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should create throttling settings for all endpoint definitions', () => {
          expect(throttlingSettings.endpointSettings).to.have.lengthOf(2);
        });
      });
    });
  });

  describe('when there are command line options for the deployment', () => {
    let options;
    before(() => {
      serverless = given.a_serverless_instance()
        .forStage('devstage').forRegion('eu-west-1')
        .withApiGatewayThrottlingConfig();
    });

    describe('and they do not specify the stage', () => {
      before(() => {
        options = {}

        throttlingSettings = createSettingsFor(serverless, options);
      });

      it('should use the provider stage', () => {
        expect(throttlingSettings.stage).to.equal('devstage');
      });
    });

    describe('and they specify the stage', () => {
      before(() => {
        options = { stage: 'anotherstage' }

        throttlingSettings = createSettingsFor(serverless, options);
      });

      it('should use the stage from command line', () => {
        expect(throttlingSettings.stage).to.equal('anotherstage');
      });
    });

    describe('and they do not specify the region', () => {
      before(() => {
        options = {}

        throttlingSettings = createSettingsFor(serverless, options);
      });

      it('should use the provider region', () => {
        expect(throttlingSettings.region).to.equal('eu-west-1');
      });
    });

    describe('and they specify the region', () => {
      before(() => {
        options = { region: 'someotherregion' }

        throttlingSettings = createSettingsFor(serverless, options);
      });

      it('should use the region from command line', () => {
        expect(throttlingSettings.region).to.equal('someotherregion');
      });
    });
  });

  describe('when a http endpoint is defined in shorthand', () => {
    before(() => {
      let endpoint = given.a_serverless_function('list-items')
        .withHttpEndpointInShorthand('get /items');
      serverless = given.a_serverless_instance()
        .withApiGatewayThrottlingConfig()
        .withFunction(endpoint);

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should create throttling settings for the http endpoint', () => {
      expect(throttlingSettings.endpointSettings.find(e => e.functionName == 'list-items')).to.exist;
    });
  });
});

const createSettingsFor = (serverless, options) => {
  return new ApiGatewayThrottlingSettings(serverless, options);
}
