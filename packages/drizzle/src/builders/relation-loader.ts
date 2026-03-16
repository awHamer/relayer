import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  inArray,
  normalizeRelation,
} from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { EntityMetadata, RelationFieldDef } from '@relayerjs/core';

import type { TableInfo } from '../introspect';
import { resolveRelationFields } from './where/relations';

export interface RelationLoadContext {
  db: any;
  allTables: Map<string, TableInfo>;
  schema: Record<string, unknown>;
  parentMetadata: EntityMetadata;
}

export async function loadRelations(
  parentResults: Record<string, unknown>[],
  requestedRelations: string[],
  relationSelects: Map<string, Record<string, unknown>>,
  ctx: RelationLoadContext,
): Promise<void> {
  if (requestedRelations.length === 0 || parentResults.length === 0) return;

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

    // Build select columns based on nested select spec
    const nestedSelect = relationSelects.get(relationName);
    let relatedRows: Record<string, unknown>[];

    // Track internally-added columns to strip from response
    const internalKeys = new Set<string>();

    if (nestedSelect) {
      const targetRelationFields = resolveRelationFields(relDef.targetEntity, ctx.schema);
      const selectColumns = buildNestedColumns(
        nestedSelect,
        targetInfo,
        targetRelationFields,
        ctx.schema,
      );
      // Always include FK column for grouping
      if (!selectColumns[targetColName]) {
        selectColumns[targetColName] = (targetInfo.table as unknown as Record<string, Column>)[
          targetColName
        ]!;
        internalKeys.add(targetColName);
      }
      // Mark any FK columns added by buildNestedColumns that user didn't request
      for (const key of Object.keys(selectColumns)) {
        if (!(key in nestedSelect)) {
          internalKeys.add(key);
        }
      }
      relatedRows = (await ctx.db
        .select(selectColumns as any)
        .from(targetInfo.table)
        .where(inArray(targetCol, parentValues as unknown[]))) as Record<string, unknown>[];
    } else {
      relatedRows = (await ctx.db
        .select()
        .from(targetInfo.table)
        .where(inArray(targetCol, parentValues as unknown[]))) as Record<string, unknown>[];
    }

    // Group by FK
    const grouped = new Map<unknown, Record<string, unknown>[]>();
    for (const row of relatedRows) {
      const fkValue = row[targetColName];
      const existing = grouped.get(fkValue) ?? [];
      existing.push(row);
      grouped.set(fkValue, existing);
    }

    // Recursive: load nested relations BEFORE stripping (they need FK columns)
    if (nestedSelect && relatedRows.length > 0) {
      const targetRelFields = resolveRelationFields(relDef.targetEntity, ctx.schema);
      const nestedRelationNames: string[] = [];
      const nestedRelationSelects = new Map<string, Record<string, unknown>>();

      for (const [key, val] of Object.entries(nestedSelect)) {
        if (targetRelFields.has(key)) {
          nestedRelationNames.push(key);
          if (typeof val === 'object' && val !== null) {
            nestedRelationSelects.set(key, val as Record<string, unknown>);
          }
        }
      }

      if (nestedRelationNames.length > 0) {
        const targetMetadata: EntityMetadata = {
          name: relDef.targetEntity,
          scalarFields: targetInfo.scalarFields,
          relationFields: targetRelFields,
          computedFields: new Map(),
          derivedFields: new Map(),
        };

        await loadRelations(relatedRows, nestedRelationNames, nestedRelationSelects, {
          db: ctx.db,
          allTables: ctx.allTables,
          schema: ctx.schema,
          parentMetadata: targetMetadata,
        });
      }
    }

    // Strip internal columns from response
    if (internalKeys.size > 0) {
      for (const row of relatedRows) {
        for (const key of internalKeys) {
          delete row[key];
        }
      }
    }

    // Attach to parent results
    for (const parent of parentResults) {
      const parentValue = parent[sourceColName];
      const related = grouped.get(parentValue) ?? [];
      parent[relationName] = relDef.relationType === 'many' ? related : (related[0] ?? null);
    }
  }
}

function buildNestedColumns(
  nestedSelect: Record<string, unknown>,
  targetInfo: TableInfo,
  targetRelationFields: Map<string, RelationFieldDef>,
  schema: Record<string, unknown>,
): Record<string, Column> {
  const columns: Record<string, Column> = {};
  const tableColumns = targetInfo.table as unknown as Record<string, Column>;
  const nestedRelationNames: string[] = [];

  for (const [key, val] of Object.entries(nestedSelect)) {
    if (!val) continue;
    if (targetInfo.scalarFields.has(key)) {
      const col = tableColumns[key];
      if (col) columns[key] = col;
    }
    if (targetRelationFields.has(key)) {
      nestedRelationNames.push(key);
    }
  }

  // Include only the specific FK columns needed for nested relations
  if (nestedRelationNames.length > 0) {
    try {
      const { tables: relConfig, tableNamesMap } = extractTablesRelationalConfig(
        schema,
        (table: Table) => createTableRelationsHelpers(table),
      );
      const targetConfig = relConfig[targetInfo.tsName];
      if (targetConfig) {
        for (const relName of nestedRelationNames) {
          const drizzleRel = targetConfig.relations[relName];
          if (!drizzleRel) continue;
          const normalized = normalizeRelation(relConfig, tableNamesMap, drizzleRel);
          // fields = source (current table) side FK columns
          for (const col of normalized.fields) {
            const colName = findColumnTsName(col);
            if (colName && !columns[colName]) {
              columns[colName] = col;
            }
          }
        }
      }
    } catch {
      // Fallback: include all scalar fields
      for (const [fieldName] of targetInfo.scalarFields) {
        if (!columns[fieldName]) {
          const col = tableColumns[fieldName];
          if (col) columns[fieldName] = col;
        }
      }
    }
  }

  return columns;
}

function findColumnTsName(column: Column): string | undefined {
  const tableObj = column.table as unknown as Record<string, Column>;
  for (const [key, col] of Object.entries(tableObj)) {
    if (col === column) return key;
  }
  return undefined;
}
