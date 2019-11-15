'use strict';

const given = require('./steps/given');
const ApiGatewayThrottlingSettings = require('../src/ApiGatewayThrottlingSettings');
const expect = require('chai').expect;

describe('Creating settings', () => {
  let throttlingSettings, serverless;

  describe('when the input is invalid', () => {
    it('should not configure throttling', () => {
      throttlingSettings = createSettingsFor();
      expect(throttlingSettings.throttlingEnabled).to.not.exist;
    });
  });

  describe('when there are no settings for API Gateway throttling', () => {
    it('should not configure throttling', () => {
      throttlingSettings = createSettingsFor(given.a_serverless_instance());
      expect(throttlingSettings.throttlingEnabled).to.not.exist;
    });
  });

  describe('when the max requests per second setting is omitted', () => {
    before(() => {
      serverless = given.a_serverless_instance()
        .withApiGatewayThrottlingConfig({ enabled: true, maxConcurrentRequests: 2000 });

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should set whether throttling is enabled', () => {
      expect(throttlingSettings.throttlingEnabled).to.be.true;
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
        .withApiGatewayThrottlingConfig({ enabled: true, maxRequestsPerSecond: 300 });

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should set whether throttling is enabled', () => {
      expect(throttlingSettings.throttlingEnabled).to.be.true;
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
        .withApiGatewayThrottlingConfig({ enabled: true, maxRequestsPerSecond: 400, maxConcurrentRequests: 200 });

      throttlingSettings = createSettingsFor(serverless);
    });

    it('should set whether throttling is enabled', () => {
      expect(throttlingSettings.throttlingEnabled).to.be.true;
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
      enabled: true,
      maxRequestsPerSecond: 2000,
      maxConcurrentRequests: 1000
    };

    describe('and there are functions', () => {
      describe('and none of them are http endpoints', () => {
        before(() => {
          serverless = given.a_serverless_instance()
            .withApiGatewayThrottlingConfig(globalThrottlingConfig)
            .withFunction(given.a_serverless_function('list-cats'))
            .withFunction(given.a_serverless_function('get-cat'));

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
            .withFunction(given.a_serverless_function('count-cats-cron-job'))
            .withFunction(given.a_serverless_function('list-cats')
              .withHttpEndpoint('get', '/cats'))
            .withFunction(given.a_serverless_function('get-cat')
              .withHttpEndpoint('get', '/cat/{catId}', { enabled: false }))
            .withFunction(given.a_serverless_function('update-cat')
              .withHttpEndpoint('post', '/cat/{catId}', { enabled: true }))
            .withFunction(given.a_serverless_function('delete-cat')
              .withHttpEndpoint('delete', '/cat/{catId}', { enabled: true, maxRequestsPerSecond: 500, maxConcurrentRequests: 200 }));

          throttlingSettings = createSettingsFor(serverless);
        });

        it('should create throttling settings for all http endpoints', () => {
          expect(throttlingSettings.endpointSettings).to.have.lengthOf(4);
        });

        it('should not have throttling settings for the function without an http endpoint', () => {
          expect(throttlingSettings.endpointSettings.find(e => e.functionName == 'count-cats-cron-job')).to.not.exist;
        });

        describe('for the http endpoint without throttling settings defined', () => {
          let endpointSettings;
          before(() => {
            endpointSettings = throttlingSettings.endpointSettings.find(e => e.functionName == 'list-cats');
          });

          it('throttling should default to true', () => {
            expect(endpointSettings.throttlingEnabled).to.be.true;
          });

          it('should inherit maxRequestsPerSecond from global settings', () => {
            expect(endpointSettings.maxRequestsPerSecond).to.equal(globalThrottlingConfig.maxRequestsPerSecond);
          });

          it('should inherit maxConcurrentRequests from global settings', () => {
            expect(endpointSettings.maxConcurrentRequests).to.equal(globalThrottlingConfig.maxConcurrentRequests);
          });
        });

        describe('for the http endpoint with throttling disabled', () => {
          let endpointSettings;
          before(() => {
            endpointSettings = throttlingSettings.endpointSettings.find(e => e.functionName == 'get-cat');
          });

          it('throttling should be set to false', () => {
            expect(endpointSettings.throttlingEnabled).to.be.false;
          });
        });

        describe('for the http endpoint with throttling enabled', () => {
          let endpointSettings;
          before(() => {
            endpointSettings = throttlingSettings.endpointSettings.find(e => e.functionName == 'update-cat');
          });

          it('throttling should be set to true', () => {
            expect(endpointSettings.throttlingEnabled).to.be.true;
          });

          it('should inherit maxRequestsPerSecond from global settings', () => {
            expect(endpointSettings.maxRequestsPerSecond).to.equal(globalThrottlingConfig.maxRequestsPerSecond);
          });

          it('should inherit maxConcurrentRequests from global settings', () => {
            expect(endpointSettings.maxConcurrentRequests).to.equal(globalThrottlingConfig.maxConcurrentRequests);
          });
        });

        describe('for the http endpoint with throttling enabled and custom maxRequestsPerSecond and maxConcurrentRequests settings', () => {
          let endpointSettings;
          before(() => {
            endpointSettings = throttlingSettings.endpointSettings.find(e => e.functionName == 'delete-cat');
          });

          it('throttling should be set to true', () => {
            expect(endpointSettings.throttlingEnabled).to.be.true;
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
            .withFunction(given.a_serverless_function('list-cats')
              .withHttpEndpoint('get', '/cats', { enabled: true, maxRequestsPerSecond: 500, maxConcurrentRequests: 200 })
              .withHttpEndpoint('get', '/all-cats', { enabled: true, maxRequestsPerSecond: 100, maxConcurrentRequests: 50 }));

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
        .forStage('devstage')
        .forRegion('eu-west-1')
        .withApiGatewayThrottlingConfig({ enabled: true });
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
    describe(`and throttling is turned on globally`, () => {
      before(() => {
        let endpoint = given.a_serverless_function('list-cats')
          .withHttpEndpointInShorthand('get /cats');
        serverless = given.a_serverless_instance()
          .withApiGatewayThrottlingConfig({ enabled: true })
          .withFunction(endpoint);

        throttlingSettings = createSettingsFor(serverless);
      });

      it('settings should contain the endpoint method', () => {
        expect(throttlingSettings.endpointSettings[0].method).to.equal('get');
      });

      it('settings should contain the endpoint path', () => {
        expect(throttlingSettings.endpointSettings[0].path).to.equal('/cats');
      });

      it('throttling should be enabled for the http endpoint', () => {
        expect(throttlingSettings.endpointSettings[0].throttlingEnabled).to.be.true;
      });
    });
  });
});

const createSettingsFor = (serverless, options) => {
  return new ApiGatewayThrottlingSettings(serverless, options);
}
