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

import { resolveDerivedFields } from '../../resolvers';
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
  // eslint-disable-next-line no-useless-assignment
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

  // Use registry for full target metadata (includes derived/computed fields)
  const registryMetadata = ctx.registry?.get(relDef.targetEntity);
  const targetMetadata = registryMetadata ?? {
    name: relDef.targetEntity,
    scalarFields: targetInfo.scalarFields,
    relationFields: resolveRelationFields(relDef.targetEntity, ctx.schema),
    computedFields: new Map(),
    derivedFields: new Map(),
  };

  // Split nested where into scalar fields vs derived fields
  const scalarWhere: Record<string, unknown> = {};
  const derivedWhere: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(nestedWhere)) {
    if (registryMetadata?.derivedFields.has(k)) {
      derivedWhere[k] = v;
    } else {
      scalarWhere[k] = v;
    }
  }

  // Resolve computed fields on target entity for use in WHERE.
  // Use raw SQL expressions (no .as() alias) since these go inside EXISTS subquery.
  const targetComputedSqlMap = new Map<string, SQL>();
  if (registryMetadata && registryMetadata.computedFields.size > 0) {
    for (const [k] of Object.entries(nestedWhere)) {
      const fieldDef = registryMetadata.computedFields.get(k);
      if (!fieldDef) continue;
      const sqlExpr = fieldDef.resolve({
        table: targetInfo.table as unknown as Record<string, unknown>,
        schema: ctx.schema,
        sql,
        context: ctx.queryContext,
      });
      if (sqlExpr instanceof SQL) {
        targetComputedSqlMap.set(k, sqlExpr);
      }
    }
  }

  const nestedCtx: WhereBuilderContext = {
    table: targetInfo.table,
    tableInfo: targetInfo,
    metadata: targetMetadata,
    schema: ctx.schema,
    allTables: ctx.allTables,
    computedSqlMap: targetComputedSqlMap,
    derivedAliasMap: new Map(),
    adapter: ctx.adapter,
    registry: ctx.registry,
    db: ctx.db,
    queryContext: ctx.queryContext,
  };

  // Build scalar conditions normally
  const scalarCondition =
    Object.keys(scalarWhere).length > 0 ? buildWhere(scalarWhere, nestedCtx) : undefined;

  // For derived fields, resolve subqueries and build inline EXISTS conditions
  const derivedConditions: SQL[] = [];
  if (Object.keys(derivedWhere).length > 0 && registryMetadata && ctx.db) {
    const derivedKeys = Object.keys(derivedWhere);
    const resolutions = resolveDerivedFields(
      registryMetadata.derivedFields,
      derivedKeys,
      targetInfo.table,
      ctx.db,
      ctx.schema,
      ctx.queryContext,
      ctx.adapter.dialect,
    );

    for (const [name, derivedValue] of Object.entries(derivedWhere)) {
      const res = resolutions.get(name);
      if (!res) continue;

      // Build condition on derived alias column
      const derivedAliasMap = new Map<string, { column: Column | SQL }>();
      derivedAliasMap.set(name, { column: res.valueColumn });

      const derivedCtx: WhereBuilderContext = {
        table: targetInfo.table,
        tableInfo: targetInfo,
        metadata: { ...targetMetadata, scalarFields: new Map(), relationFields: new Map() },
        schema: ctx.schema,
        allTables: ctx.allTables,
        computedSqlMap: new Map(),
        derivedAliasMap,
        adapter: ctx.adapter,
      };
      const cond = buildWhere({ [name]: derivedValue }, derivedCtx);
      if (cond && res.joinCondition) {
        const derivedExists = sql`EXISTS (SELECT 1 FROM ${res.subquery} WHERE ${and(res.joinCondition, cond)})`;
        derivedConditions.push(derivedExists);
      }
    }
  }

  const nestedCondition =
    derivedConditions.length > 0
      ? scalarCondition
        ? and(scalarCondition, ...derivedConditions)
        : derivedConditions.length === 1
          ? derivedConditions[0]!
          : and(...derivedConditions)
      : scalarCondition;
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
      targetEntity:
        dbNameToTsName.get(relation.referencedTableName) ?? relation.referencedTableName,
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
