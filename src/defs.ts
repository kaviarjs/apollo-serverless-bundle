import { Config, CreateHandlerOptions } from "apollo-server-lambda";

export interface IApolloServerlessBundleConfig {
  apollo: Config;
  handlerOptions: CreateHandlerOptions;
}
