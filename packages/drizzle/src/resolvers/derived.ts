import { eq, SQL, sql } from 'drizzle-orm';
import type { Column, Table } from 'drizzle-orm';
import type { DerivedFieldDef, ObjectValueType } from '@relayerjs/core';

import type { Dialect } from '../dialect';

export interface DerivedFieldResolution {
  subquery: unknown;
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

export function resolveDerivedFields(
  derivedFields: Map<string, DerivedFieldDef>,
  requestedDerived: string[],
  table: Table,
  db: any,
  schema: Record<string, unknown>,
  context: unknown = undefined,
  dialect: Dialect = 'pg',
): Map<string, DerivedFieldResolution> {
  const result = new Map<string, DerivedFieldResolution>();
  let counter = 0;

  for (const fieldName of requestedDerived) {
    const fieldDef = derivedFields.get(fieldName);
    if (!fieldDef) continue;

    const isObjectType =
      typeof fieldDef.valueType === 'object' && !Array.isArray(fieldDef.valueType);
    const alias = `__derived_${fieldName}_${counter++}`;

    const wrappedDb = createAutoAliasProxy(db, fieldName, isObjectType);
    const subqueryBuilder = fieldDef.query({ db: wrappedDb as unknown, schema, sql, context });

    const aliasedSubquery = (subqueryBuilder as { as: (name: string) => unknown }).as(alias);

    const parentProxy = new Proxy({} as Record<string, unknown>, {
      get: (_target, prop) => (table as unknown as Record<string, Column>)[prop as string],
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
        const sqlKey = `${fieldName}_${subField}`;
        valueColumns.set(
          subField,
          sql`${sql.raw(`${quoteIdent(alias, dialect)}.${quoteIdent(sqlKey, dialect)}`)}`.as(
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
        sql`${sql.raw(`${quoteIdent(alias, dialect)}.${quoteIdent(fieldName, dialect)}`)}`.as(
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

function createAutoAliasProxy(db: any, fieldName: string, isObjectType: boolean): any {
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'select') {
        return (fields: Record<string, unknown>) => {
          if (!fields) return (target as any).select(fields);

          const patched = { ...fields };

          if (isObjectType) {
            // Auto-alias all fieldName_* columns
            for (const key of Object.keys(patched)) {
              if (key.startsWith(`${fieldName}_`)) {
                const field = patched[key];
                if (field instanceof SQL && !('fieldAlias' in field)) {
                  patched[key] = (field as SQL).as(key);
                }
              }
            }
          } else if (fieldName in patched) {
            const field = patched[fieldName];
            if (field instanceof SQL && !('fieldAlias' in field)) {
              patched[fieldName] = (field as SQL).as(fieldName);
            }
          }

          return (target as any).select(patched);
        };
      }
      return (target as any)[prop];
    },
  });
}
