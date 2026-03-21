// Infer utility types — extract where/select/orderBy/data types from any Relayer client.
// These are ORM-agnostic and work with any adapter (Drizzle, Kysely, TypeORM, etc.)

export type InferEntityWhere<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: infer O): unknown }
    ? O extends { where?: infer W }
      ? NonNullable<W>
      : never
    : never
  : never;

export type InferEntitySelect<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: infer O): unknown }
    ? O extends { select?: infer S }
      ? NonNullable<S>
      : never
    : never
  : never;

export type InferEntityOrderBy<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: infer O): unknown }
    ? O extends { orderBy?: infer OB }
      ? NonNullable<OB> extends (infer Single)[] | infer Single
        ? Single
        : never
      : never
    : never
  : never;

export type InferEntityResult<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: unknown): Promise<infer R> }
    ? R extends (infer Item)[]
      ? Item
      : never
    : never
  : never;

export type InferCreateData<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { create(options: { data: infer D }): unknown }
    ? D
    : never
  : never;

export type InferUpdateData<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { update(options: { data: infer D; where: unknown }): unknown }
    ? D
    : never
  : never;
