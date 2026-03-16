export type ScalarValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'json'
  | 'array'
  | 'enum'
  | 'object';

export type ObjectValueType = Record<string, ScalarValueType>;

export type ValueType = ScalarValueType | ObjectValueType;
