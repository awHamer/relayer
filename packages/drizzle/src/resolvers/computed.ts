import { SQL, sql } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import type { ComputedFieldDef } from '@relayerjs/core';

export function resolveComputedFields(
  computedFields: Map<string, ComputedFieldDef>,
  table: Table,
  schema: Record<string, unknown>,
  context: unknown = undefined,
  requestedFields?: string[],
): Map<string, SQL> {
  const result = new Map<string, SQL>();

  for (const [fieldName, fieldDef] of computedFields) {
    if (requestedFields && !requestedFields.includes(fieldName)) continue;
    const sqlExpr = fieldDef.resolve({
      table: table as unknown as Record<string, unknown>,
      schema,
      sql,
      context,
    });

    if (sqlExpr instanceof SQL) {
      result.set(fieldName, sql`${sqlExpr}`.as(fieldName) as unknown as SQL);
    }
  }

  return result;
}
