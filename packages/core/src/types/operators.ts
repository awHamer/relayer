import type {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  NumberOperators,
  StringOperators,
} from '../operators';

export type OperatorsForValue<T> = T extends string
  ? StringOperators
  : T extends number
    ? NumberOperators
    : T extends boolean
      ? BooleanOperators
      : T extends Date
        ? DateOperators
        : T extends Array<infer U>
          ? ArrayOperators<U>
          : Record<string, never>;
