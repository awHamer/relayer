import { describe, expect, it } from 'vitest';

import { entitiesToRecord, getEntityKey, isEntityWithKey } from '../../src/utils';

const validEntity = {
  __entityKey: 'posts',
  __schema: {},
  __table: {},
  __relayerEntity: true,
};

const invalidEntity = {
  __relayerEntity: true,
};

describe('isEntityWithKey', () => {
  it('returns true for entity with __entityKey', () => {
    expect(isEntityWithKey(validEntity as any)).toBe(true);
  });

  it('returns false without __entityKey', () => {
    expect(isEntityWithKey(invalidEntity as any)).toBe(false);
  });

  it('returns false for __entityKey that is not a string', () => {
    expect(isEntityWithKey({ __entityKey: 123 } as any)).toBe(false);
  });
});

describe('getEntityKey', () => {
  it('returns __entityKey value', () => {
    expect(getEntityKey(validEntity as any)).toBe('posts');
  });

  it('throws for entity without __entityKey', () => {
    expect(() => getEntityKey(invalidEntity as any)).toThrow('Entity class must have __entityKey');
  });
});

describe('entitiesToRecord', () => {
  it('converts array to record by key', () => {
    const entity1 = { ...validEntity, __entityKey: 'posts' };
    const entity2 = { ...validEntity, __entityKey: 'users' };
    const result = entitiesToRecord([entity1, entity2] as any);
    expect(result).toEqual({ posts: entity1, users: entity2 });
  });

  it('returns record as-is', () => {
    const record = { posts: validEntity };
    expect(entitiesToRecord(record as any)).toBe(record);
  });
});
