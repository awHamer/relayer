import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { RELAYER_CLIENT, RELAYER_ENTITY_PREFIX, RELAYER_SERVICE_PREFIX } from '../../src/constants';
import { getEntityToken, InjectEntity } from '../../src/decorators/inject-entity.decorator';
import {
  getServiceToken,
  InjectQueryService,
} from '../../src/decorators/inject-query-service.decorator';
import { InjectRelayer } from '../../src/decorators/inject-relayer.decorator';
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

describe('InjectRelayer', () => {
  it('returns a parameter decorator function', () => {
    const decorator = InjectRelayer();
    expect(typeof decorator).toBe('function');
  });

  it('injects RELAYER_CLIENT token via metadata', () => {
    class TestService {
      constructor(
        @InjectRelayer()
        public relayer: any,
      ) {}
    }

    const paramTypes = Reflect.getMetadata('self:paramtypes', TestService);
    expect(paramTypes).toBeDefined();
    const hasRelayerToken = paramTypes.some((p: any) => p.param === RELAYER_CLIENT);
    expect(hasRelayerToken).toBe(true);
  });
});
