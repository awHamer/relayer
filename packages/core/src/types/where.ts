import type {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  NumberOperators,
  StringOperators,
} from '../operators';

type OpsForType<T> = T extends string
  ? StringOperators | string
  : T extends number
    ? NumberOperators | number
    : T extends boolean
      ? BooleanOperators | boolean
      : T extends Date
        ? DateOperators | Date
        : T extends Array<infer U>
          ? ArrayOperators<U>
          : T extends Record<string, unknown>
            ? JsonWhereType<T>
            : never;


type JsonWhereType<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends Record<string, unknown>
    ? JsonWhereType<NonNullable<T[K]>>
    : OpsForType<NonNullable<T[K]>>;
} & { isNull?: boolean; isNotNull?: boolean };


export type WhereType<T> = {
  [K in keyof T]?: OpsForType<NonNullable<T[K]>>;
} & {
  AND?: WhereType<T>[];
  OR?: WhereType<T>[];
  NOT?: WhereType<T>;
};
