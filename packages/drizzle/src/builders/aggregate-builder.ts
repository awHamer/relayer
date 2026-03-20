import { sql, SQL } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveDerivedFields } from '../resolvers';
import { aggDerivedKey, derivedJoinKey, getPrimaryKeyField, getTableColumns } from '../utils';
import { resolveRelationJoin } from './relation-join';

export interface AggregateOptions {
  groupBy?: string[];
  _count?: boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}

export interface AggregateResult {
  selectColumns: Record<string, Column | SQL>;
  groupByColumns: (Column | SQL)[];
  joins: Array<{ subquery: unknown; on: SQL }>;
}

export interface BuildAggregateParams {
  options: AggregateOptions;
  table: Table;
  metadata: EntityMetadata;
  allTables: Map<string, TableInfo>;
  schema: Record<string, unknown>;
  registry?: EntityRegistry;
  db?: DrizzleDatabase;
  adapter?: DialectAdapter;
  queryContext?: unknown;
}

export function buildAggregate(ctx: BuildAggregateParams): AggregateResult {
  const { options } = ctx;
  const selectColumns: Record<string, Column | SQL> = {};
  const groupByColumns: (Column | SQL)[] = [];
  const joins: Array<{ subquery: unknown; on: SQL }> = [];
  const joinedRelations = new Set<string>();

  if (options._count) {
    selectColumns._count = sql<number>`count(*)`.as('_count') as unknown as SQL;
  }

  const aggFns: Array<{ key: string; fn: string; fields?: Record<string, boolean> }> = [
    { key: '_sum', fn: 'sum', fields: options._sum },
    { key: '_avg', fn: 'avg', fields: options._avg },
    { key: '_min', fn: 'min', fields: options._min },
    { key: '_max', fn: 'max', fields: options._max },
  ];

  for (const { key, fn, fields } of aggFns) {
    if (!fields) continue;
    for (const [fieldName, enabled] of Object.entries(fields)) {
      if (!enabled) continue;
      const alias = `${key}_${fieldName.replace(/\./g, '_')}`;
      const resolveCtx: ResolveFieldCtx = { ...ctx, joins, joinedRelations };
      const resolved = resolveFieldColumn(fieldName, resolveCtx);
      if (resolved) {
        selectColumns[alias] = sql`${sql.raw(fn)}(${resolved})`.as(alias) as unknown as SQL;
      }
    }
  }

  if (options.groupBy) {
    const resolveCtx: ResolveFieldCtx = { ...ctx, joins, joinedRelations };
    for (const field of options.groupBy) {
      const resolved = resolveFieldColumn(field, resolveCtx);
      if (resolved) {
        const alias = field.includes('.') ? field.replace(/\./g, '_') : field;
        selectColumns[alias] = field.includes('.') ? resolved : (resolved as Column);
        groupByColumns.push(resolved as Column);
      }
    }
  }

  return { selectColumns, groupByColumns, joins };
}

// Resolve a field path to a SQL column/expression, adding joins as needed.
// Handles: scalar, computed, derived, relation.scalar, relation.computed,
// relation.derived, relation.objectDerived.subField
interface ResolveFieldCtx extends BuildAggregateParams {
  joins: Array<{ subquery: unknown; on: SQL }>;
  joinedRelations: Set<string>;
}

function resolveFieldColumn(fieldPath: string, ctx: ResolveFieldCtx): Column | SQL | undefined {
  const { table, metadata, allTables, schema, registry, db, adapter, queryContext } = ctx;
  const tableColumns = getTableColumns(table);
  const joined = ctx.joinedRelations;
  const jns = ctx.joins;

  if (!fieldPath.includes('.')) {
    const col = tableColumns[fieldPath];
    if (col) return col;

    if (metadata.computedFields.has(fieldPath)) {
      const fieldDef = metadata.computedFields.get(fieldPath)!;
      const sqlExpr = fieldDef.resolve({
        table: table as unknown as Record<string, unknown>,
        schema,
        sql,
        context: queryContext,
      });
      if (sqlExpr instanceof SQL) return sqlExpr;
    }

    if (metadata.derivedFields.has(fieldPath) && db && adapter) {
      const resolutions = resolveDerivedFields(metadata.derivedFields, [fieldPath], {
        table,
        db,
        schema,
        context: queryContext,
        dialect: adapter.dialect,
      });
      const res = resolutions.get(fieldPath);
      if (res) {
        const derivedKey = aggDerivedKey(fieldPath);
        if (!joined.has(derivedKey)) {
          joined.add(derivedKey);
          jns.push({ subquery: res.subquery, on: res.joinCondition });
        }
        return res.valueColumn;
      }
    }

    return undefined;
  }

  const segments = fieldPath.split('.');
  const relationName = segments[0]!;
  const relDef = metadata.relationFields.get(relationName);
  if (!relDef) return undefined;

  const targetInfo = allTables.get(relDef.targetEntity);
  if (!targetInfo) return undefined;

  // Ensure FK join to target table
  if (!joined.has(relationName)) {
    const pkField = getPrimaryKeyField(targetInfo);
    if (pkField) {
      const fkResolved = resolveRelationJoin(relationName, pkField, ctx);
      if (fkResolved) {
        joined.add(relationName);
        jns.push({ subquery: fkResolved.targetTable, on: fkResolved.joinCondition });
      }
    }
  }

  const targetMetadata = registry?.get(relDef.targetEntity);
  const remaining = segments.slice(1);

  // relation.field (1 remaining segment)
  if (remaining.length === 1) {
    const targetField = remaining[0]!;
    const targetColumns = getTableColumns(targetInfo.table);

    const col = targetColumns[targetField];
    if (col) return col;

    if (targetMetadata?.computedFields.has(targetField)) {
      const fieldDef = targetMetadata.computedFields.get(targetField)!;
      const sqlExpr = fieldDef.resolve({
        table: targetInfo.table as unknown as Record<string, unknown>,
        schema,
        sql,
        context: queryContext,
      });
      if (sqlExpr instanceof SQL) return sqlExpr;
    }

    if (targetMetadata?.derivedFields.has(targetField) && db && adapter) {
      const resolutions = resolveDerivedFields(targetMetadata.derivedFields, [targetField], {
        table: targetInfo.table,
        db,
        schema,
        context: queryContext,
        dialect: adapter.dialect,
      });
      const res = resolutions.get(targetField);
      if (res) {
        const derivedKey = derivedJoinKey(relationName, targetField);
        if (!joined.has(derivedKey)) {
          joined.add(derivedKey);
          jns.push({ subquery: res.subquery, on: res.joinCondition });
        }
        return res.valueColumn;
      }
    }
  }

  // relation.objectDerived.subField (2 remaining segments)
  if (remaining.length === 2) {
    const [derivedName, subField] = remaining;
    if (
      derivedName &&
      subField &&
      targetMetadata?.derivedFields.has(derivedName) &&
      db &&
      adapter
    ) {
      const resolutions = resolveDerivedFields(targetMetadata.derivedFields, [derivedName], {
        table: targetInfo.table,
        db,
        schema,
        context: queryContext,
        dialect: adapter.dialect,
      });
      const res = resolutions.get(derivedName);
      if (res?.isObjectType && res.valueColumns) {
        const subCol = res.valueColumns.get(subField);
        if (subCol) {
          const derivedKey = derivedJoinKey(relationName, derivedName);
          if (!joined.has(derivedKey)) {
            joined.add(derivedKey);
            jns.push({ subquery: res.subquery, on: res.joinCondition });
          }
          return subCol;
        }
      }
    }
  }

  return undefined;
}
