import type { TableInfo } from '../introspect';

export function getPrimaryKeyField(tableInfo: TableInfo): string | undefined {
  for (const [name, def] of tableInfo.scalarFields) {
    if (def.primaryKey) return name;
  }
  return undefined;
}
