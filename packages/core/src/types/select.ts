export interface RawSelect {
  $raw: true;
}

export type SelectType<T> = {
  [K in keyof T & string]?: NonNullable<T[K]> extends (infer Item)[]
    ? Item extends Record<string, unknown>
      ? boolean | SelectType<Item>
      : boolean
    : NonNullable<T[K]> extends Record<string, unknown>
      ? NonNullable<T[K]> extends Date
        ? boolean | RawSelect
        : boolean | SelectType<NonNullable<T[K]>>
      : boolean | RawSelect;
};
