import { describe, expect, it } from 'vitest';

import { translateOrderByInput } from '../../src/handlers/order-by-translation';

describe('translateOrderByInput', () => {
  it('returns empty array for undefined', () => {
    expect(translateOrderByInput(undefined)).toEqual([]);
  });

  it('handles single object with one field', () => {
    expect(translateOrderByInput({ title: 'asc' })).toEqual([{ field: 'title', order: 'asc' }]);
  });

  it('handles single object with multiple fields', () => {
    const result = translateOrderByInput({ title: 'asc', createdAt: 'desc' });
    expect(result).toEqual([
      { field: 'title', order: 'asc' },
      { field: 'createdAt', order: 'desc' },
    ]);
  });

  it('handles array of objects', () => {
    const result = translateOrderByInput([{ title: 'desc' }, { createdAt: 'asc' }]);
    expect(result).toEqual([
      { field: 'title', order: 'desc' },
      { field: 'createdAt', order: 'asc' },
    ]);
  });

  it('flattens nested objects with dot notation', () => {
    const result = translateOrderByInput({ author: { name: 'desc' } });
    expect(result).toEqual([{ field: 'author.name', order: 'desc' }]);
  });

  it('flattens 3-level nesting', () => {
    const result = translateOrderByInput({ author: { profile: { rating: 'asc' } } });
    expect(result).toEqual([{ field: 'author.profile.rating', order: 'asc' }]);
  });

  it('normalizes unknown direction strings to asc', () => {
    const result = translateOrderByInput({ title: 'DESCENDING' });
    expect(result).toEqual([{ field: 'title', order: 'asc' }]);
  });

  it('keeps desc as desc', () => {
    const result = translateOrderByInput({ title: 'desc' });
    expect(result).toEqual([{ field: 'title', order: 'desc' }]);
  });

  it('skips null values', () => {
    const result = translateOrderByInput({ title: 'asc', deleted: null } as any);
    expect(result).toEqual([{ field: 'title', order: 'asc' }]);
  });

  it('skips undefined values', () => {
    const result = translateOrderByInput({ title: 'asc', deleted: undefined });
    expect(result).toEqual([{ field: 'title', order: 'asc' }]);
  });

  it('returns empty array for empty object', () => {
    expect(translateOrderByInput({})).toEqual([]);
  });

  it('handles mixed flat and nested fields in array', () => {
    const result = translateOrderByInput([{ createdAt: 'desc' }, { author: { lastName: 'asc' } }]);
    expect(result).toEqual([
      { field: 'createdAt', order: 'desc' },
      { field: 'author.lastName', order: 'asc' },
    ]);
  });
});
