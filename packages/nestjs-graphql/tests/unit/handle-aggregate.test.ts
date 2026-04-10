import { describe, expect, it, vi } from 'vitest';

import { handleAggregate } from '../../src/handlers';
import { mockCallContext, mockHooks, mockHost, mockService } from '../helpers';

describe('handleAggregate', () => {
  it('wraps result in { data }', async () => {
    const aggResult = [{ _count: 5, authorId: 1 }];
    const service = mockService({ aggregate: vi.fn().mockResolvedValue(aggResult) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleAggregate(host, { _count: true, groupBy: ['authorId'] }, call);
    expect(result).toEqual({ data: aggResult });
  });

  it('passes all args to service', async () => {
    const service = mockService({ aggregate: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    const call = mockCallContext();

    const args = {
      where: { published: true },
      groupBy: ['authorId'],
      _count: true,
      _sum: { rating: true },
      _avg: { rating: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
      having: { _count: { gt: 5 } },
    };

    await handleAggregate(host, args, call);
    expect(service.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: args.where,
        groupBy: args.groupBy,
        _count: args._count,
        _sum: args._sum,
        _avg: args._avg,
        _min: args._min,
        _max: args._max,
        having: args.having,
      }),
    );
  });

  it('passes queryCtx to service', async () => {
    const queryCtx = { tenantId: 'acme' };
    const service = mockService({ aggregate: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service);
    host.buildQueryContext = () => queryCtx as any;
    const call = mockCallContext();

    await handleAggregate(host, { _count: true }, call);
    expect(service.aggregate).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
  });

  it('calls beforeAggregate hook', async () => {
    const service = mockService({ aggregate: vi.fn().mockResolvedValue([]) });
    const beforeAggregate = vi.fn();
    const hooks = mockHooks({ beforeAggregate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleAggregate(host, { _count: true }, call);
    expect(beforeAggregate).toHaveBeenCalledTimes(1);
  });

  it('afterAggregate hook can override result', async () => {
    const original = [{ _count: 5 }];
    const transformed = [{ _count: 5, extra: 'added' }];
    const service = mockService({ aggregate: vi.fn().mockResolvedValue(original) });
    const afterAggregate = vi.fn().mockResolvedValue(transformed);
    const hooks = mockHooks({ afterAggregate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleAggregate(host, { _count: true }, call);
    expect(result).toEqual({ data: transformed });
  });

  it('uses original data when afterAggregate returns undefined', async () => {
    const original = [{ _count: 5 }];
    const service = mockService({ aggregate: vi.fn().mockResolvedValue(original) });
    const afterAggregate = vi.fn().mockResolvedValue(undefined);
    const hooks = mockHooks({ afterAggregate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleAggregate(host, { _count: true }, call);
    expect(result).toEqual({ data: original });
  });

  it('works without hooks', async () => {
    const service = mockService({ aggregate: vi.fn().mockResolvedValue([]) });
    const host = mockHost(service, null);
    const call = mockCallContext();

    const result = await handleAggregate(host, { _count: true }, call);
    expect(result).toEqual({ data: [] });
  });
});
