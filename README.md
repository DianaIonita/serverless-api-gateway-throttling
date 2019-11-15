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
    enabled: true # enables or disables throttling globally.
    maxRequestsPerSecond: 1000
    maxConcurrentRequests: 500

functions:
  # Requests are throttled using globally defined settings
  update-cat:
    handler: rest_api/cat/post/handler.handle
    events:
      - http:
          path: /cat
          method: post

  # Responses are throttled using this endpoint's throttling configuration
  list-all-cats:
    handler: rest_api/cats/get/handler.handle
    events:
      - http:
          path: /cats
          method: get
          throttling:
            maxRequestsPerSecond: 2000
            maxConcurrentRequests: 1000

  # You can configure throttling for each http event
  get-cat:
    handler: rest_api/cats/get/handler.handle
    events:
      - http:
          path: /cat/paw/{pawId}
          method: get
          throttling:
            enabled: false # defaults to "true". Enables or disables throttling for this event.
      - http:
          path: /cat/{catId}
          method: get
          throttling:
            maxRequestsPerSecond: 2000
            maxConcurrentRequests: 1000
```
