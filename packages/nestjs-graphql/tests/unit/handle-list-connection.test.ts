import { describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@relayerjs/nestjs-common';

import { handleListConnection } from '../../src/handlers/handle-list-connection';
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

describe('handleListConnection', () => {
  it('returns edges, pageInfo, and totalCount', async () => {
    const items = makeItems(2);
    const service = mockService({ findMany: vi.fn().mockResolvedValue(items) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListConnection(host, { first: 10 }, call);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].node).toBe(items[0]);
    expect(result.edges[0]).toHaveProperty('cursor');
    expect(result).toHaveProperty('pageInfo');
    expect(result).toHaveProperty('totalCount');
  });

  it('fetches limit + 1 to detect hasNextPage', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(3)) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListConnection(host, { first: 5 }, call);
    expect(service.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 6 }));
  });

  it('hasNextPage is true when fetched > limit', async () => {
    // Return 4 items when limit is 3+1=4 means 3 items fetched + 1 extra
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(4)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListConnection(host, { first: 3 }, call);
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.edges).toHaveLength(3); // trimmed to limit
  });

  it('hasNextPage is false when fetched <= limit', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(2)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListConnection(host, { first: 5 }, call);
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(result.edges).toHaveLength(2);
  });

  it('hasPreviousPage is true when args.after exists', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(1)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const cursor = encodeCursor({ id: 1 }, [{ field: 'id', order: 'asc' }], 'id');
    const result = await handleListConnection(host, { first: 5, after: cursor }, call);
    expect(result.pageInfo.hasPreviousPage).toBe(true);
  });

  it('hasPreviousPage is false when no args.after', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(1)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListConnection(host, { first: 5 }, call);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
  });

  it('startCursor and endCursor are null for empty result', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListConnection(host, { first: 10 }, call);
    expect(result.pageInfo.startCursor).toBeNull();
    expect(result.pageInfo.endCursor).toBeNull();
    expect(result.edges).toHaveLength(0);
  });

  it('startCursor and endCursor are set for non-empty result', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(2)) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleListConnection(host, { first: 10 }, call);
    expect(result.pageInfo.startCursor).toBe(result.edges[0].cursor);
    expect(result.pageInfo.endCursor).toBe(result.edges[1].cursor);
  });

  it('ensures id is in orderBy when missing', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListConnection(host, { first: 5, orderBy: [{ title: 'desc' }] }, call);
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

    await handleListConnection(host, { first: 5, orderBy: [{ id: 'desc' }] }, call);
    const passedOrderBy = (service.findMany as any).mock.calls[0][0].orderBy;
    expect(passedOrderBy).toEqual([{ field: 'id', order: 'desc' }]);
  });

  it('uses custom primary key field for id order', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext({
      entity: mockEntityMeta({ primaryKeyField: { name: 'uuid' } }),
    });

    await handleListConnection(host, { first: 5 }, call);
    const passedOrderBy = (service.findMany as any).mock.calls[0][0].orderBy;
    expect(passedOrderBy).toEqual([{ field: 'uuid', order: 'asc' }]);
  });

  it('defaults to 20 when first is not provided', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleListConnection(host, {}, call);
    expect(service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 21 }), // 20 + 1
    );
  });

  it('totalCount is null when not selected', async () => {
    const service = mockService({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(99),
    });
    const host = mockHost(service);
    // Only edges selected, no totalCount
    const call = mockCallContext({
      info: mockGqlInfo([fieldNode('edges', ['node'])]),
    });

    const result = await handleListConnection(host, { first: 10 }, call);
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
      info: mockGqlInfo([fieldNode('edges', ['node']), 'totalCount']),
    });

    const result = await handleListConnection(host, { first: 10 }, call);
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
      info: mockGqlInfo([fieldNode('edges', ['node']), 'totalCount']),
    });

    await handleListConnection(host, { first: 5, where: originalWhere, after: cursor }, call);
    expect(service.count).toHaveBeenCalledWith(expect.objectContaining({ where: originalWhere }));
  });

  it('calls beforeFind and afterFind hooks', async () => {
    const service = mockService({ findMany: vi.fn().mockResolvedValue(makeItems(2)) });
    const beforeFind = vi.fn();
    const afterFind = vi.fn();
    const hooks = mockHooks({ beforeFind, afterFind });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleListConnection(host, { first: 10 }, call);
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

    const result = await handleListConnection(host, { first: 10 }, call);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].node).toBe(transformed[0]);
  });
});
