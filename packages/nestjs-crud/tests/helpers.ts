import { vi } from 'vitest';

import type { EntityClient } from '../src/relayer.service';

export function mockEntityClient(overrides?: Partial<EntityClient>): EntityClient {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    aggregate: vi.fn().mockResolvedValue({ _count: 0 }),
    ...overrides,
  };
}

export class TestEntity {
  static __entityKey = 'tests';
  static __schema = {};
  static __table = {};
  static __relayer = true as const;
  static __computed = new Map();
  static __derived = new Map();

  id!: number;
  title!: string;
  content!: string;
}
