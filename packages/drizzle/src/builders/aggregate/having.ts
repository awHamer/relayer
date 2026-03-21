import { sql, SQL } from 'drizzle-orm';

export function buildHavingClause(
  having: Record<string, unknown>,
  rawExpressions: Map<string, SQL>,
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(having)) {
    if (value === undefined || value === null) continue;

    const expr = rawExpressions.get(key);
    if (!expr) continue;

    if (typeof value === 'number') {
      conditions.push(sql`${expr} = ${value}`);
    } else if (typeof value === 'object') {
      const ops = value as Record<string, number>;
      if (ops.eq !== undefined) conditions.push(sql`${expr} = ${ops.eq}`);
      if (ops.ne !== undefined) conditions.push(sql`${expr} != ${ops.ne}`);
      if (ops.gt !== undefined) conditions.push(sql`${expr} > ${ops.gt}`);
      if (ops.gte !== undefined) conditions.push(sql`${expr} >= ${ops.gte}`);
      if (ops.lt !== undefined) conditions.push(sql`${expr} < ${ops.lt}`);
      if (ops.lte !== undefined) conditions.push(sql`${expr} <= ${ops.lte}`);
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return sql.join(conditions, sql` AND `);
}
