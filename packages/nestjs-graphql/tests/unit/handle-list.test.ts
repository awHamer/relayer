import { describe, expect, it, vi } from 'vitest';

import { handleList } from '../../src/handlers';
import {
  fieldNode,
  mockCallContext,
  mockGqlInfo,
  mockHooks,
  mockHost,
  mockService,
} from '../helpers';

describe('handleList', () => {
  it('returns items, totalCount, and hasMore', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleList(host, {}, call);
    expect(result.items).toBe(items);
    expect(result).toHaveProperty('totalCount');
    expect(result).toHaveProperty('hasMore');
  });

  it('hasMore is true when items.length === limit and limit > 0', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleList(host, { limit: 3 }, call);
    expect(result.hasMore).toBe(true);
  });

  it('hasMore is false when items.length < limit', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleList(host, { limit: 10 }, call);
    expect(result.hasMore).toBe(false);
  });

  it('hasMore is true when limit is undefined (falls back to items.length)', async () => {
    // When limit is undefined, code does: limit = args.limit ?? finalItems.length
    // So limit === items.length -> hasMore = true (items.length > 0 && items.length === limit)
    const items = [{ id: 1 }, { id: 2 }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleList(host, {}, call);
    expect(result.hasMore).toBe(true);
  });

  it('hasMore is false when limit is undefined and no items', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleList(host, {}, call);
    expect(result.hasMore).toBe(false);
  });

  it('hasMore is false when limit is 0', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleList(host, { limit: 0 }, call);
    expect(result.hasMore).toBe(false);
  });

  it('queries totalCount only when totalCount is selected', async () => {
    const service = mockService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(42),
    });
    const host = mockHost(service);
    // Info includes totalCount at root
    const call = mockCallContext({
      info: mockGqlInfo([fieldNode('items', ['id']), 'totalCount']),
    });

    const result = await handleList(host, {}, call);
    expect(result.totalCount).toBe(42);
    expect(service.count).toHaveBeenCalled();
  });

  it('skips count query when totalCount is not selected', async () => {
    const service = mockService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(99),
    });
    const host = mockHost(service);
    // Info only has 'items', no 'totalCount'
    const call = mockCallContext({
      info: mockGqlInfo([fieldNode('items', ['id'])]),
    });

    const result = await handleList(host, {}, call);
    expect(result.totalCount).toBe(0);
    expect(service.count).not.toHaveBeenCalled();
  });

  it('passes translated orderBy to service', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleList(host, { orderBy: [{ title: 'desc' }] }, call);
    expect(service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ field: 'title', order: 'desc' }],
      }),
    );
  });

  it('passes undefined orderBy when none provided', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleList(host, {}, call);
    expect(service.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: undefined }));
  });

  it('passes where to service', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleList(host, { where: { published: true } }, call);
    expect(service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('passes limit and offset to service', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleList(host, { limit: 10, offset: 20 }, call);
    expect(service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 }),
    );
  });

  it('calls beforeFind hook', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const beforeFind = vi.fn();
    const hooks = mockHooks({ beforeFind });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleList(host, {}, call);
    expect(beforeFind).toHaveBeenCalledTimes(1);
  });

  it('calls afterFind hook and uses its return value', async () => {
    const original = [{ id: 1, title: 'A' }];
    const transformed = [{ id: 1, title: 'A', extra: true }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(original) });
    const afterFind = vi.fn().mockResolvedValue(transformed);
    const hooks = mockHooks({ afterFind });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleList(host, {}, call);
    expect(result.items).toBe(transformed);
  });

  it('uses original items when afterFind returns undefined', async () => {
    const items = [{ id: 1 }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const afterFind = vi.fn().mockResolvedValue(undefined);
    const hooks = mockHooks({ afterFind });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleList(host, {}, call);
    expect(result.items).toBe(items);
  });

  it('passes queryCtx to service', async () => {
    const queryCtx = { tenantId: 'acme' };
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    host.buildQueryContext = () => queryCtx as any;
    const call = mockCallContext();

    await handleList(host, {}, call);
    expect(service.findMany).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
  });
});
