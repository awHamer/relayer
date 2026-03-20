import type { TableInfo } from '../introspect';

/**
 * Returns the first primary key field name from table metadata
 */
export function getPrimaryKeyField(tableInfo: TableInfo): string | undefined {
  for (const [name, def] of tableInfo.scalarFields) {
    if (def.primaryKey) return name;
  }
  return undefined;
}
