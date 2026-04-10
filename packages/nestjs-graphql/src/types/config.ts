import type { EntityModelFromInstance } from '@relayerjs/drizzle';
import type { RelayerHooks } from '@relayerjs/nestjs-common';

export type PaginationMode = 'offset' | 'cursor' | 'both';

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
  hooks?: new (...args: never[]) => RelayerHooks<TEntity, EM>;
  idField?: string;
  idType?: 'number' | 'string';
}

export interface ResolvedResolverMetadata {
  entityClass: unknown;
  config: GqlResolverConfig;
}
