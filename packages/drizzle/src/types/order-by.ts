import type { EntityFields, TableColumnKeys } from './helpers';

type ObjectFieldDotPaths<TEntityConfig> = {
  [K in keyof EntityFields<TEntityConfig> & string]: EntityFields<TEntityConfig>[K] extends {
    valueType: Record<string, string>;
  }
    ? `${K}.${keyof EntityFields<TEntityConfig>[K]['valueType'] & string}`
    : never;
}[keyof EntityFields<TEntityConfig> & string];

export type EntityOrderByField<TTable, TEntityConfig = {}> =
  | TableColumnKeys<TTable>
  | (keyof EntityFields<TEntityConfig> & string)
  | ObjectFieldDotPaths<TEntityConfig>;

export interface EntityOrderBy<TTable, TEntityConfig = {}> {
  field: EntityOrderByField<TTable, TEntityConfig>;
  order: 'asc' | 'desc';
}
