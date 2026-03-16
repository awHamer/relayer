import { SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

import { buildJsonWhere, isOperatorObject } from '../../src/builders/where/json';
import { mysqlAdapter, pgAdapter, sqliteAdapter } from '../../src/dialect';
import { users } from '../fixtures/pg-schema';

const mockDb = drizzle({} as any);

function toSql(condition: SQL) {
  return mockDb.select().from(users).where(condition).toSQL();
}

describe('isOperatorObject', () => {
  it('returns true for { eq: 5 }', () => {
    expect(isOperatorObject({ eq: 5 })).toBe(true);
  });

  it('returns true for { ne: "x" }', () => {
    expect(isOperatorObject({ ne: 'x' })).toBe(true);
  });

  it('returns true for { contains: "foo" }', () => {
    expect(isOperatorObject({ contains: 'foo' })).toBe(true);
  });

  it('returns true for { isNull: true }', () => {
    expect(isOperatorObject({ isNull: true })).toBe(true);
  });

  it('returns true for { arrayContains: [1] }', () => {
    expect(isOperatorObject({ arrayContains: [1] })).toBe(true);
  });

  it('returns false for nested object without operator key at top level', () => {
    expect(isOperatorObject({ nested: { eq: 5 } })).toBe(false);
  });

  it('returns false for unknown key', () => {
    expect(isOperatorObject({ unknownKey: 5 })).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isOperatorObject('string')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isOperatorObject(null)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isOperatorObject(42)).toBe(false);
  });
});

describe('buildJsonWhere', () => {
  describe('PG adapter', () => {
    it('direct value at root key', () => {
      const result = buildJsonWhere(users.metadata, { role: 'admin' }, [], pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain("->>\'role\'");
      expect(params).toContain('admin');
    });

    it('operator at root key with numeric cast', () => {
      const result = buildJsonWhere(users.metadata, { level: { gte: 5 } }, [], pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('::numeric');
      expect(query).toContain('>=');
    });

    it('nested path', () => {
      const result = buildJsonWhere(users.metadata, { settings: { theme: 'dark' } }, [], pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).toContain('->');
      expect(query).toContain("->>\'theme\'");
      expect(params).toContain('dark');
    });

    it('multiple keys produce AND', () => {
      const result = buildJsonWhere(
        users.metadata,
        { role: 'admin', level: { gte: 8 } },
        [],
        pgAdapter,
      );
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(params).toContain('admin');
      expect(query).toContain('>=');
    });

    it('isNull on JSON key', () => {
      const result = buildJsonWhere(users.metadata, { role: { isNull: true } }, [], pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query.toLowerCase()).toContain('is null');
    });

    it('isNotNull on JSON key', () => {
      const result = buildJsonWhere(users.metadata, { role: { isNotNull: true } }, [], pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query.toLowerCase()).toContain('is not null');
    });

    it('empty value returns undefined', () => {
      const result = buildJsonWhere(users.metadata, {}, [], pgAdapter);
      expect(result).toBeUndefined();
    });

    it('undefined values are skipped', () => {
      const result = buildJsonWhere(users.metadata, { role: undefined, level: 5 }, [], pgAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query, params } = toSql(result!);
      expect(query).not.toContain("'role'");
      expect(params).toContain(5);
    });
  });

  describe('MySQL adapter', () => {
    it('direct value contains $.role path', () => {
      const result = buildJsonWhere(users.metadata, { role: 'admin' }, [], mysqlAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('$.role');
    });

    it('numeric operator contains CAST and DECIMAL', () => {
      const result = buildJsonWhere(users.metadata, { level: { gte: 5 } }, [], mysqlAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('CAST');
      expect(query).toContain('DECIMAL');
    });
  });

  describe('SQLite adapter', () => {
    it('direct value contains json_extract', () => {
      const result = buildJsonWhere(users.metadata, { role: 'admin' }, [], sqliteAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('json_extract');
    });

    it('numeric operator contains CAST and REAL', () => {
      const result = buildJsonWhere(users.metadata, { level: { gte: 5 } }, [], sqliteAdapter);
      expect(result).toBeInstanceOf(SQL);
      const { sql: query } = toSql(result!);
      expect(query).toContain('CAST');
      expect(query).toContain('REAL');
    });
  });
});
