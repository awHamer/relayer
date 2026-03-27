import {
  arrayContained as arrayContainedFn,
  arrayContains as arrayContainsFn,
  arrayOverlaps as arrayOverlapsFn,
  ilike,
  sql,
} from 'drizzle-orm';
import type { Column, SQL } from 'drizzle-orm';

import { assertSafeIdentifier } from '../utils';
import { buildRowNumberQuery } from './relation-limit';
import type { DialectAdapter } from './types';

export const pgAdapter: DialectAdapter = {
  dialect: 'pg',

  ilike: (col, val) => ilike(col as Column, val),
  notIlike: (col, val) => sql`${col} not ilike ${val}`,

  arrayContains: (col, vals) => arrayContainsFn(col, vals),
  arrayContained: (col, vals) => arrayContainedFn(col, vals),
  arrayOverlaps: (col, vals) => arrayOverlapsFn(col, vals),

  jsonPath: (col, path, castType) => {
    let expr: SQL = sql`${col}`;
    for (let i = 0; i < path.length; i++) {
      const op = i === path.length - 1 ? '->>' : '->';
      const segment = assertSafeIdentifier(path[i]!);
      expr = sql`${expr}${sql.raw(op)}'${sql.raw(segment)}'`;
    }
    if (castType) {
      expr = sql`(${expr})::${sql.raw(castType)}`;
    }
    return expr;
  },

  castToText: (col) => sql`(${col})::text`,

  quoteIdent: (name) => `"${name}"`,

  buildLimitedRelationQuery: async (db, table, fkColumn, parentValues, limit) => {
    return buildRowNumberQuery(db, table, fkColumn, parentValues, limit);
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
