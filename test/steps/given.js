'use strict';

const Serverless = require('../model/Serverless');
const ServerlessFunction = require('../model/ServerlessFunction');
const chance = require('chance').Chance();

const a_serverless_instance = (serviceName) => {
  return new Serverless(serviceName);
}

const a_serverless_function = name => {
  return new ServerlessFunction(name);
}

const a_rest_api_id = () => {
  return chance.guid();
}

module.exports = {
  a_serverless_instance,
  a_serverless_function,
  a_rest_api_id
}
