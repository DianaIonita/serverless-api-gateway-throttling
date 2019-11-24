'use strict';

const Serverless = require('../model/Serverless');
const ServerlessFunction = require('../model/ServerlessFunction');
const chance = require('chance').Chance();

const a_serverless_instance = () => {
  return new Serverless();
}

const a_serverless_function = name => {
  return new ServerlessFunction(name);
}

const a_rest_api_id = () => {
  return chance.guid();
}

const a_deployed_rest_api_id = async (serverless, { stage, region } = {}) => {
  const restApiId = a_rest_api_id();
  serverless.setDeployedRestApiId(restApiId, { stage, region });

  return restApiId;
}

const functions_with_custom_throttling_configuration = (endpointCount, throttlingConfiguration) => {
  let result = [];
  for (let i = 0; i < endpointCount; i++) {
    result.push(
      a_serverless_function(chance.word())
        .withHttpEndpoint('GET', `/${chance.word()}`, throttlingConfiguration));
  }
  return result;
}

module.exports = {
  a_serverless_instance,
  a_serverless_function,
  a_rest_api_id,
  a_deployed_rest_api_id,
  functions_with_custom_throttling_configuration
}
