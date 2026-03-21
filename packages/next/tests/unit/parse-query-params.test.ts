import { describe, expect, it } from 'vitest';

import {
  parseAggregateParams,
  parseListParams,
  parseSortString,
} from '../../src/parse/query-params';

describe('parseListParams', () => {
  function url(qs: string) {
    return new URL(`http://test/api?${qs}`);
  }

  it('parses where JSON', () => {
    const result = parseListParams(url('where={"status":"active"}'), 20, 100);
    expect(result.where).toEqual({ status: 'active' });
  });

  it('throws on invalid where JSON', () => {
    expect(() => parseListParams(url('where=not-json'), 20, 100)).toThrow('Invalid JSON');
  });

  it('parses select JSON', () => {
    const result = parseListParams(url('select={"id":true}'), 20, 100);
    expect(result.select).toEqual({ id: true });
  });

  it('parses orderBy JSON', () => {
    const result = parseListParams(url('orderBy={"field":"name","order":"asc"}'), 20, 100);
    expect(result.orderBy).toEqual({ field: 'name', order: 'asc' });
  });

  it('parses sort shorthand', () => {
    const result = parseListParams(url('sort=-createdAt,+name'), 20, 100);
    expect(result.orderBy).toEqual([
      { field: 'createdAt', order: 'desc' },
      { field: 'name', order: 'asc' },
    ]);
  });

  it('sort ignored when orderBy present', () => {
    const result = parseListParams(url('orderBy={"field":"id","order":"asc"}&sort=-name'), 20, 100);
    expect(result.orderBy).toEqual({ field: 'id', order: 'asc' });
  });

  it('parses limit capped at maxLimit', () => {
    const result = parseListParams(url('limit=200'), 20, 50);
    expect(result.limit).toBe(50);
  });

  it('uses defaultLimit when not specified', () => {
    const result = parseListParams(url(''), 25, 100);
    expect(result.limit).toBe(25);
  });

  it('parses offset', () => {
    const result = parseListParams(url('offset=10'), 20, 100);
    expect(result.offset).toBe(10);
  });
});

describe('parseSortString', () => {
  it('parses -field as desc', () => {
    expect(parseSortString('-name')).toEqual([{ field: 'name', order: 'desc' }]);
  });

  it('parses +field as asc', () => {
    expect(parseSortString('+name')).toEqual([{ field: 'name', order: 'asc' }]);
  });

  it('defaults to asc', () => {
    expect(parseSortString('name')).toEqual([{ field: 'name', order: 'asc' }]);
  });

  it('parses multiple fields', () => {
    expect(parseSortString('-a,+b,c')).toEqual([
      { field: 'a', order: 'desc' },
      { field: 'b', order: 'asc' },
      { field: 'c', order: 'asc' },
    ]);
  });
});

describe('parseAggregateParams', () => {
  function url(qs: string) {
    return new URL(`http://test/api?${qs}`);
  }

  it('parses groupBy', () => {
    const result = parseAggregateParams(url('groupBy=["status"]'));
    expect(result.groupBy).toEqual(['status']);
  });

  it('parses _count=true as boolean', () => {
    const result = parseAggregateParams(url('_count=true'));
    expect(result._count).toBe(true);
  });

  it('parses _sum as JSON', () => {
    const result = parseAggregateParams(url('_sum={"total":true}'));
    expect(result._sum).toEqual({ total: true });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAggregateParams(url('groupBy=bad'))).toThrow('Invalid JSON');
  });
});
