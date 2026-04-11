/**
 * Type-safe object check. Returns true for plain objects, false for null, arrays, dates, etc.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merges multiple where clauses with AND. Skips undefined values.
 * Returns undefined if all clauses are undefined, the single clause if only one is defined,
 * or { AND: [...] } if multiple are defined.
 */
export function mergeWhere<T extends object>(
  ...clauses: (T | undefined)[]
): T | { AND: T[] } | undefined {
  const defined = clauses.filter((c): c is T => c !== undefined);
  if (defined.length === 0) return undefined;
  if (defined.length === 1) return defined[0];
  return { AND: defined };
}
