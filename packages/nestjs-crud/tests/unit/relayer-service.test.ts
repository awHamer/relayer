import { describe, expect, it, vi } from 'vitest';

import { RelayerService } from '../../src/relayer.service';
import { mockEntityClient } from '../helpers';

describe('RelayerService', () => {
  it('findMany delegates to entityClient', async () => {
    const client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    });
    const service = new RelayerService(client);
    const result = await service.findMany({ where: { published: true } });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(client.findMany).toHaveBeenCalledWith({ where: { published: true } });
  });

  it('findFirst delegates to entityClient', async () => {
    const client = mockEntityClient({
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
    });
    const service = new RelayerService(client);
    const result = await service.findFirst({ where: { id: 1 } });
    expect(result).toEqual({ id: 1 });
    expect(client.findFirst).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('count delegates to entityClient', async () => {
    const client = mockEntityClient({
      count: vi.fn().mockResolvedValue(42),
    });
    const service = new RelayerService(client);
    const result = await service.count({ where: { published: true } });
    expect(result).toBe(42);
    expect(client.count).toHaveBeenCalledWith({ where: { published: true } });
  });

  it('create wraps data in { data }', async () => {
    const client = mockEntityClient({
      create: vi.fn().mockResolvedValue({ id: 1, title: 'New' }),
    });
    const service = new RelayerService(client);
    const result = await service.create({ title: 'New' });
    expect(result).toEqual({ id: 1, title: 'New' });
    expect(client.create).toHaveBeenCalledWith({ data: { title: 'New' } });
  });

  it('createMany wraps data array', async () => {
    const client = mockEntityClient({
      createMany: vi.fn().mockResolvedValue([{ id: 1 }]),
    });
    const service = new RelayerService(client);
    await service.createMany([{ title: 'A' }]);
    expect(client.createMany).toHaveBeenCalledWith({ data: [{ title: 'A' }] });
  });

  it('update wraps where and data', async () => {
    const client = mockEntityClient({
      update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
    });
    const service = new RelayerService(client);
    const result = await service.update({ id: 1 }, { title: 'Updated' });
    expect(result).toEqual({ id: 1, title: 'Updated' });
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'Updated' },
    });
  });

  it('updateMany wraps where and data', async () => {
    const client = mockEntityClient({
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    });
    const service = new RelayerService(client);
    const result = await service.updateMany({ published: false }, { published: true });
    expect(result).toEqual({ count: 3 });
    expect(client.updateMany).toHaveBeenCalledWith({
      where: { published: false },
      data: { published: true },
    });
  });

  it('delete wraps where', async () => {
    const client = mockEntityClient({
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    });
    const service = new RelayerService(client);
    const result = await service.delete({ id: 1 });
    expect(result).toEqual({ id: 1 });
    expect(client.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('deleteMany wraps where', async () => {
    const client = mockEntityClient({
      deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
    });
    const service = new RelayerService(client);
    const result = await service.deleteMany({ published: false });
    expect(result).toEqual({ count: 5 });
    expect(client.deleteMany).toHaveBeenCalledWith({ where: { published: false } });
  });

  it('aggregate delegates to entityClient', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({ _count: 42 }),
    });
    const service = new RelayerService(client);
    const result = await service.aggregate({ _count: true, groupBy: ['status'] });
    expect(result).toEqual({ _count: 42 });
    expect(client.aggregate).toHaveBeenCalledWith({ _count: true, groupBy: ['status'] });
  });

  it('aggregate with no options passes empty object', async () => {
    const client = mockEntityClient();
    const service = new RelayerService(client);
    await service.aggregate();
    expect(client.aggregate).toHaveBeenCalledWith({});
  });

  it('findMany with no options passes empty object', async () => {
    const client = mockEntityClient();
    const service = new RelayerService(client);
    await service.findMany();
    expect(client.findMany).toHaveBeenCalledWith({});
  });

  it('subclass getDefaultWhere merges into findMany', async () => {
    const client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([]),
    });

    class ScopedService extends RelayerService<unknown> {
      protected getDefaultWhere(upstream?: Record<string, unknown>) {
        return { ...upstream, tenantId: 1 };
      }
    }

    const service = new ScopedService(client);
    await service.findMany({ where: { published: true } });
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true, tenantId: 1 } }),
    );
  });

  it('subclass getDefaultWhere merges into count', async () => {
    const client = mockEntityClient({
      count: vi.fn().mockResolvedValue(0),
    });

    class ScopedService extends RelayerService<unknown> {
      protected getDefaultWhere(upstream?: Record<string, unknown>) {
        return { ...upstream, tenantId: 1 };
      }
    }

    const service = new ScopedService(client);
    await service.count({ where: { published: true } });
    expect(client.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true, tenantId: 1 } }),
    );
  });
});
