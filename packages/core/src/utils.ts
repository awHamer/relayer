/**
 * Type-safe object check. Returns true for plain objects, false for null, arrays, dates, etc.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
