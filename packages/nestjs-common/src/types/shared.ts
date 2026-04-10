import type { RelayerEntityClass } from '@relayerjs/core';

import type { Model } from './entity-repo';

export type RelationOperation = 'connect' | 'disconnect' | 'set';

export type RelationId = string | number | ({ _id: string | number } & Record<string, unknown>);

export type RelationKeys<TEntity, TEntities extends Record<string, unknown>> = {
  [K in keyof Model<TEntity, TEntities> & string]: NonNullable<
    Model<TEntity, TEntities>[K]
  > extends (infer Item)[]
    ? Item extends Record<string, unknown>
      ? K
      : never
    : NonNullable<Model<TEntity, TEntities>[K]> extends Record<string, unknown>
      ? NonNullable<Model<TEntity, TEntities>[K]> extends Date
        ? never
        : K
      : never;
}[keyof Model<TEntity, TEntities> & string];

export interface ZodLike {
  parse(data: unknown): unknown;
  safeParse?(data: unknown): { success: boolean; error?: { errors: unknown[] }; data?: unknown };
}

export interface RelayerModuleOptions {
  db: unknown;
  schema: Record<string, unknown>;
  entities: RelayerEntityClass[] | Record<string, RelayerEntityClass>;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
  baseUrl?: string | (() => string);
  envelope?: boolean;
}

export interface RelayerModuleAsyncOptions {
  imports?: unknown[];
  inject?: unknown[];
  useFactory: (...args: unknown[]) => Promise<RelayerModuleOptions> | RelayerModuleOptions;
}
