import type { Column, SQL, Table } from 'drizzle-orm';

export type Dialect = 'pg' | 'mysql' | 'sqlite';

export interface DialectAdapter {
  dialect: Dialect;

  // Case-insensitive LIKE
  ilike(column: Column | SQL, value: string): SQL;
  notIlike(column: Column | SQL, value: string): SQL;

  // Array operators (PG only, others throw)
  arrayContains(column: Column, values: unknown[]): SQL;
  arrayContained(column: Column, values: unknown[]): SQL;
  arrayOverlaps(column: Column, values: unknown[]): SQL;

  // JSON path extraction
  jsonPath(column: Column, path: string[], castType?: string): SQL;

  // Mutation support
  supportsReturning: boolean;
  executeInsert(db: any, table: Table, data: any): Promise<any[]>;
  executeInsertMany(db: any, table: Table, data: any[]): Promise<any[]>;
  executeUpdate(db: any, table: Table, data: any, where?: SQL): Promise<any[]>;
  executeDelete(db: any, table: Table, where?: SQL): Promise<any[]>;
}
