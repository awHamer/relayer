import { sql, SQL } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

import { buildOrderBy } from '../../src/builders/order-by-builder';
import { buildRegistry } from '../../src/introspect';
import * as pgSchema from '../fixtures/pg-schema';
import { users } from '../fixtures/pg-schema';

const mockDb = drizzle({} as any);
const { registry } = buildRegistry(pgSchema as unknown as Record<string, unknown>);
const metadata = registry.get('users')!;

function toSql(orderByResult: SQL[]) {
  return mockDb
    .select()
    .from(users)
    .orderBy(...orderByResult)
    .toSQL();
}

describe('buildOrderBy', () => {
  it('returns empty array for undefined', () => {
    const result = buildOrderBy(undefined, users, metadata, new Map(), new Map());
    expect(result).toEqual([]);
  });

  it('single scalar field asc', () => {
    const result = buildOrderBy(
      { field: 'firstName', order: 'asc' },
      users,
      metadata,
      new Map(),
      new Map(),
    );
    expect(result).toHaveLength(1);
    const { sql: query } = toSql(result);
    expect(query).toContain('"first_name" asc');
  });

  it('single scalar field desc', () => {
    const result = buildOrderBy(
      { field: 'firstName', order: 'desc' },
      users,
      metadata,
      new Map(),
      new Map(),
    );
    expect(result).toHaveLength(1);
    const { sql: query } = toSql(result);
    expect(query).toContain('"first_name" desc');
  });

  it('array of entries produces multiple order clauses', () => {
    const result = buildOrderBy(
      [
        { field: 'lastName', order: 'asc' },
        { field: 'firstName', order: 'desc' },
      ],
      users,
      metadata,
      new Map(),
      new Map(),
    );
    expect(result).toHaveLength(2);
    const { sql: query } = toSql(result);
    expect(query).toContain('"last_name" asc');
    expect(query).toContain('"first_name" desc');
  });

  it('computed field uses SQL expression from computedSqlMap', () => {
    const fullNameSql = sql`${users.firstName} || ' ' || ${users.lastName}`;
    const computedSqlMap = new Map<string, SQL>();
    computedSqlMap.set('fullName', fullNameSql);

    const metadataWithComputed = {
      ...metadata,
      computedFields: new Map(metadata.computedFields),
    };
    metadataWithComputed.computedFields.set('fullName', {
      kind: 'computed' as const,
      valueType: 'string' as const,
      resolve: () => fullNameSql,
    });

    const result = buildOrderBy(
      { field: 'fullName', order: 'asc' },
      users,
      metadataWithComputed,
      computedSqlMap,
      new Map(),
    );
    expect(result).toHaveLength(1);
    const { sql: query } = toSql(result);
    expect(query).toContain('asc');
  });

  it('derived field uses alias column from derivedAliasMap', () => {
    const derivedAliasMap = new Map<string, { column: Column | SQL }>();
    derivedAliasMap.set('postsCount', { column: sql`"postsCount"` });

    const metadataWithDerived = {
      ...metadata,
      derivedFields: new Map(metadata.derivedFields),
    };
    metadataWithDerived.derivedFields.set('postsCount', {
      kind: 'derived' as const,
      valueType: 'number' as const,
      query: () => null,
      on: () => null,
    });

    const result = buildOrderBy(
      { field: 'postsCount', order: 'desc' },
      users,
      metadataWithDerived,
      new Map(),
      derivedAliasMap,
    );
    expect(result).toHaveLength(1);
    const { sql: query } = toSql(result);
    expect(query).toContain('desc');
  });

  it('derived object dot notation uses sub-field alias', () => {
    const derivedAliasMap = new Map<string, { column: Column | SQL }>();
    derivedAliasMap.set('orderSummary_totalAmount', { column: sql`"orderSummary_totalAmount"` });

    const metadataWithDerived = {
      ...metadata,
      derivedFields: new Map(metadata.derivedFields),
    };
    metadataWithDerived.derivedFields.set('orderSummary', {
      kind: 'derived' as const,
      valueType: { totalAmount: 'string', orderCount: 'number' } as any,
      query: () => null,
      on: () => null,
    });

    const result = buildOrderBy(
      { field: 'orderSummary.totalAmount', order: 'asc' },
      users,
      metadataWithDerived,
      new Map(),
      derivedAliasMap,
    );
    expect(result).toHaveLength(1);
    const { sql: query } = toSql(result);
    expect(query).toContain('asc');
  });

  it('unknown field is skipped and returns empty array', () => {
    const result = buildOrderBy(
      { field: 'nonExistent', order: 'asc' },
      users,
      metadata,
      new Map(),
      new Map(),
    );
    expect(result).toEqual([]);
  });
});
