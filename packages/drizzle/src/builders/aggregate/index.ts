import { Column, sql, SQL } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../../dialect';
import type { TableInfo } from '../../introspect';
import { buildHavingClause } from './having';
import { resolveFieldColumn } from './resolve-field';
import type { ResolveFieldCtx } from './resolve-field';

export { hydrateAggregateResult } from './hydrate';

export interface AggregateOptions {
  groupBy?: readonly string[];
  _count?: boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  having?: Record<string, unknown>;
}

export interface AggregateResult {
  selectColumns: Record<string, Column | SQL>;
  groupByColumns: (Column | SQL)[];
  joins: Array<{ subquery: unknown; on: SQL }>;
  havingCondition?: SQL;
  meta: AggregateMeta;
}

export interface AggregateMeta {
  aggFields: Array<{ fn: string; fieldName: string; alias: string }>;
  groupByFields: string[];
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
  const meta: AggregateMeta = { aggFields: [], groupByFields: [] };
  const rawExpressions = new Map<string, SQL>();

  if (options._count) {
    const countExpr = sql<number>`count(*)`;
    selectColumns._count = countExpr.as('_count') as unknown as SQL;
    rawExpressions.set('_count', countExpr);
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
        const isNumericFn = fn === 'sum' || fn === 'avg';
        let expr: Column | SQL = resolved;
        if (isNumericFn) {
          const isNumericCol =
            resolved instanceof Column &&
            (resolved.dataType === 'number' || resolved.dataType === 'bigint');
          if (!isNumericCol) {
            const castType =
              ctx.adapter?.dialect === 'mysql'
                ? 'DECIMAL'
                : ctx.adapter?.dialect === 'sqlite'
                  ? 'REAL'
                  : 'numeric';
            expr = sql`CAST(${resolved} AS ${sql.raw(castType)})`;
          }
        }
        const rawExpr = sql`${sql.raw(fn)}(${expr})`;
        selectColumns[alias] = rawExpr.as(alias) as unknown as SQL;
        rawExpressions.set(alias, rawExpr);
        meta.aggFields.push({ fn: key, fieldName, alias });
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
        meta.groupByFields.push(field);
      }
    }
  }

  let havingCondition: SQL | undefined;
  if (options.having && Object.keys(options.having).length > 0) {
    havingCondition = buildHavingClause(options.having, rawExpressions);
  }

  return { selectColumns, groupByColumns, joins, havingCondition, meta };
}
