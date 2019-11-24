# serverless-api-gateway-throttling

[![CircleCI](https://circleci.com/gh/DianaIonita/serverless-api-gateway-throttling.svg?style=svg)](https://circleci.com/gh/DianaIonita/serverless-api-gateway-throttling)

## Intro
A plugin for the Serverless framework which configures throttling for API Gateway endpoints.

## Example

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

  # Responses are throttled using this endpoint's throttling configuration
  list-all-items:
    handler: rest_api/items/get/handler.handle
    events:
      - http:
          path: /items
          method: get
          throttling:
            maxRequestsPerSecond: 2000
            maxConcurrentRequests: 1000
```
