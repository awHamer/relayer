import { sql } from 'drizzle-orm';
import type { Column, SQL } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';
import { EntityRegistry } from '@relayerjs/core';

import {
  buildAggregate,
  buildWhere,
  executeCreate,
  executeCreateMany,
  executeDelete,
  executeDeleteMany,
  executeUpdate,
  executeUpdateMany,
} from '../builders';
import type { WhereBuilderContext } from '../builders';
import type { DialectAdapter } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveComputedFields, resolveDerivedFields } from '../resolvers';
import { buildDerivedAliasMap } from '../utils';
import { executeFindMany } from './find-many';
import { executeFindManyStream } from './find-many-stream';

export function createEntityClient(
  db: any,
  schema: Record<string, unknown>,
  allTables: Map<string, TableInfo>,
  tableInfo: TableInfo,
  metadata: EntityMetadata,
  adapter: DialectAdapter,
  registry: EntityRegistry = new EntityRegistry(),
  maxRelationDepth?: number,
): Record<string, (...args: any[]) => any> {
  const table = tableInfo.table;

  function getComputedSqlMap(context?: unknown, requestedFields?: string[]): Map<string, SQL> {
    return resolveComputedFields(metadata.computedFields, table, schema, context, requestedFields);
  }

  function getDerivedResolutions(requestedDerived: string[], context?: unknown) {
    if (requestedDerived.length === 0) return { resolutions: new Map(), aliasMap: new Map() };
    const filtered = resolveDerivedFields(
      metadata.derivedFields,
      requestedDerived,
      table,
      db,
      schema,
      context,
      adapter.dialect,
    );
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
    getComputedSqlMap,
    getDerivedResolutions,
    makeWhereCtx,
  };

  return {
    async findMany(options: any = {}) {
      return executeFindMany(findManyDeps, options);
    },

    findManyStream(options: any = {}) {
      return executeFindManyStream(findManyDeps, options);
    },

    async findFirst(options: any = {}) {
      const results = await executeFindMany(findManyDeps, { ...options, limit: 1 });
      return results[0] ?? null;
    },

    async count(options: any = {}) {
      const whereComputed = options.where
        ? Object.keys(options.where).filter((k: string) => metadata.computedFields.has(k))
        : [];
      const computedSqlMap = getComputedSqlMap(options.context, whereComputed);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      const whereCondition = options.where ? buildWhere(options.where, whereCtx) : undefined;

      let query = db.select({ count: sql<number>`count(*)` }).from(table) as any;
      if (whereCondition) query = query.where(whereCondition);
      const rows = (await query) as { count: number }[];
      return rows[0]?.count ?? 0;
    },

    async aggregate(options: any = {}) {
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

      let query = db.select(aggResult.selectColumns as any).from(table) as any;

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

      const rows = (await query) as Record<string, unknown>[];
      return aggResult.groupByColumns.length > 0 ? rows : (rows[0] ?? null);
    },

    async create(options: any) {
      return (await executeCreate(db, table, options.data, adapter)) as Record<string, unknown>;
    },

    async createMany(options: any) {
      return (await executeCreateMany(db, table, options.data, adapter)) as Record<
        string,
        unknown
      >[];
    },

    async update(options: any) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return (await executeUpdate(
        db,
        table,
        options.where,
        options.data,
        whereCtx,
        adapter,
      )) as Record<string, unknown>;
    },

    async updateMany(options: any) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return executeUpdateMany(db, table, options.where, options.data, whereCtx, adapter);
    },

    async delete(options: any) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return (await executeDelete(db, table, options.where, whereCtx, adapter)) as Record<
        string,
        unknown
      >;
    },

    async deleteMany(options: any) {
      const computedSqlMap = getComputedSqlMap(undefined, []);
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      const whereCtx = makeWhereCtx(computedSqlMap, derivedAliasMap);
      return executeDeleteMany(db, table, options.where, whereCtx, adapter);
    },
  };
}
