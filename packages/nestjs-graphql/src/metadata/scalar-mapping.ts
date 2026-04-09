import type { ScalarFieldDef, ValueType } from '@relayerjs/core';

import type { GqlScalarKind } from './types';

export function mapValueTypeToGqlScalar(valueType: ValueType): GqlScalarKind {
  if (typeof valueType === 'object') return 'JSON';
  switch (valueType) {
    case 'number':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    case 'json':
    case 'array':
    case 'object':
      return 'JSON';
    case 'string':
    case 'enum':
    case 'unknown':
    default:
      return 'String';
  }
}

export function mapScalarFieldToGqlScalar(field: ScalarFieldDef): GqlScalarKind {
  if (field.primaryKey) return 'ID';
  if (field.valueType === 'number') {
    return field.name.toLowerCase().includes('id') ? 'Int' : 'Float';
  }
  return mapValueTypeToGqlScalar(field.valueType);
}
