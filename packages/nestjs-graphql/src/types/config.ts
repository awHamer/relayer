import type { RelayerHooks } from '@relayerjs/nestjs-crud';

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

// todo: improve types
export interface FieldsConfig {
  include?: readonly string[];
  exclude?: readonly string[];
}

export interface GqlResolverConfig<
  TEntity = unknown,
  EM extends Record<string, unknown> = Record<string, unknown>,
> {
  name?: string;
  queries?: QueriesConfig;
  mutations?: MutationsConfig;
  fields?: FieldsConfig;
  filterable?: readonly string[]; // todo: implement, improve types
  orderable?: readonly string[]; // todo: implement, improve types
  hooks?: new (...args: never[]) => RelayerHooks<TEntity, EM>;
  idField?: string;
  idType?: 'number' | 'string';
}

export interface ResolvedResolverMetadata {
  entityClass: unknown;
  config: GqlResolverConfig;
}
