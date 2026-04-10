import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { handleFindById } from '../../src/handlers/handle-find-by-id';
import { mockCallContext, mockEntityMeta, mockHooks, mockHost, mockService } from '../helpers';

describe('handleFindById', () => {
  it('returns entity when found', async () => {
    const entity = { id: 1, title: 'Hello' };
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(entity) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleFindById(host, 1, call);
    expect(result).toBe(entity);
  });

  it('throws NotFoundException when entity is null', async () => {
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(null) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleFindById(host, 1, call)).rejects.toThrow(NotFoundException);
  });

  it('uses entity primary key field for where clause', async () => {
    const entity = { uuid: 'abc', title: 'Hello' };
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(entity) });
    const host = mockHost(service);
    const call = mockCallContext({
      entity: mockEntityMeta({ primaryKeyField: { name: 'uuid' } }),
    });

    await handleFindById(host, 'abc', call);
    expect(service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uuid: 'abc' } }),
    );
  });

  it('falls back to "id" when no primary key defined', async () => {
    const service = mockService({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const host = mockHost(service);
    const call = mockCallContext({
      entity: mockEntityMeta({ primaryKeyField: null }),
    });

    await handleFindById(host, 1, call);
    expect(service.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });

  it('calls beforeFindOne hook', async () => {
    const service = mockService({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const beforeFindOne = vi.fn();
    const hooks = mockHooks({ beforeFindOne });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleFindById(host, 1, call);
    expect(beforeFindOne).toHaveBeenCalledTimes(1);
  });

  it('calls afterFindOne hook with found entity', async () => {
    const entity = { id: 1, title: 'Hello' };
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(entity) });
    const afterFindOne = vi.fn();
    const hooks = mockHooks({ afterFindOne });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleFindById(host, 1, call);
    expect(afterFindOne).toHaveBeenCalledWith(entity, expect.anything());
  });

  it('uses afterFindOne return value when provided', async () => {
    const original = { id: 1, title: 'Hello' };
    const transformed = { id: 1, title: 'Hello', extra: true };
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(original) });
    const afterFindOne = vi.fn().mockResolvedValue(transformed);
    const hooks = mockHooks({ afterFindOne });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleFindById(host, 1, call);
    expect(result).toBe(transformed);
  });

  it('uses original entity when afterFindOne returns undefined', async () => {
    const entity = { id: 1, title: 'Hello' };
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(entity) });
    const afterFindOne = vi.fn().mockResolvedValue(undefined);
    const hooks = mockHooks({ afterFindOne });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    const result = await handleFindById(host, 1, call);
    expect(result).toBe(entity);
  });

  it('works without hooks', async () => {
    const entity = { id: 1, title: 'Hello' };
    const service = mockService({ findFirst: vi.fn().mockResolvedValue(entity) });
    const host = mockHost(service, null);
    const call = mockCallContext();

    const result = await handleFindById(host, 1, call);
    expect(result).toBe(entity);
  });

  it('passes queryCtx to service', async () => {
    const service = mockService({ findFirst: vi.fn().mockResolvedValue({ id: 1 }) });
    const queryCtx = { tenantId: 'acme' };
    const host = mockHost(service);
    host.buildQueryContext = () => queryCtx as any;
    const call = mockCallContext();

    await handleFindById(host, 1, call);
    expect(service.findFirst).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
  });
});
