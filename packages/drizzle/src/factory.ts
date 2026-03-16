import { FieldType } from '@relayerjs/core';

import { createEntityClient } from './client';
import { createDialectAdapter, detectDialect } from './dialect';
import { buildRegistry } from './introspect';
import type { RelayerClient, TypedEntitiesConfig } from './types';

/**
 * Create a type-safe Relayer client from a Drizzle ORM instance.
 *
 * @param config.db - Drizzle database instance
 * @param config.schema - Drizzle schema object (tables + relations)
 * @param config.entities - Optional entity configuration with computed/derived fields
 * @param config.context - Optional typed context hint (actual value passed per-query)
 * @returns A proxy-based client with typed entity accessors, `$orm`, `getOrm()`, and `$transaction()`
 *
 * @example
 * ```ts
 * const r = createRelayerDrizzle({ db, schema, entities: { users: { fields: { ... } } } });
 * const users = await r.users.findMany({ where: { email: { contains: '@example.com' } } });
 * ```
 */
export function createRelayerDrizzle<
  TDb,
  TSchema extends Record<string, unknown>,
  TContext = unknown,
  TEntities extends TypedEntitiesConfig<TDb, TSchema, TContext> = TypedEntitiesConfig<
    TDb,
    TSchema,
    TContext
  >,
>(config: {
  db: TDb;
  schema: TSchema;
  entities?: TEntities;
  context?: TContext;
}): RelayerClient<TSchema, TEntities, TContext, TDb> {
  return _createRelayerDrizzle(config);
}

function _createRelayerDrizzle(config: {
  db: unknown;
  schema: Record<string, unknown>;
  entities?: Record<string, unknown>;
}): any {
  const db = config.db as any;
  const schema = config.schema as Record<string, unknown>;
  const dialect = detectDialect(schema);
  const adapter = createDialectAdapter(dialect);

  let resolvedEntities: Record<string, { fields?: Record<string, any> }> | undefined;
  if (config.entities) {
    resolvedEntities = {};
    for (const [entityName, entityConfig] of Object.entries(config.entities)) {
      if (!entityConfig) continue;
      const ec = entityConfig as { fields?: Record<string, any> };
      const fields: Record<string, any> = {};

      if (ec.fields) {
        for (const [name, def] of Object.entries(ec.fields)) {
          if (def.type === 'computed' || def.type === FieldType.Computed) {
            fields[name] = { kind: 'computed', valueType: def.valueType, resolve: def.resolve };
          } else if (def.type === 'derived' || def.type === FieldType.Derived) {
            fields[name] = {
              kind: 'derived',
              valueType: def.valueType,
              query: def.query,
              on: def.on,
            };
          }
        }
      }

      resolvedEntities[entityName] = { fields };
    }
  }

  const { registry, tables } = buildRegistry(schema, resolvedEntities as any);

  return new Proxy({} as any, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;

      if (prop === '$orm') return db;
      if (prop === 'getOrm') return () => db;
      if (prop === '$transaction') {
        return async (callback: (tx: unknown) => Promise<unknown>, txConfig?: unknown) => {
          return (db as any).transaction(async (tx: any) => {
            const txClient = _createRelayerDrizzle({ ...config, db: tx } as any);
            return callback(txClient);
          }, txConfig);
        };
      }

      const metadata = registry.get(prop);
      if (!metadata) return undefined;
      const tableInfo = tables.get(prop);
      if (!tableInfo) return undefined;

      return createEntityClient(db, schema, tables, tableInfo, metadata, adapter);
    },
  });
}
