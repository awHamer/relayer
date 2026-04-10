import type {
  ComputedFieldDef,
  DerivedFieldDef,
  RelationFieldDef,
  ScalarFieldDef,
} from '@relayerjs/core';

export type GqlScalarKind = 'Int' | 'Float' | 'String' | 'Boolean' | 'ID' | 'DateTime' | 'JSON';

export interface ResolvedScalarField {
  name: string;
  scalar: GqlScalarKind;
  nullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  raw: ScalarFieldDef;
}

export interface ResolvedRelationField {
  name: string;
  cardinality: 'one' | 'many';
  targetEntity: string;
  raw: RelationFieldDef;
}

export interface ResolvedComputedField {
  name: string;
  scalar: GqlScalarKind;
  nullable: boolean;
  raw: ComputedFieldDef;
}

export interface ResolvedDerivedField {
  name: string;
  scalar: GqlScalarKind;
  nullable: boolean;
  raw: DerivedFieldDef;
}
