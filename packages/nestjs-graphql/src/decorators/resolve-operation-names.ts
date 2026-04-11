import type { GqlResolverConfig } from '../types';
import { Pagination } from '../types';
import { lowerFirst, upperFirst } from '../utils';

export interface QueryNames {
  listOffset?: string;
  listCursor?: string;
  listCursorEdges?: string;
  findById?: string;
  count?: string;
  aggregate?: string;
}

export interface MutationNames {
  createOne?: string;
  updateOne?: string;
  deleteOne?: string;
}

export interface RelationMutationNames {
  add?: string;
  remove?: string;
  set?: string;
}

export interface ResolvedOperationNames {
  queries: QueryNames;
  mutations: MutationNames;
  relations: Record<string, RelationMutationNames>;
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

  const baseLower = lowerFirst(gqlName);
  const plural = baseLower.endsWith('s') ? baseLower : `${baseLower}s`;

  if (queryDefaults.list !== false) {
    const listConfig = typeof queryDefaults.list === 'object' ? queryDefaults.list : {};
    const pagination = listConfig.pagination ?? Pagination.Cursor;
    const baseName = listConfig.name ?? plural;
    if (pagination === Pagination.Offset) queries.listOffset = baseName;
    else if (pagination === Pagination.Cursor) queries.listCursor = baseName;
    else if (pagination === Pagination.CursorEdges) queries.listCursorEdges = baseName;
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

  const relations: Record<string, RelationMutationNames> = {};
  if (config.relations) {
    for (const [relName, relConfig] of Object.entries(config.relations)) {
      if (relConfig === false) continue;
      const ops =
        typeof relConfig === 'object' ? relConfig : { add: true, remove: true, set: true };
      const capRelation = upperFirst(relName);
      const names: RelationMutationNames = {};
      if (ops.add !== false) names.add = `add${capRelation}To${gqlName}`;
      if (ops.remove !== false) names.remove = `remove${capRelation}From${gqlName}`;
      if (ops.set !== false) names.set = `set${capRelation}On${gqlName}`;
      relations[relName] = names;
    }
  }

  return { queries, mutations, relations };
}
