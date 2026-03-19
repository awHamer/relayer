import { describe, expect, it } from 'vitest';

import { applySelectPolicy } from '../../src/validate/select-schema';

describe('applySelectPolicy', () => {
  it('returns userSelect as-is when no config', () => {
    const select = { id: true, name: true };
    expect(applySelectPolicy(select, undefined)).toEqual(select);
  });

  it('returns undefined when no userSelect', () => {
    expect(applySelectPolicy(undefined, { password: false })).toBeUndefined();
  });

  it('passes through scalar fields not denied', () => {
    const result = applySelectPolicy({ id: true, name: true }, { password: false });
    expect(result).toEqual({ id: true, name: true });
  });

  it('strips scalar fields with false', () => {
    const result = applySelectPolicy({ id: true, password: true }, { password: false });
    expect(result).toEqual({ id: true });
  });

  it('strips relations not configured (denied by default)', () => {
    const result = applySelectPolicy({ id: true, posts: { title: true } }, {});
    expect(result).toEqual({ id: true });
  });

  it('allows relations with true policy', () => {
    const result = applySelectPolicy({ id: true, posts: { title: true } }, { posts: true });
    expect(result).toEqual({ id: true, posts: { title: true } });
  });

  it('filters relation sub-fields via object policy', () => {
    const result = applySelectPolicy(
      { posts: { title: true, secret: true } },
      { posts: { title: true, secret: false } },
    );
    expect(result).toEqual({ posts: { title: true } });
  });

  it('returns undefined when all fields stripped', () => {
    const result = applySelectPolicy({ password: true }, { password: false });
    expect(result).toBeUndefined();
  });
});
