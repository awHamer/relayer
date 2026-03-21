import { describe, expect, it, vi } from 'vitest';

import { createFindByIdHandler } from '../../src/handlers/find-by-id';
import { jsonReq, mockConfig, mockEntity, routeCtx } from '../helpers';

describe('createFindByIdHandler', () => {
  it('returns 200 with found record', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }) });
    const handler = createFindByIdHandler(entity, mockConfig());
    const res = await handler(jsonReq('/api/items/1'), routeCtx({ id: '1' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: 1, name: 'Test' });
  });

  it('returns 404 when not found', async () => {
    const entity = mockEntity();
    const handler = createFindByIdHandler(entity, mockConfig());
    const res = await handler(jsonReq('/api/items/999'), routeCtx({ id: '999' }));
    expect(res.status).toBe(404);
  });

  it('parses numeric id', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 42 }) });
    const handler = createFindByIdHandler(entity, mockConfig());
    await handler(jsonReq('/api/items/42'), routeCtx({ id: '42' }));
    expect(entity.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
  });

  it('keeps string id for non-numeric', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 'abc' }) });
    const handler = createFindByIdHandler(entity, mockConfig());
    await handler(jsonReq('/api/items/abc'), routeCtx({ id: 'abc' }));
    expect(entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'abc' } }),
    );
  });

  it('applies defaultSelect from hooks', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const handler = createFindByIdHandler(entity, mockConfig(), {
      defaultSelect: { id: true, name: true },
    });
    await handler(jsonReq('/api/items/1'), routeCtx({ id: '1' }));
    expect(entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, name: true } }),
    );
  });

  it('query param select overrides defaultSelect', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const handler = createFindByIdHandler(entity, mockConfig(), {
      defaultSelect: { id: true, name: true },
    });
    const selectParam = encodeURIComponent('{"id":true,"email":true}');
    await handler(jsonReq(`/api/items/1?select=${selectParam}`), routeCtx({ id: '1' }));
    expect(entity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, email: true } }),
    );
  });

  it('calls afterFind hook', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const afterFind = vi.fn().mockReturnValue({ id: 1, extra: true });
    const handler = createFindByIdHandler(entity, mockConfig(), { afterFind });
    const res = await handler(jsonReq('/api/items/1'), routeCtx({ id: '1' }));
    const body = await res.json();
    expect(afterFind).toHaveBeenCalled();
    expect(body.data).toEqual({ id: 1, extra: true });
  });

  it('afterFind returning null gives 404', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const afterFind = vi.fn().mockReturnValue(null);
    const handler = createFindByIdHandler(entity, mockConfig(), { afterFind });
    const res = await handler(jsonReq('/api/items/1'), routeCtx({ id: '1' }));
    expect(res.status).toBe(404);
  });

  it('afterFind returning Response is used directly', async () => {
    const entity = mockEntity({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const afterFind = vi.fn().mockReturnValue(new Response(null, { status: 403 }));
    const handler = createFindByIdHandler(entity, mockConfig(), { afterFind });
    const res = await handler(jsonReq('/api/items/1'), routeCtx({ id: '1' }));
    expect(res.status).toBe(403);
  });

  it('returns 422 for missing id', async () => {
    const entity = mockEntity();
    const handler = createFindByIdHandler(entity, mockConfig());
    const res = await handler(jsonReq('/api/items/'), routeCtx({}));
    expect(res.status).toBe(422);
  });
});
