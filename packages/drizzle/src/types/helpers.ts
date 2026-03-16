import type { ExtractTablesWithRelations, Table } from 'drizzle-orm';
import type {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  NumberOperators,
  StringOperators,
  ValueType,
} from '@relayerjs/core';

import type { ValueTypeToTS } from './entity-config';

export type InferTableSelect<TTable> = TTable extends Table & { $inferSelect: infer S }
  ? S
  : Record<string, unknown>;
export type InferTableInsert<TTable> = TTable extends Table & { $inferInsert: infer I }
  ? I
  : Record<string, unknown>;

export type TableColumnKeys<TTable> = keyof InferTableSelect<TTable> & string;

export type TableRelationKeys<TTableName extends string, TSchema> =
  TSchema extends Record<string, unknown>
    ? TTableName extends keyof ExtractTablesWithRelations<TSchema>
      ? keyof ExtractTablesWithRelations<TSchema>[TTableName]['relations'] & string
      : never
    : never;

// Maps DB table name -> TS schema key (reverse lookup)
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
> = ReferencedDbName<TTableName, TSchema, K> extends infer DbName extends string
  ? DbName extends keyof DbNameToTsName<TSchema>
    ? DbNameToTsName<TSchema>[DbName]
    : DbName
  : never;

export type RelationTargetTable<
  TTableName extends string,
  TSchema extends Record<string, unknown>,
  K extends string,
> =
  RelationTargetName<TTableName, TSchema, K> extends infer TsName extends string
    ? TsName extends keyof TSchema
      ? TSchema[TsName]
      : never
    : never;

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

export type OpsForValueType<VT extends ValueType> = VT extends keyof ValueTypeToTS
  ? OpsForTSType<ValueTypeToTS[VT]>
  : VT extends Record<string, keyof ValueTypeToTS>
    ? { [K in keyof VT]?: OpsForTSType<ValueTypeToTS[VT[K] & keyof ValueTypeToTS]> }
    : unknown;

export type EntityFields<TEntityConfig> = TEntityConfig extends { fields?: infer F }
  ? F extends Record<string, { valueType: ValueType }>
    ? F
    : {}
  : {};

export type ExtractValueType<T> = T extends { valueType: infer VT extends ValueType } ? VT : never;
