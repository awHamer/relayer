export type ScalarValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'json'
  | 'array'
  | 'enum'
  | 'object'
  | 'unknown';

export type ObjectValueType = Record<string, ScalarValueType>;

export type ValueType = ScalarValueType | ObjectValueType;
