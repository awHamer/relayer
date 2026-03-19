import { sql, SQL } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveDerivedFields } from '../resolvers';
import { getPrimaryKeyField } from '../utils';
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
  db?: unknown;
  adapter?: DialectAdapter;
  queryContext?: unknown;
}

export function buildAggregate(ctx: BuildAggregateParams): AggregateResult {
  const { options, table, metadata, allTables, schema, registry, db, adapter, queryContext } = ctx;
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
      const resolved = resolveFieldColumn(
        fieldName,
        table,
        metadata,
        allTables,
        schema,
        registry,
        db,
        adapter,
        queryContext,
        joins,
        joinedRelations,
      );
      if (resolved) {
        selectColumns[alias] = sql`${sql.raw(fn)}(${resolved})`.as(alias) as unknown as SQL;
      }
    }
  }

  if (options.groupBy) {
    for (const field of options.groupBy) {
      const resolved = resolveFieldColumn(
        field,
        table,
        metadata,
        allTables,
        schema,
        registry,
        db,
        adapter,
        queryContext,
        joins,
        joinedRelations,
      );
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
function resolveFieldColumn(
  fieldPath: string,
  table: Table,
  metadata: EntityMetadata,
  allTables: Map<string, TableInfo>,
  schema: Record<string, unknown>,
  registry?: EntityRegistry,
  db?: unknown,
  adapter?: DialectAdapter,
  queryContext?: unknown,
  joins?: Array<{ subquery: unknown; on: SQL }>,
  joinedRelations?: Set<string>,
): Column | SQL | undefined {
  const tableColumns = table as unknown as Record<string, Column>;
  const joined = joinedRelations ?? new Set<string>();
  const jns = joins ?? [];

  // Simple field on current entity
  if (!fieldPath.includes('.')) {
    // Scalar
    const col = tableColumns[fieldPath];
    if (col) return col;

    // Computed
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

    // Derived
    if (metadata.derivedFields.has(fieldPath) && db && adapter) {
      const resolutions = resolveDerivedFields(
        metadata.derivedFields,
        [fieldPath],
        table,
        db,
        schema,
        queryContext,
        adapter.dialect,
      );
      const res = resolutions.get(fieldPath);
      if (res) {
        const derivedKey = `__agg_derived_${fieldPath}`;
        if (!joined.has(derivedKey)) {
          joined.add(derivedKey);
          jns.push({ subquery: res.subquery, on: res.joinCondition });
        }
        return res.valueColumn;
      }
    }

    return undefined;
  }

  // Dot path — relation fields
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
      const fkResolved = resolveRelationJoin(relationName, pkField, metadata, allTables, schema);
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
    const targetColumns = targetInfo.table as unknown as Record<string, Column>;

    // Scalar column on target
    const col = targetColumns[targetField];
    if (col) return col;

    // Computed on target
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

    // Derived on target
    if (targetMetadata?.derivedFields.has(targetField) && db && adapter) {
      const resolutions = resolveDerivedFields(
        targetMetadata.derivedFields,
        [targetField],
        targetInfo.table,
        db,
        schema,
        queryContext,
        adapter.dialect,
      );
      const res = resolutions.get(targetField);
      if (res) {
        const derivedKey = `${relationName}__derived_${targetField}`;
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
      const resolutions = resolveDerivedFields(
        targetMetadata.derivedFields,
        [derivedName],
        targetInfo.table,
        db,
        schema,
        queryContext,
        adapter.dialect,
      );
      const res = resolutions.get(derivedName);
      if (res?.isObjectType && res.valueColumns) {
        const subCol = res.valueColumns.get(subField);
        if (subCol) {
          const derivedKey = `${relationName}__derived_${derivedName}`;
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
