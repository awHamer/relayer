import { describe, expect, it, vi } from 'vitest';

import { RelayerService } from '../../src';
import { mockEntityClient } from '../helpers';

function createService(overrides = {}) {
  const client = mockEntityClient(overrides);
  const r = { posts: client } as any;
  const service = new RelayerService<any, Record<string, unknown>>(r, 'posts');
  return { service, client };
}

describe('RelayerService', () => {
  it('findMany delegates to repo', async () => {
    const { service, client } = createService({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    });
    const result = await service.findMany({ where: { published: true } });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(client.findMany).toHaveBeenCalled();
  });

  it('findFirst delegates to repo', async () => {
    const { service, client } = createService({
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
    });
    const result = await service.findFirst({ where: { id: 1 } });
    expect(result).toEqual({ id: 1 });
    expect(client.findFirst).toHaveBeenCalled();
  });

  it('count delegates to repo', async () => {
    const { service, client } = createService({
      count: vi.fn().mockResolvedValue(42),
    });
    const result = await service.count({ where: { published: true } });
    expect(result).toBe(42);
    expect(client.count).toHaveBeenCalled();
  });

  it('create delegates to repo', async () => {
    const { service, client } = createService({
      create: vi.fn().mockResolvedValue({ id: 1, title: 'New' }),
    });
    const result = await service.create({ data: { title: 'New' } });
    expect(result).toEqual({ id: 1, title: 'New' });
    expect(client.create).toHaveBeenCalled();
  });

  it('update delegates to repo', async () => {
    const { service, client } = createService({
      update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
    });
    const result = await service.update({ where: { id: 1 }, data: { title: 'Updated' } });
    expect(result).toEqual({ id: 1, title: 'Updated' });
    expect(client.update).toHaveBeenCalled();
  });

  it('delete delegates to repo', async () => {
    const { service, client } = createService({
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    });
    const result = await service.delete({ where: { id: 1 } });
    expect(result).toEqual({ id: 1 });
    expect(client.delete).toHaveBeenCalled();
  });

  it('aggregate delegates to repo', async () => {
    const { service, client } = createService({
      aggregate: vi.fn().mockResolvedValue({ _count: 42 }),
    });
    const result = await service.aggregate({ _count: true, groupBy: ['status'] });
    expect(result).toEqual({ _count: 42 });
    expect(client.aggregate).toHaveBeenCalled();
  });

  it('updateMany delegates to repo', async () => {
    const { service, client } = createService({
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    });
    const result = await service.updateMany({
      where: { published: false },
      data: { published: true },
    });
    expect(result).toEqual({ count: 3 });
    expect(client.updateMany).toHaveBeenCalled();
  });

  it('deleteMany delegates to repo', async () => {
    const { service, client } = createService({
      deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
    });
    const result = await service.deleteMany({ where: { archived: true } });
    expect(result).toEqual({ count: 5 });
    expect(client.deleteMany).toHaveBeenCalled();
  });

  it('createMany delegates to repo', async () => {
    const { service, client } = createService({
      createMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    });
    const result = await service.createMany({ data: [{ title: 'A' }, { title: 'B' }] });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(client.createMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// typed context propagation
// ---------------------------------------------------------------------------
// Verifies that TContext flows through every CRUD method on RelayerService:
// 1. getDefaultWhere(upstream, ctx) is called with the typed context
// 2. The combined where (default + user-supplied) is passed to the repo
// 3. The original context is also forwarded to the repo for SQL resolvers
//
// We use a TenantScopedService that overrides getDefaultWhere to scope every
// query to the current tenant — the same pattern users will hit in real apps.

interface TenantContext {
  tenantId: string;
}

class TenantScopedService extends RelayerService<any, Record<string, unknown>, TenantContext> {
  // Public spy hook so tests can assert what getDefaultWhere received.
  public getDefaultWhereSpy = vi.fn();

  protected getDefaultWhere(upstream: any, ctx?: TenantContext): any {
    this.getDefaultWhereSpy(upstream, ctx);
    if (!ctx) return upstream;
    const scoped = { tenantId: ctx.tenantId };
    return upstream ? { AND: [upstream, scoped] } : scoped;
  }
}

function createTenantService(overrides = {}) {
  const client = mockEntityClient(overrides);
  const r = { posts: client } as any;
  const service = new TenantScopedService(r, 'posts');
  return { service, client };
}

describe('RelayerService: typed context', () => {
  // ---- findMany ----
  describe('findMany', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.findMany({ context: { tenantId: 'acme' } });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.findMany({
        where: { published: true },
        context: { tenantId: 'acme' },
      });
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { published: true }] },
        }),
      );
    });

    it('forwards context to repo.findMany', async () => {
      const { service, client } = createTenantService();
      await service.findMany({ context: { tenantId: 'acme' } });
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- findFirst ----
  describe('findFirst', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.findFirst({ context: { tenantId: 'acme' } });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.findFirst({
        where: { id: 1 },
        context: { tenantId: 'acme' },
      });
      expect(client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { id: 1 }] },
        }),
      );
    });

    it('forwards context to repo.findFirst', async () => {
      const { service, client } = createTenantService();
      await service.findFirst({ context: { tenantId: 'acme' } });
      expect(client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- count ----
  describe('count', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.count({ context: { tenantId: 'acme' } });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.count({
        where: { published: true },
        context: { tenantId: 'acme' },
      });
      expect(client.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { published: true }] },
        }),
      );
    });

    it('forwards context to repo.count', async () => {
      const { service, client } = createTenantService();
      await service.count({ context: { tenantId: 'acme' } });
      expect(client.count).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- update ----
  describe('update', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.update({
        where: { id: 1 },
        data: { title: 'New' },
        context: { tenantId: 'acme' },
      });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.update({
        where: { id: 1 },
        data: { title: 'New' },
        context: { tenantId: 'acme' },
      });
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { id: 1 }] },
        }),
      );
    });

    it('forwards context to repo.update', async () => {
      const { service, client } = createTenantService();
      await service.update({
        where: { id: 1 },
        data: { title: 'New' },
        context: { tenantId: 'acme' },
      });
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- updateMany ----
  describe('updateMany', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.updateMany({
        where: { archived: false },
        data: { archived: true },
        context: { tenantId: 'acme' },
      });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.updateMany({
        where: { archived: false },
        data: { archived: true },
        context: { tenantId: 'acme' },
      });
      expect(client.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { archived: false }] },
        }),
      );
    });

    it('forwards context to repo.updateMany', async () => {
      const { service, client } = createTenantService();
      await service.updateMany({
        where: { archived: false },
        data: { archived: true },
        context: { tenantId: 'acme' },
      });
      expect(client.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- delete ----
  describe('delete', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.delete({ where: { id: 1 }, context: { tenantId: 'acme' } });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.delete({ where: { id: 1 }, context: { tenantId: 'acme' } });
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { id: 1 }] },
        }),
      );
    });

    it('forwards context to repo.delete', async () => {
      const { service, client } = createTenantService();
      await service.delete({ where: { id: 1 }, context: { tenantId: 'acme' } });
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- deleteMany ----
  describe('deleteMany', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.deleteMany({ where: { archived: true }, context: { tenantId: 'acme' } });
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.deleteMany({ where: { archived: true }, context: { tenantId: 'acme' } });
      expect(client.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { archived: true }] },
        }),
      );
    });

    it('forwards context to repo.deleteMany', async () => {
      const { service, client } = createTenantService();
      await service.deleteMany({ where: { archived: true }, context: { tenantId: 'acme' } });
      expect(client.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- aggregate ----
  describe('aggregate', () => {
    it('passes context to getDefaultWhere', async () => {
      const { service } = createTenantService();
      await service.aggregate({ _count: true, context: { tenantId: 'acme' } } as any);
      expect(service.getDefaultWhereSpy).toHaveBeenCalledWith(undefined, { tenantId: 'acme' });
    });

    it('merges scoped where with user-supplied where', async () => {
      const { service, client } = createTenantService();
      await service.aggregate({
        _count: true,
        where: { published: true },
        context: { tenantId: 'acme' },
      } as any);
      expect(client.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ tenantId: 'acme' }, { published: true }] },
        }),
      );
    });

    it('forwards context to repo.aggregate', async () => {
      const { service, client } = createTenantService();
      await service.aggregate({ _count: true, context: { tenantId: 'acme' } } as any);
      expect(client.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- create / createMany (no getDefaultWhere here, but context still flows) ----
  describe('create / createMany', () => {
    it('forwards context to repo.create', async () => {
      const { service, client } = createTenantService();
      await service.create({ data: { title: 'New' }, context: { tenantId: 'acme' } });
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });

    it('forwards context to repo.createMany', async () => {
      const { service, client } = createTenantService();
      await service.createMany({
        data: [{ title: 'A' }, { title: 'B' }],
        context: { tenantId: 'acme' },
      });
      expect(client.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ context: { tenantId: 'acme' } }),
      );
    });
  });

  // ---- negative cases ----
  describe('negative cases', () => {
    it('getDefaultWhere returns upstream unchanged when no context', async () => {
      const { service, client } = createTenantService();
      await service.findMany({ where: { published: true } });
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } }),
      );
    });

    it('update without context bypasses tenant scoping', async () => {
      // Critical: proves the row-level scoping requires context, so callers
      // can't accidentally get global scope by forgetting to pass it.
      const { service, client } = createTenantService();
      await service.update({ where: { id: 1 }, data: { title: 'X' } });
      expect(client.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
      // Also: no AND wrapper, so where is exactly { id: 1 }
      const callArg = (client.update as any).mock.calls[0][0];
      expect(callArg.where).toEqual({ id: 1 });
    });

    it('delete without context bypasses tenant scoping', async () => {
      const { service, client } = createTenantService();
      await service.delete({ where: { id: 1 } });
      const callArg = (client.delete as any).mock.calls[0][0];
      expect(callArg.where).toEqual({ id: 1 });
    });
  });
});
