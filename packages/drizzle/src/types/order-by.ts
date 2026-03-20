import type { ModelDotPaths } from './helpers';

export type ModelOrderByField<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> = ModelDotPaths<TSchema, TEntities, TKey>;

export interface ModelOrderBy<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> {
  field: ModelDotPaths<TSchema, TEntities, TKey>;
  order: 'asc' | 'desc';
}
