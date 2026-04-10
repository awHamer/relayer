import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { isRelayerEntityClass, type RelayerEntityClass } from '@relayerjs/core';
import {
  entitiesToRecord,
  getEntityToken,
  getServiceToken,
  RELAYER_CLIENT,
  RelayerService,
  type RelayerInstance,
} from '@relayerjs/nestjs-common';

interface RelayerClient {
  [key: string]: unknown;
}

type CreateRelayerDrizzleFn = (options: {
  db: unknown;
  schema: Record<string, unknown>;
  entities: Record<string, RelayerEntityClass>;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
}) => RelayerClient;

export interface RelayerGraphqlModuleOptions {
  db: unknown;
  schema: Record<string, unknown>;
  entities: RelayerEntityClass[];
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
  graphql?: Record<string, unknown>;
}

@Module({})
export class RelayerGraphqlModule {
  static forRoot(options: RelayerGraphqlModuleOptions): DynamicModule {
    const entityMap = entitiesToRecord(options.entities);

    const clientProvider: Provider = {
      provide: RELAYER_CLIENT,
      useFactory: async () => this.createClient(options, entityMap),
    };

    const entityProviders = this.buildEntityProviders(entityMap);
    const graphqlModule = this.buildGraphqlModule(options.graphql);

    return {
      module: RelayerGraphqlModule,
      global: true,
      imports: [graphqlModule],
      providers: [clientProvider, ...entityProviders],
      exports: [RELAYER_CLIENT, ...entityProviders],
    };
  }

  private static buildEntityProviders(entityMap: Record<string, RelayerEntityClass>): Provider[] {
    const providers: Provider[] = [];

    for (const [key, entity] of Object.entries(entityMap)) {
      if (!isRelayerEntityClass(entity)) continue;

      providers.push({
        provide: getEntityToken(entity),
        useFactory: (client: RelayerClient) => client[key],
        inject: [RELAYER_CLIENT],
      });

      providers.push({
        provide: getServiceToken(entity),
        useFactory: (client: RelayerInstance<Record<string, unknown>>) =>
          new RelayerService(client, key),
        inject: [RELAYER_CLIENT],
      });
    }

    return providers;
  }

  private static async buildGraphqlModule(
    overrides?: Record<string, unknown>,
  ): Promise<DynamicModule> {
    const { ApolloDriver } = await import('@nestjs/apollo');
    const { GraphQLModule } = await import('@nestjs/graphql');

    return GraphQLModule.forRoot({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      context: (ctx: { req: unknown }) => ({ req: ctx.req }),
      ...overrides,
    });
  }

  private static async createClient(
    options: RelayerGraphqlModuleOptions,
    entityMap: Record<string, RelayerEntityClass>,
  ): Promise<RelayerClient> {
    const drizzleModule = await import('@relayerjs/drizzle');
    const createFn = drizzleModule.createRelayerDrizzle as unknown as CreateRelayerDrizzleFn;
    return createFn({
      db: options.db,
      schema: options.schema,
      entities: entityMap,
      maxRelationDepth: options.maxRelationDepth,
      defaultRelationLimit: options.defaultRelationLimit,
    });
  }
}
