import { describe, expect, it, vi } from 'vitest';

import { createCreateHandler } from '../../src/handlers/create';
import { createRemoveHandler } from '../../src/handlers/remove';
import { createUpdateHandler } from '../../src/handlers/update';
import { mockClient, mockConfig, mockEntity, routeCtx } from '../helpers';

function postReq(body: Record<string, unknown>) {
  return new Request('http://test/api/items', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function patchReq(body: Record<string, unknown>) {
  return new Request('http://test/api/items/1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function deleteReq() {
  return new Request('http://test/api/items/1', { method: 'DELETE' });
}

describe('createCreateHandler', () => {
  it('returns 201 with created record', async () => {
    const entity = mockEntity({ create: vi.fn().mockResolvedValue({ id: 1, name: 'New' }) });
    const client = mockClient('items', entity);
    const handler = createCreateHandler('items', client, mockConfig());
    const res = await handler(postReq({ name: 'New' }), routeCtx());
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data).toEqual({ id: 1, name: 'New' });
  });

  it('calls beforeCreate hook and uses modified data', async () => {
    const entity = mockEntity({ create: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const beforeCreate = vi.fn().mockImplementation((data) => ({ ...data, slug: 'test' }));
    const handler = createCreateHandler('items', client, mockConfig(), { beforeCreate });
    await handler(postReq({ name: 'New' }), routeCtx());
    expect(beforeCreate).toHaveBeenCalled();
  });

  it('beforeCreate returning false returns null data', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createCreateHandler('items', client, mockConfig(), {
      beforeCreate: vi.fn().mockReturnValue(false),
    });
    const res = await handler(postReq({ name: 'test' }), routeCtx());
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it('beforeCreate returning Response is used directly', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createCreateHandler('items', client, mockConfig(), {
      beforeCreate: vi.fn().mockReturnValue(new Response(null, { status: 403 })),
    });
    const res = await handler(postReq({ name: 'test' }), routeCtx());
    expect(res.status).toBe(403);
  });

  it('afterCreate hook transforms result (runs in transaction)', async () => {
    const entity = mockEntity({ create: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const afterCreate = vi.fn().mockReturnValue({ id: 1, extra: true });
    const handler = createCreateHandler('items', client, mockConfig(), { afterCreate });
    const res = await handler(postReq({ name: 'New' }), routeCtx());
    const body = await res.json();
    expect(afterCreate).toHaveBeenCalled();
    expect(body.data).toEqual({ id: 1, extra: true });
  });

  it('afterCreate returning Response is used directly', async () => {
    const entity = mockEntity({ create: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const handler = createCreateHandler('items', client, mockConfig(), {
      afterCreate: vi.fn().mockReturnValue(Response.json({ custom: true }, { status: 202 })),
    });
    const res = await handler(postReq({ name: 'New' }), routeCtx());
    expect(res.status).toBe(202);
  });

  it('returns 422 for invalid body', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createCreateHandler('items', client, mockConfig());
    const req = new Request('http://test/api/items', { method: 'POST', body: 'not-json' });
    const res = await handler(req, routeCtx());
    expect(res.status).toBe(422);
  });
});

describe('createUpdateHandler', () => {
  it('returns 200 with updated record', async () => {
    const entity = mockEntity({ update: vi.fn().mockResolvedValue({ id: 1, name: 'Updated' }) });
    const client = mockClient('items', entity);
    const handler = createUpdateHandler('items', client, mockConfig());
    const res = await handler(patchReq({ name: 'Updated' }), routeCtx({ id: '1' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: 1, name: 'Updated' });
  });

  it('passes id from params as where', async () => {
    const entity = mockEntity({ update: vi.fn().mockResolvedValue({ id: 5 }) });
    const client = mockClient('items', entity);
    const handler = createUpdateHandler('items', client, mockConfig());
    await handler(patchReq({ name: 'X' }), routeCtx({ id: '5' }));
    expect(entity.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 } }));
  });

  it('beforeUpdate hook modifies data', async () => {
    const entity = mockEntity({ update: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const handler = createUpdateHandler('items', client, mockConfig(), {
      beforeUpdate: vi.fn().mockImplementation((data) => data),
    });
    await handler(patchReq({ name: 'X' }), routeCtx({ id: '1' }));
  });

  it('beforeUpdate returning false returns 404', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createUpdateHandler('items', client, mockConfig(), {
      beforeUpdate: vi.fn().mockReturnValue(false),
    });
    const res = await handler(patchReq({ name: 'X' }), routeCtx({ id: '1' }));
    expect(res.status).toBe(404);
  });

  it('beforeUpdate returning Response is used directly', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createUpdateHandler('items', client, mockConfig(), {
      beforeUpdate: vi.fn().mockReturnValue(new Response(null, { status: 403 })),
    });
    const res = await handler(patchReq({ name: 'X' }), routeCtx({ id: '1' }));
    expect(res.status).toBe(403);
  });

  it('afterUpdate hook transforms result', async () => {
    const entity = mockEntity({ update: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const handler = createUpdateHandler('items', client, mockConfig(), {
      afterUpdate: vi.fn().mockReturnValue({ id: 1, extra: true }),
    });
    const res = await handler(patchReq({ name: 'X' }), routeCtx({ id: '1' }));
    const body = await res.json();
    expect(body.data).toEqual({ id: 1, extra: true });
  });
});

describe('createRemoveHandler', () => {
  it('returns 200 with deleted record', async () => {
    const entity = mockEntity({ delete: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const handler = createRemoveHandler('items', client, mockConfig());
    const res = await handler(deleteReq(), routeCtx({ id: '1' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: 1 });
  });

  it('passes id from params as where', async () => {
    const entity = mockEntity({ delete: vi.fn().mockResolvedValue({ id: 3 }) });
    const client = mockClient('items', entity);
    const handler = createRemoveHandler('items', client, mockConfig());
    await handler(deleteReq(), routeCtx({ id: '3' }));
    expect(entity.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3 } }));
  });

  it('beforeDelete hook modifies where', async () => {
    const entity = mockEntity({ delete: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const handler = createRemoveHandler('items', client, mockConfig(), {
      beforeDelete: vi.fn().mockImplementation((where) => where),
    });
    await handler(deleteReq(), routeCtx({ id: '1' }));
  });

  it('beforeDelete returning false returns 404', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createRemoveHandler('items', client, mockConfig(), {
      beforeDelete: vi.fn().mockReturnValue(false),
    });
    const res = await handler(deleteReq(), routeCtx({ id: '1' }));
    expect(res.status).toBe(404);
  });

  it('beforeDelete returning Response is used directly', async () => {
    const entity = mockEntity();
    const client = mockClient('items', entity);
    const handler = createRemoveHandler('items', client, mockConfig(), {
      beforeDelete: vi.fn().mockReturnValue(new Response(null, { status: 403 })),
    });
    const res = await handler(deleteReq(), routeCtx({ id: '1' }));
    expect(res.status).toBe(403);
  });

  it('afterDelete hook transforms result', async () => {
    const entity = mockEntity({ delete: vi.fn().mockResolvedValue({ id: 1 }) });
    const client = mockClient('items', entity);
    const handler = createRemoveHandler('items', client, mockConfig(), {
      afterDelete: vi.fn().mockReturnValue({ id: 1, softDeleted: true }),
    });
    const res = await handler(deleteReq(), routeCtx({ id: '1' }));
    const body = await res.json();
    expect(body.data).toEqual({ id: 1, softDeleted: true });
  });
});
