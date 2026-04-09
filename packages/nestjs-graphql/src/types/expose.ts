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

export interface ExposeQueriesConfig {
  list?: boolean | ListQueryConfig;
  findById?: boolean | QueryOpConfig;
  count?: boolean | QueryOpConfig;
  aggregate?: boolean | QueryOpConfig;
}

export interface ExposeMutationsConfig {
  createOne?: boolean | MutationOpConfig;
  createMany?: boolean | MutationOpConfig;
  updateOne?: boolean | MutationOpConfig;
  updateMany?: boolean | MutationOpConfig;
  deleteOne?: boolean | MutationOpConfig;
  deleteMany?: boolean | MutationOpConfig;
}

export interface ExposeFieldsConfig {
  include?: readonly string[];
  exclude?: readonly string[];
}

export interface ExposeConfig {
  queries?: ExposeQueriesConfig;
  mutations?: ExposeMutationsConfig;
  fields?: ExposeFieldsConfig;
  filterable?: readonly string[];
  orderable?: readonly string[];
}
