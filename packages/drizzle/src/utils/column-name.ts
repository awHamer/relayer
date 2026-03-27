import type { Column, Table } from 'drizzle-orm';

import { getTableColumns } from './table-columns';

export function findColumnTsName(column: Column): string | undefined {
  const tableObj = getTableColumns(column.table as Table);
  for (const [key, col] of Object.entries(tableObj)) {
    if (col === column) return key;
  }
  return undefined;
}
