import { SQL, sql } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import type { ComputedFieldDef } from '@relayerjs/core';

import { getTableColumns } from '../utils';

export interface ComputedResolverCtx {
  table: Table;
  schema: Record<string, unknown>;
  context?: unknown;
  requestedFields?: string[];
}

export function resolveComputedFields(
  computedFields: Map<string, ComputedFieldDef>,
  ctx: ComputedResolverCtx,
): Map<string, SQL> {
  const result = new Map<string, SQL>();

  for (const [fieldName, fieldDef] of computedFields) {
    if (ctx.requestedFields && !ctx.requestedFields.includes(fieldName)) continue;
    const sqlExpr = fieldDef.resolve({
      table: getTableColumns(ctx.table),
      schema: ctx.schema,
      sql,
      context: ctx.context,
    });

    if (sqlExpr instanceof SQL) {
      result.set(fieldName, sql`${sqlExpr}`.as(fieldName) as unknown as SQL);
    }
  }

  return result;
}
