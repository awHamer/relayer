import { getTableColumns, getTableName } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import type { ScalarFieldDef, ValueType } from '@relayerjs/core';

const DATA_TYPE_MAP: Record<string, ValueType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  json: 'json',
  bigint: 'number',
  custom: 'string',
  buffer: 'string',
  array: 'array',
};

export interface TableInfo {
  tableName: string;
  tsName: string;
  table: Table;
  scalarFields: Map<string, ScalarFieldDef>;
}

export function readSchema(schema: Record<string, unknown>): Map<string, TableInfo> {
  const tables = new Map<string, TableInfo>();

  for (const [tsName, tableOrValue] of Object.entries(schema)) {
    if (!isTable(tableOrValue)) continue;

    const tableName = getTableName(tableOrValue);
    const columns = getTableColumns(tableOrValue);
    const scalarFields = new Map<string, ScalarFieldDef>();

    for (const [fieldName, column] of Object.entries(columns)) {
      const col = column as { dataType: string; notNull: boolean; primary?: boolean };
      scalarFields.set(fieldName, {
        kind: 'scalar',
        name: fieldName,
        valueType: DATA_TYPE_MAP[col.dataType] ?? 'string',
        nullable: !col.notNull,
        primaryKey: col.primary ?? false,
      });
    }

    tables.set(tsName, { tableName, tsName, table: tableOrValue, scalarFields });
  }

  return tables;
}

function isTable(value: unknown): value is Table {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.for('drizzle:Name') in (value as Record<symbol, unknown>)
  );
}
