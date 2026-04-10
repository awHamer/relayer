import type {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  SelectionSetNode,
} from 'graphql';
import { vi } from 'vitest';

import type { AnyHandlerHost, HandlerCallContext } from '../src/handlers';
import type { EntityMetadata } from '../src/metadata';

// Service mock with all CRUD methods
export function mockService(overrides: Record<string, unknown> = {}) {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// Hooks mock - all methods optional
export function mockHooks(overrides: Record<string, unknown> = {}) {
  return {
    beforeFind: undefined,
    afterFind: undefined,
    beforeFindOne: undefined,
    afterFindOne: undefined,
    beforeCreate: undefined,
    afterCreate: undefined,
    beforeUpdate: undefined,
    afterUpdate: undefined,
    beforeDelete: undefined,
    afterDelete: undefined,
    beforeCount: undefined,
    beforeAggregate: undefined,
    afterAggregate: undefined,
    ...overrides,
  };
}

// Handler host mock
export function mockHost(
  service = mockService(),
  hooks: ReturnType<typeof mockHooks> | null = null,
): AnyHandlerHost {
  return {
    getService: () => service as any,
    getHooks: () => hooks as any,
    buildContext: (req: unknown) => ({ request: req }),
    buildQueryContext: () => undefined,
  };
}

// EntityMetadata mock
export function mockEntityMeta(
  overrides: Partial<{
    name: string;
    primaryKeyField: { name: string } | null;
    fields: Set<string>;
    relations: Map<string, { name: string; cardinality: string; targetEntity: string }>;
    relatedMeta: Map<string, EntityMetadata>;
  }> = {},
) {
  const name = overrides.name ?? 'tests';
  const primaryKeyField =
    overrides.primaryKeyField !== undefined ? overrides.primaryKeyField : { name: 'id' };
  const fields = overrides.fields ?? new Set(['id', 'title', 'content']);
  const relations = overrides.relations ?? new Map();
  const relatedMeta = overrides.relatedMeta ?? new Map();

  return {
    name,
    getPrimaryKeyField: () => primaryKeyField,
    hasField: (n: string) => fields.has(n) || relations.has(n),
    getRelation: (n: string) => relations.get(n) ?? null,
    getRelatedEntityMetadata: (n: string) => relatedMeta.get(n) ?? null,
    getScalarFields: () => [],
    getComputedFields: () => [],
    getDerivedFields: () => [],
    getRelationFields: () => [],
  } as unknown as EntityMetadata;
}

// Minimal GraphQL SelectionSet builder
export function fieldNode(name: string, subFields?: string[]): FieldNode {
  const node: any = {
    kind: 'Field',
    name: { kind: 'Name', value: name },
  };
  if (subFields) {
    node.selectionSet = selectionSet(subFields.map((f) => fieldNode(f)));
  }
  return node;
}

export function selectionSet(selections: FieldNode[]): SelectionSetNode {
  return { kind: 'SelectionSet', selections } as SelectionSetNode;
}

// Build a minimal GraphQLResolveInfo with given top-level fields
export function mockGqlInfo(
  fields: (string | FieldNode)[],
  fragments: Record<string, FragmentDefinitionNode> = {},
): GraphQLResolveInfo {
  const nodes = fields.map((f) => (typeof f === 'string' ? fieldNode(f) : f));
  const root = fieldNode('root', undefined) as any;
  root.selectionSet = selectionSet(nodes);
  return {
    fieldNodes: [root],
    fragments,
  } as unknown as GraphQLResolveInfo;
}

// Handler call context mock
export function mockCallContext(overrides: Partial<HandlerCallContext> = {}): HandlerCallContext {
  return {
    info: mockGqlInfo(['id', 'title']),
    gqlContext: { req: {} },
    entity: mockEntityMeta(),
    ...overrides,
  };
}
