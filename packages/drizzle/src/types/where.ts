import type {
  CustomFieldKeys,
  InferTableSelect,
  ModelInstance,
  OpsForTSType,
  RelationTargetName,
  TableColumnKeys,
  TableRelationKeys,
} from './helpers';

type ScalarWhere<
  TSchema extends Record<string, unknown>,
  TKey extends string,
> = TKey extends keyof TSchema
  ? { [K in TableColumnKeys<TSchema[TKey]>]?: OpsForTSType<InferTableSelect<TSchema[TKey]>[K]> }
  : {};

type CustomFieldsWhere<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> = {
  [K in CustomFieldKeys<TSchema, TEntities, TKey>]?: OpsForTSType<
    ModelInstance<TSchema, TEntities, TKey>[K]
  >;
};

type RelationNestedWhere<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TTargetKey extends string,
> = ScalarWhere<TSchema, TTargetKey> &
  CustomFieldsWhere<TSchema, TEntities, TTargetKey> &
  RelationWhereFields<TSchema, TEntities, TTargetKey> & {
    AND?: RelationNestedWhere<TSchema, TEntities, TTargetKey>[];
    OR?: RelationNestedWhere<TSchema, TEntities, TTargetKey>[];
    NOT?: RelationNestedWhere<TSchema, TEntities, TTargetKey>;
  };

type RelationWhereFields<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> =
  string extends TableRelationKeys<TKey, TSchema>
    ? {}
    : {
        [R in TableRelationKeys<TKey, TSchema>]?:
          | { exists?: boolean }
          | {
              some?: RelationNestedWhere<
                TSchema,
                TEntities,
                RelationTargetName<TKey, TSchema, R> & string
              >;
            }
          | {
              every?: RelationNestedWhere<
                TSchema,
                TEntities,
                RelationTargetName<TKey, TSchema, R> & string
              >;
            }
          | {
              none?: RelationNestedWhere<
                TSchema,
                TEntities,
                RelationTargetName<TKey, TSchema, R> & string
              >;
            }
          | RelationNestedWhere<TSchema, TEntities, RelationTargetName<TKey, TSchema, R> & string>;
      };

export type ModelWhere<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> = ScalarWhere<TSchema, TKey> &
  CustomFieldsWhere<TSchema, TEntities, TKey> &
  RelationWhereFields<TSchema, TEntities, TKey> & {
    AND?: ModelWhere<TSchema, TEntities, TKey>[];
    OR?: ModelWhere<TSchema, TEntities, TKey>[];
    NOT?: ModelWhere<TSchema, TEntities, TKey>;
    $raw?: (ctx: {
      table: TKey extends keyof TSchema ? TSchema[TKey] : unknown;
      sql: typeof import('drizzle-orm').sql;
      schema: TSchema;
    }) => unknown;
  };
