import type {
  EntityConfigFor,
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
  TEntities = {},
> = TTargetName extends keyof TSchema
  ? ScalarWhereFields<TSchema[TTargetName]> &
      CustomFieldsWhere<EntityConfigFor<TEntities, TTargetName>> &
      RelationWhereFields<TTargetName, TSchema, TEntities> & {
        AND?: RelationNestedWhere<TTargetName, TSchema, TEntities>[];
        OR?: RelationNestedWhere<TTargetName, TSchema, TEntities>[];
        NOT?: RelationNestedWhere<TTargetName, TSchema, TEntities>;
      }
  : Record<string, unknown>;

type RelationWhereFields<
  TTableName extends string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> =
  string extends TableRelationKeys<TTableName, TSchema>
    ? {}
    : {
        [K in TableRelationKeys<TTableName, TSchema>]?:
          | { $exists?: boolean }
          | {
              $some?: RelationNestedWhere<
                RelationTargetName<TTableName, TSchema, K> & string,
                TSchema,
                TEntities
              >;
            }
          | {
              $every?: RelationNestedWhere<
                RelationTargetName<TTableName, TSchema, K> & string,
                TSchema,
                TEntities
              >;
            }
          | {
              $none?: RelationNestedWhere<
                RelationTargetName<TTableName, TSchema, K> & string,
                TSchema,
                TEntities
              >;
            }
          | RelationNestedWhere<
              RelationTargetName<TTableName, TSchema, K> & string,
              TSchema,
              TEntities
            >;
      };

export type EntityWhere<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> = ScalarWhereFields<TTable> &
  CustomFieldsWhere<TEntityConfig> &
  RelationWhereFields<TTableName, TSchema, TEntities> & {
    AND?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema, TEntities>[];
    OR?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema, TEntities>[];
    NOT?: EntityWhere<TTable, TEntityConfig, TTableName, TSchema, TEntities>;
    $raw?: (ctx: {
      table: TTable;
      sql: typeof import('drizzle-orm').sql;
      schema: TSchema;
    }) => unknown;
  };
