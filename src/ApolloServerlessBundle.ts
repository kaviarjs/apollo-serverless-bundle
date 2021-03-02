import {
  Bundle,
  KernelAfterInitEvent,
  EventManager,
  Kernel,
} from "@kaviar/core";
import { Loader } from "@kaviar/graphql-bundle";
import { ApolloServer, Config } from "apollo-server-lambda";
import { LoggerService } from "@kaviar/logger-bundle";
import { IApolloServerlessBundleConfig } from "./defs";

export class ApolloServerlessBundle extends Bundle<
  IApolloServerlessBundleConfig
> {
  defaultConfig = {
    handlerOptions: {
      cors: {
        origin: "*",
        credentials: true,
      },
    },
  };

  public server: ApolloServer;
  protected logger: LoggerService;

  async validate(config) {
    const keys = Object.keys(config.apollo);
    if (
      keys.includes("typeDefs") ||
      keys.includes("schemaDirectives") ||
      keys.includes("resolvers") ||
      keys.includes("subscriptions")
    ) {
      throw new Error(
        `You have to use the 'Loader' if you wish to load these into the API`
      );
    }
  }

  async hook() {
    const manager = this.container.get(EventManager);

    manager.addListener(KernelAfterInitEvent, () => {
      this.server = new ApolloServer(this.getApolloConfig());
    });
  }

  async init() {
    this.logger = this.container.get(LoggerService);
  }

  /**
   * Returns the GraphQL handler with the proper options set.
   * You'll have to use: exports.graphqlHandler = server.createHandler();
   */
  public createHandler() {
    if (!this.server) {
      throw new Error(
        `The server hasn't been initialised yet. Ensure you run this after awaiting kernel.init().`
      );
    }

    return this.server.createHandler(this.config.handlerOptions);
  }

  /**
   * Returns the ApolloConfiguration for ApolloServer
   */
  protected getApolloConfig(): Config {
    const loader = this.get<Loader>(Loader);

    loader.load({
      typeDefs: `
        type Query { framework: String }
      `,
      resolvers: {
        Query: {
          framework: () => "Kaviar",
        },
      },
    });

    const {
      typeDefs,
      resolvers,
      schemaDirectives,
      contextReducers,
    } = loader.getSchema();

    return Object.assign(
      {
        cors: true,
        formatError: (e) => {
          this.logger.error(JSON.stringify(e, null, 4));

          return {
            message: e.message,
            path: e.path,
          };
        },
      },
      {
        typeDefs,
        resolvers,
        schemaDirectives,
        context: this.createContext([
          ({ event, context }) => {
            return {
              headers: event.headers,
              lambda: {
                functionName: context.functionName,
                event,
                context,
              },
            };
          },
          contextReducers,
        ]),
      }
    );
  }

  /**
   * Creates the function for handling GraphQL contexts
   */
  protected createContext(contextReducers = []) {
    const contextHandler = async (context) => {
      try {
        context = await this.applyContextReducers(context, contextReducers);
      } catch (e) {
        console.error(e);
      }

      return context;
    };

    return contextHandler;
  }

  /**
   * Applies reducing of context
   */
  protected async applyContextReducers(context: any, reducers: any) {
    context.container = this.container;

    for (const reducer of reducers) {
      try {
        context = await reducer(context);
      } catch (e) {
        console.error(`Error found in context reducers: `, e);
        throw e;
      }
    }

    return context;
  }
}
