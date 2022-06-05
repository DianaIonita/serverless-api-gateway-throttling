'use strict';

const isEmpty = require('lodash.isempty');
const { updateRestApi } = require('./updateRestApiStageThrottling');
const { updateHttpApi } = require('./updateHttpApiStageThrottling');

const updateStageThrottling = async (serverless, settings) => {
  if (isEmpty(settings)) {
    return;
  }

  await updateRestApi(settings, serverless);
  await updateHttpApi(settings, serverless);
}

module.exports = updateStageThrottling;
