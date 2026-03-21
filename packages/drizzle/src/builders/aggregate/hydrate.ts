import type { AggregateMeta } from './index';

/**
 * Transform flat aggregate rows into nested objects.
 * `_sum_total: "2000"` -> `_sum: { total: 2000 }`
 * `user_firstName: "Ihor"` -> `user: { firstName: "Ihor" }`
 * `_count: "3"` -> `_count: 3`
 */
export function hydrateAggregateResult(
  rows: Record<string, unknown>[],
  meta: AggregateMeta,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const result: Record<string, unknown> = {};

    if ('_count' in row) {
      result._count = Number(row._count);
    }

    for (const { fn, fieldName, alias } of meta.aggFields) {
      const value = row[alias];
      const numValue = value !== null && value !== undefined ? Number(value) : null;

      if (!result[fn]) result[fn] = {};
      const target = result[fn] as Record<string, unknown>;

      if (!fieldName.includes('.')) {
        target[fieldName] = numValue;
      } else {
        const parts = fieldName.split('.');
        let current = target;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]!]) current[parts[i]!] = {};
          current = current[parts[i]!] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]!] = numValue;
      }
    }

    for (const field of meta.groupByFields) {
      if (!field.includes('.')) {
        result[field] = row[field];
      } else {
        const parts = field.split('.');
        const alias = field.replace(/\./g, '_');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]!]) current[parts[i]!] = {};
          current = current[parts[i]!] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]!] = row[alias];
      }
    }

    return result;
  });
}
