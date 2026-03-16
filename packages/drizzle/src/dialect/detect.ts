import { is } from 'drizzle-orm';
import { MySqlTable } from 'drizzle-orm/mysql-core';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { Dialect } from './types';

export function detectDialect(schema: Record<string, unknown>): Dialect {
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) return 'pg';
    if (is(value, MySqlTable)) return 'mysql';
    if (is(value, SQLiteTable)) return 'sqlite';
  }
  return 'pg';
}
