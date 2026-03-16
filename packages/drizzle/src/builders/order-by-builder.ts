import { asc, desc } from 'drizzle-orm';
import type { Column, SQL, Table } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';

export interface OrderByEntry {
  field: string;
  order: 'asc' | 'desc';
}

export function buildOrderBy(
  orderBy: OrderByEntry | OrderByEntry[] | undefined,
  table: Table,
  metadata: EntityMetadata,
  computedSqlMap: Map<string, SQL>,
  derivedAliasMap: Map<string, { column: Column | SQL }>,
): SQL[] {
  if (!orderBy) return [];

  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const result: SQL[] = [];
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
      // Dot notation: 'orderSummary.totalAmount' -> derivedAliasMap key 'orderSummary_totalAmount'
      const [parent, sub] = entry.field.split('.');
      if (parent && sub) {
        column = derivedAliasMap.get(`${parent}_${sub}`)?.column;
      }
    }

    if (column) {
      result.push(direction(column as Column));
    }
  }

  return result;
}
