import type { ExtractTablesWithRelations } from 'drizzle-orm';

import type {
  EntityConfigFor,
  EntityFields,
  JsonColumnDotPaths,
  RelationColumnDotPaths,
  RelationTargetName,
  TableColumnKeys,
  TableRelationKeys,
} from './helpers';

type ObjectFieldDotPaths<TEntityConfig> = {
  [K in keyof EntityFields<TEntityConfig> & string]: EntityFields<TEntityConfig>[K] extends {
    valueType: Record<string, string>;
  }
    ? `${K}.${keyof EntityFields<TEntityConfig>[K]['valueType'] & string}`
    : never;
}[keyof EntityFields<TEntityConfig> & string];

// Dot paths for entity fields on relation targets: 'relation.field' and 'relation.objectDerived.subField'
type RelationEntityFieldDotPaths<
  TTableName extends string,
  TSchema extends Record<string, unknown>,
  TEntities = {},
> = TTableName extends keyof ExtractTablesWithRelations<TSchema>
  ? {
      [K in TableRelationKeys<TTableName, TSchema>]: RelationTargetName<
        TTableName,
        TSchema,
        K
      > extends infer TargetName extends string
        ?
            | (keyof EntityFields<EntityConfigFor<TEntities, TargetName>> extends infer F extends
                string
                ? `${K}.${F}`
                : never)
            | (ObjectFieldDotPaths<EntityConfigFor<TEntities, TargetName>> extends infer P extends
                string
                ? `${K}.${P}`
                : never)
        : never;
    }[TableRelationKeys<TTableName, TSchema>]
  : never;

export type EntityOrderByField<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> =
  | TableColumnKeys<TTable>
  | (keyof EntityFields<TEntityConfig> & string)
  | ObjectFieldDotPaths<TEntityConfig>
  | RelationColumnDotPaths<TTableName, TSchema>
  | RelationEntityFieldDotPaths<TTableName, TSchema, TEntities>
  | JsonColumnDotPaths<TTable>;

export interface EntityOrderBy<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
  TEntities = {},
> {
  field: EntityOrderByField<TTable, TEntityConfig, TTableName, TSchema, TEntities>;
  order: 'asc' | 'desc';
}
