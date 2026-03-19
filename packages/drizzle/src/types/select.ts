import type {
  EntityConfigFor,
  EntityFields,
  RelationTargetName,
  RelationTargetTable,
  TableColumnKeys,
  TableRelationKeys,
} from './helpers';

export type EntitySelect<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> = {
  [K in TableColumnKeys<TTable>]?: boolean;
} & {
  [K in keyof EntityFields<TEntityConfig>]?: EntityFields<TEntityConfig>[K] extends {
    valueType: Record<string, string>;
  }
    ? boolean | { [Sub in keyof EntityFields<TEntityConfig>[K]['valueType']]?: boolean }
    : boolean;
} & {
  [K in TableRelationKeys<TTableName, TSchema>]?:
    | boolean
    | EntitySelect<
        RelationTargetTable<TTableName, TSchema, K>,
        EntityConfigFor<TEntities, RelationTargetName<TTableName, TSchema, K> & string>,
        RelationTargetName<TTableName, TSchema, K> & string,
        TSchema,
        TEntities
      >;
};
