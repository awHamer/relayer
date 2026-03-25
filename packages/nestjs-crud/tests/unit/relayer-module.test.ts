import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import {
  RELAYER_BASE_URL,
  RELAYER_CLIENT,
  RELAYER_ENTITY_PREFIX,
  RELAYER_MODULE_OPTIONS,
  RELAYER_SERVICE_PREFIX,
} from '../../src/constants';
import { RelayerModule } from '../../src/relayer.module';
import { TestEntity } from '../helpers';

describe('RelayerModule.forRoot', () => {
  it('returns global DynamicModule', () => {
    const result = RelayerModule.forRoot({
      db: {},
      schema: {},
      entities: [TestEntity as any],
    });

    expect(result.module).toBe(RelayerModule);
    expect(result.global).toBe(true);
    expect(result.providers).toBeDefined();
    expect(result.exports).toBeDefined();
  });

  it('creates RELAYER_CLIENT provider', () => {
    const result = RelayerModule.forRoot({
      db: {},
      schema: {},
      entities: [TestEntity as any],
    });

    const providers = result.providers as Array<{ provide: unknown }>;
    const clientProvider = providers.find((p) => p.provide === RELAYER_CLIENT);
    expect(clientProvider).toBeDefined();
  });

  it('creates RELAYER_BASE_URL provider with value', () => {
    const result = RelayerModule.forRoot({
      db: {},
      schema: {},
      entities: [TestEntity as any],
      baseUrl: 'http://test',
    });

    const providers = result.providers as Array<{ provide: unknown; useValue?: unknown }>;
    const baseUrlProvider = providers.find((p) => p.provide === RELAYER_BASE_URL);
    expect(baseUrlProvider).toBeDefined();
    expect((baseUrlProvider as any).useValue).toBe('http://test');
  });

  it('defaults baseUrl to empty string', () => {
    const result = RelayerModule.forRoot({
      db: {},
      schema: {},
      entities: [TestEntity as any],
    });

    const providers = result.providers as Array<{ provide: unknown; useValue?: unknown }>;
    const baseUrlProvider = providers.find((p) => p.provide === RELAYER_BASE_URL);
    expect((baseUrlProvider as any).useValue).toBe('');
  });

  it('creates entity and service providers', () => {
    const result = RelayerModule.forRoot({
      db: {},
      schema: {},
      entities: [TestEntity as any],
    });

    const providers = result.providers as Array<{ provide: unknown }>;
    const entityProvider = providers.find((p) => p.provide === `${RELAYER_ENTITY_PREFIX}tests`);
    const serviceProvider = providers.find((p) => p.provide === `${RELAYER_SERVICE_PREFIX}tests`);
    expect(entityProvider).toBeDefined();
    expect(serviceProvider).toBeDefined();
  });
});

describe('RelayerModule.forRootAsync', () => {
  it('returns global DynamicModule with async providers', () => {
    const result = RelayerModule.forRootAsync({
      useFactory: async () => ({
        db: {},
        schema: {},
        entities: [],
      }),
    });

    expect(result.module).toBe(RelayerModule);
    expect(result.global).toBe(true);
  });

  it('creates RELAYER_MODULE_OPTIONS and RELAYER_CLIENT providers', () => {
    const factory = vi.fn();
    const result = RelayerModule.forRootAsync({
      useFactory: factory,
      inject: ['CONFIG'],
    });

    const providers = result.providers as Array<{ provide: unknown }>;
    const optionsProvider = providers.find((p) => p.provide === RELAYER_MODULE_OPTIONS);
    const clientProvider = providers.find((p) => p.provide === RELAYER_CLIENT);
    expect(optionsProvider).toBeDefined();
    expect(clientProvider).toBeDefined();
    expect((optionsProvider as any).useFactory).toBe(factory);
  });

  it('exports RELAYER_CLIENT', () => {
    const result = RelayerModule.forRootAsync({
      useFactory: async () => ({ db: {}, schema: {}, entities: [] }),
    });

    expect(result.exports).toContain(RELAYER_CLIENT);
  });
});

describe('RelayerModule.forFeature', () => {
  it('returns DynamicModule with entity providers', () => {
    const result = RelayerModule.forFeature([TestEntity as any]);

    expect(result.module).toBe(RelayerModule);
    const providers = result.providers as Array<{ provide: unknown }>;
    expect(providers.length).toBe(2);

    const entityProvider = providers.find((p) => p.provide === `${RELAYER_ENTITY_PREFIX}tests`);
    const serviceProvider = providers.find((p) => p.provide === `${RELAYER_SERVICE_PREFIX}tests`);
    expect(entityProvider).toBeDefined();
    expect(serviceProvider).toBeDefined();
  });

  it('exports providers', () => {
    const result = RelayerModule.forFeature([TestEntity as any]);
    expect(result.exports).toEqual(result.providers);
  });

  it('filters non-relayer entities', () => {
    class PlainClass {}
    const result = RelayerModule.forFeature([PlainClass as any]);
    expect((result.providers as unknown[]).length).toBe(0);
  });
});
