'use strict';

const Serverless = require('../model/Serverless');
const ServerlessFunction = require('../model/ServerlessFunction');
const chance = require('chance').Chance();

const aServerlessInstance = () => {
  return new Serverless();
}

const aServerlessFunction = name => {
  return new ServerlessFunction(name);
}

const aRestApiId = () => {
  return chance.guid();
}

const aDeployedRestApiId = (serverless, { stage, region } = {}) => {
  const restApiId = aRestApiId();
  serverless.setDeployedRestApiId(restApiId, { stage, region });

  return restApiId;
}

const theRestApiIdIsNotSetForDeployment = (serverless, settings) => {
  serverless.setDeployedRestApiId(undefined, settings);
}

const aHttpApiId = () => {
  return chance.guid();
}

const aDeployedHttpApiId = (serverless, { stage, region } = {}) => {
  const httpApiId = aHttpApiId();
  serverless.setDeployedHttpApiId(httpApiId, { stage, region });

  return httpApiId;
}

const theHttpApiIdIsNotSetForDeployment = (serverless, settings) => {
  serverless.setDeployedHttpApiId(undefined, settings);
}

const functionsWithCustomThrottlingConfiguration = (endpointCount, throttlingConfiguration) => {
  let result = [];
  for (let i = 0; i < endpointCount; i++) {
    result.push(
      aServerlessFunction(chance.word())
        .withRestEndpoint('GET', `/${chance.word()}`, throttlingConfiguration));
  }
  return result;
}

module.exports = {
  aServerlessInstance,
  aServerlessFunction,
  aRestApiId,
  aDeployedRestApiId,
  theRestApiIdIsNotSetForDeployment,
  aHttpApiId,
  aDeployedHttpApiId,
  theHttpApiIdIsNotSetForDeployment,
  functionsWithCustomThrottlingConfiguration
}
