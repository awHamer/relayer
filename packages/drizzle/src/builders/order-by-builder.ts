import { asc, desc, sql, SQL } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveDerivedFields } from '../resolvers';
import { derivedJoinKey, derivedSubFieldKey, getPrimaryKeyField, getTableColumns } from '../utils';
import { resolveRelationJoin } from './relation-join';

export interface OrderByEntry {
  field: string;
  order: 'asc' | 'desc';
}

export interface OrderByResult {
  clauses: SQL[];
  joins: Array<{ table: unknown; on: SQL; relationName: string }>;
}

export interface OrderByContext {
  table: Table;
  metadata: EntityMetadata;
  computedSqlMap: Map<string, SQL>;
  derivedAliasMap: Map<string, { column: Column | SQL }>;
  allTables: Map<string, TableInfo>;
  schema: Record<string, unknown>;
  adapter: DialectAdapter;
  registry?: EntityRegistry;
  db?: DrizzleDatabase;
  queryContext?: unknown;
  maxRelationDepth?: number;
}

export function buildOrderBy(
  orderBy: OrderByEntry | OrderByEntry[] | undefined,
  ctx: OrderByContext,
): OrderByResult {
  if (!orderBy) return { clauses: [], joins: [] };

  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const clauses: SQL[] = [];
  const joins: Array<{ table: unknown; on: SQL; relationName: string }> = [];
  const joinedRelations = new Set<string>();
  const tableColumns = getTableColumns(ctx.table);

  for (const entry of entries) {
    const direction = entry.order === 'desc' ? desc : asc;
    let column: Column | SQL | undefined;

    if (ctx.metadata.scalarFields.has(entry.field)) {
      column = tableColumns[entry.field];
    } else if (ctx.metadata.computedFields.has(entry.field)) {
      column = ctx.computedSqlMap.get(entry.field);
    } else if (ctx.metadata.derivedFields.has(entry.field)) {
      column = ctx.derivedAliasMap.get(entry.field)?.column;
    } else if (entry.field.includes('.')) {
      const segments = entry.field.split('.');
      const firstSegment = segments[0]!;

      if (ctx.metadata.derivedFields.has(firstSegment) && segments.length === 2) {
        column = ctx.derivedAliasMap.get(derivedSubFieldKey(firstSegment, segments[1]!))?.column;
      } else if (ctx.metadata.scalarFields.has(firstSegment)) {
        const fieldDef = ctx.metadata.scalarFields.get(firstSegment)!;
        if (fieldDef.valueType === 'json') {
          const col = tableColumns[firstSegment];
          if (col) {
            column = ctx.adapter.jsonPath(col, segments.slice(1));
          }
        }
      } else if (ctx.metadata.relationFields.has(firstSegment) && segments.length === 2) {
        const resolved = resolveRelationJoin(firstSegment, segments[1]!, ctx);
        if (resolved) {
          column = resolved.column;
          if (!joinedRelations.has(firstSegment)) {
            joinedRelations.add(firstSegment);
            joins.push({
              table: resolved.targetTable,
              on: resolved.joinCondition,
              relationName: firstSegment,
            });
          }
        } else if (ctx.registry && ctx.db) {
          column = resolveRelationPath(segments, ctx, joins, joinedRelations);
        }
      } else if (ctx.metadata.relationFields.has(firstSegment) && ctx.registry && ctx.db) {
        column = resolveRelationPath(segments, ctx, joins, joinedRelations);
      }
    }

    if (column) {
      clauses.push(direction(column as Column));
    }
  }

  return { clauses, joins };
}

/**
 * Walk a dot-separated path through relations to resolve the final column.
 * e.g. 'author.department.employeeCount' ->
 *   step 0: 'author' is relation on current entity -> FK join to users
 *   step 1: 'department' is relation on users -> FK join to departments
 *   step 2: 'employeeCount' is derived on departments -> derived subquery join
 */
function resolveRelationPath(
  segments: string[],
  ctx: OrderByContext,
  joins: Array<{ table: unknown; on: SQL; relationName: string }>,
  joinedRelations: Set<string>,
): Column | SQL | undefined {
  const depthLimit = ctx.maxRelationDepth ?? 3;
  let currentMetadata = ctx.metadata;
  let joinPrefix = '';

  for (let i = 0; i < segments.length - 1; i++) {
    if (i >= depthLimit) return undefined;

    const segment = segments[i]!;
    const relDef = currentMetadata.relationFields.get(segment);
    if (!relDef) break;

    const targetMetadata = ctx.registry!.get(relDef.targetEntity);
    const targetInfo = ctx.allTables.get(relDef.targetEntity);
    if (!targetMetadata || !targetInfo) return undefined;

    joinPrefix = joinPrefix ? `${joinPrefix}.${segment}` : segment;

    if (!joinedRelations.has(joinPrefix)) {
      const pkField = getPrimaryKeyField(targetInfo);
      if (!pkField) return undefined;
      const fkResolved = resolveRelationJoin(segment, pkField, {
        metadata: currentMetadata,
        allTables: ctx.allTables,
        schema: ctx.schema,
      });
      if (!fkResolved) return undefined;
      joinedRelations.add(joinPrefix);
      joins.push({
        table: fkResolved.targetTable,
        on: fkResolved.joinCondition,
        relationName: joinPrefix,
      });
    }

    currentMetadata = targetMetadata;
  }

  const finalInfo = ctx.allTables.get(currentMetadata.name);
  if (!finalInfo) return undefined;
  const finalColumns = getTableColumns(finalInfo.table);

  const relHops = joinPrefix ? joinPrefix.split('.').length : 0;
  const remainingSegments = segments.slice(relHops);

  if (remainingSegments.length === 2) {
    const [derivedName, subField] = remainingSegments;
    if (derivedName && subField && currentMetadata.derivedFields.has(derivedName)) {
      const resolutions = resolveDerivedFields(currentMetadata.derivedFields, [derivedName], {
        table: finalInfo.table,
        db: ctx.db!,
        schema: ctx.schema,
        context: ctx.queryContext,
        dialect: ctx.adapter.dialect,
      });
      const res = resolutions.get(derivedName);
      if (res?.isObjectType && res.valueColumns) {
        const subCol = res.valueColumns.get(subField);
        if (subCol) {
          const djKey = derivedJoinKey(joinPrefix, derivedName);
          if (!joinedRelations.has(djKey)) {
            joinedRelations.add(djKey);
            joins.push({
              table: res.subquery,
              on: res.joinCondition,
              relationName: djKey,
            });
          }
          return subCol;
        }
      }
    }
  }

  const fieldName = remainingSegments[remainingSegments.length - 1]!;

  if (currentMetadata.scalarFields.has(fieldName)) {
    return finalColumns[fieldName];
  }

  if (currentMetadata.computedFields.has(fieldName)) {
    const fieldDef = currentMetadata.computedFields.get(fieldName)!;
    const sqlExpr = fieldDef.resolve({
      table: finalInfo.table as unknown as Record<string, unknown>,
      schema: ctx.schema,
      sql,
      context: ctx.queryContext,
    });
    if (sqlExpr instanceof SQL) return sqlExpr;
    return undefined;
  }

  if (currentMetadata.derivedFields.has(fieldName)) {
    const resolutions = resolveDerivedFields(currentMetadata.derivedFields, [fieldName], {
      table: finalInfo.table,
      db: ctx.db!,
      schema: ctx.schema,
      context: ctx.queryContext,
      dialect: ctx.adapter.dialect,
    });
    const res = resolutions.get(fieldName);
    if (!res) return undefined;

    const djKey = derivedJoinKey(joinPrefix, fieldName);
    if (!joinedRelations.has(djKey)) {
      joinedRelations.add(djKey);
      joins.push({ table: res.subquery, on: res.joinCondition, relationName: djKey });
    }
    return res.valueColumn;
  }

  return undefined;
}
