import type { Table } from 'drizzle-orm';
import type { MutationResult } from '@relayerjs/core';

import type { DialectAdapter } from '../dialect';
import type { WhereBuilderContext } from './where';
import { buildWhere } from './where';

export async function executeCreate(
  db: any,
  table: Table,
  data: Record<string, unknown>,
  adapter: DialectAdapter,
): Promise<unknown> {
  const rows = await adapter.executeInsert(db, table, data);
  return rows[0];
}

export async function executeCreateMany(
  db: any,
  table: Table,
  data: Record<string, unknown>[],
  adapter: DialectAdapter,
): Promise<unknown[]> {
  if (data.length === 0) return [];
  return adapter.executeInsertMany(db, table, data);
}

export async function executeUpdate(
  db: any,
  table: Table,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
): Promise<unknown> {
  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeUpdate(db, table, data, condition);
  return rows[0];
}

export async function executeUpdateMany(
  db: any,
  table: Table,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
): Promise<MutationResult> {
  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeUpdate(db, table, data, condition);
  return { count: rows.length };
}

export async function executeDelete(
  db: any,
  table: Table,
  where: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
): Promise<unknown> {
  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeDelete(db, table, condition);
  return rows[0];
}

export async function executeDeleteMany(
  db: any,
  table: Table,
  where: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
): Promise<MutationResult> {
  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeDelete(db, table, condition);
  return { count: rows.length };
}
