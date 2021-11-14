# serverless-api-gateway-throttling

[![CircleCI](https://circleci.com/gh/DianaIonita/serverless-api-gateway-throttling.svg?style=svg)](https://circleci.com/gh/DianaIonita/serverless-api-gateway-throttling)
![npm](https://img.shields.io/npm/v/serverless-api-gateway-throttling.svg)
[![npm downloads](https://img.shields.io/npm/dt/serverless-api-gateway-throttling.svg?style=svg)](https://www.npmjs.com/package/serverless-api-gateway-throttling)

## Intro
A plugin for the Serverless framework which configures throttling for API Gateway endpoints.

## Why?
When you deploy an API to API Gateway, throttling is enabled by default. However, the default method limits – 10,000 requests/second with a burst of 5000 concurrent requests – match your account level limits. As a result, ALL your APIs in the entire region share a rate limit that can be exhausted by a single method. Read more about that [here](https://theburningmonk.com/2019/10/the-api-gateway-security-flaw-you-need-to-pay-attention-to/).

This plugin makes it easy to configure those limits.

## Good to know
- if custom throttling settings are defined for an endpoint with HTTP method `ANY`, the settings will be applied to all methods: `GET`, `DELETE`, `HEAD`, `OPTIONS`, `PATCH`, `POST` and `PUT`.

## How this plugin works
It configures endpoints in the gateway to override the settings they inherit from the stage.
If you need reset all endpoints to inherit their settings from the stage again (as seen [in this issue](https://github.com/DianaIonita/serverless-api-gateway-throttling/issues/16)), you can do this:
```
sls reset-all-endpoint-settings
```

## Examples

```yml
plugins:
  - serverless-api-gateway-throttling

custom:
  # Configures throttling settings for the API Gateway stage
  # They apply to all http endpoints, unless specifically overridden
  apiGatewayThrottling:
    maxRequestsPerSecond: 1000
    maxConcurrentRequests: 500

functions:
  # Throttling settings are inherited from stage settings
  update-item:
    handler: rest_api/item/post/handler.handle
    events:
      - http:
          path: /item
          method: post

  # Requests are throttled using this endpoint's throttling configuration
  list-all-items:
    handler: rest_api/items/get/handler.handle
    events:
      - http:
          path: /items
          method: get
          throttling:
            maxRequestsPerSecond: 2000
            maxConcurrentRequests: 1000

  # Requests are throttled for both endpoints
  get-item:
    handler: rest_api/items/get/handler.handle
    events:
      - http: # throttling settings are inherited from stage settings
          path: /item/{itemId}
          method: get
      - http:
          path: /another/item/{itemId}
          method: get
          throttling:
            maxRequestsPerSecond: 2000
            maxConcurrentRequests: 1000

  # Requests are throttled for both endpoints
  get-blue-item:
    handler: rest_api/items/blue/get/handler.handle
    events:
      - http:
          path: /item/blue/{itemId}
          method: get
          throttling:
            maxRequestsPerSecond: 300
            # maxConcurrentRequests are inherited from stage settings
      - http:
          path: /item/dark-blue/{itemId}
          method: get
          throttling:
            # maxRequestsPerSecond are inherited from stage settings
            maxConcurrentRequests: 300

  # Throttling is disabled for this endpoint
  list-all-items:
    handler: rest_api/items/get/handler.handle
    events:
      - http:
          path: /items
          method: get
          throttling:
            disabled: true
```
