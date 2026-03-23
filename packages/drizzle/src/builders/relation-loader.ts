import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  inArray,
  normalizeRelation,
} from 'drizzle-orm';
import type { Column, SQL, Table } from 'drizzle-orm';
import { isObject } from '@relayerjs/core';
import type { EntityMetadata, EntityRegistry, RelationFieldDef } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveComputedFields, resolveDerivedFields } from '../resolvers';
import type { DerivedFieldResolution } from '../resolvers';
import { derivedSubFieldKey, getTableColumns } from '../utils';
import { resolveRelationFields } from './where/relations';

export interface RelationLoadContext {
  db: DrizzleDatabase;
  allTables: Map<string, TableInfo>;
  schema: Record<string, unknown>;
  parentMetadata: EntityMetadata;
  registry?: EntityRegistry;
  adapter?: DialectAdapter;
  queryContext?: unknown;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
  _currentDepth?: number;
}

export async function loadRelations(
  parentResults: Record<string, unknown>[],
  requestedRelations: string[],
  relationSelects: Map<string, Record<string, unknown>>,
  ctx: RelationLoadContext,
): Promise<void> {
  if (requestedRelations.length === 0 || parentResults.length === 0) return;
  const depth = ctx._currentDepth ?? 0;
  const maxDepth = ctx.maxRelationDepth ?? 3;
  if (depth >= maxDepth) return;

  const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(
    ctx.schema,
    (table: Table) => createTableRelationsHelpers(table),
  );

  const parentTsName = ctx.parentMetadata.name;
  const parentTableConfig = relConfig[parentTsName];
  if (!parentTableConfig) return;

  for (const relationName of requestedRelations) {
    const relDef = ctx.parentMetadata.relationFields.get(relationName);
    if (!relDef) continue;

    const drizzleRelation = parentTableConfig.relations[relationName];
    if (!drizzleRelation) continue;

    const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRelation);

    const targetInfo = ctx.allTables.get(relDef.targetEntity);
    if (!targetInfo) continue;

    const sourceColumns = normalized.fields;
    const targetColumns = normalized.references;
    if (sourceColumns.length === 0 || targetColumns.length === 0) continue;

    const sourceCol = sourceColumns[0]!;
    const sourceColName = findColumnTsName(sourceCol);
    if (!sourceColName) continue;

    const parentValues = parentResults
      .map((r) => r[sourceColName])
      .filter((v) => v !== null && v !== undefined);

    if (parentValues.length === 0) {
      for (const parent of parentResults) {
        parent[relationName] = relDef.relationType === 'many' ? [] : null;
      }
      continue;
    }

    const targetCol = targetColumns[0]!;
    const targetColName = findColumnTsName(targetCol);
    if (!targetColName) continue;

    const nestedSelect = relationSelects.get(relationName);
    let relatedRows: Record<string, unknown>[] = [];
    const internalKeys = new Set<string>();

    const targetMetadata = ctx.registry?.get(relDef.targetEntity);
    const targetRelationFields = resolveRelationFields(relDef.targetEntity, ctx.schema);

    const manyLimit = nestedSelect
      ? typeof nestedSelect.$limit === 'number'
        ? nestedSelect.$limit
        : ctx.defaultRelationLimit
      : ctx.defaultRelationLimit;
    let usedSqlLimit = false;

    if (nestedSelect) {
      const hasLimit = typeof nestedSelect.$limit === 'number';
      const effectiveSelect = hasLimit
        ? Object.fromEntries(Object.entries(nestedSelect).filter(([k]) => k !== '$limit'))
        : nestedSelect;

      const { columns, computedColumns, derivedResolutions, nestedRelationNames } =
        buildNestedSelect(effectiveSelect, targetInfo, targetRelationFields, targetMetadata, ctx);

      const hasComplexFields =
        computedColumns.size > 0 || derivedResolutions.size > 0 || nestedRelationNames.length > 0;
      const canUseSqlLimit =
        relDef.relationType === 'many' && manyLimit && !hasComplexFields && ctx.adapter;

      if (canUseSqlLimit) {
        const sqlResult = await ctx.adapter!.buildLimitedRelationQuery(
          ctx.db,
          targetInfo.table,
          targetCol,
          parentValues as unknown[],
          manyLimit,
        );
        if (sqlResult) {
          usedSqlLimit = true;
          relatedRows = sqlResult;
        }
      }
      if (!usedSqlLimit) {
        // Always include FK column for grouping
        if (!columns[targetColName]) {
          columns[targetColName] = getTableColumns(targetInfo.table)[targetColName]!;
          internalKeys.add(targetColName);
        }

        for (const key of Object.keys(columns)) {
          if (!(key in effectiveSelect)) internalKeys.add(key);
        }

        // Merge computed SQL expressions into select
        const selectColumns: Record<string, Column | SQL> = { ...columns };
        for (const [name, sqlExpr] of computedColumns) {
          selectColumns[name] = sqlExpr as unknown as Column;
        }
        for (const [name, res] of derivedResolutions) {
          if (res.isObjectType && res.valueColumns) {
            for (const [subField, col] of res.valueColumns) {
              selectColumns[derivedSubFieldKey(name, subField)] = col as unknown as Column;
            }
          } else if (res.valueColumn) {
            selectColumns[name] = res.valueColumn as unknown as Column;
          }
        }

        let query = ctx.db.select(selectColumns).from(targetInfo.table);

        for (const [, res] of derivedResolutions) {
          query = query.leftJoin(res.subquery, res.joinCondition);
        }

        query = query.where(inArray(targetCol, parentValues as unknown[]));
        relatedRows = (await query) as Record<string, unknown>[];
      }

      // load nested relations recursively BEFORE stripping
      if (nestedRelationNames.length > 0 && relatedRows.length > 0) {
        const nestedRelationSelects = new Map<string, Record<string, unknown>>();
        for (const relName of nestedRelationNames) {
          const val = effectiveSelect[relName];
          if (isObject(val)) {
            nestedRelationSelects.set(relName, val);
          }
        }

        const childMetadata: EntityMetadata = targetMetadata ?? {
          name: relDef.targetEntity,
          scalarFields: targetInfo.scalarFields,
          relationFields: targetRelationFields,
          computedFields: new Map(),
          derivedFields: new Map(),
        };

        await loadRelations(relatedRows, nestedRelationNames, nestedRelationSelects, {
          ...ctx,
          parentMetadata: childMetadata,
          _currentDepth: depth + 1,
        });
      }
    } else {
      if (relDef.relationType === 'many' && manyLimit && ctx.adapter) {
        const sqlResult = await ctx.adapter.buildLimitedRelationQuery(
          ctx.db,
          targetInfo.table,
          targetCol,
          parentValues as unknown[],
          manyLimit,
        );
        if (sqlResult) {
          usedSqlLimit = true;
          relatedRows = sqlResult;
        }
      }
      if (!usedSqlLimit) {
        const defaultQuery = ctx.db
          .select()
          .from(targetInfo.table)
          .where(inArray(targetCol, parentValues as unknown[]));
        relatedRows = (await defaultQuery) as Record<string, unknown>[];
      }
    }

    const grouped = new Map<unknown, Record<string, unknown>[]>();
    for (const row of relatedRows) {
      const fkValue = row[targetColName];
      const existing = grouped.get(fkValue) ?? [];
      existing.push(row);
      grouped.set(fkValue, existing);
    }

    // Hydrate object-type derived fields (convert flat keys to nested objects)
    if (nestedSelect && targetMetadata) {
      for (const [name, def] of targetMetadata.derivedFields) {
        if (!(name in nestedSelect)) continue;
        if (def.valueType && typeof def.valueType === 'object') {
          for (const row of relatedRows) {
            const obj: Record<string, unknown> = {};
            for (const subField of Object.keys(def.valueType as Record<string, string>)) {
              const sqlKey = derivedSubFieldKey(name, subField);
              if (sqlKey in row) {
                obj[subField] = row[sqlKey];
                delete row[sqlKey];
              }
            }
            row[name] = Object.keys(obj).length > 0 ? obj : null;
          }
        }
      }
    }

    // Strip internal columns
    if (internalKeys.size > 0) {
      for (const row of relatedRows) {
        for (const key of internalKeys) delete row[key];
      }
    }

    for (const parent of parentResults) {
      const parentValue = parent[sourceColName];
      const related = grouped.get(parentValue) ?? [];
      if (relDef.relationType === 'many') {
        parent[relationName] = manyLimit && !usedSqlLimit ? related.slice(0, manyLimit) : related;
      } else {
        parent[relationName] = related[0] ?? null;
      }
    }
  }
}

interface NestedSelectResult {
  columns: Record<string, Column>;
  computedColumns: Map<string, SQL>;
  derivedResolutions: Map<string, DerivedFieldResolution>;
  nestedRelationNames: string[];
}

function buildNestedSelect(
  nestedSelect: Record<string, unknown>,
  targetInfo: TableInfo,
  targetRelationFields: Map<string, RelationFieldDef>,
  targetMetadata: EntityMetadata | undefined,
  ctx: RelationLoadContext,
): NestedSelectResult {
  const columns: Record<string, Column> = {};
  const tableColumns = getTableColumns(targetInfo.table);
  const nestedRelationNames: string[] = [];
  const requestedComputed: string[] = [];
  const requestedDerived: string[] = [];

  for (const [key, val] of Object.entries(nestedSelect)) {
    if (!val) continue;

    if (targetInfo.scalarFields.has(key)) {
      const col = tableColumns[key];
      if (col) columns[key] = col;
    } else if (targetRelationFields.has(key)) {
      nestedRelationNames.push(key);
    } else if (targetMetadata?.computedFields.has(key)) {
      requestedComputed.push(key);
    } else if (targetMetadata?.derivedFields.has(key)) {
      requestedDerived.push(key);
    }
  }

  // Include FK columns for nested relations
  if (nestedRelationNames.length > 0) {
    try {
      const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(
        ctx.schema,
        (table: Table) => createTableRelationsHelpers(table),
      );
      const targetConfig = relConfig[targetInfo.tsName];
      if (targetConfig) {
        for (const relName of nestedRelationNames) {
          const drizzleRel = targetConfig.relations[relName];
          if (!drizzleRel) continue;
          const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRel);
          for (const col of normalized.fields) {
            const colName = findColumnTsName(col);
            if (colName && !columns[colName]) columns[colName] = col;
          }
        }
      }
    } catch {
      for (const [fieldName] of targetInfo.scalarFields) {
        if (!columns[fieldName]) {
          const col = tableColumns[fieldName];
          if (col) columns[fieldName] = col;
        }
      }
    }
  }

  let computedColumns = new Map<string, SQL>();
  if (requestedComputed.length > 0 && targetMetadata) {
    computedColumns = resolveComputedFields(targetMetadata.computedFields, {
      table: targetInfo.table,
      schema: ctx.schema,
      context: ctx.queryContext,
      requestedFields: requestedComputed,
    });
  }

  let derivedResolutions = new Map<string, DerivedFieldResolution>();
  if (requestedDerived.length > 0 && targetMetadata && ctx.adapter) {
    derivedResolutions = resolveDerivedFields(targetMetadata.derivedFields, requestedDerived, {
      table: targetInfo.table,
      db: ctx.db,
      schema: ctx.schema,
      context: ctx.queryContext,
      dialect: ctx.adapter.dialect,
    });
  }

  return { columns, computedColumns, derivedResolutions, nestedRelationNames };
}

function findColumnTsName(column: Column): string | undefined {
  const tableObj = getTableColumns(column.table as Table);
  for (const [key, col] of Object.entries(tableObj)) {
    if (col === column) return key;
  }
  return undefined;
}
