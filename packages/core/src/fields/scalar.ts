import type { ValueType } from '../types';

export interface ScalarFieldDef {
  kind: 'scalar';
  name: string;
  valueType: ValueType;
  nullable: boolean;
  primaryKey?: boolean;
}
