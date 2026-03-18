import { sql, SQL } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

import { buildOrderBy } from '../../src/builders/order-by-builder';
import type { OrderByResult } from '../../src/builders/order-by-builder';
import { pgAdapter } from '../../src/dialect/pg';
import { buildRegistry } from '../../src/introspect';
import * as pgSchema from '../fixtures/pg-schema';
import { posts, users } from '../fixtures/pg-schema';

const mockDb = drizzle({} as any);
const { registry, tables } = buildRegistry(pgSchema as unknown as Record<string, unknown>);
const metadata = registry.get('users')!;
const postsMetadata = registry.get('posts')!;
const adapter = pgAdapter;
const schema = pgSchema as unknown as Record<string, unknown>;

function toSql(orderByClauses: SQL[]) {
  return mockDb
    .select()
    .from(users)
    .orderBy(...orderByClauses)
    .toSQL();
}

const emptyArgs = [tables, schema, adapter] as const;

describe('buildOrderBy', () => {
  it('returns empty result for undefined', () => {
    const result = buildOrderBy(undefined, users, metadata, new Map(), new Map(), ...emptyArgs);
    expect(result).toEqual({ clauses: [], joins: [] });
  });

  it('single scalar field asc', () => {
    const result = buildOrderBy(
      { field: 'firstName', order: 'asc' },
      users,
      metadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    expect(result.joins).toHaveLength(0);
    const { sql: query } = toSql(result.clauses);
    expect(query).toContain('"first_name" asc');
  });

  it('single scalar field desc', () => {
    const result = buildOrderBy(
      { field: 'firstName', order: 'desc' },
      users,
      metadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    const { sql: query } = toSql(result.clauses);
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
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(2);
    const { sql: query } = toSql(result.clauses);
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
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    const { sql: query } = toSql(result.clauses);
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
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    const { sql: query } = toSql(result.clauses);
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
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    const { sql: query } = toSql(result.clauses);
    expect(query).toContain('asc');
  });

  it('unknown field is skipped and returns empty result', () => {
    const result = buildOrderBy(
      { field: 'nonExistent', order: 'asc' },
      users,
      metadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result).toEqual({ clauses: [], joins: [] });
  });

  // ─── New: Relation dot notation ──────────────────────────────

  it('relation dot notation produces join and order clause', () => {
    const result = buildOrderBy(
      { field: 'author.firstName', order: 'asc' },
      posts,
      postsMetadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    expect(result.joins).toHaveLength(1);
    expect(result.joins[0]!.relationName).toBe('author');
  });

  it('deduplicates joins for same relation', () => {
    const result = buildOrderBy(
      [
        { field: 'author.firstName', order: 'asc' },
        { field: 'author.lastName', order: 'desc' },
      ],
      posts,
      postsMetadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(2);
    expect(result.joins).toHaveLength(1);
  });

  // ─── New: JSON path dot notation ─────────────────────────────

  it('JSON path produces order clause', () => {
    const result = buildOrderBy(
      { field: 'metadata.role', order: 'asc' },
      users,
      metadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    expect(result.joins).toHaveLength(0);
  });

  it('nested JSON path works', () => {
    const result = buildOrderBy(
      { field: 'metadata.settings.theme', order: 'desc' },
      users,
      metadata,
      new Map(),
      new Map(),
      ...emptyArgs,
    );
    expect(result.clauses).toHaveLength(1);
    expect(result.joins).toHaveLength(0);
  });
});
