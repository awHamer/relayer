import type { sql } from 'drizzle-orm';
import type {
  ComputedFieldDef,
  DerivedFieldDef,
  DerivedJoinContext,
  ObjectValueType,
} from '@relayerjs/core';

import type { DrizzleDatabase } from './dialect';
import type { SchemaTableKeys } from './types/entity-config';
import type { InferTableSelect } from './types/helpers';

// Infer db type from table dialect. All dialects map to DrizzleDatabase.
type InferDialectDb<_TTable> = DrizzleDatabase;

interface ComputedDecoratorConfig<TTable, TSchema> {
  resolve: (ctx: { table: TTable; schema: TSchema; sql: typeof sql; context: unknown }) => unknown;
}

interface DerivedDecoratorConfig<TTable, TDb, TSchema> {
  shape?: ObjectValueType;
  query: (ctx: {
    db: TDb;
    schema: TSchema;
    sql: typeof sql;
    context: unknown;
    field: (subField?: string) => string;
  }) => unknown;
  on: (ctx: DerivedJoinContext<TTable>) => unknown;
}

export interface EntityClassStatics<TTable, _TDb, TSchema, TKey extends string = string> {
  readonly __relayer: true;
  readonly __schema: TSchema;
  readonly __entityKey: TKey;
  readonly __table: TTable;
  readonly __computed: Map<string, ComputedFieldDef>;
  readonly __derived: Map<string, DerivedFieldDef>;
}

// Entity class methods: decorators & chain
export interface EntityClassMethods<
  TTable,
  TDb,
  TSchema,
  TInstance,
  TKey extends string = string,
> {
  computed(config: ComputedDecoratorConfig<TTable, TSchema>): PropertyDecorator;
  computed<V, K extends string>(
    name: K,
    config: ComputedDecoratorConfig<TTable, TSchema>,
  ): EntityChainResult<TTable, TDb, TSchema, TInstance & Record<K, V>, TKey>;

  derived(config: DerivedDecoratorConfig<TTable, TDb, TSchema>): PropertyDecorator;
  derived<V, K extends string>(
    name: K,
    config: DerivedDecoratorConfig<TTable, TDb, TSchema>,
  ): EntityChainResult<TTable, TDb, TSchema, TInstance & Record<K, V>, TKey>;
}

export type EntityChainResult<
  TTable,
  TDb,
  TSchema,
  TInstance,
  TKey extends string = string,
> = (new () => TInstance) &
  EntityClassStatics<TTable, TDb, TSchema, TKey> &
  EntityClassMethods<TTable, TDb, TSchema, TInstance>;

type EntityBaseClass<
  TTable,
  TDb,
  TSchema extends Record<string, unknown>,
  TKey extends string = string,
> = (new () => InferTableSelect<TTable>) &
  EntityClassStatics<TTable, TDb, TSchema, TKey> &
  EntityClassMethods<TTable, TDb, TSchema, InferTableSelect<TTable>, TKey>;

interface EntityClassWithMaps {
  __computed: Map<string, ComputedFieldDef>;
  __derived: Map<string, DerivedFieldDef>;
}

function ensureOwnMaps(ctor: EntityClassWithMaps): void {
  if (!Object.prototype.hasOwnProperty.call(ctor, '__computed')) {
    ctor.__computed = new Map(ctor.__computed);
  }
  if (!Object.prototype.hasOwnProperty.call(ctor, '__derived')) {
    ctor.__derived = new Map(ctor.__derived);
  }
}

function makeEntityClass(schema: Record<string, unknown>, key: string, table: unknown) {
  class EntityClass {
    static readonly __relayer = true as const;
    static readonly __schema = schema;
    static readonly __entityKey = key;
    static readonly __table = table;
    static readonly __computed = new Map<string, ComputedFieldDef>();
    static readonly __derived = new Map<string, DerivedFieldDef>();
  }

  interface ComputedConfig {
    resolve: (ctx: unknown) => unknown;
  }
  interface DerivedConfig {
    shape?: ObjectValueType;
    query: (ctx: unknown) => unknown;
    on: (ctx: unknown) => unknown;
  }

  Object.defineProperty(EntityClass, 'computed', {
    value: function (configOrName: string | ComputedConfig, maybeConfig?: ComputedConfig) {
      if (typeof configOrName === 'string') {
        ensureOwnMaps(EntityClass);
        EntityClass.__computed.set(configOrName, {
          kind: 'computed',
          valueType: 'unknown',
          resolve: maybeConfig!.resolve as ComputedFieldDef['resolve'],
        });
        return EntityClass;
      }
      return (_target: object, propertyKey: string | symbol) => {
        ensureOwnMaps(_target.constructor as unknown as EntityClassWithMaps);
        (_target.constructor as unknown as EntityClassWithMaps).__computed.set(
          String(propertyKey),
          {
            kind: 'computed',
            valueType: 'unknown',
            resolve: configOrName.resolve as ComputedFieldDef['resolve'],
          },
        );
      };
    },
    writable: false,
    configurable: false,
  });

  Object.defineProperty(EntityClass, 'derived', {
    value: function (configOrName: string | DerivedConfig, maybeConfig?: DerivedConfig) {
      if (typeof configOrName === 'string') {
        ensureOwnMaps(EntityClass);
        EntityClass.__derived.set(configOrName, {
          kind: 'derived',
          valueType: maybeConfig!.shape ?? 'unknown',
          query: maybeConfig!.query as DerivedFieldDef['query'],
          on: maybeConfig!.on as DerivedFieldDef['on'],
        });
        return EntityClass;
      }
      return (_target: object, propertyKey: string | symbol) => {
        ensureOwnMaps(_target.constructor as unknown as EntityClassWithMaps);
        (_target.constructor as unknown as EntityClassWithMaps).__derived.set(String(propertyKey), {
          kind: 'derived',
          valueType: configOrName.shape ?? 'unknown',
          query: configOrName.query as DerivedFieldDef['query'],
          on: configOrName.on as DerivedFieldDef['on'],
        });
      };
    },
    writable: false,
    configurable: false,
  });

  return EntityClass;
}

export function createRelayerEntity<
  TSchema extends Record<string, unknown>,
  TKey extends string & SchemaTableKeys<TSchema>,
>(
  schema: TSchema,
  key: TKey,
): EntityBaseClass<TSchema[TKey], InferDialectDb<TSchema[TKey]>, TSchema, TKey> {
  const table = schema[key];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime class cast to generic EntityBaseClass
  return makeEntityClass(schema, key, table) as any;
}

function isDrizzleTable(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.for('drizzle:Name') in (value as Record<symbol, unknown>)
  );
}

export type DrizzleEntities<TSchema extends Record<string, unknown>> = {
  [K in SchemaTableKeys<TSchema>]: EntityBaseClass<
    TSchema[K],
    InferDialectDb<TSchema[K]>,
    TSchema,
    K
  >;
};

export function createDrizzleEntities<TSchema extends Record<string, unknown>>(
  schema: TSchema,
): DrizzleEntities<TSchema> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (isDrizzleTable(value)) {
      result[key] = makeEntityClass(schema, key, value);
    }
  }
  return result as DrizzleEntities<TSchema>;
}
