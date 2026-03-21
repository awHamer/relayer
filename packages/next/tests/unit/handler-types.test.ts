import { describe, expect, it } from 'vitest';

import type {
  QueryOptions,
  RuntimeCreateHooks,
  RuntimeEntityClient,
  RuntimeHandlerContext,
  RuntimeListHooks,
  RuntimeRemoveHooks,
  RuntimeRouteConfig,
  RuntimeUpdateHooks,
} from '../../src/handlers/handler-types';

describe('handler-types', () => {
  it('QueryOptions is assignable with all fields', () => {
    const opts: QueryOptions = {
      select: { id: true },
      where: { name: 'test' },
      orderBy: { field: 'name', order: 'asc' },
      limit: 10,
      offset: 0,
      context: { userId: 1 },
    };
    expect(opts.limit).toBe(10);
  });

  it('RuntimeEntityClient has all methods', () => {
    const entity: RuntimeEntityClient = {
      findMany: async () => [],
      findFirst: async () => null,
      count: async () => 0,
      aggregate: async () => ({}),
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
    };
    expect(typeof entity.findMany).toBe('function');
    expect(typeof entity.create).toBe('function');
  });

  it('RuntimeHandlerContext supports arbitrary keys', () => {
    const ctx: RuntimeHandlerContext = { context: {}, tx: null, user: { id: 1 }, custom: true };
    expect(ctx.custom).toBe(true);
  });

  it('RuntimeRouteConfig is assignable with allow* fields', () => {
    const config: RuntimeRouteConfig = {
      allowSelect: { password: false },
      allowWhere: { secret: false },
      allowOrderBy: ['name'],
      maxLimit: 50,
      defaultLimit: 20,
    };
    expect(config.maxLimit).toBe(50);
  });

  it('RuntimeListHooks supports defaults and callbacks', () => {
    const hooks: RuntimeListHooks = {
      defaultSelect: { id: true },
      defaultWhere: { active: true },
      defaultOrderBy: { field: 'id', order: 'asc' },
      defaultLimit: 10,
      beforeFind: async () => {},
      afterFind: async (results) => results,
    };
    expect(hooks.defaultLimit).toBe(10);
  });

  it('Mutation hooks accept Response returns', () => {
    const createHooks: RuntimeCreateHooks = {
      beforeCreate: () => new Response(null, { status: 403 }),
      afterCreate: () => new Response(null, { status: 202 }),
    };
    expect(createHooks.beforeCreate).toBeDefined();

    const updateHooks: RuntimeUpdateHooks = {
      beforeUpdate: () => false,
      afterUpdate: () => new Response(null, { status: 200 }),
    };
    expect(updateHooks.beforeUpdate).toBeDefined();

    const removeHooks: RuntimeRemoveHooks = {
      beforeDelete: () => new Response(null, { status: 401 }),
      afterDelete: () => ({ id: 1 }),
    };
    expect(removeHooks.beforeDelete).toBeDefined();
  });
});
