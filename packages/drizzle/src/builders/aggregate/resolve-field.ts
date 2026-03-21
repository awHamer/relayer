import { sql, SQL } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { EntityMetadata, EntityRegistry } from '@relayerjs/core';

import type { DialectAdapter, DrizzleDatabase } from '../../dialect';
import type { TableInfo } from '../../introspect';
import { resolveDerivedFields } from '../../resolvers';
import { aggDerivedKey, derivedJoinKey, getPrimaryKeyField, getTableColumns } from '../../utils';
import { resolveRelationJoin } from '../relation-join';

export interface ResolveFieldCtx {
  options: unknown;
  table: Table;
  metadata: EntityMetadata;
  allTables: Map<string, TableInfo>;
  schema: Record<string, unknown>;
  registry?: EntityRegistry;
  db?: DrizzleDatabase;
  adapter?: DialectAdapter;
  queryContext?: unknown;
  joins: Array<{ subquery: unknown; on: SQL }>;
  joinedRelations: Set<string>;
}

export function resolveFieldColumn(
  fieldPath: string,
  ctx: ResolveFieldCtx,
): Column | SQL | undefined {
  const { table, metadata, allTables, schema, registry, db, adapter, queryContext } = ctx;
  const tableColumns = getTableColumns(table);
  const joined = ctx.joinedRelations;
  const jns = ctx.joins;

  if (!fieldPath.includes('.')) {
    const col = tableColumns[fieldPath];
    if (col) return col;

    if (metadata.computedFields.has(fieldPath)) {
      const fieldDef = metadata.computedFields.get(fieldPath)!;
      const sqlExpr = fieldDef.resolve({
        table: table as unknown as Record<string, unknown>,
        schema,
        sql,
        context: queryContext,
      });
      if (sqlExpr instanceof SQL) return sqlExpr;
    }

    if (metadata.derivedFields.has(fieldPath) && db && adapter) {
      const resolutions = resolveDerivedFields(metadata.derivedFields, [fieldPath], {
        table,
        db,
        schema,
        context: queryContext,
        dialect: adapter.dialect,
      });
      const res = resolutions.get(fieldPath);
      if (res) {
        const derivedKey = aggDerivedKey(fieldPath);
        if (!joined.has(derivedKey)) {
          joined.add(derivedKey);
          jns.push({ subquery: res.subquery, on: res.joinCondition });
        }
        return res.valueColumn;
      }
    }

    return undefined;
  }

  const segments = fieldPath.split('.');
  const relationName = segments[0]!;
  const relDef = metadata.relationFields.get(relationName);
  if (!relDef) return undefined;

  const targetInfo = allTables.get(relDef.targetEntity);
  if (!targetInfo) return undefined;

  if (!joined.has(relationName)) {
    const pkField = getPrimaryKeyField(targetInfo);
    if (pkField) {
      const fkResolved = resolveRelationJoin(relationName, pkField, ctx);
      if (fkResolved) {
        joined.add(relationName);
        jns.push({ subquery: fkResolved.targetTable, on: fkResolved.joinCondition });
      }
    }
  }

  const targetMetadata = registry?.get(relDef.targetEntity);
  const remaining = segments.slice(1);

  if (remaining.length === 1) {
    const targetField = remaining[0]!;
    const targetColumns = getTableColumns(targetInfo.table);

    const col = targetColumns[targetField];
    if (col) return col;

    if (targetMetadata?.computedFields.has(targetField)) {
      const fieldDef = targetMetadata.computedFields.get(targetField)!;
      const sqlExpr = fieldDef.resolve({
        table: targetInfo.table as unknown as Record<string, unknown>,
        schema,
        sql,
        context: queryContext,
      });
      if (sqlExpr instanceof SQL) return sqlExpr;
    }

    if (targetMetadata?.derivedFields.has(targetField) && db && adapter) {
      const resolutions = resolveDerivedFields(targetMetadata.derivedFields, [targetField], {
        table: targetInfo.table,
        db,
        schema,
        context: queryContext,
        dialect: adapter.dialect,
      });
      const res = resolutions.get(targetField);
      if (res) {
        const derivedKey = derivedJoinKey(relationName, targetField);
        if (!joined.has(derivedKey)) {
          joined.add(derivedKey);
          jns.push({ subquery: res.subquery, on: res.joinCondition });
        }
        return res.valueColumn;
      }
    }
  }

  if (remaining.length === 2) {
    const [derivedName, subField] = remaining;
    if (
      derivedName &&
      subField &&
      targetMetadata?.derivedFields.has(derivedName) &&
      db &&
      adapter
    ) {
      const resolutions = resolveDerivedFields(targetMetadata.derivedFields, [derivedName], {
        table: targetInfo.table,
        db,
        schema,
        context: queryContext,
        dialect: adapter.dialect,
      });
      const res = resolutions.get(derivedName);
      if (res?.isObjectType && res.valueColumns) {
        const subCol = res.valueColumns.get(subField);
        if (subCol) {
          const derivedKey = derivedJoinKey(relationName, derivedName);
          if (!joined.has(derivedKey)) {
            joined.add(derivedKey);
            jns.push({ subquery: res.subquery, on: res.joinCondition });
          }
          return subCol;
        }
      }
    }
  }

  return undefined;
}
