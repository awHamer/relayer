import { Inject, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { RelayerHooks, RelayerService } from '@relayerjs/nestjs-common';

import { RELAYER_GQL_RESOLVER_METADATA } from './constants';
import type { GqlContext, GqlResolverConfig, ResolvedResolverMetadata } from './types';

export class RelayerResolver<
  TEntity,
  EM extends Record<string, unknown> = Record<string, unknown>,
  TCtx extends GqlContext = GqlContext,
  TQueryCtx = unknown,
> implements OnModuleInit {
  @Inject(ModuleRef)
  private moduleRef!: ModuleRef;

  private resolvedHooks: RelayerHooks<TEntity, EM> | null = null;
  private hooksResolved = false;

  constructor(protected readonly service: RelayerService<TEntity, EM, TQueryCtx>) {}

  onModuleInit(): void {
    const config = this.getConfig();
    if (!config?.hooks) return;
    try {
      this.resolvedHooks = this.moduleRef.get(config.hooks, { strict: false });
    } catch {
      this.resolvedHooks = new config.hooks() as RelayerHooks<TEntity, EM>;
    }
    this.hooksResolved = true;
  }

  protected getConfig(): GqlResolverConfig {
    const meta = Reflect.getMetadata(RELAYER_GQL_RESOLVER_METADATA, this.constructor) as
      | ResolvedResolverMetadata
      | undefined;
    return meta?.config ?? {};
  }

  protected getEntityClass(): unknown {
    const meta = Reflect.getMetadata(RELAYER_GQL_RESOLVER_METADATA, this.constructor) as
      | ResolvedResolverMetadata
      | undefined;
    return meta?.entityClass;
  }

  protected getService(): RelayerService<TEntity, EM, TQueryCtx> {
    return this.service;
  }

  protected getHooks(): RelayerHooks<TEntity, EM> | null {
    return this.hooksResolved ? this.resolvedHooks : null;
  }

  protected buildContext(req: unknown): TCtx {
    return { request: req } as TCtx;
  }

  protected buildQueryContext(_ctx: TCtx): TQueryCtx | undefined {
    return undefined;
  }
}
