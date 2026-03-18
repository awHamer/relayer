import { sql } from 'drizzle-orm';
import type { Column, SQL, Table } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';

import type { TableInfo } from '../introspect';
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

export function buildAggregate(
  options: AggregateOptions,
  table: Table,
  metadata: EntityMetadata,
  allTables: Map<string, TableInfo>,
  schema: Record<string, unknown>,
): AggregateResult {
  const selectColumns: Record<string, Column | SQL> = {};
  const groupByColumns: (Column | SQL)[] = [];
  const joins: Array<{ subquery: unknown; on: SQL }> = [];
  const tableColumns = table as unknown as Record<string, Column>;

  // Aggregate functions
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
      const col = tableColumns[fieldName];
      if (col) {
        const alias = `${key}_${fieldName}`;
        selectColumns[alias] = sql`${sql.raw(fn)}(${col})`.as(alias) as unknown as SQL;
      }
    }
  }

  // GroupBy
  if (options.groupBy) {
    for (const field of options.groupBy) {
      if (field.includes('.')) {
        // Dot notation: 'type.label' -> LEFT JOIN + group by target column
        const [relationName, targetFieldName] = field.split('.');
        if (!relationName || !targetFieldName) continue;

        const resolved = resolveRelationJoin(
          relationName,
          targetFieldName,
          metadata,
          allTables,
          schema,
        );

        if (resolved) {
          const alias = `${relationName}_${targetFieldName}`;
          selectColumns[alias] = resolved.column;
          groupByColumns.push(resolved.column);
          joins.push({ subquery: resolved.targetTable, on: resolved.joinCondition });
        }
      } else {
        // Simple scalar field
        const col = tableColumns[field];
        if (col) {
          selectColumns[field] = col;
          groupByColumns.push(col);
        }
      }
    }
  }

  return { selectColumns, groupByColumns, joins };
}
