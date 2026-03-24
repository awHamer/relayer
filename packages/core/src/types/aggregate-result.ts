type PathToNested<P extends string, V> = P extends `${infer Head}.${infer Rest}`
  ? { [K in Head]: PathToNested<Rest, V> }
  : { [K in P]: V };

export type TypeAtPath<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? TypeAtPath<NonNullable<T[Head]>, Rest>
    : unknown
  : P extends keyof T
    ? T[P]
    : unknown;

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type MaterializeAggFields<TFields> = UnionToIntersection<
  {
    [K in keyof TFields & string]: TFields[K] extends true ? PathToNested<K, number | null> : never;
  }[keyof TFields & string]
>;

type MaterializeGroupBy<TInstance, TGroupBy extends readonly string[]> = UnionToIntersection<
  {
    [I in keyof TGroupBy & `${number}`]: TGroupBy[I] extends infer P extends string
      ? PathToNested<P, TypeAtPath<TInstance, P>>
      : never;
  }[keyof TGroupBy & `${number}`]
>;

export type AggregateResult<TInstance, TOptions> = (TOptions extends {
  groupBy: infer G extends readonly string[];
}
  ? MaterializeGroupBy<TInstance, G>
  : unknown) &
  (TOptions extends { _count: true } ? { _count: number } : unknown) &
  (TOptions extends { _sum: infer F } ? { _sum: MaterializeAggFields<F> } : unknown) &
  (TOptions extends { _avg: infer F } ? { _avg: MaterializeAggFields<F> } : unknown) &
  (TOptions extends { _min: infer F } ? { _min: MaterializeAggFields<F> } : unknown) &
  (TOptions extends { _max: infer F } ? { _max: MaterializeAggFields<F> } : unknown);
