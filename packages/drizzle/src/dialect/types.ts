import type { Column, SQL, Table } from 'drizzle-orm';

export type Dialect = 'pg' | 'mysql' | 'sqlite';

// Minimal Drizzle database client interface that is cover out needs
export interface DrizzleDatabase {
  select(fields?: Record<string, unknown>): DrizzleQueryBuilder;
  execute(query: SQL): Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(table: Table): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(table: Table): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(table: Table): any;
  transaction(fn: (tx: DrizzleDatabase) => Promise<unknown>, config?: unknown): Promise<unknown>;
}

// Query builder returned by db.select()
export interface DrizzleQueryBuilder {
  from(table: Table | unknown): DrizzleQueryBuilder;
  where(condition: SQL): DrizzleQueryBuilder;
  leftJoin(table: unknown, on: SQL): DrizzleQueryBuilder;
  orderBy(...columns: unknown[]): DrizzleQueryBuilder;
  groupBy(...columns: unknown[]): DrizzleQueryBuilder;
  having(condition: SQL): DrizzleQueryBuilder;
  limit(n: number): DrizzleQueryBuilder;
  offset(n: number): DrizzleQueryBuilder;
  as(name: string): unknown;
  iterator(): AsyncIterable<Record<string, unknown>>;
  then: Promise<unknown[]>['then'];
}

export interface DialectAdapter {
  dialect: Dialect;

  ilike(column: Column | SQL, value: string): SQL;
  notIlike(column: Column | SQL, value: string): SQL;

  arrayContains(column: Column, values: unknown[]): SQL;
  arrayContained(column: Column, values: unknown[]): SQL;
  arrayOverlaps(column: Column, values: unknown[]): SQL;

  jsonPath(column: Column, path: string[], castType?: string): SQL;
  quoteIdent(name: string): string;

  buildLimitedRelationQuery(
    db: DrizzleDatabase,
    table: Table,
    fkColumn: Column,
    parentValues: unknown[],
    limit: number,
  ): Promise<Record<string, unknown>[] | null>;

  supportsReturning: boolean;
  executeInsert(db: DrizzleDatabase, table: Table, data: unknown): Promise<unknown[]>;
  executeInsertMany(db: DrizzleDatabase, table: Table, data: unknown[]): Promise<unknown[]>;
  executeUpdate(db: DrizzleDatabase, table: Table, data: unknown, where?: SQL): Promise<unknown[]>;
  executeDelete(db: DrizzleDatabase, table: Table, where?: SQL): Promise<unknown[]>;
}
