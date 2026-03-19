import { describe, expect, it } from 'vitest';

import { OrderByValidationError } from '../../src/errors';
import { validateOrderBy } from '../../src/validate/order-by-schema';

describe('validateOrderBy', () => {
  it('returns undefined when orderBy is undefined', () => {
    expect(validateOrderBy(undefined, ['name'])).toBeUndefined();
  });

  it('returns orderBy as-is when no allowedFields', () => {
    const ob = { field: 'name', order: 'asc' };
    expect(validateOrderBy(ob, undefined)).toEqual(ob);
  });

  it('allows valid field', () => {
    const ob = { field: 'name', order: 'asc' };
    expect(validateOrderBy(ob, ['name', 'id'])).toEqual(ob);
  });

  it('allows valid array', () => {
    const ob = [
      { field: 'name', order: 'asc' },
      { field: 'id', order: 'desc' },
    ];
    expect(validateOrderBy(ob, ['name', 'id'])).toEqual(ob);
  });

  it('throws OrderByValidationError for disallowed field', () => {
    expect(() => validateOrderBy({ field: 'secret', order: 'asc' }, ['name'])).toThrow(
      OrderByValidationError,
    );
  });

  it('throws for any disallowed field in array', () => {
    const ob = [
      { field: 'name', order: 'asc' },
      { field: 'secret', order: 'desc' },
    ];
    expect(() => validateOrderBy(ob, ['name'])).toThrow(OrderByValidationError);
  });
});
