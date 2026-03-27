import { sql } from 'drizzle-orm';
import { RelayerDialectError } from '@relayerjs/core';

import { assertSafeIdentifier } from '../utils';
import { buildRowNumberQuery } from './relation-limit';
import type { DialectAdapter } from './types';

export const mysqlAdapter: DialectAdapter = {
  dialect: 'mysql',

  ilike: (col, val) => sql`LOWER(${col}) LIKE LOWER(${val})`,
  notIlike: (col, val) => sql`LOWER(${col}) NOT LIKE LOWER(${val})`,

  arrayContains: () => {
    throw new RelayerDialectError(
      'mysql',
      'Array operators are not supported in MySQL. Use JSON columns instead.',
    );
  },
  arrayContained: () => {
    throw new RelayerDialectError(
      'mysql',
      'Array operators are not supported in MySQL. Use JSON columns instead.',
    );
  },
  arrayOverlaps: () => {
    throw new RelayerDialectError(
      'mysql',
      'Array operators are not supported in MySQL. Use JSON columns instead.',
    );
  },

  jsonPath: (col, path, castType) => {
    const jsonPathStr = '$.' + path.map((s) => assertSafeIdentifier(s)).join('.');
    const expr = sql`${col}->>${sql.raw(`'${jsonPathStr}'`)}`;
    if (castType === 'numeric') return sql`CAST(${expr} AS DECIMAL)`;
    if (castType === 'boolean') return sql`CAST(${expr} AS UNSIGNED)`;
    return expr;
  },

  castToText: (col) => sql`CAST(${col} AS CHAR)`,

  quoteIdent: (name) => `\`${name}\``,

  buildLimitedRelationQuery: async (db, table, fkColumn, parentValues, limit) => {
    return buildRowNumberQuery(db, table, fkColumn, parentValues, limit);
  },

  supportsReturning: false,
  executeInsert: async (db, table, data) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MySQL insert returns insertId not in DrizzleDatabase interface
    const result = (await (db as any).insert(table).values(data)) as { insertId?: number };
    if (result.insertId) {
      return db
        .select()
        .from(table)
        .where(sql`id = ${result.insertId}`);
    }
    return [data];
  },
  executeInsertMany: async (db, table, data) => {
    if (data.length === 0) return [];
    await db.insert(table).values(data);
    // MySQL: can't easily return all inserted rows, return input data
    return data;
  },
  executeUpdate: async (db, table, data, where) => {
    let q = db.update(table).set(data);
    if (where) q = q.where(where);
    await q;
    // MySQL: return an empty arr (the caller has to requery if needed)
    return [];
  },
  executeDelete: async (db, table, where) => {
    let q = db.delete(table);
    if (where) q = q.where(where);
    await q;
    return [];
  },
};
