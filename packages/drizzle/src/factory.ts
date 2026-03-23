import { isRelayerEntityClass } from '@relayerjs/core';

import { createEntityClient } from './client';
import { createDialectAdapter, detectDialect } from './dialect';
import type { DrizzleDatabase } from './dialect';
import { buildRegistry } from './introspect';
import type { RelayerClient } from './types';

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
 * const UserEntity = createRelayerEntity(schema, 'users');
 * class User extends UserEntity {
 *   @UserEntity.computed({ resolve: ({ table, sql }) => sql`...` })
 *   fullName!: string;
 * }
 * const r = createRelayerDrizzle({ db, schema, entities: { users: User } });
 * ```
 */
export function createRelayerDrizzle<
  TDb,
  TSchema extends Record<string, unknown>,
  TContext = unknown,
  TEntities extends Record<string, unknown> = Record<string, unknown>,
>(config: {
  db: TDb;
  schema: TSchema;
  entities?: TEntities;
  context?: TContext;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
}): RelayerClient<TSchema, TEntities, TContext, TDb> {
  return _createRelayerDrizzle(config) as RelayerClient<TSchema, TEntities, TContext, TDb>;
}

function _createRelayerDrizzle(config: {
  db: unknown;
  schema: Record<string, unknown>;
  entities?: Record<string, unknown>;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
}): unknown {
  const db = config.db as DrizzleDatabase;
  const schema = config.schema as Record<string, unknown>;
  const dialect = detectDialect(schema);
  const adapter = createDialectAdapter(dialect);

  let resolvedEntities: Record<string, unknown> | undefined;
  if (config.entities) {
    resolvedEntities = {};
    for (const [entityName, entityConfig] of Object.entries(config.entities)) {
      if (!entityConfig) continue;
      if (isRelayerEntityClass(entityConfig)) {
        resolvedEntities[entityName] = entityConfig;
      }
    }
  }

  const { registry, tables } = buildRegistry(schema, resolvedEntities);
  const relayerClientCache = new Map<string, unknown>();

  // Create a client on first accessing to reduce unnecessary instances
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;

      if (prop === '$orm') return db;
      if (prop === 'getOrm') return () => db;
      if (prop === '$transaction') {
        return async (callback: (tx: unknown) => Promise<unknown>, txConfig?: unknown) => {
          return db.transaction(async (tx: DrizzleDatabase) => {
            const txClient = _createRelayerDrizzle({ ...config, db: tx });
            return callback(txClient);
          }, txConfig);
        };
      }

      const cached = relayerClientCache.get(prop);
      if (cached) return cached;

      const metadata = registry.get(prop);
      if (!metadata) return undefined;
      const tableInfo = tables.get(prop);
      if (!tableInfo) return undefined;

      const client = createEntityClient({
        db,
        schema,
        allTables: tables,
        tableInfo,
        metadata,
        adapter,
        registry,
        maxRelationDepth: config.maxRelationDepth ?? 3,
        defaultRelationLimit: config.defaultRelationLimit,
      });
      relayerClientCache.set(prop, client);
      return client;
    },
  });
}
