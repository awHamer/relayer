import { sql } from 'drizzle-orm';
import { RelayerDialectError } from '@relayerjs/core';

import type { DialectAdapter } from './types';

export const mysqlAdapter: DialectAdapter = {
  dialect: 'mysql',

  ilike: (col, val) => sql`LOWER(${col}) LIKE LOWER(${val})`,
  notIlike: (col, val) => sql`LOWER(${col}) NOT LIKE LOWER(${val})`,

  arrayContains: () => {
    throw new RelayerDialectError('mysql', 'Array operators are not supported in MySQL. Use JSON columns instead.');
  },
  arrayContained: () => {
    throw new RelayerDialectError('mysql', 'Array operators are not supported in MySQL. Use JSON columns instead.');
  },
  arrayOverlaps: () => {
    throw new RelayerDialectError('mysql', 'Array operators are not supported in MySQL. Use JSON columns instead.');
  },

  jsonPath: (col, path, castType) => {
    const jsonPathStr = '$.' + path.join('.');
    const expr = sql`${col}->>${sql.raw(`'${jsonPathStr}'`)}`;
    if (castType === 'numeric') return sql`CAST(${expr} AS DECIMAL)`;
    if (castType === 'boolean') return sql`CAST(${expr} AS UNSIGNED)`;
    return expr;
  },

  supportsReturning: false,
  executeInsert: async (db: any, table, data) => {
    const result = await db.insert(table).values(data);
    // MySQL: no .returning(), insertId + SELECT instead
    if (result.insertId) {
      return db
        .select()
        .from(table)
        .where(sql`id = ${result.insertId}`);
    }
    return [data];
  },
  executeInsertMany: async (db: any, table, data) => {
    if (data.length === 0) return [];
    await db.insert(table).values(data);
    // MySQL: can't easily return all inserted rows, return input data
    return data;
  },
  executeUpdate: async (db: any, table, data, where) => {
    let q = db.update(table).set(data);
    if (where) q = q.where(where);
    await q;
    // MySQL: return an empty arr (the caller has to requery if needed)
    return [];
  },
  executeDelete: async (db: any, table, where) => {
    let q = db.delete(table);
    if (where) q = q.where(where);
    await q;
    return [];
  },
};
