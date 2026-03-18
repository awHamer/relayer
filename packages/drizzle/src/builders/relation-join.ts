import {
  createTableRelationsHelpers,
  eq,
  extractTablesRelationalConfig,
  normalizeRelation,
  sql,
} from 'drizzle-orm';
import type { Column, SQL, Table } from 'drizzle-orm';
import type { EntityMetadata } from '@relayerjs/core';

import type { TableInfo } from '../introspect';

export interface ResolvedRelationJoin {
  column: Column;
  targetTable: Table;
  joinCondition: SQL;
}

export function resolveRelationJoin(
  relationName: string,
  targetFieldName: string,
  metadata: EntityMetadata,
  allTables: Map<string, TableInfo>,
  schema: Record<string, unknown>,
): ResolvedRelationJoin | undefined {
  const relDef = metadata.relationFields.get(relationName);
  if (!relDef) return undefined;

  const targetInfo = allTables.get(relDef.targetEntity);
  if (!targetInfo) return undefined;

  const targetCol = (targetInfo.table as unknown as Record<string, Column>)[targetFieldName];
  if (!targetCol) return undefined;

  // Resolve FK join condition
  const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(schema, (t: Table) =>
    createTableRelationsHelpers(t),
  );
  const parentConfig = relConfig[metadata.name];
  if (!parentConfig) return undefined;

  const drizzleRelation = parentConfig.relations[relationName];
  if (!drizzleRelation) return undefined;

  const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRelation);
  if (normalized.fields.length === 0 || normalized.references.length === 0) return undefined;

  const conditions = normalized.fields.map((field, i) =>
    eq(field as Column, normalized.references[i] as Column),
  );
  const joinCondition =
    conditions.length === 1
      ? conditions[0]!
      : sql`${conditions.map((c, i) => (i > 0 ? sql` AND ${c}` : c))}`;

  return {
    column: targetCol,
    targetTable: targetInfo.table,
    joinCondition: joinCondition as SQL,
  };
}
