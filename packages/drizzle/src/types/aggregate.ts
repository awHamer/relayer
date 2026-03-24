import type { NumberOperators, TypeAtPath } from '@relayerjs/core';

import type { EntityWithRelations, ModelDotPaths } from './helpers';
import type { ModelWhere } from './where';

// Paths resolving to summable types (includes string for PG numeric/decimal -> TS string)
type SummableDotPaths<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> =
  ModelDotPaths<TSchema, TEntities, TKey> extends infer P extends string
    ? P extends unknown
      ? NonNullable<TypeAtPath<EntityWithRelations<TSchema, TEntities, TKey>, P>> extends
          | string
          | number
          | bigint
        ? P
        : never
      : never
    : never;

export interface ModelAggregateOptions<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> {
  where?: ModelWhere<TSchema, TEntities, TKey>;
  groupBy?: readonly ModelDotPaths<TSchema, TEntities, TKey>[];
  _count?: boolean;
  _sum?: Partial<Record<SummableDotPaths<TSchema, TEntities, TKey>, boolean>>;
  _avg?: Partial<Record<SummableDotPaths<TSchema, TEntities, TKey>, boolean>>;
  _min?: Partial<Record<ModelDotPaths<TSchema, TEntities, TKey>, boolean>>;
  _max?: Partial<Record<ModelDotPaths<TSchema, TEntities, TKey>, boolean>>;
  having?: AggregateHaving;
}

export interface AggregateHaving {
  _count?: number | NumberOperators;
  [key: string]: number | NumberOperators | undefined;
}
