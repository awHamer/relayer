import { describe, expect, it } from 'vitest';

import { parseListQuery } from '../../src/pipes/parse-list-query';

describe('parseListQuery', () => {
  it('returns empty object for no params', () => {
    expect(parseListQuery({})).toEqual({});
  });

  it('parses select from JSON string', () => {
    const result = parseListQuery({ select: '{"id":true,"title":true}' });
    expect(result.select).toEqual({ id: true, title: true });
  });

  it('parses where from JSON string', () => {
    const result = parseListQuery({ where: '{"published":true}' });
    expect(result.where).toEqual({ published: true });
  });

  it('parses orderBy from JSON string', () => {
    const result = parseListQuery({
      orderBy: '[{"field":"createdAt","order":"desc"}]',
    });
    expect(result.orderBy).toEqual([{ field: 'createdAt', order: 'desc' }]);
  });

  it('parses sort shorthand: -field -> desc', () => {
    const result = parseListQuery({ sort: '-createdAt' });
    expect(result.orderBy).toEqual({ field: 'createdAt', order: 'desc' });
  });

  it('parses sort shorthand: +field -> asc', () => {
    const result = parseListQuery({ sort: '+title' });
    expect(result.orderBy).toEqual({ field: 'title', order: 'asc' });
  });

  it('parses sort shorthand: plain field -> asc', () => {
    const result = parseListQuery({ sort: 'title' });
    expect(result.orderBy).toEqual({ field: 'title', order: 'asc' });
  });

  it('parses sort CSV with multiple fields', () => {
    const result = parseListQuery({ sort: '-createdAt,+title' });
    expect(result.orderBy).toEqual([
      { field: 'createdAt', order: 'desc' },
      { field: 'title', order: 'asc' },
    ]);
  });

  it('ignores sort when orderBy is present', () => {
    const result = parseListQuery({
      orderBy: '{"field":"id","order":"asc"}',
      sort: '-createdAt',
    });
    expect(result.orderBy).toEqual({ field: 'id', order: 'asc' });
  });

  it('parses limit as positive integer', () => {
    expect(parseListQuery({ limit: '10' }).limit).toBe(10);
  });

  it('ignores invalid limit', () => {
    expect(parseListQuery({ limit: 'abc' }).limit).toBeUndefined();
  });

  it('ignores negative limit', () => {
    expect(parseListQuery({ limit: '-5' }).limit).toBeUndefined();
  });

  it('parses offset as non-negative integer', () => {
    expect(parseListQuery({ offset: '20' }).offset).toBe(20);
  });

  it('parses offset 0', () => {
    expect(parseListQuery({ offset: '0' }).offset).toBe(0);
  });

  it('ignores invalid offset', () => {
    expect(parseListQuery({ offset: 'abc' }).offset).toBeUndefined();
  });

  it('passes cursor as raw string', () => {
    expect(parseListQuery({ cursor: 'abc123' }).cursor).toBe('abc123');
  });

  it('passes search as raw string', () => {
    expect(parseListQuery({ search: 'hello world' }).search).toBe('hello world');
  });

  it('ignores malformed JSON for select', () => {
    expect(parseListQuery({ select: '{bad' }).select).toBeUndefined();
  });

  it('ignores malformed JSON for where', () => {
    expect(parseListQuery({ where: 'not-json' }).where).toBeUndefined();
  });

  it('ignores non-object JSON for select', () => {
    expect(parseListQuery({ select: '"string"' }).select).toBeUndefined();
  });
});
