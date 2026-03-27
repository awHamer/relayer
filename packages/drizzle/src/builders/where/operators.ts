import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notInArray,
  notLike,
  SQL,
} from 'drizzle-orm';
import type { Column } from 'drizzle-orm';

import type { DialectAdapter } from '../../dialect';

export function applyOperators(
  column: Column | SQL,
  value: unknown,
  adapter: DialectAdapter,
): SQL | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return eq(column as Column, value);
  }

  if (value instanceof Date) {
    return eq(column as Column, value);
  }

  if (Array.isArray(value)) {
    return inArray(column as Column, value);
  }

  if (typeof value !== 'object' || value === null) return undefined;

  const ops = value as Record<string, unknown>;
  const conditions: SQL[] = [];

  if (ops.eq !== undefined) conditions.push(eq(column as Column, ops.eq));
  if (ops.ne !== undefined) conditions.push(ne(column as Column, ops.ne));
  if (ops.gt !== undefined) conditions.push(gt(column as Column, ops.gt));
  if (ops.gte !== undefined) conditions.push(gte(column as Column, ops.gte));
  if (ops.lt !== undefined) conditions.push(lt(column as Column, ops.lt));
  if (ops.lte !== undefined) conditions.push(lte(column as Column, ops.lte));
  if (ops.in !== undefined) conditions.push(inArray(column as Column, ops.in as unknown[]));
  if (ops.notIn !== undefined)
    conditions.push(notInArray(column as Column, ops.notIn as unknown[]));
  if (ops.like !== undefined) conditions.push(like(column as Column, ops.like as string));
  if (ops.ilike !== undefined)
    conditions.push(adapter.ilike(column as Column, ops.ilike as string));
  if (ops.notLike !== undefined) conditions.push(notLike(column as Column, ops.notLike as string));
  if (ops.notIlike !== undefined)
    conditions.push(adapter.notIlike(column as Column, ops.notIlike as string));

  const insensitive = ops.mode === 'insensitive';

  if (ops.contains !== undefined) {
    const pattern = `%${ops.contains as string}%`;
    conditions.push(
      insensitive ? adapter.ilike(column as Column, pattern) : like(column as Column, pattern),
    );
  }
  if (ops.startsWith !== undefined) {
    const pattern = `${ops.startsWith as string}%`;
    conditions.push(
      insensitive ? adapter.ilike(column as Column, pattern) : like(column as Column, pattern),
    );
  }
  if (ops.endsWith !== undefined) {
    const pattern = `%${ops.endsWith as string}`;
    conditions.push(
      insensitive ? adapter.ilike(column as Column, pattern) : like(column as Column, pattern),
    );
  }

  if (ops.isNull === true) conditions.push(isNull(column as Column));
  if (ops.isNotNull === true) conditions.push(isNotNull(column as Column));

  if (ops.arrayContains !== undefined)
    conditions.push(adapter.arrayContains(column as Column, ops.arrayContains as unknown[]));
  if (ops.arrayContained !== undefined)
    conditions.push(adapter.arrayContained(column as Column, ops.arrayContained as unknown[]));
  if (ops.arrayOverlaps !== undefined)
    conditions.push(adapter.arrayOverlaps(column as Column, ops.arrayOverlaps as unknown[]));

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}
