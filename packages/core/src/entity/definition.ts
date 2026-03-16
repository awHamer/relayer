import type { ComputedFieldDef, DerivedFieldDef } from '../fields';

export interface EntityFieldsConfig {
  [fieldName: string]: ComputedFieldDef | DerivedFieldDef;
}

export interface EntityDefinition {
  fields?: EntityFieldsConfig;
}

export type EntitiesConfig = Record<string, EntityDefinition>;
