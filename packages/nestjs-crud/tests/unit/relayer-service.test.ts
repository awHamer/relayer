import { describe, expect, it, vi } from 'vitest';

import { RelayerService } from '../../src/relayer.service';
import { mockEntityClient } from '../helpers';

function createService(overrides = {}) {
  const client = mockEntityClient(overrides);
  const r = { posts: client } as any;
  const service = new RelayerService(r, 'posts');
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
});
