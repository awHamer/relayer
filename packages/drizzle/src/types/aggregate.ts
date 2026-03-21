import type { NumberOperators } from '@relayerjs/core';

import type { ModelDotPaths } from './helpers';
import type { ModelWhere } from './where';

export interface ModelAggregateOptions<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> {
  where?: ModelWhere<TSchema, TEntities, TKey>;
  groupBy?: ModelDotPaths<TSchema, TEntities, TKey>[];
  _count?: boolean;
  _sum?: Partial<Record<ModelDotPaths<TSchema, TEntities, TKey>, boolean>>;
  _avg?: Partial<Record<ModelDotPaths<TSchema, TEntities, TKey>, boolean>>;
  _min?: Partial<Record<ModelDotPaths<TSchema, TEntities, TKey>, boolean>>;
  _max?: Partial<Record<ModelDotPaths<TSchema, TEntities, TKey>, boolean>>;
  having?: AggregateHaving;
}

export interface AggregateHaving {
  _count?: number | NumberOperators;
  [key: string]: number | NumberOperators | undefined;
}
