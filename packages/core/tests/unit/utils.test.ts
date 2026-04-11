import { describe, expect, it } from 'vitest';

import { isObject, mergeWhere } from '../../src/utils';

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ foo: 'bar' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isObject('string')).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });
});

describe('mergeWhere', () => {
  it('returns undefined for no arguments', () => {
    expect(mergeWhere()).toBeUndefined();
  });

  it('returns undefined when all clauses are undefined', () => {
    expect(mergeWhere(undefined, undefined, undefined)).toBeUndefined();
  });

  it('returns the single clause unchanged', () => {
    const clause = { id: 1 };
    expect(mergeWhere(clause)).toBe(clause);
  });

  it('skips undefined clauses and returns the only defined one', () => {
    const clause = { published: true };
    expect(mergeWhere(undefined, clause, undefined)).toBe(clause);
  });

  it('merges two clauses with AND', () => {
    const a = { published: true };
    const b = { authorId: 1 };
    expect(mergeWhere(a, b)).toEqual({ AND: [a, b] });
  });

  it('merges multiple clauses with AND (variadic)', () => {
    const a = { a: 1 };
    const b = { b: 2 };
    const c = { c: 3 };
    expect(mergeWhere(a, b, c)).toEqual({ AND: [a, b, c] });
  });

  it('skips undefined clauses in the middle', () => {
    const a = { a: 1 };
    const c = { c: 3 };
    expect(mergeWhere(a, undefined, c)).toEqual({ AND: [a, c] });
  });

  it('skips trailing undefined clauses', () => {
    const a = { a: 1 };
    const b = { b: 2 };
    expect(mergeWhere(a, b, undefined)).toEqual({ AND: [a, b] });
  });

  it('preserves nested AND/OR clauses as-is', () => {
    const a = { OR: [{ id: 1 }, { id: 2 }] };
    const b = { published: true };
    expect(mergeWhere(a, b)).toEqual({ AND: [a, b] });
  });

  it('works with strict typing via generic', () => {
    interface PostWhere {
      id?: number;
      published?: boolean;
    }
    const result = mergeWhere<PostWhere>({ id: 1 }, { published: true });
    expect(result).toEqual({ AND: [{ id: 1 }, { published: true }] });
  });
});
