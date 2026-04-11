import { describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@relayerjs/nestjs-common';

import { handleListCursor } from '../../src/handlers';
import {
  fieldNode,
  mockCallContext,
  mockEntityMeta,
  mockGqlInfo,
  mockHooks,
  mockHost,
  mockService,
} from '../helpers';

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, title: `Item ${i + 1}` }));
}

describe('handleListCursor', () => {
  it('returns items, pageInfo, and totalCount', async () => {
    const items = makeItems(2);
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toBe(items[0]);
    expect(result).toHaveProperty('pageInfo');
    expect(result).toHaveProperty('totalCount');
  });

  it('returns flat items array (no edges wrapping)', async () => {
    const items = makeItems(3);
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toEqual(items);
    // ensure no edges field
    expect((result as Record<string, unknown>).edges).toBeUndefined();
  });

  it('fetches limit + 1 to detect hasNextPage', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(3)) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListCursor(host, { first: 5 }, call);
    expect(service.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 6 }));
  });

  it('hasNextPage is true when fetched > limit', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(4)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 3 }, call);
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.items).toHaveLength(3);
  });

  it('hasNextPage is false when fetched <= limit', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(2)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 5 }, call);
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(result.items).toHaveLength(2);
  });

  it('hasPreviousPage is true when args.after exists', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(1)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const cursor = encodeCursor({ id: 1 }, [{ field: 'id', order: 'asc' }], 'id');
    const result = await handleListCursor(host, { first: 5, after: cursor }, call);
    expect(result.pageInfo.hasPreviousPage).toBe(true);
  });

  it('hasPreviousPage is false when no args.after', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(1)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 5 }, call);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
  });

  it('startCursor and endCursor are null for empty result', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(result.pageInfo.startCursor).toBeNull();
    expect(result.pageInfo.endCursor).toBeNull();
    expect(result.items).toHaveLength(0);
  });

  it('startCursor is encoded from first item, endCursor from last', async () => {
    const items = makeItems(3);
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 10 }, call);
    const expectedStart = encodeCursor(items[0]!, [{ field: 'id', order: 'asc' }], 'id');
    const expectedEnd = encodeCursor(items[2]!, [{ field: 'id', order: 'asc' }], 'id');
    expect(result.pageInfo.startCursor).toBe(expectedStart);
    expect(result.pageInfo.endCursor).toBe(expectedEnd);
  });

  it('single item has same startCursor and endCursor', async () => {
    const items = makeItems(1);
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(result.pageInfo.startCursor).toBe(result.pageInfo.endCursor);
    expect(result.pageInfo.startCursor).not.toBeNull();
  });

  it('ensures id is in orderBy when missing', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListCursor(host, { first: 5, orderBy: [{ title: 'desc' }] }, call);
    const passedOrderBy = (service.findMany as any).mock.calls[0][0].orderBy;
    expect(passedOrderBy).toEqual([
      { field: 'title', order: 'desc' },
      { field: 'id', order: 'asc' },
    ]);
  });

  it('does not duplicate id in orderBy when already present', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListCursor(host, { first: 5, orderBy: [{ id: 'desc' }] }, call);
    const passedOrderBy = (service.findMany as any).mock.calls[0][0].orderBy;
    expect(passedOrderBy).toEqual([{ field: 'id', order: 'desc' }]);
  });

  it('uses custom primary key field for id order', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext({
      entity: mockEntityMeta({ primaryKeyField: { name: 'uuid' } }),
    });

    await handleListCursor(host, { first: 5 }, call);
    const passedOrderBy = (service.findMany as any).mock.calls[0][0].orderBy;
    expect(passedOrderBy).toEqual([{ field: 'uuid', order: 'asc' }]);
  });

  it('defaults to 20 when first is not provided', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListCursor(host, {}, call);
    expect(service.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 21 }));
  });

  it('totalCount is null when not selected', async () => {
    const service = mockService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(99),
    });
    const host = mockHost(service);
    const call = mockCallContext({
      info: mockGqlInfo([fieldNode('items', ['id'])]),
    });

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(result.totalCount).toBeNull();
    expect(service.count).not.toHaveBeenCalled();
  });

  it('totalCount is queried when selected', async () => {
    const service = mockService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(42),
    });
    const host = mockHost(service);
    const call = mockCallContext({
      info: mockGqlInfo([fieldNode('items', ['id']), 'totalCount']),
    });

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(result.totalCount).toBe(42);
    expect(service.count).toHaveBeenCalled();
  });

  it('uses original args.where (not merged) for totalCount', async () => {
    const originalWhere = { published: true };
    const cursor = encodeCursor({ id: 1 }, [{ field: 'id', order: 'asc' }], 'id');

    const service = mockService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(10),
    });
    const host = mockHost(service);
    const call = mockCallContext({
      info: mockGqlInfo([fieldNode('items', ['id']), 'totalCount']),
    });

    await handleListCursor(host, { first: 5, where: originalWhere, after: cursor }, call);
    expect(service.count).toHaveBeenCalledWith(expect.objectContaining({ where: originalWhere }));
  });

  it('calls beforeFind and afterFind hooks', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(2)) });
    const beforeFind = vi.fn();
    const afterFind = vi.fn();
    const hooks = mockHooks({ beforeFind, afterFind });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleListCursor(host, { first: 10 }, call);
    expect(beforeFind).toHaveBeenCalledTimes(1);
    expect(afterFind).toHaveBeenCalledTimes(1);
  });

  it('afterFind can override items', async () => {
    const original = makeItems(2);
    const transformed = [{ id: 1, title: 'Modified' }];
    const service = mockService({ findMany: vi.fn().mockResolvedValue(original) });
    const afterFind = vi.fn().mockResolvedValue(transformed);
    const hooks = mockHooks({ afterFind });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleListCursor(host, { first: 10 }, call);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBe(transformed[0]);
  });
});
