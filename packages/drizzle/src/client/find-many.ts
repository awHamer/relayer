import { sql } from 'drizzle-orm';
import type { Column, SQL, Table } from 'drizzle-orm';
import { isObject } from '@relayerjs/core';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import { buildOrderBy, buildSelect, buildWhere, loadRelations } from '../builders';
import type { OrderByEntry, SelectResult, WhereBuilderContext } from '../builders';
import type { DialectAdapter, DrizzleDatabase, DrizzleQueryBuilder } from '../dialect';
import type { TableInfo } from '../introspect';
import type { DerivedFieldResolution } from '../resolvers';
import { derivedSubFieldKey, getPrimaryKeyField, getTableColumns } from '../utils';

export interface FindManyOptions {
  select?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: OrderByEntry | OrderByEntry[];
  limit?: number;
  offset?: number;
  context?: unknown;
}

export interface FindManyDeps {
  db: DrizzleDatabase;
  table: Table;
  tableInfo: TableInfo;
  schema: Record<string, unknown>;
  allTables: Map<string, TableInfo>;
  metadata: EntityMetadata;
  adapter: DialectAdapter;
  registry: EntityRegistry;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
  getComputedSqlMap(context?: unknown, requestedFields?: string[]): Map<string, SQL>;
  getDerivedResolutions(
    requestedDerived: string[],
    context?: unknown,
  ): {
    resolutions: Map<string, DerivedFieldResolution>;
    aliasMap: Map<string, { column: Column | SQL }>;
  };
  makeWhereCtx(
    computedSqlMap: Map<string, SQL>,
    derivedAliasMap: Map<string, { column: Column | SQL }>,
    queryContext?: unknown,
  ): WhereBuilderContext;
}

export interface BuiltQuery {
  query: DrizzleQueryBuilder;
  selectResult: SelectResult;
  eagerResolutions: Map<string, DerivedFieldResolution>;
  deferredDerived: string[];
}

export function buildFindManyQuery(
  deps: FindManyDeps,
  options: FindManyOptions = {},
  forceAllDerivedEager = false,
): BuiltQuery {
  const { db, table, metadata } = deps;
  const context = options.context;

  const requestedComputed = options.select
    ? Object.keys(options.select).filter((k: string) => metadata.computedFields.has(k))
    : [...metadata.computedFields.keys()];
  const computedSqlMap = deps.getComputedSqlMap(context, requestedComputed);
  const selectResult = buildSelect(options.select, table, metadata, computedSqlMap, deps.adapter);

  const whereKeys = new Set(options.where ? Object.keys(options.where) : []);
  const orderByFields = new Set(
    options.orderBy
      ? (Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy]).map(
          (e) => e.field.split('.')[0],
        )
      : [],
  );

  const eagerDerived: string[] = [];
  const deferredDerived: string[] = [];
  for (const name of selectResult.requestedDerived) {
    if (forceAllDerivedEager || whereKeys.has(name) || orderByFields.has(name)) {
      eagerDerived.push(name);
    } else {
      deferredDerived.push(name);
    }
  }
  for (const key of [...whereKeys, ...orderByFields] as string[]) {
    if (
      metadata.derivedFields.has(key) &&
      !eagerDerived.includes(key) &&
      !deferredDerived.includes(key)
    ) {
      eagerDerived.push(key);
    }
  }

  const { resolutions: eagerResolutions, aliasMap: derivedAliasMap } = deps.getDerivedResolutions(
    eagerDerived,
    context,
  );

  for (const [name, res] of eagerResolutions) {
    if (res.isObjectType && res.valueColumns) {
      const userSelect = options.select?.[name];
      const requestedSubs = isObject(userSelect)
        ? new Set(Object.keys(userSelect).filter((k) => (userSelect as Record<string, unknown>)[k]))
        : null;
      for (const [subField, col] of res.valueColumns) {
        if (!requestedSubs || requestedSubs.has(subField)) {
          selectResult.columns[derivedSubFieldKey(name, subField)] = col;
        }
      }
    } else {
      selectResult.columns[name] = res.valueColumn;
    }
  }

  const whereCtx = deps.makeWhereCtx(computedSqlMap, derivedAliasMap, options.context);
  const whereCondition = options.where ? buildWhere(options.where, whereCtx) : undefined;
  const orderByResult = buildOrderBy(options.orderBy, {
    table,
    metadata,
    computedSqlMap,
    derivedAliasMap,
    allTables: deps.allTables,
    schema: deps.schema,
    adapter: deps.adapter,
    registry: deps.registry,
    db,
    queryContext: context,
    maxRelationDepth: deps.maxRelationDepth,
  });

  let query = db.select(selectResult.columns).from(table);

  for (const [, res] of eagerResolutions) {
    query = query.leftJoin(res.subquery, res.joinCondition);
  }
  for (const join of orderByResult.joins) {
    query = query.leftJoin(join.table, join.on);
  }

  if (whereCondition) query = query.where(whereCondition);
  if (orderByResult.clauses.length > 0) query = query.orderBy(...orderByResult.clauses);
  if (options.limit !== undefined) query = query.limit(options.limit);
  if (options.offset !== undefined) query = query.offset(options.offset);

  return { query, selectResult, eagerResolutions, deferredDerived };
}

export function hydrateRow(
  row: Record<string, unknown>,
  objectDerivedFields: Map<string, Set<string>>,
): void {
  for (const [name, subFields] of objectDerivedFields) {
    const obj: Record<string, unknown> = {};
    for (const subField of subFields) {
      const sqlKey = derivedSubFieldKey(name, subField);
      if (sqlKey in row) {
        obj[subField] = row[sqlKey];
        delete row[sqlKey];
      }
    }
    row[name] = Object.keys(obj).length > 0 ? obj : null;
  }
}

export function stripUnrequestedFields(
  row: Record<string, unknown>,
  requestedKeys: Set<string>,
): void {
  for (const key of Object.keys(row)) {
    if (!requestedKeys.has(key)) {
      delete row[key];
    }
  }
}

export async function executeFindMany(
  deps: FindManyDeps,
  options: FindManyOptions = {},
): Promise<Record<string, unknown>[]> {
  const { db, table, metadata } = deps;
  const context = options.context;

  const { query, selectResult, eagerResolutions, deferredDerived } = buildFindManyQuery(
    deps,
    options,
  );

  const results = (await query) as Record<string, unknown>[];

  // Deferred derived: batch load after main query
  if (deferredDerived.length > 0 && results.length > 0) {
    const pkName = getPrimaryKeyField(deps.tableInfo);
    if (pkName) {
      const pks = results.map((r) => r[pkName!]).filter(Boolean);
      const pkCol = getTableColumns(table as Table)[pkName];

      const { resolutions: deferredResolutions } = deps.getDerivedResolutions(
        deferredDerived,
        context,
      );

      for (const [name, res] of deferredResolutions) {
        const batchSelect: Record<string, Column | SQL> = { [pkName]: pkCol! };
        if (res.isObjectType && res.valueColumns) {
          const userSelect = options.select?.[name];
          const requestedSubs = isObject(userSelect)
            ? new Set(
                Object.keys(userSelect).filter((k) => (userSelect as Record<string, unknown>)[k]),
              )
            : null;
          for (const [subField, col] of res.valueColumns) {
            if (!requestedSubs || requestedSubs.has(subField)) {
              batchSelect[derivedSubFieldKey(name, subField)] = col;
            }
          }
        } else {
          batchSelect[name] = res.valueColumn;
        }

        let batchQuery = db.select(batchSelect).from(table);
        batchQuery = batchQuery.leftJoin(res.subquery, res.joinCondition);
        batchQuery = batchQuery.where(
          sql`${pkCol} IN (${sql.join(
            pks.map((pk) => sql`${pk}`),
            sql`, `,
          )})`,
        );

        const batchRows = (await batchQuery) as Record<string, unknown>[];

        const batchMap = new Map<unknown, Record<string, unknown>>();
        for (const row of batchRows) {
          batchMap.set(row[pkName!], row);
        }

        for (const row of results) {
          const batchRow = batchMap.get(row[pkName!]);
          if (res.isObjectType && res.valueColumns) {
            const obj: Record<string, unknown> = {};
            for (const sqlKey of Object.keys(batchSelect)) {
              if (sqlKey === pkName) continue;
              const subField = sqlKey.replace(`${name}_`, '');
              obj[subField] = batchRow?.[sqlKey] ?? null;
            }
            row[name] = Object.values(obj).some((v) => v !== null) ? obj : null;
          } else {
            row[name] = batchRow?.[name] ?? null;
          }
        }
      }
    }
  }

  if (selectResult.requestedRelations.length > 0) {
    await loadRelations(results, selectResult.requestedRelations, selectResult.relationSelects, {
      db,
      allTables: deps.allTables,
      schema: deps.schema,
      parentMetadata: metadata,
      registry: deps.registry,
      adapter: deps.adapter,
      queryContext: context,
      maxRelationDepth: deps.maxRelationDepth,
      defaultRelationLimit: deps.defaultRelationLimit,
    });
  }

  const objectDerivedFields = new Map<string, Set<string>>();
  for (const [name, res] of eagerResolutions) {
    if (res.isObjectType && res.valueColumns) {
      objectDerivedFields.set(name, new Set(res.valueColumns.keys()));
    }
  }

  for (const row of results) {
    hydrateRow(row, objectDerivedFields);
  }

  if (options.select) {
    const requestedKeys = new Set(Object.keys(options.select));
    for (const row of results) {
      stripUnrequestedFields(row, requestedKeys);
    }
  }

  return results;
}
