import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { RELAYER_ENTITY_PREFIX, RELAYER_SERVICE_PREFIX } from '../../src/constants';
import { getEntityToken, InjectEntity } from '../../src/decorators/inject-entity.decorator';
import { getServiceToken, InjectQueryService } from '../../src/decorators/inject-query-service.decorator';
import { TestEntity } from '../helpers';

describe('getEntityToken', () => {
  it('returns prefixed token from entity key', () => {
    expect(getEntityToken(TestEntity as any)).toBe(`${RELAYER_ENTITY_PREFIX}tests`);
  });
});

describe('InjectEntity', () => {
  it('returns a parameter decorator function', () => {
    const decorator = InjectEntity(TestEntity as any);
    expect(typeof decorator).toBe('function');
  });
});

describe('getServiceToken', () => {
  it('returns prefixed token from entity key', () => {
    expect(getServiceToken(TestEntity as any)).toBe(`${RELAYER_SERVICE_PREFIX}tests`);
  });
});

describe('InjectQueryService', () => {
  it('returns a parameter decorator function', () => {
    const decorator = InjectQueryService(TestEntity as any);
    expect(typeof decorator).toBe('function');
  });
});
