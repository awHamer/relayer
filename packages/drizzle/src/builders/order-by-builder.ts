import { asc, desc, sql, SQL } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter } from '../dialect';
import type { TableInfo } from '../introspect';
import { resolveDerivedFields } from '../resolvers';
import { getPrimaryKeyField } from '../utils';
import { resolveRelationJoin } from './relation-join';

export interface OrderByEntry {
  field: string;
  order: 'asc' | 'desc';
}

export interface OrderByResult {
  clauses: SQL[];
  joins: Array<{ table: unknown; on: SQL; relationName: string }>;
}

export function buildOrderBy(
  orderBy: OrderByEntry | OrderByEntry[] | undefined,
  table: Table,
  metadata: EntityMetadata,
  computedSqlMap: Map<string, SQL>,
  derivedAliasMap: Map<string, { column: Column | SQL }>,
  allTables: Map<string, TableInfo>,
  schema: Record<string, unknown>,
  adapter: DialectAdapter,
  registry?: EntityRegistry,
  db?: unknown,
  queryContext?: unknown,
  maxRelationDepth?: number,
): OrderByResult {
  if (!orderBy) return { clauses: [], joins: [] };

  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const clauses: SQL[] = [];
  const joins: Array<{ table: unknown; on: SQL; relationName: string }> = [];
  const joinedRelations = new Set<string>();
  const tableColumns = table as unknown as Record<string, Column>;

  for (const entry of entries) {
    const direction = entry.order === 'desc' ? desc : asc;
    let column: Column | SQL | undefined;

    // Direct field on current entity
    if (metadata.scalarFields.has(entry.field)) {
      column = tableColumns[entry.field];
    } else if (metadata.computedFields.has(entry.field)) {
      column = computedSqlMap.get(entry.field);
    } else if (metadata.derivedFields.has(entry.field)) {
      column = derivedAliasMap.get(entry.field)?.column;
    } else if (entry.field.includes('.')) {
      const segments = entry.field.split('.');
      const firstSegment = segments[0]!;

      // Derived object dot notation: 'orderSummary.totalAmount'
      if (metadata.derivedFields.has(firstSegment) && segments.length === 2) {
        column = derivedAliasMap.get(`${firstSegment}_${segments[1]}`)?.column;
      }
      // JSON path dot notation: 'metadata.role' or 'metadata.settings.theme'
      else if (metadata.scalarFields.has(firstSegment)) {
        const fieldDef = metadata.scalarFields.get(firstSegment)!;
        if (fieldDef.valueType === 'json') {
          const col = tableColumns[firstSegment];
          if (col) {
            column = adapter.jsonPath(col, segments.slice(1));
          }
        }
      }
      // Relation path: try simple 1-level scalar column first (no registry needed)
      else if (metadata.relationFields.has(firstSegment) && segments.length === 2) {
        const resolved = resolveRelationJoin(
          firstSegment,
          segments[1]!,
          metadata,
          allTables,
          schema,
        );
        if (resolved) {
          column = resolved.column;
          if (!joinedRelations.has(firstSegment)) {
            joinedRelations.add(firstSegment);
            joins.push({
              table: resolved.targetTable,
              on: resolved.joinCondition,
              relationName: firstSegment,
            });
          }
        }
        // Not a scalar column — try recursive resolver for computed/derived
        else if (registry && db) {
          column = resolveRelationPath(
            segments,
            metadata,
            allTables,
            schema,
            adapter,
            registry,
            db,
            queryContext,
            joins,
            joinedRelations,
            maxRelationDepth,
          );
        }
      }
      // Deep relation path (3+ segments): requires registry
      else if (metadata.relationFields.has(firstSegment) && registry && db) {
        column = resolveRelationPath(
          segments,
          metadata,
          allTables,
          schema,
          adapter,
          registry,
          db,
          queryContext,
          joins,
          joinedRelations,
        );
      }
    }

    if (column) {
      clauses.push(direction(column as Column));
    }
  }

  return { clauses, joins };
}

// Walk a dot-separated path through relations to resolve the final column.
// e.g. 'author.department.employeeCount' ->
//   step 0: 'author' is relation on current entity -> FK join to users
//   step 1: 'department' is relation on users -> FK join to departments
//   step 2: 'employeeCount' is derived on departments -> derived subquery join
function resolveRelationPath(
  segments: string[],
  rootMetadata: EntityMetadata,
  allTables: Map<string, TableInfo>,
  schema: Record<string, unknown>,
  adapter: DialectAdapter,
  registry: EntityRegistry,
  db: unknown,
  queryContext: unknown,
  joins: Array<{ table: unknown; on: SQL; relationName: string }>,
  joinedRelations: Set<string>,
  maxRelationDepth?: number,
): Column | SQL | undefined {
  const depthLimit = maxRelationDepth ?? 3;
  let currentMetadata = rootMetadata;
  let joinPrefix = '';

  // Walk segments as long as they are relations
  for (let i = 0; i < segments.length - 1; i++) {
    if (i >= depthLimit) return undefined;

    const segment = segments[i]!;
    const relDef = currentMetadata.relationFields.get(segment);
    if (!relDef) break; // the remaining segment is not a relation

    const targetMetadata = registry.get(relDef.targetEntity);
    const targetInfo = allTables.get(relDef.targetEntity);
    if (!targetMetadata || !targetInfo) return undefined;

    joinPrefix = joinPrefix ? `${joinPrefix}.${segment}` : segment;

    // FK join to target table (if not already joined at this path)
    if (!joinedRelations.has(joinPrefix)) {
      const pkField = getPrimaryKeyField(targetInfo);
      if (!pkField) return undefined;
      const fkResolved = resolveRelationJoin(segment, pkField, currentMetadata, allTables, schema);
      if (!fkResolved) return undefined;
      joinedRelations.add(joinPrefix);
      joins.push({
        table: fkResolved.targetTable,
        on: fkResolved.joinCondition,
        relationName: joinPrefix,
      });
    }

    currentMetadata = targetMetadata;
  }

  const finalInfo = allTables.get(currentMetadata.name);
  if (!finalInfo) return undefined;
  const finalColumns = finalInfo.table as unknown as Record<string, Column>;

  // dot paths 'path.prop'
  const relHops = joinPrefix ? joinPrefix.split('.').length : 0;
  const remainingSegments = segments.slice(relHops);

  if (remainingSegments.length === 2) {
    const [derivedName, subField] = remainingSegments;
    if (derivedName && subField && currentMetadata.derivedFields.has(derivedName)) {
      const resolutions = resolveDerivedFields(
        currentMetadata.derivedFields,
        [derivedName],
        finalInfo.table,
        db,
        schema,
        queryContext,
        adapter.dialect,
      );
      const res = resolutions.get(derivedName);
      if (res?.isObjectType && res.valueColumns) {
        const subCol = res.valueColumns.get(subField);
        if (subCol) {
          const derivedJoinKey = `${joinPrefix}__derived_${derivedName}`;
          if (!joinedRelations.has(derivedJoinKey)) {
            joinedRelations.add(derivedJoinKey);
            joins.push({
              table: res.subquery,
              on: res.joinCondition,
              relationName: derivedJoinKey,
            });
          }
          return subCol;
        }
      }
    }
  }

  const fieldName = remainingSegments[remainingSegments.length - 1]!;

  // Scalar column
  if (currentMetadata.scalarFields.has(fieldName)) {
    return finalColumns[fieldName];
  }

  // Computed field — resolve raw SQL expression (not aliased, for use in ORDER BY)
  if (currentMetadata.computedFields.has(fieldName)) {
    const fieldDef = currentMetadata.computedFields.get(fieldName)!;
    const sqlExpr = fieldDef.resolve({
      table: finalInfo.table as unknown as Record<string, unknown>,
      schema,
      sql,
      context: queryContext,
    });
    if (sqlExpr instanceof SQL) return sqlExpr;
    return undefined;
  }

  // Derived field
  if (currentMetadata.derivedFields.has(fieldName)) {
    const resolutions = resolveDerivedFields(
      currentMetadata.derivedFields,
      [fieldName],
      finalInfo.table,
      db,
      schema,
      queryContext,
      adapter.dialect,
    );
    const res = resolutions.get(fieldName);
    if (!res) return undefined;

    const derivedJoinKey = `${joinPrefix}__derived_${fieldName}`;
    if (!joinedRelations.has(derivedJoinKey)) {
      joinedRelations.add(derivedJoinKey);
      joins.push({ table: res.subquery, on: res.joinCondition, relationName: derivedJoinKey });
    }
    return res.valueColumn;
  }

  return undefined;
}
