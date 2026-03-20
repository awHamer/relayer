import { mysqlAdapter } from './mysql';
import { pgAdapter } from './pg';
import { sqliteAdapter } from './sqlite';
import type { Dialect, DialectAdapter } from './types';

export type { Dialect, DialectAdapter, DrizzleDatabase, DrizzleQueryBuilder } from './types';
export { detectDialect } from './detect';
export { pgAdapter } from './pg';
export { mysqlAdapter } from './mysql';
export { sqliteAdapter } from './sqlite';

export function createDialectAdapter(dialect: Dialect): DialectAdapter {
  switch (dialect) {
    case 'pg':
      return pgAdapter;
    case 'mysql':
      return mysqlAdapter;
    case 'sqlite':
      return sqliteAdapter;
  }
}
