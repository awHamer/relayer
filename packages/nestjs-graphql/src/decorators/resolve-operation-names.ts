import type { GqlResolverConfig } from '../types';

export interface QueryNames {
  list?: string;
  listConnection?: string;
  findById?: string;
  count?: string;
  aggregate?: string;
}

export interface MutationNames {
  createOne?: string;
  updateOne?: string;
  deleteOne?: string;
}

export interface ResolvedOperationNames {
  queries: QueryNames;
  mutations: MutationNames;
}

const DEFAULT_QUERIES = { list: true, findById: true, count: true, aggregate: true } as const;
const DEFAULT_MUTATIONS = { createOne: true, updateOne: true, deleteOne: true } as const;

export function resolveOperationNames<T, EM extends Record<string, unknown>>(
  gqlName: string,
  config: GqlResolverConfig<T, EM>,
): ResolvedOperationNames {
  const queries: QueryNames = {};
  const mutations: MutationNames = {};
  const queryDefaults = config.queries ?? DEFAULT_QUERIES;
  const mutationDefaults = config.mutations ?? DEFAULT_MUTATIONS;

  const baseLower = gqlName.charAt(0).toLowerCase() + gqlName.slice(1);
  const plural = baseLower.endsWith('s') ? baseLower : `${baseLower}s`;

  if (queryDefaults.list !== false) {
    const listConfig = typeof queryDefaults.list === 'object' ? queryDefaults.list : {};
    const pagination = listConfig.pagination ?? 'cursor';
    const baseName = listConfig.name ?? plural;
    if (pagination === 'cursor' || pagination === 'both') {
      queries.listConnection = baseName;
    }
    if (pagination === 'offset' || pagination === 'both') {
      queries.list = pagination === 'both' ? `${baseName}Offset` : baseName;
    }
  }
  if (queryDefaults.findById !== false) {
    const cfg = typeof queryDefaults.findById === 'object' ? queryDefaults.findById : {};
    queries.findById = cfg.name ?? baseLower;
  }
  if (queryDefaults.count !== false) {
    const cfg = typeof queryDefaults.count === 'object' ? queryDefaults.count : {};
    queries.count = cfg.name ?? `${plural}Count`;
  }
  if (queryDefaults.aggregate !== false) {
    const cfg = typeof queryDefaults.aggregate === 'object' ? queryDefaults.aggregate : {};
    queries.aggregate = cfg.name ?? `${plural}Aggregate`;
  }

  if (mutationDefaults.createOne !== false) {
    const cfg = typeof mutationDefaults.createOne === 'object' ? mutationDefaults.createOne : {};
    mutations.createOne = cfg.name ?? `create${gqlName}`;
  }
  if (mutationDefaults.updateOne !== false) {
    const cfg = typeof mutationDefaults.updateOne === 'object' ? mutationDefaults.updateOne : {};
    mutations.updateOne = cfg.name ?? `update${gqlName}`;
  }
  if (mutationDefaults.deleteOne !== false) {
    const cfg = typeof mutationDefaults.deleteOne === 'object' ? mutationDefaults.deleteOne : {};
    mutations.deleteOne = cfg.name ?? `delete${gqlName}`;
  }

  return { queries, mutations };
}
