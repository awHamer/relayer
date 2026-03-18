import { asc, desc } from 'drizzle-orm';
import type { Column, SQL, Table } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';

import type { DialectAdapter } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveRelationJoin } from './relation-join';

export interface OrderByEntry {
  field: string;
  order: 'asc' | 'desc';
}

export interface OrderByResult {
  clauses: SQL[];
  joins: Array<{ table: Table; on: SQL; relationName: string }>;
}

export function buildOrderBy(
  orderBy: OrderByEntry | OrderByEntry[] | undefined,
  table: Table,
  metadata: EntityMetadata,
  computedSqlMap: Map<string, SQL>,
  derivedAliasMap: Map<string, { column: Column | SQL }>,
  allTables: Map<string, TableInfo>,
  schema: Record<string, unknown>,
  adapter: DialectAdapter,
): OrderByResult {
  if (!orderBy) return { clauses: [], joins: [] };

  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const clauses: SQL[] = [];
  const joins: Array<{ table: Table; on: SQL; relationName: string }> = [];
  const joinedRelations = new Set<string>();
  const tableColumns = table as unknown as Record<string, Column>;

  for (const entry of entries) {
    const direction = entry.order === 'desc' ? desc : asc;
    let column: Column | SQL | undefined;

    if (metadata.scalarFields.has(entry.field)) {
      column = tableColumns[entry.field];
    } else if (metadata.computedFields.has(entry.field)) {
      column = computedSqlMap.get(entry.field);
    } else if (metadata.derivedFields.has(entry.field)) {
      column = derivedAliasMap.get(entry.field)?.column;
    } else if (entry.field.includes('.')) {
      const [parent, ...rest] = entry.field.split('.');
      if (!parent || rest.length === 0) continue;

      // 1. Derived object dot notation (existing): 'orderSummary.totalAmount'
      if (metadata.derivedFields.has(parent) && rest.length === 1) {
        column = derivedAliasMap.get(`${parent}_${rest[0]}`)?.column;
      }
      // 2. Relation dot notation (new): 'author.firstName'
      else if (metadata.relationFields.has(parent) && rest.length === 1) {
        const resolved = resolveRelationJoin(parent, rest[0]!, metadata, allTables, schema);
        if (resolved) {
          column = resolved.column;
          if (!joinedRelations.has(parent)) {
            joinedRelations.add(parent);
            joins.push({
              table: resolved.targetTable,
              on: resolved.joinCondition,
              relationName: parent,
            });
          }
        }
      }
      // 3. JSON path dot notation (new): 'metadata.role' or 'metadata.settings.theme'
      else if (metadata.scalarFields.has(parent)) {
        const fieldDef = metadata.scalarFields.get(parent)!;
        if (fieldDef.valueType === 'json') {
          const col = tableColumns[parent];
          if (col) {
            column = adapter.jsonPath(col, rest);
          }
        }
      }
    }

    if (column) {
      clauses.push(direction(column as Column));
    }
  }

  return { clauses, joins };
}
