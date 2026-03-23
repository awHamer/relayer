import { getTableColumns, getTableName, sql } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';

import type { DrizzleDatabase } from './types';

export async function buildRowNumberQuery(
  db: DrizzleDatabase,
  table: Table,
  fkColumn: Column,
  parentValues: unknown[],
  limit: number,
): Promise<Record<string, unknown>[] | null> {
  if (typeof db.execute !== 'function') return null;

  const tableName = getTableName(table);
  const columns = getTableColumns(table);
  const fkDbName = fkColumn.name;

  const columnEntries = Object.entries(columns);
  const selectList = columnEntries.map(([, col]) => `"${col.name}"`).join(', ');

  const inValues = sql.join(
    parentValues.map((v) => sql`${v}`),
    sql`, `,
  );

  const query = sql`SELECT ${sql.raw(selectList)} FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY "${sql.raw(fkDbName)}") as "__rn" FROM "${sql.raw(tableName)}" WHERE "${sql.raw(fkDbName)}" IN (${inValues})) "__sub" WHERE "__rn" <= ${limit}`;

  try {
    const rawRows = (await db.execute(query)) as unknown as Record<string, unknown>[];

    const dbToTs = new Map<string, string>();
    for (const [tsName, col] of columnEntries) {
      dbToTs.set(col.name, tsName);
    }

    return rawRows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key === '__rn') continue;
        const tsKey = dbToTs.get(key) ?? key;
        mapped[tsKey] = value;
      }
      return mapped;
    });
  } catch {
    return null;
  }
}
