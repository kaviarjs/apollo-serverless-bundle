ApolloBundle quickly bootstraps an Apollo Server within Kaviar's framework. It injects the `container` inside the context and allows you to easily create server-side routes.

## Usage

```typescript title="src/startup/index.ts"
import { Kernel } from "@kaviar/core";
import { ApolloLambdaBundle } from "@kaviar/apollo-bundle";

const kernel = new Kernel({
  bundles: [
    new ApolloLambdaBundle({
      // https://www.apollographql.com/docs/apollo-server/api/apollo-server/#options
      apollo: {},
      handlerOptions: {},
    }),
    // Here you load your GQL thingies
    new AppBundle(),
  ],
});

await kernel.init();

const bundle = kernel.container.get(ApolloLambdaBundle);
exports.handler = bundle.createHandler();
```

## Transitioning from ApolloBundle

The `ApolloBundle` uses express and has more features: middlewares, routes. However, if you don't use that functionality

## Deploy with Serverless

```yml
# serverless.yml
org: theodordiaconu
app: dummy
service: logistics
provider:
  name: aws
  runtime: nodejs14.x
functions:
  graphql:
    # this is formatted as <FILENAME>.<HANDLER>
    handler: dist/startup/index.handler
    events:
      - http:
          path: graphql
          method: post
          cors: true
      - http:
          path: graphql
          method: get
          cors: true
```
