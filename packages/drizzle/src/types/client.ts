import type { EntityAggregateOptions } from './aggregate';
import type { SchemaTableKeys } from './entity-config';
import type { InferTableInsert, InferTableSelect } from './helpers';
import type { EntityOrderBy } from './order-by';
import type { EntitySelect } from './select';
import type { EntityWhere } from './where';

/** Typed entity client with CRUD, aggregation, and query methods. */
export interface TypedEntityClient<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TContext = unknown,
> {
  /** Query multiple records with optional select, where, orderBy, limit, and offset. */
  findMany(options?: {
    select?: EntitySelect<TTable, TEntityConfig, TTableName, TSchema>;
    where?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
    orderBy?: EntityOrderBy<TTable, TEntityConfig> | EntityOrderBy<TTable, TEntityConfig>[];
    limit?: number;
    offset?: number;
    context?: TContext;
  }): Promise<Partial<InferTableSelect<TTable>> & Record<string, unknown>[]>;

  /** Query a single record. Returns `null` if not found. */
  findFirst(options?: {
    select?: EntitySelect<TTable, TEntityConfig, TTableName, TSchema>;
    where?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
    orderBy?: EntityOrderBy<TTable, TEntityConfig> | EntityOrderBy<TTable, TEntityConfig>[];
    context?: TContext;
  }): Promise<(Partial<InferTableSelect<TTable>> & Record<string, unknown>) | null>;

  /** Count records matching an optional where condition. */
  count(options?: {
    where?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
    context?: TContext;
  }): Promise<number>;

  /** Run aggregate functions (_count, _sum, _avg, _min, _max) with optional groupBy. */
  aggregate(
    options: EntityAggregateOptions<TTable, TEntityConfig, TTableName, TSchema>,
  ): Promise<Record<string, unknown>[] | Record<string, unknown>>;

  /** Insert a single record. Returns the created row. */
  create(options: { data: InferTableInsert<TTable> }): Promise<InferTableSelect<TTable>>;

  /** Insert multiple records. Returns all created rows. */
  createMany(options: { data: InferTableInsert<TTable>[] }): Promise<InferTableSelect<TTable>[]>;

  /** Update a single record matching where. Returns the updated row. */
  update(options: {
    where: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
    data: Partial<InferTableInsert<TTable>>;
  }): Promise<InferTableSelect<TTable>>;

  /** Update multiple records matching where. Returns `{ count }`. */
  updateMany(options: {
    where: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
    data: Partial<InferTableInsert<TTable>>;
  }): Promise<{ count: number }>;

  /** Delete a single record matching where. Returns the deleted row. */
  delete(options: {
    where: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
  }): Promise<InferTableSelect<TTable>>;

  /** Delete multiple records matching where. Returns `{ count }`. */
  deleteMany(options: {
    where: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
  }): Promise<{ count: number }>;
}

/** Proxy-based client mapping each schema table to a {@link TypedEntityClient}. */
export type RelayerClient<
  TSchema extends Record<string, unknown>,
  TEntities,
  TContext = unknown,
  TDb = unknown,
> = {
  [K in SchemaTableKeys<TSchema>]: TypedEntityClient<
    TSchema[K],
    K extends keyof TEntities ? (TEntities[K] extends object ? TEntities[K] : {}) : {},
    K,
    TSchema,
    TContext
  >;
} & {
  /** Direct access to the underlying Drizzle ORM instance. */
  $orm: TDb;
  /** Returns the underlying Drizzle ORM instance. */
  getOrm(): TDb;
  /** Execute a callback within a database transaction. Throw inside to rollback. */
  $transaction<T>(
    callback: (tx: RelayerClient<TSchema, TEntities, TContext, TDb>) => Promise<T>,
    config?: {
      isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
      accessMode?: 'read only' | 'read write';
      deferrable?: boolean;
    },
  ): Promise<T>;
};
