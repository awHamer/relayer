import { describe, expect, it, vi } from 'vitest';

import { createAggregateHandler } from '../../src/handlers/aggregate';
import { createCountHandler } from '../../src/handlers/count';
import { jsonReq, mockConfig, mockEntity, routeCtx } from '../helpers';

describe('createCountHandler', () => {
  it('returns 200 with count', async () => {
    const entity = mockEntity({ count: vi.fn().mockResolvedValue(42) });
    const handler = createCountHandler(entity, mockConfig());
    const res = await handler(jsonReq('/api/items/count'), routeCtx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual({ count: 42 });
  });

  it('parses where from query params', async () => {
    const entity = mockEntity({ count: vi.fn().mockResolvedValue(5) });
    const handler = createCountHandler(entity, mockConfig());
    const whereParam = encodeURIComponent('{"status":"active"}');
    await handler(jsonReq(`/api/items/count?where=${whereParam}`), routeCtx());
    expect(entity.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'active' } }),
    );
  });

  it('returns 422 for denied where field', async () => {
    const entity = mockEntity();
    const handler = createCountHandler(entity, mockConfig({ allowWhere: { secret: false } }));
    const whereParam = encodeURIComponent('{"secret":"x"}');
    const res = await handler(jsonReq(`/api/items/count?where=${whereParam}`), routeCtx());
    expect(res.status).toBe(422);
  });

  it('calls beforeCount hook', async () => {
    const entity = mockEntity({ count: vi.fn().mockResolvedValue(0) });
    const beforeCount = vi.fn();
    const handler = createCountHandler(entity, mockConfig(), { beforeCount });
    await handler(jsonReq('/api/items/count'), routeCtx());
    expect(beforeCount).toHaveBeenCalled();
  });
});

describe('createAggregateHandler', () => {
  it('returns 200 with aggregate data', async () => {
    const entity = mockEntity({
      aggregate: vi.fn().mockResolvedValue([{ _count: 10, status: 'active' }]),
    });
    const handler = createAggregateHandler(entity, mockConfig());
    const res = await handler(
      jsonReq('/api/items/aggregate?groupBy=["status"]&_count=true'),
      routeCtx(),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ _count: 10, status: 'active' }]);
  });

  it('calls beforeAggregate hook', async () => {
    const entity = mockEntity({ aggregate: vi.fn().mockResolvedValue({}) });
    const beforeAggregate = vi.fn();
    const handler = createAggregateHandler(entity, mockConfig(), { beforeAggregate });
    await handler(jsonReq('/api/items/aggregate?_count=true'), routeCtx());
    expect(beforeAggregate).toHaveBeenCalled();
  });
});
