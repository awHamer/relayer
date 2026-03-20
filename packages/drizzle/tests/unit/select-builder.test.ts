import { sql, SQL } from 'drizzle-orm';

import { buildSelect } from '../../src/builders/select-builder';
import { buildRegistry } from '../../src/introspect';
import * as pgSchema from '../fixtures/pg-schema';
import { posts, users } from '../fixtures/pg-schema';

const { registry } = buildRegistry(pgSchema as unknown as Record<string, unknown>);
const usersMetadata = registry.get('users')!;
const postsMetadata = registry.get('posts')!;

describe('buildSelect', () => {
  it('undefined select returns all scalar columns', () => {
    const result = buildSelect(undefined, users, usersMetadata, new Map());
    const columnNames = Object.keys(result.columns);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('firstName');
    expect(columnNames).toContain('lastName');
    expect(columnNames).toContain('email');
    expect(columnNames).toContain('metadata');
    expect(columnNames).toContain('createdAt');
  });

  it('selective true picks only specified columns', () => {
    const result = buildSelect({ id: true, firstName: true }, users, usersMetadata, new Map());
    const columnNames = Object.keys(result.columns);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('firstName');
    expect(columnNames).not.toContain('lastName');
    expect(columnNames).not.toContain('email');
    expect(columnNames).not.toContain('metadata');
    expect(columnNames).not.toContain('createdAt');
  });

  it('false value excludes field', () => {
    const result = buildSelect({ id: false }, users, usersMetadata, new Map());
    const columnNames = Object.keys(result.columns);
    expect(columnNames).not.toContain('id');
  });

  it('computed field appears in columns and requestedComputed', () => {
    const fullNameSql = sql`${users.firstName} || ' ' || ${users.lastName}`;
    const computedSqlMap = new Map<string, SQL>();
    computedSqlMap.set('fullName', fullNameSql);

    const metadataWithComputed = {
      ...usersMetadata,
      computedFields: new Map(usersMetadata.computedFields),
    };
    metadataWithComputed.computedFields.set('fullName', {
      kind: 'computed' as const,
      valueType: 'string' as const,
      resolve: () => fullNameSql,
    });

    const result = buildSelect({ fullName: true }, users, metadataWithComputed, computedSqlMap);
    expect(result.columns['fullName']).toBe(fullNameSql);
    expect(result.requestedComputed).toContain('fullName');
  });

  it('derived field appears in requestedDerived but not in columns', () => {
    const metadataWithDerived = {
      ...usersMetadata,
      derivedFields: new Map([
        [
          'postsCount',
          {
            kind: 'derived' as const,
            valueType: 'number' as const,
            query: (() => {}) as any,
            on: (() => {}) as any,
          },
        ],
      ]),
    };

    const result = buildSelect({ postsCount: true }, users, metadataWithDerived, new Map());
    expect(result.requestedDerived).toContain('postsCount');
    expect(result.columns['postsCount']).toBeUndefined();
  });

  it('relation with true adds to requestedRelations and includes all scalar columns', () => {
    const result = buildSelect({ posts: true }, users, usersMetadata, new Map());
    expect(result.requestedRelations).toContain('posts');
    const columnNames = Object.keys(result.columns);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('firstName');
  });

  it('relation with nested select stores in relationSelects', () => {
    const result = buildSelect(
      { posts: { id: true, title: true } },
      users,
      usersMetadata,
      new Map(),
    );
    expect(result.requestedRelations).toContain('posts');
    expect(result.relationSelects.has('posts')).toBe(true);
    const postsSelect = result.relationSelects.get('posts')!;
    expect(postsSelect).toEqual({ id: true, title: true });
  });

  it('mix of scalar fields returns only selected ones when no relations', () => {
    const result = buildSelect({ id: true, firstName: true }, users, usersMetadata, new Map());
    const columnNames = Object.keys(result.columns);
    expect(columnNames).toEqual(expect.arrayContaining(['id', 'firstName']));
    expect(columnNames).not.toContain('lastName');
    expect(columnNames).not.toContain('email');
  });

  it('requestedComputed is empty when no computed fields selected', () => {
    const result = buildSelect({ id: true }, users, usersMetadata, new Map());
    expect(result.requestedComputed).toEqual([]);
  });

  it('requestedRelations is empty when no relations selected', () => {
    const result = buildSelect({ id: true, email: true }, users, usersMetadata, new Map());
    expect(result.requestedRelations).toEqual([]);
  });
});
