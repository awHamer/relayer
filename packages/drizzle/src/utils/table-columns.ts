import type { Column, Table } from 'drizzle-orm';

// Access table columns by name. Drizzle tables expose columns as properties
// but Table type doesn't reflect this. Single cast point instead of spreading `as unknown as Record` everywhere.
export function getTableColumns(table: Table): Record<string, Column> {
  return table as unknown as Record<string, Column>;
}
