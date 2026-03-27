import type { Table } from 'drizzle-orm';
import type { EntityMetadata, MutationResult } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveOneRelationOps, separateRelationData } from './relation-data';
import type { ManyRelationOp } from './relation-data';
import type { WhereBuilderContext } from './where';
import { buildWhere } from './where';

export async function executeCreate(
  db: DrizzleDatabase,
  table: Table,
  data: Record<string, unknown>,
  adapter: DialectAdapter,
): Promise<unknown> {
  const rows = await adapter.executeInsert(db, table, data);
  return rows[0];
}

export async function executeCreateMany(
  db: DrizzleDatabase,
  table: Table,
  data: Record<string, unknown>[],
  adapter: DialectAdapter,
): Promise<unknown[]> {
  if (data.length === 0) return [];
  return adapter.executeInsertMany(db, table, data);
}

interface UpdateContext {
  metadata?: EntityMetadata;
  schema?: Record<string, unknown>;
  tableInfo?: TableInfo;
}

interface ResolvedUpdateData {
  finalData: Record<string, unknown>;
  manyOps: Map<string, ManyRelationOp>;
}

function resolveUpdateData(data: Record<string, unknown>, ctx: UpdateContext): ResolvedUpdateData {
  const emptyManyOps = new Map<string, ManyRelationOp>();
  if (!ctx.metadata || !ctx.schema || !ctx.tableInfo) {
    return { finalData: data, manyOps: emptyManyOps };
  }

  const { scalarData, oneOps, manyOps } = separateRelationData(data, ctx.metadata);
  if (oneOps.size === 0 && manyOps.size === 0) {
    return { finalData: data, manyOps: emptyManyOps };
  }

  const fkUpdates = resolveOneRelationOps(oneOps, ctx.metadata, ctx.schema, ctx.tableInfo);
  return { finalData: { ...scalarData, ...fkUpdates }, manyOps };
}

export async function executeUpdate(
  db: DrizzleDatabase,
  table: Table,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
  updateCtx: UpdateContext = {},
): Promise<{ result: unknown; manyOps: Map<string, ManyRelationOp> }> {
  const { finalData, manyOps } = resolveUpdateData(data, updateCtx);

  // Skip UPDATE if only relation ops (no scalar data to set)
  if (Object.keys(finalData).length === 0) {
    return { result: undefined, manyOps };
  }

  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeUpdate(db, table, finalData, condition);
  return { result: rows[0], manyOps };
}

export async function executeUpdateMany(
  db: DrizzleDatabase,
  table: Table,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
  updateCtx: UpdateContext = {},
): Promise<MutationResult> {
  const { finalData } = resolveUpdateData(data, updateCtx);
  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeUpdate(db, table, finalData, condition);
  return { count: rows.length };
}

export async function executeDelete(
  db: DrizzleDatabase,
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
  db: DrizzleDatabase,
  table: Table,
  where: Record<string, unknown>,
  whereCtx: WhereBuilderContext,
  adapter: DialectAdapter,
): Promise<MutationResult> {
  const condition = buildWhere(where, whereCtx);
  const rows = await adapter.executeDelete(db, table, condition);
  return { count: rows.length };
}
