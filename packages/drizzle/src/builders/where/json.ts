import { and, SQL } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';

import type { DialectAdapter } from '../../dialect';
import { applyOperators } from './operators';

const OPERATOR_KEYS = new Set([
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'like',
  'ilike',
  'notLike',
  'notIlike',
  'contains',
  'startsWith',
  'endsWith',
  'isNull',
  'isNotNull',
  'arrayContains',
  'arrayContained',
  'arrayOverlaps',
]);

export function isOperatorObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return Object.keys(value).some((k) => OPERATOR_KEYS.has(k));
}

export function buildJsonWhere(
  column: Column,
  value: Record<string, unknown>,
  path: string[],
  adapter: DialectAdapter,
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const [key, val] of Object.entries(value)) {
    if (val === undefined) continue;
    const currentPath = [...path, key];

    if (typeof val === 'object' && val !== null && !isOperatorObject(val)) {
      const nested = buildJsonWhere(column, val as Record<string, unknown>, currentPath, adapter);
      if (nested) conditions.push(nested);
    } else {
      const castType = inferJsonCastType(val);
      const jsonPath = adapter.jsonPath(column, currentPath, castType);
      const cond = applyOperators(jsonPath, val, adapter);
      if (cond) conditions.push(cond);
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

function inferJsonCastType(value: unknown): string | undefined {
  if (typeof value === 'number') return 'numeric';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    for (const [key, v] of entries) {
      if (key === 'isNull' || key === 'isNotNull') continue;
      if (typeof v === 'number') return 'numeric';
      if (typeof v === 'boolean') return 'boolean';
    }
  }
  return undefined;
}
