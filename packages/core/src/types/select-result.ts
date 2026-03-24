export type SelectResult<TInstance, TSelect> = TSelect extends undefined
  ? TInstance
  : TSelect extends Record<string, unknown>
    ? {
        [K in keyof TSelect & keyof TInstance]: TSelect[K] extends true
          ? TInstance[K]
          : TSelect[K] extends Record<string, unknown>
            ? NonNullable<TInstance[K]> extends (infer Item)[]
              ? SelectResult<Item, TSelect[K]>[]
              : TInstance[K] extends object | null | undefined
                ? SelectResult<NonNullable<TInstance[K]>, TSelect[K]> | null
                : TInstance[K]
            : TInstance[K];
      }
    : TInstance;
