/**
 * Extract EntityWhere type for a specific entity from a RelayerClient.
 *
 * @example
 * const r = createRelayerDrizzle({ db, schema, entities });
 * type UserWhere = InferEntityWhere<typeof r, 'users'>;
 */
export type InferEntityWhere<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: infer O): unknown }
    ? O extends { where?: infer W }
      ? NonNullable<W>
      : never
    : never
  : never;

/**
 * Extract EntitySelect type for a specific entity from a RelayerClient.
 *
 * @example
 * const r = createRelayerDrizzle({ db, schema, entities });
 * type UserSelect = InferEntitySelect<typeof r, 'users'>;
 */
export type InferEntitySelect<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: infer O): unknown }
    ? O extends { select?: infer S }
      ? NonNullable<S>
      : never
    : never
  : never;

/**
 * Extract EntityOrderBy type for a specific entity from a RelayerClient.
 *
 * @example
 * const r = createRelayerDrizzle({ db, schema, entities });
 * type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;
 */
export type InferEntityOrderBy<TClient, TEntity extends string> = TEntity extends keyof TClient
  ? TClient[TEntity] extends { findMany(options?: infer O): unknown }
    ? O extends { orderBy?: infer OB }
      ? NonNullable<OB> extends (infer Single)[] | infer Single
        ? Single
        : never
      : never
    : never
  : never;
