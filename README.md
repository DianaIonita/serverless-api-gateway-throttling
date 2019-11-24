# serverless-api-gateway-throttling

[![CircleCI](https://circleci.com/gh/DianaIonita/serverless-api-gateway-throttling.svg?style=svg)](https://circleci.com/gh/DianaIonita/serverless-api-gateway-throttling)

## Intro
A plugin for the Serverless framework which configures throttling for API Gateway endpoints.

## Why?
When you deploy an API to API Gateway, throttling is enabled by default in the stage configurations. However, the default method limits – 10k req/s with a burst of 5000 concurrent requests – matches your account level limits. As a result, ALL your APIs in the entire region share a rate limit that can be exhausted by a single method. Read more about that [here](https://theburningmonk.com/2019/10/the-api-gateway-security-flaw-you-need-to-pay-attention-to/).
This plugin makes it easy to configure those limits.

## Good to know
- if custom throttling settings are defined for an endpoint with HTTP method `ANY`, the settings will be applied to all methods: `GET`, `DELETE`, `HEAD`, `OPTIONS`, `PATCH`, `POST`, `PUT`

## Examples

```yml
plugins:
  - serverless-api-gateway-throttling

custom:
  # Configures throttling settings for all http endpoints
  apiGatewayThrottling:
    maxRequestsPerSecond: 1000
    maxConcurrentRequests: 500

functions:
  # Throttling settings are inherited from global settings
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
      - http: # throttling settings are inherited from global settings
          path: /item/{itemId}
          method: get
      - http:
          path: /another/item/{itemId}
          method: get
          throttling:
            maxRequestsPerSecond: 2000
            maxConcurrentRequests: 1000
```
