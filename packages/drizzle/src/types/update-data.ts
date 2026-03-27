import type { ExtractTablesWithRelations, One, Table } from 'drizzle-orm';

import type { InferTableInsert, RelationTargetName, TableRelationKeys } from './helpers';

type IsOneRelation<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> = TTableName extends keyof ExtractTablesWithRelations<TSchema>
  ? R extends keyof ExtractTablesWithRelations<TSchema>[TTableName]['relations']
    ? ExtractTablesWithRelations<TSchema>[TTableName]['relations'][R] extends One<string>
      ? true
      : false
    : false
  : false;

type TargetPKType<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> =
  RelationTargetName<TTableName, TSchema, R> extends infer Target extends string
    ? Target extends keyof TSchema
      ? TSchema[Target] extends Table & { $inferSelect: infer S }
        ? 'id' extends keyof S
          ? NonNullable<S['id']>
          : number | string
        : number | string
      : number | string
    : number | string;

// Join table insert type: all columns from the join table, excluding the source FK
type JoinTableInsertData<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> =
  RelationTargetName<TTableName, TSchema, R> extends infer Target extends string
    ? Target extends keyof TSchema
      ? TSchema[Target] extends Table & { $inferInsert: infer I }
        ? { _id: number | string } & Partial<Omit<I, 'id'>>
        : { _id: number | string; [key: string]: unknown }
      : { _id: number | string; [key: string]: unknown }
    : { _id: number | string; [key: string]: unknown };

type ManyConnectItem<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> = TargetPKType<TSchema, TTableName, R> | JoinTableInsertData<TSchema, TTableName, R>;

type OneRelationOps<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> = { connect: TargetPKType<TSchema, TTableName, R> } | { disconnect: true };

type ManyRelationOps<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> = {
  connect?: ManyConnectItem<TSchema, TTableName, R>[];
  disconnect?: TargetPKType<TSchema, TTableName, R>[];
  set?: ManyConnectItem<TSchema, TTableName, R>[];
};

type RelationOpsData<TSchema extends Record<string, unknown>, TKey extends string> = {
  [R in TableRelationKeys<TKey, TSchema>]?: IsOneRelation<TSchema, TKey, R> extends true
    ? OneRelationOps<TSchema, TKey, R>
    : ManyRelationOps<TSchema, TKey, R>;
};

export type UpdateData<
  TSchema extends Record<string, unknown>,
  TKey extends string,
> = TKey extends keyof TSchema
  ? Partial<InferTableInsert<TSchema[TKey]>> & RelationOpsData<TSchema, TKey>
  : Record<string, unknown>;
