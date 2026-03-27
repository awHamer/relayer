import { describe, expect, it } from 'vitest';

import { resolveOneRelationOps, separateRelationData } from '../../src/builders/relation-data';
import { buildRegistry } from '../../src/introspect';
import * as pgSchema from '../fixtures/pg-schema';

const schema = pgSchema as unknown as Record<string, unknown>;
const { registry, tables } = buildRegistry(schema);

const postsMetadata = registry.get('posts')!;
const postsTableInfo = tables.get('posts')!;

const usersMetadata = registry.get('users')!;
const usersTableInfo = tables.get('users')!;

const commentsMetadata = registry.get('comments')!;
const commentsTableInfo = tables.get('comments')!;

describe('separateRelationData', () => {
  it('passes through scalar-only data unchanged', () => {
    const result = separateRelationData({ title: 'Hello', published: true }, postsMetadata);
    expect(result.scalarData).toEqual({ title: 'Hello', published: true });
    expect(result.oneOps.size).toBe(0);
    expect(result.manyOps.size).toBe(0);
  });

  it('separates one() relation connect from scalar data', () => {
    const result = separateRelationData({ title: 'Hello', author: { connect: 2 } }, postsMetadata);
    expect(result.scalarData).toEqual({ title: 'Hello' });
    expect(result.oneOps.size).toBe(1);
    expect(result.oneOps.get('author')).toEqual({ connect: 2 });
    expect(result.manyOps.size).toBe(0);
  });

  it('separates one() relation disconnect', () => {
    const result = separateRelationData(
      { title: 'Hello', author: { disconnect: true } },
      postsMetadata,
    );
    expect(result.scalarData).toEqual({ title: 'Hello' });
    expect(result.oneOps.get('author')).toEqual({ disconnect: true });
  });

  it('separates many() relation ops', () => {
    const result = separateRelationData(
      { title: 'Hello', postCategories: { connect: [5, 6] } },
      postsMetadata,
    );
    expect(result.scalarData).toEqual({ title: 'Hello' });
    expect(result.oneOps.size).toBe(0);
    expect(result.manyOps.size).toBe(1);
    expect(result.manyOps.get('postCategories')).toEqual({ connect: [5, 6] });
  });

  it('separates many() set operation', () => {
    const result = separateRelationData({ postCategories: { set: [1, 2, 3] } }, postsMetadata);
    expect(result.manyOps.get('postCategories')).toEqual({ set: [1, 2, 3] });
  });

  it('separates mixed one() and many() ops', () => {
    const result = separateRelationData(
      { title: 'Hello', author: { connect: 2 }, postCategories: { connect: [5] } },
      postsMetadata,
    );
    expect(result.scalarData).toEqual({ title: 'Hello' });
    expect(result.oneOps.size).toBe(1);
    expect(result.manyOps.size).toBe(1);
  });

  it('treats non-relation object fields as scalar data', () => {
    const result = separateRelationData(
      { title: 'Hello', metadata: { role: 'admin' } },
      usersMetadata,
    );
    expect(result.scalarData).toEqual({ title: 'Hello', metadata: { role: 'admin' } });
    expect(result.oneOps.size).toBe(0);
    expect(result.manyOps.size).toBe(0);
  });

  it('handles multiple one() relation ops', () => {
    const result = separateRelationData(
      { content: 'test', post: { connect: 1 }, author: { connect: 5 } },
      commentsMetadata,
    );
    expect(result.scalarData).toEqual({ content: 'test' });
    expect(result.oneOps.size).toBe(2);
    expect(result.oneOps.get('post')).toEqual({ connect: 1 });
    expect(result.oneOps.get('author')).toEqual({ connect: 5 });
  });
});

describe('resolveOneRelationOps', () => {
  it('resolves connect to FK column assignment', () => {
    const ops = new Map([['author', { connect: 2 }]]);
    const result = resolveOneRelationOps(ops, postsMetadata, schema, postsTableInfo);
    expect(result).toEqual({ authorId: 2 });
  });

  it('resolves multiple connect ops', () => {
    const ops = new Map([
      ['post', { connect: 10 }],
      ['author', { connect: 5 }],
    ]);
    const result = resolveOneRelationOps(ops, commentsMetadata, schema, commentsTableInfo);
    expect(result).toEqual({ postId: 10, authorId: 5 });
  });

  it('throws on disconnect for non-nullable FK', () => {
    const ops = new Map([['author', { disconnect: true }]]);
    expect(() => resolveOneRelationOps(ops, postsMetadata, schema, postsTableInfo)).toThrow(
      'NOT NULL',
    );
  });

  it('throws on one() relation where FK is on target table', () => {
    const ops = new Map([['profile', { connect: 1 }]]);
    expect(() => resolveOneRelationOps(ops, usersMetadata, schema, usersTableInfo)).toThrow(
      'foreign key is on the target table',
    );
  });

  it('returns empty object for empty ops', () => {
    const ops = new Map();
    const result = resolveOneRelationOps(ops, postsMetadata, schema, postsTableInfo);
    expect(result).toEqual({});
  });
});
