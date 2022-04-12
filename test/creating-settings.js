'use strict';

const given = require('./steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const expect = require('chai').expect;

describe('Creating throttling settings', () => {
  let throttlingSettings, serverless;

  describe('when there are no settings for API Gateway throttling', () => {
    before(() => {
      serverless = given.aServerlessInstance();
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
      serverless = given.aServerlessInstance()
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
      serverless = given.aServerlessInstance()
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
      serverless = given.aServerlessInstance()
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
          serverless = given.aServerlessInstance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.aServerlessFunction('list-items'))
            .withFunction(given.aServerlessFunction('get-item'));
          throttlingSettings = createSettingsFor(serverless);
        });

        it('should not have throttling settings for non-http endpoints', () => {
          expect(throttlingSettings.restEndpointSettings).to.be.empty;
        });
      });

      describe('and there are some http endpoints', () => {
        before(() => {
          serverless = given.aServerlessInstance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.aServerlessFunction('count-items-cron-job'))
            .withFunction(given.aServerlessFunction('list-items')
              .withRestEndpoint('get', '/items', { disabled: true }))
            .withFunction(given.aServerlessFunction('get-item')
              .withRestEndpoint('get', '/item/{itemId}', { maxRequestsPerSecond: 500, maxConcurrentRequests: 200 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should create throttling settings only for the http endpoints', () => {
          expect(throttlingSettings.restEndpointSettings).to.have.lengthOf(2);
        });

        it('should not create http api throttling settings', () => {
          expect(throttlingSettings.httpApiEndpointSettings).to.have.lengthOf(0);
        });

        it('should not create throttling settings for the function without an http endpoint', () => {
          expect(throttlingSettings.restEndpointSettings.find(e => e.functionName == 'count-items-cron-job')).to.not.exist;
        });

        describe('for the http endpoint with custom maxRequestsPerSecond and maxConcurrentRequests settings', () => {
          let restEndpointSettings;
          before(() => {
            restEndpointSettings = throttlingSettings.restEndpointSettings.find(e => e.functionName == 'get-item');
          });

          it('maxRequestsPerSecond should be set', () => {
            expect(restEndpointSettings.maxRequestsPerSecond).to.equal(500);
          });

          it('maxConcurrentRequests should be set', () => {
            expect(restEndpointSettings.maxConcurrentRequests).to.equal(200);
          });
        })

        describe('for the http endpoint with custom throttling disabled', () => {
          let restEndpointSettings;
          before(() => {
            restEndpointSettings = throttlingSettings.restEndpointSettings.find(e => e.functionName == 'list-items');
          });

          it('maxRequestsPerSecond should be -1', () => {
            expect(restEndpointSettings.maxRequestsPerSecond).to.equal(-1);
          });

          it('maxConcurrentRequests should be -1', () => {
            expect(restEndpointSettings.maxConcurrentRequests).to.equal(-1);
          });
        });
      });

      describe('and one function has defined many http endpoints', () => {
        before(() => {
          serverless = given.aServerlessInstance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.aServerlessFunction('list-items')
              .withRestEndpoint('get', '/items', { maxRequestsPerSecond: 500, maxConcurrentRequests: 200 })
              .withRestEndpoint('get', '/all-items', { maxRequestsPerSecond: 100, maxConcurrentRequests: 50 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should create throttling settings for all endpoint definitions', () => {
          expect(throttlingSettings.restEndpointSettings).to.have.lengthOf(2);
        });

        it('should not create http api throttling settings', () => {
          expect(throttlingSettings.httpApiEndpointSettings).to.have.lengthOf(0);
        });
      });

      describe('and one function has defined many Http API endpoints', () => {
        before(() => {
          serverless = given.aServerlessInstance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.aServerlessFunction('list-items')
              .withHttpApiEndpoint('get', '/items', { maxRequestsPerSecond: 500, maxConcurrentRequests: 200 })
              .withHttpApiEndpoint('get', '/all-items', { maxRequestsPerSecond: 100, maxConcurrentRequests: 50 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should create throttling settings for all endpoint definitions', () => {
          expect(throttlingSettings.httpApiEndpointSettings).to.have.lengthOf(2);
        });

        it('should not create rest endpoint throttling settings', () => {
          expect(throttlingSettings.restEndpointSettings).to.have.lengthOf(0);
        });
      });

      describe('and one function has defined only maxRequestsPerSecond', () => {
        before(() => {
          serverless = given.aServerlessInstance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.aServerlessFunction('list-items')
              .withRestEndpoint('get', '/items', { maxRequestsPerSecond: 500 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should set maxRequestsPerSecond correctly', () => {
          expect(throttlingSettings.restEndpointSettings[0].maxRequestsPerSecond).to.equal(500);
        });

        it('should inherit maxConcurrentRequests from global settings', () => {
          expect(throttlingSettings.restEndpointSettings[0].maxConcurrentRequests).to.equal(globalThrottlingConfig.maxConcurrentRequests);
        });
      });

      describe('and one function has defined only maxConcurrentRequests', () => {
        before(() => {
          serverless = given.aServerlessInstance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.aServerlessFunction('list-items')
              .withRestEndpoint('get', '/items', { maxConcurrentRequests: 500 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should set maxConcurrentRequests correctly', () => {
          expect(throttlingSettings.restEndpointSettings[0].maxConcurrentRequests).to.equal(500);
        });

        it('should inherit maxRequestsPerSecond from global settings', () => {
          expect(throttlingSettings.restEndpointSettings[0].maxRequestsPerSecond).to.equal(globalThrottlingConfig.maxRequestsPerSecond);
        });
      });
    });
  });

  describe('when there are command line options for the deployment', () => {
    let options;
    before(() => {
      serverless = given.aServerlessInstance()
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
    let restEndpointSettings;
    before(() => {
      let endpoint = given.aServerlessFunction('list-items')
        .withRestEndpointInShorthand('get /items');
      serverless = given.aServerlessInstance()
        .withApiGatewayThrottlingConfig()
        .withFunction(endpoint);

      throttlingSettings = createSettingsFor(serverless);
      restEndpointSettings = throttlingSettings.restEndpointSettings.find(e => e.functionName == 'list-items');
    });

    it('maxRequestsPerSecond should be set', () => {
      expect(restEndpointSettings.maxRequestsPerSecond).to.equal(10000);
    });

    it('maxConcurrentRequests should be set', () => {
      expect(restEndpointSettings.maxConcurrentRequests).to.equal(5000);
    });
  });

  describe('when a Http API endpoint is defined in shorthand', () => {
    let httpApiEndpointSettings;
    before(() => {
      let endpoint = given.aServerlessFunction('list-items')
        .withHttpApiEndpointInShorthand('get /items');
      serverless = given.aServerlessInstance()
        .withApiGatewayThrottlingConfig()
        .withFunction(endpoint);

      throttlingSettings = createSettingsFor(serverless);
      httpApiEndpointSettings = throttlingSettings.httpApiEndpointSettings.find(e => e.functionName == 'list-items');
    });

    it('maxRequestsPerSecond should be set', () => {
      expect(httpApiEndpointSettings.maxRequestsPerSecond).to.equal(10000);
    });

    it('maxConcurrentRequests should be set', () => {
      expect(httpApiEndpointSettings.maxConcurrentRequests).to.equal(5000);
    });
  });

  describe('when a http endpoint has throttling specifically disabled', () => {
    let restEndpointSettings;
    before(() => {
      serverless = given.aServerlessInstance()
        .withApiGatewayThrottlingConfig({ maxConcurrentRequests: 100, maxRequestsPerSecond: 200 })
        .withFunction(given.aServerlessFunction('list-items')
          .withRestEndpoint('get', '/items', { disabled: true }));

      throttlingSettings = createSettingsFor(serverless);

      restEndpointSettings = throttlingSettings.restEndpointSettings.find(e => e.functionName == 'list-items');
    });

    it('maxRequestsPerSecond should be set', () => {
      expect(restEndpointSettings.maxRequestsPerSecond).to.equal(-1);
    });

    it('maxConcurrentRequests should be set', () => {
      expect(restEndpointSettings.maxConcurrentRequests).to.equal(-1);
    });
  });

  describe('when a Http API endpoint has throttling specifically disabled', () => {
    let httpApiEndpointSettings;
    before(() => {
      serverless = given.aServerlessInstance()
        .withApiGatewayThrottlingConfig({ maxConcurrentRequests: 100, maxRequestsPerSecond: 200 })
        .withFunction(given.aServerlessFunction('list-items')
          .withHttpApiEndpoint('get', '/items', { disabled: true }));

      throttlingSettings = createSettingsFor(serverless);

      httpApiEndpointSettings = throttlingSettings.httpApiEndpointSettings.find(e => e.functionName == 'list-items');
    });

    it('maxRequestsPerSecond should be set', () => {
      expect(httpApiEndpointSettings.maxRequestsPerSecond).to.equal(-1);
    });

    it('maxConcurrentRequests should be set', () => {
      expect(httpApiEndpointSettings.maxConcurrentRequests).to.equal(-1);
    });
  });
});

const createSettingsFor = (serverless, options) => {
  return new ApiGatewayThrottlingSettings(serverless, options);
}
