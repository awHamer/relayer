import { describe, expect, it, vi } from 'vitest';

import { handleCount } from '../../src/handlers/handle-count';
import { mockCallContext, mockHooks, mockHost, mockService } from '../helpers';

describe('handleCount', () => {
  it('returns count from service', async () => {
    const service = mockService({ count: vi.fn().mockResolvedValue(42) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleCount(host, {}, call);
    expect(result).toBe(42);
  });

  it('passes where to service', async () => {
    const service = mockService({ count: vi.fn().mockResolvedValue(5) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleCount(host, { where: { published: true } }, call);
    expect(service.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('passes queryCtx to service', async () => {
    const queryCtx = { tenantId: 'acme' };
    const service = mockService({ count: vi.fn().mockResolvedValue(0) });
    const host = mockHost(service);
    host.buildQueryContext = () => queryCtx as any;
    const call = mockCallContext();

    await handleCount(host, {}, call);
    expect(service.count).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
  });

  it('calls beforeCount hook', async () => {
    const service = mockService({ count: vi.fn().mockResolvedValue(0) });
    const beforeCount = vi.fn();
    const hooks = mockHooks({ beforeCount });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleCount(host, {}, call);
    expect(beforeCount).toHaveBeenCalledTimes(1);
  });

  it('works without hooks', async () => {
    const service = mockService({ count: vi.fn().mockResolvedValue(10) });
    const host = mockHost(service, null);
    const call = mockCallContext();

    const result = await handleCount(host, {}, call);
    expect(result).toBe(10);
  });
});
