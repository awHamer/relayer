import type { Column, SQL, Table } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';

export interface SelectResult {
  columns: Record<string, Column | SQL>;
  requestedRelations: string[];
  relationSelects: Map<string, Record<string, unknown>>;
  requestedComputed: string[];
  requestedDerived: string[];
}

export function buildSelect(
  select: Record<string, unknown> | undefined,
  table: Table,
  metadata: EntityMetadata,
  computedSqlMap: Map<string, SQL>,
): SelectResult {
  const columns: Record<string, Column | SQL> = {};
  const requestedRelations: string[] = [];
  const relationSelects = new Map<string, Record<string, unknown>>();
  const requestedComputed: string[] = [];
  const requestedDerived: string[] = [];
  const tableColumns = table as unknown as Record<string, Column>;

  if (!select) {
    for (const [fieldName] of metadata.scalarFields) {
      const col = tableColumns[fieldName];
      if (col) columns[fieldName] = col;
    }
    return { columns, requestedRelations, relationSelects, requestedComputed, requestedDerived };
  }

  for (const [fieldName, value] of Object.entries(select)) {
    if (!value) continue;

    if (metadata.scalarFields.has(fieldName)) {
      const col = tableColumns[fieldName];
      if (col) columns[fieldName] = col;
      continue;
    }

    if (metadata.computedFields.has(fieldName)) {
      const sqlExpr = computedSqlMap.get(fieldName);
      if (sqlExpr) {
        columns[fieldName] = sqlExpr;
        requestedComputed.push(fieldName);
      }
      continue;
    }

    if (metadata.derivedFields.has(fieldName)) {
      requestedDerived.push(fieldName);
      continue;
    }

    if (metadata.relationFields.has(fieldName)) {
      requestedRelations.push(fieldName);
      if (typeof value === 'object' && value !== null) {
        relationSelects.set(fieldName, value as Record<string, unknown>);
      }
      continue;
    }
  }

  // Ensure all scalar fields included when relations requested (FK columns needed for matching)
  if (requestedRelations.length > 0) {
    for (const [fieldName] of metadata.scalarFields) {
      if (!columns[fieldName]) {
        const col = tableColumns[fieldName];
        if (col) columns[fieldName] = col;
      }
    }
  }

  return { columns, requestedRelations, relationSelects, requestedComputed, requestedDerived };
}
