import type { EntityModelFromInstance } from '@relayerjs/drizzle';
import type { RelayerHooks } from '@relayerjs/nestjs-common';

export const Pagination = {
  Offset: 'offset',
  Cursor: 'cursor',
  CursorEdges: 'cursor-edges',
} as const;

export type PaginationMode = (typeof Pagination)[keyof typeof Pagination];

export interface QueryOpConfig {
  name?: string;
}

export interface ListQueryConfig extends QueryOpConfig {
  pagination?: PaginationMode;
}

export interface MutationOpConfig {
  name?: string;
}

export interface QueriesConfig {
  list?: boolean | ListQueryConfig;
  findById?: boolean | QueryOpConfig;
  count?: boolean | QueryOpConfig;
  aggregate?: boolean | QueryOpConfig;
}

export interface MutationsConfig {
  createOne?: boolean | MutationOpConfig;
  createMany?: boolean | MutationOpConfig;
  updateOne?: boolean | MutationOpConfig;
  updateMany?: boolean | MutationOpConfig;
  deleteOne?: boolean | MutationOpConfig;
  deleteMany?: boolean | MutationOpConfig;
}

type ModelKeys<TEntity, EM extends Record<string, unknown>> = keyof EntityModelFromInstance<
  TEntity,
  EM
> &
  string;

export interface FieldsConfig<TKeys extends string = string> {
  include?: readonly TKeys[];
  exclude?: readonly TKeys[];
}

export interface RelationMutationConfig {
  add?: boolean;
  remove?: boolean;
  set?: boolean;
  /** Extra pivot table columns to expose in the relation input type. */
  include?: readonly string[];
}

export interface GqlResolverConfig<
  TEntity = unknown,
  EM extends Record<string, unknown> = Record<string, unknown>,
> {
  name?: string;
  queries?: QueriesConfig;
  mutations?: MutationsConfig;
  fields?: FieldsConfig<ModelKeys<TEntity, EM>>;
  filterable?: readonly ModelKeys<TEntity, EM>[];
  orderable?: readonly ModelKeys<TEntity, EM>[];
  relations?: Record<string, boolean | RelationMutationConfig>;
  hooks?: new (...args: never[]) => RelayerHooks<TEntity, EM>;
  idField?: string;
  idType?: 'number' | 'string';
}

export interface ResolvedResolverMetadata {
  entityClass: unknown;
  config: GqlResolverConfig;
}
