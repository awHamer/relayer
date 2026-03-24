import { Module, type DynamicModule, type InjectionToken, type Provider } from '@nestjs/common';
import { isRelayerEntityClass, type RelayerEntityClass } from '@relayerjs/core';

import { RELAYER_BASE_URL, RELAYER_CLIENT, RELAYER_MODULE_OPTIONS } from './constants';
import { getEntityToken, getServiceToken } from './decorators';
import type { EntityClient } from './entity-client';
import { RelayerService } from './relayer.service';
import type { RelayerModuleAsyncOptions, RelayerModuleOptions } from './types';
import { entitiesToRecord, getEntityKey } from './utils';

interface RelayerClient {
  [key: string]: EntityClient;
}

type CreateRelayerDrizzleFn = (options: {
  db: unknown;
  schema: Record<string, unknown>;
  entities: Record<string, RelayerEntityClass>;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
}) => RelayerClient;

@Module({})
export class RelayerModule {
  static forRoot(options: RelayerModuleOptions): DynamicModule {
    const entityMap = entitiesToRecord(options.entities);
    const providers = this.createProviders(options, entityMap);

    return {
      module: RelayerModule,
      global: true,
      providers,
      exports: providers,
    };
  }

  static forRootAsync(options: RelayerModuleAsyncOptions): DynamicModule {
    const asyncProvider: Provider = {
      provide: RELAYER_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: (options.inject ?? []) as InjectionToken[],
    };

    const clientProvider: Provider = {
      provide: RELAYER_CLIENT,
      useFactory: async (moduleOptions: RelayerModuleOptions) => {
        return this.createClient(moduleOptions);
      },
      inject: [RELAYER_MODULE_OPTIONS],
    };

    return {
      module: RelayerModule,
      global: true,
      imports: (options.imports ?? []) as DynamicModule[],
      providers: [asyncProvider, clientProvider],
      exports: [RELAYER_CLIENT],
    };
  }

  static forFeature(entities: RelayerEntityClass[]): DynamicModule {
    const providers: Provider[] = [];

    for (const entity of entities.filter(isRelayerEntityClass)) {
      const entityToken = getEntityToken(entity);
      const serviceToken = getServiceToken(entity);
      const key = getEntityKey(entity);

      providers.push({
        provide: entityToken,
        useFactory: (client: RelayerClient) => client[key],
        inject: [RELAYER_CLIENT],
      });

      providers.push({
        provide: serviceToken,
        useFactory: (client: RelayerClient) => new RelayerService(client[key]!),
        inject: [RELAYER_CLIENT],
      });
    }

    return {
      module: RelayerModule,
      providers,
      exports: providers,
    };
  }

  private static createProviders(
    options: RelayerModuleOptions,
    entityMap: Record<string, RelayerEntityClass>,
  ): Provider[] {
    const clientProvider: Provider = {
      provide: RELAYER_CLIENT,
      useFactory: async () => this.createClient(options),
    };

    const entityProviders: Provider[] = [];

    for (const [key, entity] of Object.entries(entityMap)) {
      if (!isRelayerEntityClass(entity)) continue;

      entityProviders.push({
        provide: getEntityToken(entity),
        useFactory: (client: RelayerClient) => client[key],
        inject: [RELAYER_CLIENT],
      });

      entityProviders.push({
        provide: getServiceToken(entity),
        useFactory: (client: RelayerClient) => new RelayerService(client[key]!),
        inject: [RELAYER_CLIENT],
      });
    }

    const baseUrlProvider: Provider = {
      provide: RELAYER_BASE_URL,
      useValue: options.baseUrl ?? '',
    };

    return [clientProvider, baseUrlProvider, ...entityProviders];
  }

  private static async createClient(options: RelayerModuleOptions): Promise<RelayerClient> {
    try {
      const drizzleModule = await import('@relayerjs/drizzle');
      const entityMap = entitiesToRecord(
        options.entities as Parameters<typeof entitiesToRecord>[0],
      );
      const createFn = drizzleModule.createRelayerDrizzle as unknown as CreateRelayerDrizzleFn;
      return createFn({
        db: options.db,
        schema: options.schema,
        entities: entityMap,
        maxRelationDepth: options.maxRelationDepth,
        defaultRelationLimit: options.defaultRelationLimit,
      });
    } catch {
      throw new Error('@relayerjs/drizzle is required as a peer dependency for RelayerModule');
    }
  }
}
