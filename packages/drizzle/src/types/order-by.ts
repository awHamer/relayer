import type {
  EntityFields,
  JsonColumnDotPaths,
  RelationColumnDotPaths,
  TableColumnKeys,
} from './helpers';

type ObjectFieldDotPaths<TEntityConfig> = {
  [K in keyof EntityFields<TEntityConfig> & string]: EntityFields<TEntityConfig>[K] extends {
    valueType: Record<string, string>;
  }
    ? `${K}.${keyof EntityFields<TEntityConfig>[K]['valueType'] & string}`
    : never;
}[keyof EntityFields<TEntityConfig> & string];

export type EntityOrderByField<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> =
  | TableColumnKeys<TTable>
  | (keyof EntityFields<TEntityConfig> & string)
  | ObjectFieldDotPaths<TEntityConfig>
  | RelationColumnDotPaths<TTableName, TSchema>
  | JsonColumnDotPaths<TTable>;

export interface EntityOrderBy<
  TTable,
  TEntityConfig = {},
  TTableName extends string = string,
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> {
  field: EntityOrderByField<TTable, TEntityConfig, TTableName, TSchema>;
  order: 'asc' | 'desc';
}
