import {
  and,
  createTableRelationsHelpers,
  eq,
  extractTablesRelationalConfig,
  normalizeRelation,
  One,
} from 'drizzle-orm';
import type { SQL, Table } from 'drizzle-orm';
import { isObject, RelayerError } from '@relayerjs/core';
import type { EntityMetadata } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../dialect';
import type { TableInfo } from '../introspect';
import { findColumnTsName, getPrimaryKeyField, getTableColumns } from '../utils';

interface OneRelationOp {
  connect?: unknown;
  disconnect?: boolean;
}

export interface ManyRelationOp {
  connect?: unknown[];
  disconnect?: unknown[];
  set?: unknown[];
}

export interface SeparatedData {
  scalarData: Record<string, unknown>;
  oneOps: Map<string, OneRelationOp>;
  manyOps: Map<string, ManyRelationOp>;
}

export function separateRelationData(
  data: Record<string, unknown>,
  metadata: EntityMetadata,
): SeparatedData {
  const scalarData: Record<string, unknown> = {};
  const oneOps = new Map<string, OneRelationOp>();
  const manyOps = new Map<string, ManyRelationOp>();

  for (const [key, value] of Object.entries(data)) {
    if (metadata.relationFields.has(key) && isObject(value)) {
      const op = value as Record<string, unknown>;
      if ('connect' in op || 'disconnect' in op || 'set' in op) {
        const relDef = metadata.relationFields.get(key)!;
        if (relDef.relationType === 'one') {
          oneOps.set(key, op as OneRelationOp);
        } else {
          manyOps.set(key, op as ManyRelationOp);
        }
        continue;
      }
    }
    scalarData[key] = value;
  }

  return { scalarData, oneOps, manyOps };
}

export function resolveOneRelationOps(
  relationOps: Map<string, OneRelationOp>,
  metadata: EntityMetadata,
  schema: Record<string, unknown>,
  tableInfo: TableInfo,
): Record<string, unknown> {
  if (relationOps.size === 0) return {};

  const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(
    schema,
    (table: Table) => createTableRelationsHelpers(table),
  );

  const parentTableConfig = relConfig[metadata.name];
  if (!parentTableConfig) return {};

  const fkUpdates: Record<string, unknown> = {};
  const pkField = getPrimaryKeyField(tableInfo);

  for (const [relationName, op] of relationOps) {
    const drizzleRelation = parentTableConfig.relations[relationName];
    if (!drizzleRelation || !(drizzleRelation instanceof One)) continue;

    const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRelation);
    const sourceCol = normalized.fields[0];
    if (!sourceCol) continue;

    const fkColName = findColumnTsName(sourceCol);
    if (!fkColName) continue;

    if (fkColName === pkField) {
      throw new RelayerError(
        `Cannot connect/disconnect relation '${relationName}': the foreign key is on the target table. ` +
          `Update the target entity directly instead.`,
      );
    }

    if (op.connect !== undefined) {
      fkUpdates[fkColName] = op.connect;
    }

    if (op.disconnect) {
      const fieldDef = tableInfo.scalarFields.get(fkColName);
      if (fieldDef && !fieldDef.nullable) {
        throw new RelayerError(
          `Cannot disconnect relation '${relationName}': FK column '${fkColName}' is NOT NULL. ` +
            `Set a different value with connect instead.`,
        );
      }
      fkUpdates[fkColName] = null;
    }
  }

  return fkUpdates;
}

interface ManyRelationContext {
  db: DrizzleDatabase;
  adapter: DialectAdapter;
  schema: Record<string, unknown>;
  metadata: EntityMetadata;
  tableInfo: TableInfo;
  allTables: Map<string, TableInfo>;
  sourceId: unknown;
}

interface ResolvedJoinInfo {
  joinTable: Table;
  sourceFkName: string;
  targetFkName: string;
}

function resolveJoinTableInfo(
  relationName: string,
  ctx: ManyRelationContext,
): ResolvedJoinInfo | null {
  const relDef = ctx.metadata.relationFields.get(relationName);
  if (!relDef) return null;

  const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(
    ctx.schema,
    (table: Table) => createTableRelationsHelpers(table),
  );

  const parentTableConfig = relConfig[ctx.metadata.name];
  if (!parentTableConfig) return null;

  const drizzleRelation = parentTableConfig.relations[relationName];
  if (!drizzleRelation) return null;

  // For many() relation: normalizeRelation returns
  // fields = parent PK columns (e.g., posts.id), references = join table FK columns (e.g., postCategories.postId)
  const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRelation);
  const joinFkCol = normalized.references[0]; // FK on join table pointing to source
  if (!joinFkCol) return null;

  const sourceFkName = findColumnTsName(joinFkCol);
  if (!sourceFkName) return null;

  // Find the join table info
  const joinTableInfo = ctx.allTables.get(relDef.targetEntity);
  if (!joinTableInfo) return null;

  // Find the "other" FK — the one that doesn't point to the source entity.
  // Look at all columns in the join table and find FK columns
  const joinTableConfig = relConfig[relDef.targetEntity];
  if (!joinTableConfig) return null;

  let targetFkName: string | null = null;
  for (const [, rel] of Object.entries(joinTableConfig.relations)) {
    if (!(rel instanceof One)) continue;
    const norm = normalizeRelation(relConfig, tableNamesMap, rel);
    const fkCol = norm.fields[0];
    if (!fkCol) continue;
    const fkName = findColumnTsName(fkCol);
    if (!fkName || fkName === sourceFkName) continue;
    targetFkName = fkName;
    break;
  }

  if (!targetFkName) return null;

  return {
    joinTable: joinTableInfo.table,
    sourceFkName,
    targetFkName,
  };
}

export async function executeManyRelationOps(
  manyOps: Map<string, ManyRelationOp>,
  ctx: ManyRelationContext,
): Promise<void> {
  if (manyOps.size === 0) return;

  for (const [relationName, op] of manyOps) {
    const joinInfo = resolveJoinTableInfo(relationName, ctx);
    if (!joinInfo) {
      throw new RelayerError(`Cannot resolve join table for many() relation '${relationName}'.`);
    }

    const { joinTable, sourceFkName, targetFkName } = joinInfo;

    if (op.set !== undefined) {
      // DELETE all existing links for this source entity
      const deleteCondition = buildDeleteCondition(joinTable, sourceFkName, ctx.sourceId);
      await ctx.adapter.executeDelete(ctx.db, joinTable, deleteCondition);

      // INSERT new links
      if (op.set.length > 0) {
        const rows = op.set.map((item) =>
          buildJoinRow(item, sourceFkName, targetFkName, ctx.sourceId),
        );
        await ctx.adapter.executeInsertMany(ctx.db, joinTable, rows);
      }
      continue;
    }

    if (op.disconnect && op.disconnect.length > 0) {
      for (const targetId of op.disconnect) {
        const condition = buildLinkCondition(
          joinTable,
          sourceFkName,
          ctx.sourceId,
          targetFkName,
          targetId,
        );
        await ctx.adapter.executeDelete(ctx.db, joinTable, condition);
      }
    }

    if (op.connect && op.connect.length > 0) {
      const rows = op.connect.map((item) =>
        buildJoinRow(item, sourceFkName, targetFkName, ctx.sourceId),
      );
      await ctx.adapter.executeInsertMany(ctx.db, joinTable, rows);
    }
  }
}

function buildJoinRow(
  item: unknown,
  sourceFkName: string,
  targetFkName: string,
  sourceId: unknown,
): Record<string, unknown> {
  if (isObject(item)) {
    const obj = item as Record<string, unknown>;
    const { _id, ...extraFields } = obj;
    return { [sourceFkName]: sourceId, [targetFkName]: _id, ...extraFields };
  }
  return { [sourceFkName]: sourceId, [targetFkName]: item };
}

function buildDeleteCondition(
  joinTable: Table,
  sourceFkName: string,
  sourceId: unknown,
): SQL | undefined {
  const cols = getTableColumns(joinTable);
  const col = cols[sourceFkName];
  if (!col) return undefined;
  return eq(col, sourceId);
}

function buildLinkCondition(
  joinTable: Table,
  sourceFkName: string,
  sourceId: unknown,
  targetFkName: string,
  targetId: unknown,
): SQL | undefined {
  const cols = getTableColumns(joinTable);
  const sourceCol = cols[sourceFkName];
  const targetCol = cols[targetFkName];
  if (!sourceCol || !targetCol) return undefined;
  return and(eq(sourceCol, sourceId), eq(targetCol, targetId));
}
