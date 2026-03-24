type DotPathsInner<
  T,
  MaxDepth extends number,
  Prefix extends string = '',
  Depth extends unknown[] = [],
> = Depth['length'] extends MaxDepth
  ? never
  : {
      [K in keyof T & string]:
        | `${Prefix}${K}`
        | (NonNullable<T[K]> extends Record<string, unknown>
            ? NonNullable<T[K]> extends Date | unknown[]
              ? never
              : DotPathsInner<NonNullable<T[K]>, MaxDepth, `${Prefix}${K}.`, [...Depth, unknown]>
            : never);
    }[keyof T & string];

export type DotPaths<T, MaxDepth extends number = 4> = DotPathsInner<T, MaxDepth>;
