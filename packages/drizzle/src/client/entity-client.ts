import { sql } from 'drizzle-orm';
import type { Column, SQL } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';
import { EntityRegistry, RelayerError } from '@relayerjs/core';

import {
  buildAggregate,
  buildWhere,
  executeCreate,
  executeCreateMany,
  executeDelete,
  executeDeleteMany,
  executeUpdate,
  executeUpdateMany,
  hydrateAggregateResult,
} from '../builders';
import type { WhereBuilderContext } from '../builders';
import { executeManyRelationOps, separateRelationData } from '../builders/relation-data';
import type { DialectAdapter, DrizzleDatabase } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveComputedFields, resolveDerivedFields } from '../resolvers';
import { buildDerivedAliasMap, getPrimaryKeyField } from '../utils';
import { executeFindMany } from './find-many';
import type { FindManyOptions } from './find-many';
import { executeFindManyStream } from './find-many-stream';

export interface EntityClientConfig {
  db: DrizzleDatabase;
  schema: Record<string, unknown>;
  allTables: Map<string, TableInfo>;
  tableInfo: TableInfo;
  metadata: EntityMetadata;
  adapter: DialectAdapter;
  registry: EntityRegistry;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
}

interface AggregateOptions {
  where?: Record<string, unknown>;
  groupBy?: readonly string[];
  _count?: boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  having?: Record<string, unknown>;
}

export function createEntityClient(config: EntityClientConfig) {
  const {
    db,
    schema,
    allTables,
    tableInfo,
    metadata,
    adapter,
    registry,
    maxRelationDepth,
    defaultRelationLimit,
  } = config;
  const table = tableInfo.table;

  function getComputedSqlMap(context?: unknown, requestedFields?: string[]): Map<string, SQL> {
    return resolveComputedFields(metadata.computedFields, {
      table,
      schema,
      context,
      requestedFields,
    });
  }

  function getDerivedResolutions(requestedDerived: string[], context?: unknown) {
    if (requestedDerived.length === 0) return { resolutions: new Map(), aliasMap: new Map() };
    const filtered = resolveDerivedFields(metadata.derivedFields, requestedDerived, {
      table,
      db,
      schema,
      context,
      dialect: adapter.dialect,
    });
    return { resolutions: filtered, aliasMap: buildDerivedAliasMap(filtered) };
  }

  function makeWhereCtx(
    computedSqlMap: Map<string, SQL>,
    derivedAliasMap: Map<string, { column: Column | SQL }>,
    queryContext?: unknown,
  ): WhereBuilderContext {
    return {
      table,
      tableInfo,
      metadata,
      schema,
      allTables,
      computedSqlMap,
      derivedAliasMap,
      adapter,
      registry,
      db,
      queryContext,
    };
  }

  const findManyDeps = {
    db,
    table,
    tableInfo,
    schema,
    allTables,
    metadata,
    adapter,
    registry,
    maxRelationDepth,
    defaultRelationLimit,
    getComputedSqlMap,
    getDerivedResolutions,
    makeWhereCtx,
  };

  return {
    async findMany(options: FindManyOptions = {}) {
      return executeFindMany(findManyDeps, options);
    },

    findManyStream(options: FindManyOptions = {}) {
      return executeFindManyStream(findManyDeps, options);
    },

    async findFirst(options: FindManyOptions = {}) {
      const results = await executeFindMany(findManyDeps, { ...options, limit: 1 });
      return results[0] ?? null;
    },

    async count(options: Pick<FindManyOptions, 'where' | 'context'> = {}) {
      const whereComputed = options.where
        ? Object.keys(options.where).filter((k: string) => metadata.computedFields.has(k))
        : [];
      const computedSqlMap = getComputedSqlMap(options.context, whereComputed);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      const whereCondition = options.where ? buildWhere(options.where, whereCtx) : undefined;

      let query = db.select({ count: sql<number>`count(*)` }).from(table);
      if (whereCondition) query = query.where(whereCondition);
      const rows = (await query) as { count: number }[];
      return Number(rows[0]?.count ?? 0);
    },

    async aggregate(options: AggregateOptions = {}) {
      const aggResult = buildAggregate({
        options,
        table,
        metadata,
        allTables,
        schema,
        registry,
        db,
        adapter,
      });

      let query = db.select(aggResult.selectColumns).from(table);

      for (const join of aggResult.joins) {
        query = query.leftJoin(join.subquery, join.on);
      }

      if (options.where) {
        const computedSqlMap = getComputedSqlMap(undefined, []);
        const derivedAliasMap = new Map<string, { column: Column | SQL }>();
        const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
        const whereCondition = buildWhere(options.where, whereCtx);
        if (whereCondition) query = query.where(whereCondition);
      }

      if (aggResult.groupByColumns.length > 0) {
        query = query.groupBy(...aggResult.groupByColumns);
      }

      if (aggResult.havingCondition) {
        query = query.having(aggResult.havingCondition);
      }

      const rawRows = (await query) as Record<string, unknown>[];
      const hydrated = hydrateAggregateResult(rawRows, aggResult.meta);
      return aggResult.groupByColumns.length > 0 ? hydrated : (hydrated[0] ?? null);
    },

    async create(options: { data: Record<string, unknown> }) {
      return (await executeCreate(db, table, options.data, adapter)) as Record<string, unknown>;
    },

    async createMany(options: { data: Record<string, unknown>[] }) {
      return (await executeCreateMany(db, table, options.data, adapter)) as Record<
        string,
        unknown
      >[];
    },

    async update(options: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      const updateCtx = { metadata, schema, tableInfo };

      const runUpdate = async (txDb: DrizzleDatabase) => {
        const { result, manyOps } = await executeUpdate(
          txDb,
          table,
          options.where,
          options.data,
          whereCtx,
          adapter,
          updateCtx,
        );

        if (manyOps.size > 0) {
          const pkField = getPrimaryKeyField(tableInfo);
          const sourceId = pkField ? options.where[pkField] : undefined;
          if (!sourceId) {
            throw new RelayerError(
              'connect/disconnect/set on many() relations requires a primary key in the where clause.',
            );
          }
          await executeManyRelationOps(manyOps, {
            db: txDb,
            adapter,
            schema,
            metadata,
            tableInfo,
            allTables,
            sourceId,
          });
        }

        return result as Record<string, unknown>;
      };

      // Wrap in transaction when many() ops are present (PG/MySQL only).
      // SQLite better-sqlite3 doesn't support async transaction callbacks,
      // but is inherently serial within a single connection.
      const { manyOps } = separateRelationData(options.data, metadata);
      if (manyOps.size > 0 && adapter.dialect !== 'sqlite') {
        return db.transaction(async (tx) => runUpdate(tx as DrizzleDatabase));
      }
      return runUpdate(db);
    },

    async updateMany(options: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return executeUpdateMany(db, table, options.where, options.data, whereCtx, adapter, {
        metadata,
        schema,
        tableInfo,
      });
    },

    async delete(options: { where: Record<string, unknown> }) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return (await executeDelete(db, table, options.where, whereCtx, adapter)) as Record<
        string,
        unknown
      >;
    },

    async deleteMany(options: { where: Record<string, unknown> }) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return executeDeleteMany(db, table, options.where, whereCtx, adapter);
    },
  };
}
