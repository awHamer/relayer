import { describe, expect, it, vi } from 'vitest';

import { createListHandler } from '../../src/handlers/list';
import { jsonReq, mockConfig, mockEntity, routeCtx } from '../helpers';

describe('createListHandler', () => {
  it('returns 200 with data and meta', async () => {
    const entity = mockEntity({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
      count: vi.fn().mockResolvedValue(1),
    });
    const handler = createListHandler(entity, mockConfig());
    const res = await handler(jsonReq('/api/items'), routeCtx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ id: 1 }]);
    expect(body.meta).toEqual({ total: 1, limit: 20, offset: 0 });
  });

  it('caps limit at maxLimit', async () => {
    const entity = mockEntity();
    const handler = createListHandler(entity, mockConfig({ maxLimit: 5 }));
    await handler(jsonReq('/api/items?limit=50'), routeCtx());
    expect(entity.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
  });

  it('uses defaultLimit from config', async () => {
    const entity = mockEntity();
    const handler = createListHandler(entity, mockConfig({ defaultLimit: 15 }));
    await handler(jsonReq('/api/items'), routeCtx());
    expect(entity.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 15 }));
  });

  it('applies defaultSelect from hooks', async () => {
    const entity = mockEntity();
    const handler = createListHandler(entity, mockConfig(), {
      defaultSelect: { id: true, name: true },
    });
    await handler(jsonReq('/api/items'), routeCtx());
    expect(entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, name: true } }),
    );
  });

  it('applies defaultWhere from hooks', async () => {
    const entity = mockEntity();
    const handler = createListHandler(entity, mockConfig(), {
      defaultWhere: { active: true },
    });
    await handler(jsonReq('/api/items'), routeCtx());
    expect(entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } }),
    );
  });

  it('applies defaultOrderBy from hooks', async () => {
    const entity = mockEntity();
    const handler = createListHandler(entity, mockConfig(), {
      defaultOrderBy: { field: 'id', order: 'asc' },
    });
    await handler(jsonReq('/api/items'), routeCtx());
    expect(entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { field: 'id', order: 'asc' } }),
    );
  });

  it('calls afterFind hook', async () => {
    const entity = mockEntity({ findMany: vi.fn().mockResolvedValue([{ id: 1 }]) });
    const afterFind = vi.fn().mockReturnValue([{ id: 1, extra: true }]);
    const handler = createListHandler(entity, mockConfig(), { afterFind });
    const res = await handler(jsonReq('/api/items'), routeCtx());
    const body = await res.json();
    expect(afterFind).toHaveBeenCalled();
    expect(body.data).toEqual([{ id: 1, extra: true }]);
  });

  it('returns 422 for invalid where', async () => {
    const entity = mockEntity();
    const handler = createListHandler(entity, mockConfig({ allowWhere: { password: false } }));
    const res = await handler(
      jsonReq('/api/items?where=' + encodeURIComponent('{"password":"x"}')),
      routeCtx(),
    );
    expect(res.status).toBe(422);
  });

  it('.query() returns data and meta', async () => {
    const entity = mockEntity({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
      count: vi.fn().mockResolvedValue(5),
    });
    const handler = createListHandler(entity, mockConfig());
    const result = await handler.query({ limit: 10 });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta.total).toBe(5);
  });
});
