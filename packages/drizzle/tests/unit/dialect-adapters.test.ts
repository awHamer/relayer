import { SQL } from 'drizzle-orm';
import { serial as mysqlSerial, mysqlTable, text as mysqlText } from 'drizzle-orm/mysql-core';
import { drizzle as pgDrizzle } from 'drizzle-orm/postgres-js';
import { integer as sqliteInt, sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';

import { detectDialect, mysqlAdapter, pgAdapter, sqliteAdapter } from '../../src/dialect';
import { posts, users } from '../fixtures/pg-schema';

const mysqlUsers = mysqlTable('users', {
  id: mysqlSerial('id').primaryKey(),
  name: mysqlText('name'),
});

const sqliteUsers = sqliteTable('users', {
  id: sqliteInt('id').primaryKey(),
  name: sqliteText('name'),
});

const mockPgDb = pgDrizzle({} as any);

function pgSql(fragment: SQL): string {
  const result = mockPgDb.select().from(users).where(fragment).toSQL();
  return result.sql;
}

describe('detectDialect', () => {
  it('detects PG schema', () => {
    expect(detectDialect({ users })).toBe('pg');
  });

  it('detects MySQL schema', () => {
    expect(detectDialect({ users: mysqlUsers })).toBe('mysql');
  });

  it('detects SQLite schema', () => {
    expect(detectDialect({ users: sqliteUsers })).toBe('sqlite');
  });

  it('defaults to pg for empty schema', () => {
    expect(detectDialect({})).toBe('pg');
  });
});

describe('pgAdapter', () => {
  it('has dialect === "pg"', () => {
    expect(pgAdapter.dialect).toBe('pg');
  });

  it('has supportsReturning === true', () => {
    expect(pgAdapter.supportsReturning).toBe(true);
  });

  it('ilike returns SQL containing "ilike"', () => {
    const fragment = pgAdapter.ilike(users.firstName, '%john%');
    const sql = pgSql(fragment);
    expect(sql).toContain('ilike');
  });

  it('notIlike returns SQL containing "not ilike"', () => {
    const fragment = pgAdapter.notIlike(users.firstName, '%john%');
    const sql = pgSql(fragment);
    expect(sql).toContain('not ilike');
  });

  it('arrayContains returns SQL', () => {
    const fragment = pgAdapter.arrayContains(posts.tags, ['typescript']);
    expect(fragment).toBeInstanceOf(SQL);
  });

  it('arrayContained returns SQL', () => {
    const fragment = pgAdapter.arrayContained(posts.tags, ['typescript']);
    expect(fragment).toBeInstanceOf(SQL);
  });

  it('arrayOverlaps returns SQL', () => {
    const fragment = pgAdapter.arrayOverlaps(posts.tags, ['typescript']);
    expect(fragment).toBeInstanceOf(SQL);
  });

  it("jsonPath single key contains ->>'role'", () => {
    const fragment = pgAdapter.jsonPath(users.metadata, ['role']);
    const sql = pgSql(fragment);
    expect(sql).toContain("->>\'role\'");
  });

  it("jsonPath nested contains -> and ->>'theme'", () => {
    const fragment = pgAdapter.jsonPath(users.metadata, ['settings', 'theme']);
    const sql = pgSql(fragment);
    expect(sql).toContain('->');
    expect(sql).toContain("->>\'theme\'");
  });

  it('jsonPath with numeric cast contains ::numeric', () => {
    const fragment = pgAdapter.jsonPath(users.metadata, ['level'], 'numeric');
    const sql = pgSql(fragment);
    expect(sql).toContain('::numeric');
  });

  it('jsonPath with boolean cast contains ::boolean', () => {
    const fragment = pgAdapter.jsonPath(users.metadata, ['active'], 'boolean');
    const sql = pgSql(fragment);
    expect(sql).toContain('::boolean');
  });

  it('castToText produces ::text', () => {
    const fragment = pgAdapter.castToText(users.createdAt);
    const sql = pgSql(fragment);
    expect(sql).toContain('::text');
  });
});

describe('mysqlAdapter', () => {
  it('has dialect === "mysql"', () => {
    expect(mysqlAdapter.dialect).toBe('mysql');
  });

  it('has supportsReturning === false', () => {
    expect(mysqlAdapter.supportsReturning).toBe(false);
  });

  it('ilike returns SQL containing LOWER and LIKE', () => {
    const fragment = mysqlAdapter.ilike(users.firstName, '%john%');
    const sql = pgSql(fragment);
    expect(sql).toContain('LOWER');
    expect(sql).toContain('LIKE');
  });

  it('notIlike returns SQL containing NOT LIKE', () => {
    const fragment = mysqlAdapter.notIlike(users.firstName, '%john%');
    const sql = pgSql(fragment);
    expect(sql).toContain('NOT LIKE');
  });

  it('arrayContains throws with "not supported in MySQL"', () => {
    expect(() => mysqlAdapter.arrayContains(posts.tags, ['a'])).toThrow('not supported in MySQL');
  });

  it('arrayContained throws', () => {
    expect(() => mysqlAdapter.arrayContained(posts.tags, ['a'])).toThrow('not supported in MySQL');
  });

  it('arrayOverlaps throws', () => {
    expect(() => mysqlAdapter.arrayOverlaps(posts.tags, ['a'])).toThrow('not supported in MySQL');
  });

  it("jsonPath single key contains '$.role'", () => {
    const fragment = mysqlAdapter.jsonPath(users.metadata, ['role']);
    const sql = pgSql(fragment);
    expect(sql).toContain('$.role');
  });

  it('jsonPath with numeric cast contains CAST and DECIMAL', () => {
    const fragment = mysqlAdapter.jsonPath(users.metadata, ['level'], 'numeric');
    const sql = pgSql(fragment);
    expect(sql).toContain('CAST');
    expect(sql).toContain('DECIMAL');
  });

  it('jsonPath with boolean cast contains UNSIGNED', () => {
    const fragment = mysqlAdapter.jsonPath(users.metadata, ['active'], 'boolean');
    const sql = pgSql(fragment);
    expect(sql).toContain('UNSIGNED');
  });

  it('castToText produces CAST AS CHAR', () => {
    const fragment = mysqlAdapter.castToText(users.createdAt);
    const sql = pgSql(fragment);
    expect(sql).toContain('CAST');
    expect(sql).toContain('CHAR');
  });
});

describe('sqliteAdapter', () => {
  it('has dialect === "sqlite"', () => {
    expect(sqliteAdapter.dialect).toBe('sqlite');
  });

  it('has supportsReturning === true', () => {
    expect(sqliteAdapter.supportsReturning).toBe(true);
  });

  it('ilike returns SQL containing COLLATE NOCASE', () => {
    const fragment = sqliteAdapter.ilike(users.firstName, '%john%');
    const sql = pgSql(fragment);
    expect(sql).toContain('COLLATE NOCASE');
  });

  it('notIlike returns SQL containing NOT LIKE and COLLATE NOCASE', () => {
    const fragment = sqliteAdapter.notIlike(users.firstName, '%john%');
    const sql = pgSql(fragment);
    expect(sql).toContain('NOT LIKE');
    expect(sql).toContain('COLLATE NOCASE');
  });

  it('arrayContains throws with "not supported in SQLite"', () => {
    expect(() => sqliteAdapter.arrayContains(posts.tags, ['a'])).toThrow('not supported in SQLite');
  });

  it('arrayContained throws', () => {
    expect(() => sqliteAdapter.arrayContained(posts.tags, ['a'])).toThrow(
      'not supported in SQLite',
    );
  });

  it('arrayOverlaps throws', () => {
    expect(() => sqliteAdapter.arrayOverlaps(posts.tags, ['a'])).toThrow('not supported in SQLite');
  });

  it('jsonPath contains json_extract', () => {
    const fragment = sqliteAdapter.jsonPath(users.metadata, ['role']);
    const sql = pgSql(fragment);
    expect(sql).toContain('json_extract');
  });

  it('jsonPath with numeric cast contains CAST and REAL', () => {
    const fragment = sqliteAdapter.jsonPath(users.metadata, ['level'], 'numeric');
    const sql = pgSql(fragment);
    expect(sql).toContain('CAST');
    expect(sql).toContain('REAL');
  });

  it('castToText produces CAST AS TEXT', () => {
    const fragment = sqliteAdapter.castToText(users.createdAt);
    const sql = pgSql(fragment);
    expect(sql).toContain('CAST');
    expect(sql).toContain('TEXT');
  });
});
