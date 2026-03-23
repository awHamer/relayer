import { Module, type DynamicModule, type InjectionToken, type Provider } from '@nestjs/common';
import { isRelayerEntityClass } from '@relayerjs/core';

import { RELAYER_BASE_URL, RELAYER_CLIENT, RELAYER_MODULE_OPTIONS } from './constants';
import { getEntityToken, getServiceToken } from './decorators';
import { RelayerService } from './relayer.service';
import type { EntityClient } from './relayer.service';
import type { RelayerModuleAsyncOptions, RelayerModuleOptions } from './types';
import { entitiesToRecord } from './utils';

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

  static forFeature(entities: (new (...args: unknown[]) => unknown)[]): DynamicModule {
    const providers: Provider[] = [];

    for (const entity of entities.filter(isRelayerEntityClass)) {
      const entityToken = getEntityToken(entity);
      const serviceToken = getServiceToken(entity);
      const key = (entity as unknown as { __entityKey: string }).__entityKey;

      providers.push({
        provide: entityToken,
        useFactory: (client: Record<string, unknown>) => client[key],
        inject: [RELAYER_CLIENT],
      });

      providers.push({
        provide: serviceToken,
        useFactory: (client: Record<string, unknown>) =>
          new RelayerService(client[key] as EntityClient),
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
    entityMap: Record<string, unknown>,
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
        useFactory: (client: Record<string, unknown>) => client[key],
        inject: [RELAYER_CLIENT],
      });

      entityProviders.push({
        provide: getServiceToken(entity),
        useFactory: (client: Record<string, unknown>) =>
          new RelayerService(client[key] as EntityClient),
        inject: [RELAYER_CLIENT],
      });
    }

    const baseUrlProvider: Provider = {
      provide: RELAYER_BASE_URL,
      useValue: options.baseUrl ?? '',
    };

    return [clientProvider, baseUrlProvider, ...entityProviders];
  }

  private static async createClient(options: RelayerModuleOptions): Promise<unknown> {
    try {
      const drizzleModule = await import('@relayerjs/drizzle');
      const entityMap = entitiesToRecord(
        options.entities as Parameters<typeof entitiesToRecord>[0],
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (drizzleModule.createRelayerDrizzle as any)({
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
