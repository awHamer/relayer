import type { ModelDotPaths } from './helpers';

export interface ModelOrderBy<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> {
  field: ModelDotPaths<TSchema, TEntities, TKey>;
  order: 'asc' | 'desc';
}
