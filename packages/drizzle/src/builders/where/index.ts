import { and, not, or, sql, SQL } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import { isObject } from '@relayerjs/core';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../../dialect';
import type { TableInfo } from '../../introspect';
import { derivedSubFieldKey, getTableColumns } from '../../utils';
import { buildJsonWhere, isOperatorObject } from './json';
import { applyOperators } from './operators';
import { buildRelationFilter } from './relations';

export interface WhereBuilderContext {
  table: Table;
  tableInfo: TableInfo;
  metadata: EntityMetadata;
  schema: Record<string, unknown>;
  allTables: Map<string, TableInfo>;
  computedSqlMap: Map<string, SQL>;
  derivedAliasMap: Map<string, { column: Column | SQL }>;
  adapter: DialectAdapter;
  registry?: EntityRegistry;
  db?: DrizzleDatabase;
  queryContext?: unknown;
}

export function buildWhere(
  where: Record<string, unknown>,
  ctx: WhereBuilderContext,
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if ((key === 'AND' || key === 'OR') && Array.isArray(value)) {
      const nested = value
        .map((w) => buildWhere(w as Record<string, unknown>, ctx))
        .filter(Boolean) as SQL[];
      const combinator = key === 'AND' ? and : or;
      if (nested.length > 0) conditions.push(combinator(...nested)!);
      continue;
    }

    if (key === 'NOT' && isObject(value)) {
      const nested = buildWhere(value as Record<string, unknown>, ctx);
      if (nested) conditions.push(not(nested));
      continue;
    }

    if (key === '$raw' && typeof value === 'function') {
      const rawResult = (
        value as (ctx: { table: unknown; sql: typeof sql; schema: unknown }) => unknown
      )({
        table: ctx.table,
        sql,
        schema: ctx.schema,
      });
      if (rawResult instanceof SQL) {
        conditions.push(rawResult);
      }
      continue;
    }

    if (ctx.metadata.scalarFields.has(key)) {
      const column = getTableColumns(ctx.table)[key];
      if (!column) continue;

      const fieldDef = ctx.metadata.scalarFields.get(key)!;
      if (
        fieldDef.valueType === 'json' &&
        typeof value === 'object' &&
        value !== null &&
        !isOperatorObject(value)
      ) {
        const cond = buildJsonWhere(column, value as Record<string, unknown>, [], ctx.adapter);
        if (cond) conditions.push(cond);
      } else {
        const cond = applyOperators(column, value, ctx.adapter);
        if (cond) conditions.push(cond);
      }
      continue;
    }

    if (ctx.metadata.computedFields.has(key)) {
      const sqlExpr = ctx.computedSqlMap.get(key);
      if (sqlExpr) {
        const cond = applyOperators(sqlExpr, value, ctx.adapter);
        if (cond) conditions.push(cond);
      }
      continue;
    }

    if (ctx.metadata.derivedFields.has(key)) {
      const fieldDef = ctx.metadata.derivedFields.get(key)!;
      const isObjectType =
        typeof fieldDef.valueType === 'object' && !Array.isArray(fieldDef.valueType);

      if (isObjectType && isObject(value)) {
        const subConditions: SQL[] = [];
        for (const [subField, subValue] of Object.entries(value as Record<string, unknown>)) {
          if (subValue === undefined) continue;
          const subAlias = ctx.derivedAliasMap.get(derivedSubFieldKey(key, subField));
          if (subAlias) {
            const cond = applyOperators(subAlias.column, subValue, ctx.adapter);
            if (cond) subConditions.push(cond);
          }
        }
        if (subConditions.length > 0) {
          conditions.push(subConditions.length === 1 ? subConditions[0]! : and(...subConditions)!);
        }
      } else {
        const alias = ctx.derivedAliasMap.get(key);
        if (alias) {
          const cond = applyOperators(alias.column, value, ctx.adapter);
          if (cond) conditions.push(cond);
        }
      }
      continue;
    }

    if (ctx.metadata.relationFields.has(key)) {
      const cond = buildRelationFilter(key, value, ctx);
      if (cond) conditions.push(cond);
      continue;
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}
