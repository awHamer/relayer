import type { ExtractTablesWithRelations, Table } from 'drizzle-orm';
import type {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  DotPaths,
  NumberOperators,
  StringOperators,
} from '@relayerjs/core';

// Hidden metadata key - unique symbol doesn't show in IDE autocomplete
declare const MODEL_META: unique symbol;

export type ModelMeta<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> = { [MODEL_META]: { schema: TSchema; entities: TEntities; key: TKey } };

export type ExtractMeta<TModel> = TModel extends {
  [MODEL_META]: { schema: infer S; entities: infer E; key: infer K };
}
  ? { schema: S & Record<string, unknown>; entities: E & Record<string, unknown>; key: K & string }
  : never;

// Table type extraction
export type InferTableSelect<TTable> = TTable extends Table & { $inferSelect: infer S }
  ? S
  : Record<string, unknown>;
export type InferTableInsert<TTable> = TTable extends Table & { $inferInsert: infer I }
  ? I
  : Record<string, unknown>;

export type TableColumnKeys<TTable> = keyof InferTableSelect<TTable> & string;

export type NumericColumnKeys<TTable> = {
  [K in keyof InferTableSelect<TTable> & string]: NonNullable<InferTableSelect<TTable>[K]> extends
    | number
    | bigint
    | string
    ? K
    : never;
}[keyof InferTableSelect<TTable> & string];

// Relation helpers
export type TableRelationKeys<TTableName extends string, TSchema> =
  TSchema extends Record<string, unknown>
    ? TTableName extends keyof ExtractTablesWithRelations<TSchema>
      ? keyof ExtractTablesWithRelations<TSchema>[TTableName]['relations'] & string
      : never
    : never;

type DbNameToTsName<TSchema extends Record<string, unknown>> = {
  [K in keyof ExtractTablesWithRelations<TSchema> &
    string as ExtractTablesWithRelations<TSchema>[K]['dbName']]: K;
};

type ReferencedDbName<
  TTableName extends string,
  TSchema extends Record<string, unknown>,
  K extends string,
> = TTableName extends keyof ExtractTablesWithRelations<TSchema>
  ? K extends keyof ExtractTablesWithRelations<TSchema>[TTableName]['relations']
    ? ExtractTablesWithRelations<TSchema>[TTableName]['relations'][K]['referencedTableName']
    : never
  : never;

export type RelationTargetName<
  TTableName extends string,
  TSchema extends Record<string, unknown>,
  K extends string,
> =
  ReferencedDbName<TTableName, TSchema, K> extends infer DbName extends string
    ? DbName extends keyof DbNameToTsName<TSchema>
      ? DbNameToTsName<TSchema>[DbName]
      : DbName
    : never;

// Model instance type: class entity -> InstanceType, plain table -> InferTableSelect
export type ModelInstance<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  K extends string,
> = K extends keyof TEntities
  ? TEntities[K] extends new (...args: unknown[]) => infer I
    ? I
    : K extends keyof TSchema
      ? InferTableSelect<TSchema[K]>
      : Record<string, unknown>
  : K extends keyof TSchema
    ? InferTableSelect<TSchema[K]>
    : Record<string, unknown>;

// Custom field keys: instance keys minus scalar column keys
export type CustomFieldKeys<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  K extends string,
> = K extends keyof TSchema
  ? Exclude<keyof ModelInstance<TSchema, TEntities, K> & string, TableColumnKeys<TSchema[K]>>
  : never;

// Operators from TS type
export type JsonWhereOps<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? JsonWhereOps<T[K]> : OpsForTSType<T[K]>;
} & {
  isNull?: boolean;
  isNotNull?: boolean;
};

export type OpsForTSType<T> = T extends string
  ? string | StringOperators
  : T extends number
    ? number | NumberOperators
    : T extends boolean
      ? boolean | BooleanOperators
      : T extends Date
        ? Date | string | DateOperators
        : T extends Array<infer U>
          ? ArrayOperators<U>
          : T extends Record<string, unknown>
            ? JsonWhereOps<T>
            : unknown;

// Full entity shape: own fields + relation targets as nested objects (always singular)
export type EntityWithRelations<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> = ModelInstance<TSchema, TEntities, TKey> & {
  [R in TableRelationKeys<TKey, TSchema>]: ModelInstance<
    TSchema,
    TEntities,
    RelationTargetName<TKey, TSchema, R> & string
  >;
};

// All valid dot paths for an entity
export type ModelDotPaths<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> = DotPaths<EntityWithRelations<TSchema, TEntities, TKey>, 5>;
