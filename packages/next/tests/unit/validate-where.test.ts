import { describe, expect, it } from 'vitest';

import { WhereValidationError } from '../../src/errors';
import { validateWhere } from '../../src/validate/where-schema';

describe('validateWhere', () => {
  it('returns undefined when where is undefined', () => {
    expect(validateWhere(undefined, {})).toBeUndefined();
  });

  it('returns where as-is when no config', () => {
    const where = { name: 'test' };
    expect(validateWhere(where, undefined)).toEqual(where);
  });

  it('passes through fields not in config', () => {
    const where = { name: 'test', email: 'a@b.com' };
    expect(validateWhere(where, { password: false })).toEqual(where);
  });

  it('throws WhereValidationError for false policy', () => {
    expect(() => validateWhere({ password: '123' }, { password: false })).toThrow(
      WhereValidationError,
    );
  });

  it('passes through logical operators', () => {
    const where = { AND: [{ name: 'a' }], OR: [{ id: 1 }], NOT: { id: 2 } };
    expect(validateWhere(where, {})).toEqual(where);
  });

  it('passes through true policy fields', () => {
    const where = { name: 'test' };
    expect(validateWhere(where, { name: true })).toEqual(where);
  });

  it('throws when disallowed operator used', () => {
    const where = { email: { contains: 'test' } };
    expect(() => validateWhere(where, { email: { operators: ['eq'] } })).toThrow(
      WhereValidationError,
    );
  });

  it('throws when mixing allowed and disallowed operators', () => {
    const where = { email: { eq: 'a@b.com', contains: 'test' } };
    expect(() => validateWhere(where, { email: { operators: ['eq'] } })).toThrow(
      WhereValidationError,
    );
  });

  it('allows direct value when eq in operators', () => {
    expect(validateWhere({ email: 'test' }, { email: { operators: ['eq'] } })).toEqual({
      email: 'test',
    });
  });

  it('throws when direct value but eq not allowed', () => {
    expect(() => validateWhere({ email: 'test' }, { email: { operators: ['contains'] } })).toThrow(
      WhereValidationError,
    );
  });
});
