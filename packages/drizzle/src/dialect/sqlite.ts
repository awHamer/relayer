import { sql } from 'drizzle-orm';
import { RelayerDialectError } from '@relayerjs/core';

import type { DialectAdapter } from './types';

export const sqliteAdapter: DialectAdapter = {
  dialect: 'sqlite',

  ilike: (col, val) => sql`${col} LIKE ${val} COLLATE NOCASE`,
  notIlike: (col, val) => sql`${col} NOT LIKE ${val} COLLATE NOCASE`,

  arrayContains: () => {
    throw new RelayerDialectError('sqlite', 'Array operators are not supported in SQLite. Use JSON columns instead.');
  },
  arrayContained: () => {
    throw new RelayerDialectError('sqlite', 'Array operators are not supported in SQLite. Use JSON columns instead.');
  },
  arrayOverlaps: () => {
    throw new RelayerDialectError('sqlite', 'Array operators are not supported in SQLite. Use JSON columns instead.');
  },

  jsonPath: (col, path, castType) => {
    const jsonPathStr = '$.' + path.join('.');
    const expr = sql`json_extract(${col}, ${sql.raw(`'${jsonPathStr}'`)})`;
    if (castType === 'numeric') return sql`CAST(${expr} AS REAL)`;
    return expr;
  },

  supportsReturning: true,
  executeInsert: async (db, table, data) => db.insert(table).values(data).returning(),
  executeInsertMany: async (db, table, data) => {
    if (data.length === 0) return [];
    return db.insert(table).values(data).returning();
  },
  executeUpdate: async (db, table, data, where) => {
    let q = db.update(table).set(data);
    if (where) q = q.where(where);
    return q.returning();
  },
  executeDelete: async (db, table, where) => {
    let q = db.delete(table);
    if (where) q = q.where(where);
    return q.returning();
  },
};
