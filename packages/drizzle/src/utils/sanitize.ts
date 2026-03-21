const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates that a JSON path segment is a safe identifier.
 * Prevents SQL injection through user-controlled object keys in where clauses.
 */
export function assertSafeIdentifier(value: string): string {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Unsafe identifier in query: "${value}"`);
  }
  return value;
}
