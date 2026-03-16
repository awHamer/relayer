import type {
  EntityFields,
  ExtractValueType,
  InferTableSelect,
  OpsForTSType,
  OpsForValueType,
  RelationTargetName,
  TableColumnKeys,
  TableRelationKeys,
} from './helpers';

type ScalarWhereFields<TTable> = {
  [K in TableColumnKeys<TTable>]?: OpsForTSType<InferTableSelect<TTable>[K]>;
};

type CustomFieldsWhere<TEntityConfig> = {
  [K in keyof EntityFields<TEntityConfig>]?: OpsForValueType<
    ExtractValueType<EntityFields<TEntityConfig>[K]>
  >;
};

type RelationNestedWhere<
  TTargetName extends string,
  TSchema extends Record<string, unknown>,
> = TTargetName extends keyof TSchema
  ? ScalarWhereFields<TSchema[TTargetName]> &
      RelationWhereFields<TTargetName, TSchema> & {
        AND?: RelationNestedWhere<TTargetName, TSchema>[];
        OR?: RelationNestedWhere<TTargetName, TSchema>[];
        NOT?: RelationNestedWhere<TTargetName, TSchema>;
      }
  : Record<string, unknown>;

type RelationWhereFields<
  TTableName extends string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = {
  [K in TableRelationKeys<TTableName, TSchema>]?:
    | { $exists?: boolean }
    | { $some?: RelationNestedWhere<RelationTargetName<TTableName, TSchema, K> & string, TSchema> }
    | { $every?: RelationNestedWhere<RelationTargetName<TTableName, TSchema, K> & string, TSchema> }
    | { $none?: RelationNestedWhere<RelationTargetName<TTableName, TSchema, K> & string, TSchema> }
    | RelationNestedWhere<RelationTargetName<TTableName, TSchema, K> & string, TSchema>;
};

export type EntityWhere<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = ScalarWhereFields<TTable> &
  CustomFieldsWhere<TEntityConfig> &
  RelationWhereFields<TTableName, TSchema> & {
    AND?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>[];
    OR?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>[];
    NOT?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema>;
    $raw?: (ctx: {
      table: TTable;
      sql: typeof import('drizzle-orm').sql;
      schema: TSchema;
    }) => unknown;
  };
