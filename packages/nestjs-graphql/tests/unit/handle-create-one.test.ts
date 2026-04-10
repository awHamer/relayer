import { describe, expect, it, vi } from 'vitest';

import { handleCreateOne } from '../../src/handlers';
import { mockCallContext, mockHooks, mockHost, mockService } from '../helpers';

describe('handleCreateOne', () => {
  it('passes data to service.create and returns created entity', async () => {
    const created = { id: 1, title: 'New' };
    const service = mockService({ create: vi.fn().mockResolvedValue(created) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleCreateOne(host, { title: 'New' }, call);
    expect(result).toBe(created);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { title: 'New' } }),
    );
  });

  it('beforeCreate hook can override payload', async () => {
    const overridden = { title: 'Modified', slug: 'modified' };
    const service = mockService({ create: vi.fn().mockResolvedValue({ id: 1, ...overridden }) });
    const beforeCreate = vi.fn().mockResolvedValue(overridden);
    const hooks = mockHooks({ beforeCreate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleCreateOne(host, { title: 'Original' }, call);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ data: overridden }));
  });

  it('uses original data when beforeCreate returns falsy', async () => {
    const service = mockService({ create: vi.fn().mockResolvedValue({ id: 1 }) });
    const beforeCreate = vi.fn().mockResolvedValue(null);
    const hooks = mockHooks({ beforeCreate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleCreateOne(host, { title: 'Original' }, call);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { title: 'Original' } }),
    );
  });

  it('uses original data when beforeCreate returns non-object', async () => {
    const service = mockService({ create: vi.fn().mockResolvedValue({ id: 1 }) });
    const beforeCreate = vi.fn().mockResolvedValue('not an object');
    const hooks = mockHooks({ beforeCreate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleCreateOne(host, { title: 'Original' }, call);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { title: 'Original' } }),
    );
  });

  it('calls afterCreate with created entity', async () => {
    const created = { id: 1, title: 'New' };
    const service = mockService({ create: vi.fn().mockResolvedValue(created) });
    const afterCreate = vi.fn();
    const hooks = mockHooks({ afterCreate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleCreateOne(host, { title: 'New' }, call);
    expect(afterCreate).toHaveBeenCalledWith(created, expect.anything());
  });

  it('works without hooks', async () => {
    const created = { id: 1, title: 'New' };
    const service = mockService({ create: vi.fn().mockResolvedValue(created) });
    const host = mockHost(service, null);
    const call = mockCallContext();

    const result = await handleCreateOne(host, { title: 'New' }, call);
    expect(result).toBe(created);
  });

  it('passes queryCtx to service', async () => {
    const queryCtx = { tenantId: 'acme' };
    const service = mockService({ create: vi.fn().mockResolvedValue({ id: 1 }) });
    const host = mockHost(service);
    host.buildQueryContext = () => queryCtx as any;
    const call = mockCallContext();

    await handleCreateOne(host, { title: 'New' }, call);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
  });
});
