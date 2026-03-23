import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CRUD_OVERRIDE_METADATA, RELAYER_ENTITY_PREFIX, RELAYER_SERVICE_PREFIX } from '../../src/constants';
import { getEntityToken, InjectEntity } from '../../src/decorators/inject-entity.decorator';
import { getServiceToken, InjectQueryService } from '../../src/decorators/inject-query-service.decorator';
import { Override } from '../../src/decorators/override.decorator';
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

describe('Override decorator', () => {
  it('stores route name in metadata', () => {
    class Ctrl {
      @Override('list')
      customList() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(Ctrl.prototype, 'customList')!;
    const meta = Reflect.getMetadata(CRUD_OVERRIDE_METADATA, descriptor.value as object);
    expect(meta).toBe('list');
  });

  it('uses method name when routeName not provided', () => {
    class Ctrl {
      @Override()
      findById() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(Ctrl.prototype, 'findById')!;
    const meta = Reflect.getMetadata(CRUD_OVERRIDE_METADATA, descriptor.value as object);
    expect(meta).toBe('findById');
  });
});
