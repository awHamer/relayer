import {
  and,
  createTableRelationsHelpers,
  eq,
  exists,
  extractTablesRelationalConfig,
  getTableName,
  normalizeRelation,
  not,
  One,
  sql,
  SQL,
} from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { RelationFieldDef } from '@relayerjs/core';

import type { WhereBuilderContext } from './index';
import { buildWhere } from './index';

export function buildRelationFilter(
  relationName: string,
  value: unknown,
  ctx: WhereBuilderContext,
): SQL | undefined {
  const relDef = ctx.metadata.relationFields.get(relationName);
  if (!relDef) return undefined;

  if (typeof value !== 'object' || value === null) return undefined;
  const filter = value as Record<string, unknown>;

  if (filter.$exists !== undefined) {
    const targetInfo = ctx.allTables.get(relDef.targetEntity);
    if (!targetInfo) return undefined;
    const joinCond = buildJoinCondition(ctx.table, relationName, ctx.schema);
    if (!joinCond) return undefined;
    const subquery = sql`(SELECT 1 FROM ${targetInfo.table} WHERE ${joinCond})`;
    return filter.$exists ? exists(subquery) : not(exists(subquery));
  }

  let nestedWhere: Record<string, unknown> | undefined;
  let mode: 'some' | 'every' | 'none' = 'some';

  if (filter.$some) {
    nestedWhere = filter.$some as Record<string, unknown>;
    mode = 'some';
  } else if (filter.$every) {
    nestedWhere = filter.$every as Record<string, unknown>;
    mode = 'every';
  } else if (filter.$none) {
    nestedWhere = filter.$none as Record<string, unknown>;
    mode = 'none';
  } else {
    nestedWhere = filter;
    mode = 'some';
  }

  if (!nestedWhere) return undefined;

  const targetInfo = ctx.allTables.get(relDef.targetEntity);
  if (!targetInfo) return undefined;

  const targetRelations = resolveRelationFields(relDef.targetEntity, ctx.schema);
  const targetMetadata = {
    name: relDef.targetEntity,
    scalarFields: targetInfo.scalarFields,
    relationFields: targetRelations,
    computedFields: new Map(),
    derivedFields: new Map(),
  };

  const nestedCtx: WhereBuilderContext = {
    table: targetInfo.table,
    tableInfo: targetInfo,
    metadata: targetMetadata,
    schema: ctx.schema,
    allTables: ctx.allTables,
    computedSqlMap: new Map(),
    derivedAliasMap: new Map(),
    adapter: ctx.adapter,
  };

  const nestedCondition = buildWhere(nestedWhere, nestedCtx);
  const joinCondition = buildJoinCondition(ctx.table, relationName, ctx.schema);

  const whereParts = [joinCondition, nestedCondition].filter(Boolean);
  const fullWhere = whereParts.length > 1 ? and(...(whereParts as SQL[])) : whereParts[0];

  const subquery = sql`(SELECT 1 FROM ${targetInfo.table} WHERE ${fullWhere})`;

  switch (mode) {
    case 'some':
      return exists(subquery);
    case 'none':
      return not(exists(subquery));
    case 'every': {
      const negatedCondition = nestedCondition ? not(nestedCondition) : sql`FALSE`;
      const negatedWhere = and(joinCondition as SQL, negatedCondition);
      const negatedSubquery = sql`(SELECT 1 FROM ${targetInfo.table} WHERE ${negatedWhere})`;
      return not(exists(negatedSubquery));
    }
  }
}

export function resolveRelationFields(
  entityName: string,
  schema: Record<string, unknown>,
): Map<string, RelationFieldDef> {
  const result = new Map<string, RelationFieldDef>();
  const { tables } = extractTablesRelationalConfig(schema, (table: Table) =>
    createTableRelationsHelpers(table),
  );
  const config = tables[entityName];
  if (!config) return result;

  // Build dbName -> tsName lookup
  const dbNameToTsName = new Map<string, string>();
  for (const [tsName, tableConfig] of Object.entries(tables)) {
    dbNameToTsName.set(tableConfig.dbName, tsName);
  }

  for (const [name, relation] of Object.entries(config.relations)) {
    result.set(name, {
      kind: 'relation',
      name,
      relationType: relation instanceof One ? 'one' : 'many',
      targetEntity: dbNameToTsName.get(relation.referencedTableName) ?? relation.referencedTableName,
    });
  }
  return result;
}

function buildJoinCondition(
  parentTable: Table,
  relationName: string,
  schema: Record<string, unknown>,
): SQL | undefined {
  const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(
    schema,
    (table: Table) => createTableRelationsHelpers(table),
  );
  const parentDbName = getTableName(parentTable);
  let parentTsName: string | undefined;
  for (const [tsName, config] of Object.entries(relConfig)) {
    if (config.dbName === parentDbName) {
      parentTsName = tsName;
      break;
    }
  }
  if (!parentTsName) return undefined;

  const parentConfig = relConfig[parentTsName];
  if (!parentConfig) return undefined;

  const drizzleRelation = parentConfig.relations[relationName];
  if (!drizzleRelation) return undefined;

  const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRelation);
  if (normalized.fields.length === 0 || normalized.references.length === 0) return undefined;

  const conditions = normalized.fields.map((field, i) =>
    eq(field as Column, normalized.references[i] as Column),
  );

  return conditions.length === 1 ? conditions[0]! : and(...conditions)!;
}
