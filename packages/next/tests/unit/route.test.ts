import { describe, expect, it, vi } from 'vitest';

import { createRelayerRoute } from '../../src/route';
import { mockClient, mockEntity } from '../helpers';

function makeClient() {
  const entity = mockEntity({
    findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
    count: vi.fn().mockResolvedValue(1),
  });
  return { entity, client: mockClient('items', entity) };
}

describe('createRelayerRoute', () => {
  it('throws on invalid entity name', () => {
    const { client } = makeClient();
    expect(() => createRelayerRoute(client, 'nonexistent' as never)).toThrow(
      'Entity "nonexistent" not found',
    );
  });

  it('list() returns a callable handler', async () => {
    const { client } = makeClient();
    const route = createRelayerRoute(client, 'items' as never);
    const handler = route.list();
    const res = await handler(new Request('http://test/api/items'), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([{ id: 1 }]);
  });

  it('findById() returns a callable handler', async () => {
    const { client, entity } = makeClient();
    (entity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const route = createRelayerRoute(client, 'items' as never);
    const handler = route.findById();
    const res = await handler(new Request('http://test/api/items/1'), {
      params: Promise.resolve({ id: '1' }),
    });
    expect(res.status).toBe(200);
  });

  it('create() returns a callable handler', async () => {
    const { client, entity } = makeClient();
    (entity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const route = createRelayerRoute(client, 'items' as never);
    const handler = route.create();
    const res = await handler(
      new Request('http://test/api/items', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
  });

  it('handlers() returns GET and POST', () => {
    const { client } = makeClient();
    const route = createRelayerRoute(client, 'items' as never);
    const { GET, POST } = route.handlers();
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
  });

  it('detailHandlers() returns GET, PATCH, DELETE', () => {
    const { client } = makeClient();
    const route = createRelayerRoute(client, 'items' as never);
    const { GET, PATCH, DELETE } = route.detailHandlers();
    expect(typeof GET).toBe('function');
    expect(typeof PATCH).toBe('function');
    expect(typeof DELETE).toBe('function');
  });

  it('countHandlers() returns GET', () => {
    const { client } = makeClient();
    const route = createRelayerRoute(client, 'items' as never);
    const { GET } = route.countHandlers();
    expect(typeof GET).toBe('function');
  });

  it('aggregateHandlers() returns GET', () => {
    const { client } = makeClient();
    const route = createRelayerRoute(client, 'items' as never);
    const { GET } = route.aggregateHandlers();
    expect(typeof GET).toBe('function');
  });
});
