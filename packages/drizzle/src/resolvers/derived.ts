import { eq, SQL, sql } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { DerivedFieldDef, ObjectValueType } from '@relayerjs/core';

import type { Dialect, DrizzleDatabase } from '../dialect';
import { derivedSubFieldKey, getTableColumns, derivedAlias as makeDerivedAlias } from '../utils';

// Aliased subquery result from .as() - used in leftJoin
export type AliasedSubquery = unknown;

export interface DerivedFieldResolution {
  subquery: AliasedSubquery;
  alias: string;
  joinCondition: SQL;
  // Scalar: single column. Object: map of subField -> column.
  valueColumn: SQL;
  valueColumns?: Map<string, SQL>;
  isObjectType: boolean;
}

function quoteIdent(name: string, dialect: Dialect): string {
  return dialect === 'mysql' ? `\`${name}\`` : `"${name}"`;
}

export interface DerivedResolverCtx {
  table: Table;
  db: DrizzleDatabase;
  schema: Record<string, unknown>;
  context?: unknown;
  dialect?: Dialect;
}

export function resolveDerivedFields(
  derivedFields: Map<string, DerivedFieldDef>,
  requestedDerived: string[],
  ctx: DerivedResolverCtx,
): Map<string, DerivedFieldResolution> {
  const result = new Map<string, DerivedFieldResolution>();
  let counter = 0;

  for (const fieldName of requestedDerived) {
    const fieldDef = derivedFields.get(fieldName);
    if (!fieldDef) continue;

    const isObjectType =
      typeof fieldDef.valueType === 'object' && !Array.isArray(fieldDef.valueType);
    const alias = makeDerivedAlias(fieldName, counter++);

    const wrappedDb = createAutoAliasProxy(ctx.db, fieldName, isObjectType);
    const field = (subField?: string) =>
      subField ? derivedSubFieldKey(fieldName, subField) : fieldName;
    const subqueryBuilder = fieldDef.query({
      db: wrappedDb as unknown,
      schema: ctx.schema,
      sql,
      context: ctx.context,
      field,
    });

    const aliasedSubquery = (subqueryBuilder as { as: (name: string) => unknown }).as(alias);

    const parentProxy = new Proxy({} as Record<string, unknown>, {
      get: (_target, prop) => getTableColumns(ctx.table)[prop as string],
    });

    const derivedProxy = new Proxy({} as Record<string, unknown>, {
      get: (_target, prop) => (aliasedSubquery as Record<string, unknown>)[prop as string],
    });

    const joinCondition = fieldDef.on({
      parent: parentProxy,
      derived: derivedProxy,
      eq: (a: unknown, b: unknown) => eq(a as Column, b as Column),
    }) as SQL;

    if (isObjectType) {
      const objectShape = fieldDef.valueType as ObjectValueType;
      const valueColumns = new Map<string, SQL>();
      for (const subField of Object.keys(objectShape)) {
        const sqlKey = derivedSubFieldKey(fieldName, subField);
        valueColumns.set(
          subField,
          sql`${sql.raw(`${quoteIdent(alias, ctx.dialect ?? 'pg')}.${quoteIdent(sqlKey, ctx.dialect ?? 'pg')}`)}`.as(
            sqlKey,
          ) as unknown as SQL,
        );
      }
      result.set(fieldName, {
        subquery: aliasedSubquery,
        alias,
        joinCondition,
        valueColumn: null as unknown as SQL,
        valueColumns,
        isObjectType: true,
      });
    } else {
      const valueColumn =
        sql`${sql.raw(`${quoteIdent(alias, ctx.dialect ?? 'pg')}.${quoteIdent(fieldName, ctx.dialect ?? 'pg')}`)}`.as(
          fieldName,
        ) as unknown as SQL;
      result.set(fieldName, {
        subquery: aliasedSubquery,
        alias,
        joinCondition,
        valueColumn,
        isObjectType: false,
      });
    }
  }

  return result;
}

function needsAlias(field: unknown): boolean {
  if (field instanceof SQL) return true;
  // Drizzle Column objects (schema.table.column)
  if (field && typeof field === 'object' && 'name' in field && 'table' in field) return true;
  return false;
}

function wrapWithAlias(field: unknown, aliasName: string): unknown {
  if (field instanceof SQL) return field.as(aliasName);
  // Wrap Column as sql`${column}`.as(aliasName) to force the alias
  return sql`${field as Column}`.as(aliasName);
}

function createAutoAliasProxy(db: unknown, fieldName: string, isObjectType: boolean): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbObj = db as Record<string, any>;
  return new Proxy(db as object, {
    get(target, prop) {
      if (prop === 'select') {
        return (fields: Record<string, unknown>) => {
          if (!fields) return dbObj.select(fields);

          const patched = { ...fields };

          if (isObjectType) {
            for (const key of Object.keys(patched)) {
              if (key.startsWith(`${fieldName}_`) && needsAlias(patched[key])) {
                patched[key] = wrapWithAlias(patched[key], key);
              }
            }
          } else if (fieldName in patched && needsAlias(patched[fieldName])) {
            patched[fieldName] = wrapWithAlias(patched[fieldName], fieldName);
          }

          return dbObj.select(patched);
        };
      }
      return (target as Record<string, unknown>)[prop as string];
    },
  });
}
