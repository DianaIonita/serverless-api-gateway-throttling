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
        .withApiGatewayThrottlingConfig({ throttlingEnabled: true, maxConcurrentRequests: 2000 });

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
        .withApiGatewayThrottlingConfig({ throttlingEnabled: true, maxRequestsPerSecond: 300 });

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
        .withApiGatewayThrottlingConfig({ throttlingEnabled: true, maxRequestsPerSecond: 400, maxConcurrentRequests: 200 });

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
});

const createSettingsFor = (serverless, options) => {
  return new ApiGatewayThrottlingSettings(serverless, options);
}
