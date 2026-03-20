import { sql, SQL } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

import { buildWhere } from '../../src/builders/where';
import type { WhereBuilderContext } from '../../src/builders/where';
import { applyOperators } from '../../src/builders/where/operators';
import { pgAdapter } from '../../src/dialect';
import { buildRegistry } from '../../src/introspect';
import { posts, users } from '../fixtures/pg-schema';
import * as pgSchema from '../fixtures/pg-schema';

const mockDb = drizzle({} as any);

function toSql(condition: SQL) {
  return mockDb.select().from(users).where(condition).toSQL();
}

const { registry, tables } = buildRegistry(pgSchema as unknown as Record<string, unknown>);
const metadata = registry.get('users')!;
const tableInfo = tables.get('users')!;

function makeCtx(overrides?: Partial<WhereBuilderContext>): WhereBuilderContext {
  return {
    table: users,
    tableInfo,
    metadata,
    schema: pgSchema as unknown as Record<string, unknown>,
    allTables: tables,
    computedSqlMap: new Map(),
    derivedAliasMap: new Map(),
    adapter: pgAdapter,
    ...overrides,
  };
}

describe('applyOperators', () => {
  describe('direct values', () => {
    it('string produces eq', () => {
      const result = applyOperators(users.firstName, 'Ihor', pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('= $');
      expect(params).toContain('Ihor');
    });

    it('number produces eq', () => {
      const result = applyOperators(users.id, 42, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('= $');
      expect(params).toContain(42);
    });

    it('boolean produces eq', () => {
      const result = applyOperators(posts.published, true, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = mockDb.select().from(posts).where(result!).toSQL();
      expect(query).toContain('= $');
    });

    it('Date produces eq', () => {
      const date = new Date('2025-01-01');
      const result = applyOperators(users.createdAt, date, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('= $');
      expect(params[0]).toEqual(date.toISOString());
    });

    it('null returns undefined', () => {
      const result = applyOperators(users.firstName, null, pgAdapter);
      expect(result).toBeUndefined();
    });

    it('undefined returns undefined', () => {
      const result = applyOperators(users.firstName, undefined, pgAdapter);
      expect(result).toBeUndefined();
    });
  });

  describe('operator objects', () => {
    it('eq operator', () => {
      const result = applyOperators(users.firstName, { eq: 'Ihor' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('=');
      expect(params).toContain('Ihor');
    });

    it('ne operator', () => {
      const result = applyOperators(users.firstName, { ne: 'Ihor' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('<>');
    });

    it('gt operator', () => {
      const result = applyOperators(users.id, { gt: 5 }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('>');
      expect(params).toContain(5);
    });

    it('gte operator', () => {
      const result = applyOperators(users.id, { gte: 5 }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('>=');
    });

    it('lt operator', () => {
      const result = applyOperators(users.id, { lt: 5 }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('<');
    });

    it('lte operator', () => {
      const result = applyOperators(users.id, { lte: 5 }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('<=');
    });

    it('in operator', () => {
      const result = applyOperators(users.id, { in: [1, 2, 3] }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query.toLowerCase()).toContain('in');
      expect(params).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('notIn operator', () => {
      const result = applyOperators(users.id, { notIn: [1, 2] }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query.toLowerCase()).toContain('not in');
    });

    it('like operator', () => {
      const result = applyOperators(users.firstName, { like: '%pattern%' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query.toLowerCase()).toContain('like');
      expect(params).toContain('%pattern%');
    });

    it('notLike operator', () => {
      const result = applyOperators(users.firstName, { notLike: '%x%' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query.toLowerCase()).toContain('not like');
    });

    it('ilike operator delegates to adapter', () => {
      const result = applyOperators(users.firstName, { ilike: '%PATTERN%' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('ilike');
    });

    it('notIlike operator delegates to adapter', () => {
      const result = applyOperators(users.firstName, { notIlike: '%X%' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('not ilike');
    });

    it('contains operator wraps with %', () => {
      const result = applyOperators(users.firstName, { contains: 'sub' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query.toLowerCase()).toContain('like');
      expect(params).toContain('%sub%');
    });

    it('startsWith operator appends %', () => {
      const result = applyOperators(users.firstName, { startsWith: 'pre' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query.toLowerCase()).toContain('like');
      expect(params).toContain('pre%');
    });

    it('endsWith operator prepends %', () => {
      const result = applyOperators(users.firstName, { endsWith: 'suf' }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query.toLowerCase()).toContain('like');
      expect(params).toContain('%suf');
    });

    it('isNull: true produces is null', () => {
      const result = applyOperators(users.firstName, { isNull: true }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query.toLowerCase()).toContain('is null');
    });

    it('isNotNull: true produces is not null', () => {
      const result = applyOperators(users.firstName, { isNotNull: true }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query.toLowerCase()).toContain('is not null');
    });

    it('arrayContains delegates to adapter', () => {
      const result = applyOperators(posts.tags, { arrayContains: ['ts'] }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
    });

    it('arrayContained delegates to adapter', () => {
      const result = applyOperators(posts.tags, { arrayContained: ['ts', 'tips'] }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
    });

    it('arrayOverlaps delegates to adapter', () => {
      const result = applyOperators(posts.tags, { arrayOverlaps: ['ts'] }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
    });

    it('combined operators produce AND', () => {
      const result = applyOperators(users.id, { gt: 5, lt: 10 }, pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('>');
      expect(query).toContain('<');
      expect(params).toEqual(expect.arrayContaining([5, 10]));
    });

    it('empty object returns undefined', () => {
      const result = applyOperators(users.id, {}, pgAdapter);
      expect(result).toBeUndefined();
    });
  });
});

describe('buildWhere', () => {
  it('single scalar field produces eq', () => {
    const result = buildWhere({ firstName: 'Ihor' }, makeCtx());
    expect(result).toBeInstanceOf(SQL);
    const { sql: query, params } = toSql(result!);
    expect(query).toContain('=');
    expect(params).toContain('Ihor');
  });

  it('multiple scalar fields produce AND', () => {
    const result = buildWhere({ firstName: 'Ihor', lastName: 'K' }, makeCtx());
    expect(result).toBeInstanceOf(SQL);
    const { params } = toSql(result!);
    expect(params).toContain('Ihor');
    expect(params).toContain('K');
  });

  it('AND combinator', () => {
    const result = buildWhere({ AND: [{ firstName: 'Ihor' }, { lastName: 'K' }] }, makeCtx());
    expect(result).toBeInstanceOf(SQL);
    const { params } = toSql(result!);
    expect(params).toContain('Ihor');
    expect(params).toContain('K');
  });

  it('OR combinator', () => {
    const result = buildWhere({ OR: [{ firstName: 'Ihor' }, { firstName: 'Jane' }] }, makeCtx());
    expect(result).toBeInstanceOf(SQL);
    const { params } = toSql(result!);
    expect(params).toContain('Ihor');
    expect(params).toContain('Jane');
  });

  it('NOT combinator', () => {
    const result = buildWhere({ NOT: { firstName: 'Ihor' } }, makeCtx());
    expect(result).toBeInstanceOf(SQL);
    const { sql: query, params } = toSql(result!);
    expect(query.toLowerCase()).toContain('not');
    expect(params).toContain('Ihor');
  });

  it('nested OR with AND', () => {
    const result = buildWhere(
      {
        OR: [{ AND: [{ firstName: 'Ihor' }, { lastName: 'K' }] }, { firstName: 'Jane' }],
      },
      makeCtx(),
    );
    expect(result).toBeInstanceOf(SQL);
    const { params } = toSql(result!);
    expect(params).toContain('Ihor');
    expect(params).toContain('K');
    expect(params).toContain('Jane');
  });

  it('$raw callback', () => {
    const result = buildWhere(
      {
        $raw: ({ table, sql: sqlTag }: { table: typeof users; sql: typeof sql }) =>
          sqlTag`${table.firstName} = 'test'`,
      },
      makeCtx(),
    );
    expect(result).toBeInstanceOf(SQL);
    const { sql: query } = toSql(result!);
    expect(query).toContain('first_name');
  });

  it('computed field in where via computedSqlMap', () => {
    const fullNameSql = sql`${users.firstName} || ' ' || ${users.lastName}`;
    const computedSqlMap = new Map<string, SQL>();
    computedSqlMap.set('fullName', fullNameSql);

    const computedMeta = {
      ...metadata,
      computedFields: new Map(metadata.computedFields),
    };
    computedMeta.computedFields.set('fullName', {
      kind: 'computed' as const,
      valueType: 'string' as const,
      resolve: () => fullNameSql,
    });

    const result = buildWhere(
      { fullName: { contains: 'Ihor' } },
      makeCtx({ computedSqlMap, metadata: computedMeta }),
    );
    expect(result).toBeInstanceOf(SQL);
    const { sql: query, params } = toSql(result!);
    expect(query.toLowerCase()).toContain('like');
    expect(params).toContain('%Ihor%');
  });

  it('derived field in where via derivedAliasMap', () => {
    const derivedAliasMap = new Map<string, { column: Column | SQL }>();
    derivedAliasMap.set('postsCount', { column: sql`"postsCount"` });

    const derivedMeta = {
      ...metadata,
      derivedFields: new Map(metadata.derivedFields),
    };
    derivedMeta.derivedFields.set('postsCount', {
      kind: 'derived' as const,
      valueType: 'number' as const,
      query: (() => null) as any,
      on: (() => null) as any,
    });

    const result = buildWhere(
      { postsCount: { gt: 3 } },
      makeCtx({ derivedAliasMap, metadata: derivedMeta }),
    );
    expect(result).toBeInstanceOf(SQL);
    const { sql: query, params } = toSql(result!);
    expect(query).toContain('>');
    expect(params).toContain(3);
  });

  it('undefined value is skipped', () => {
    const result = buildWhere({ firstName: undefined }, makeCtx());
    expect(result).toBeUndefined();
  });

  it('empty where returns undefined', () => {
    const result = buildWhere({}, makeCtx());
    expect(result).toBeUndefined();
  });

  it('unknown field is ignored', () => {
    const result = buildWhere({ nonExistentField: 'value' }, makeCtx());
    expect(result).toBeUndefined();
  });
});
