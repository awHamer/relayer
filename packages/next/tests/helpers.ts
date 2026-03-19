import { vi } from 'vitest';

import type { RuntimeEntityClient, RuntimeRouteConfig } from '../src/handlers/handler-types';
import type { TransactionalClient } from '../src/handlers/shared';

export function mockEntity(overrides?: Partial<RuntimeEntityClient>): RuntimeEntityClient {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

export function mockClient(entityName: string, entity: RuntimeEntityClient): TransactionalClient {
  const client: TransactionalClient = {
    [entityName]: entity,
    $transaction: vi.fn(async (cb) => {
      const tx: TransactionalClient = {
        [entityName]: { ...entity },
        $transaction: vi.fn(),
      };
      return cb(tx);
    }),
  };
  return client;
}

export function mockConfig(overrides?: Partial<RuntimeRouteConfig>): RuntimeRouteConfig {
  return { maxLimit: 100, defaultLimit: 20, ...overrides };
}

export function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

export function jsonReq(url: string, options?: RequestInit) {
  return new Request(`http://test${url}`, options);
}
