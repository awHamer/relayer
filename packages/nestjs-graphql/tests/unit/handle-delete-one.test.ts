import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { handleDeleteOne } from '../../src/handlers/handle-delete-one';
import { mockCallContext, mockEntityMeta, mockHooks, mockHost, mockService } from '../helpers';

describe('handleDeleteOne', () => {
  it('returns deleted entity', async () => {
    const deleted = { id: 1, title: 'Gone' };
    const service = mockService({ delete: vi.fn().mockResolvedValue(deleted) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleDeleteOne(host, 1, call);
    expect(result).toBe(deleted);
  });

  it('passes where with primary key to service', async () => {
    const service = mockService({ delete: vi.fn().mockResolvedValue({ id: 1 }) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleDeleteOne(host, 1, call);
    expect(service.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });

  it('uses custom primary key field', async () => {
    const service = mockService({ delete: vi.fn().mockResolvedValue({ uuid: 'abc' }) });
    const host = mockHost(service);
    const call = mockCallContext({
      entity: mockEntityMeta({ primaryKeyField: { name: 'uuid' } }),
    });

    await handleDeleteOne(host, 'abc', call);
    expect(service.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uuid: 'abc' } }),
    );
  });

  it('throws NotFoundException when service returns null', async () => {
    const service = mockService({ delete: vi.fn().mockResolvedValue(null) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleDeleteOne(host, 999, call)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when service returns falsy', async () => {
    const service = mockService({ delete: vi.fn().mockResolvedValue(undefined) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleDeleteOne(host, 1, call)).rejects.toThrow(NotFoundException);
  });

  it('wraps "not found" service error in NotFoundException', async () => {
    const service = mockService({
      delete: vi.fn().mockRejectedValue(new Error('Record not found')),
    });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleDeleteOne(host, 1, call)).rejects.toThrow(NotFoundException);
  });

  it('rethrows non-"not found" errors as-is', async () => {
    const err = new Error('Constraint violation');
    const service = mockService({ delete: vi.fn().mockRejectedValue(err) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleDeleteOne(host, 1, call)).rejects.toThrow('Constraint violation');
  });

  it('rethrows NotFoundException from service as-is', async () => {
    const err = new NotFoundException('Already NestJS error');
    const service = mockService({ delete: vi.fn().mockRejectedValue(err) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleDeleteOne(host, 1, call)).rejects.toThrow(NotFoundException);
  });

  it('calls beforeDelete hook with where', async () => {
    const service = mockService({ delete: vi.fn().mockResolvedValue({ id: 1 }) });
    const beforeDelete = vi.fn();
    const hooks = mockHooks({ beforeDelete });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleDeleteOne(host, 1, call);
    expect(beforeDelete).toHaveBeenCalledWith({ id: 1 }, expect.anything());
  });

  it('calls afterDelete with deleted entity', async () => {
    const deleted = { id: 1, title: 'Gone' };
    const service = mockService({ delete: vi.fn().mockResolvedValue(deleted) });
    const afterDelete = vi.fn();
    const hooks = mockHooks({ afterDelete });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleDeleteOne(host, 1, call);
    expect(afterDelete).toHaveBeenCalledWith(deleted, expect.anything());
  });

  it('afterDelete is not called when entity not found', async () => {
    const service = mockService({ delete: vi.fn().mockResolvedValue(null) });
    const afterDelete = vi.fn();
    const hooks = mockHooks({ afterDelete });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await expect(handleDeleteOne(host, 1, call)).rejects.toThrow(NotFoundException);
    expect(afterDelete).not.toHaveBeenCalled();
  });

  it('passes queryCtx to service', async () => {
    const queryCtx = { tenantId: 'acme' };
    const service = mockService({ delete: vi.fn().mockResolvedValue({ id: 1 }) });
    const host = mockHost(service);
    host.buildQueryContext = () => queryCtx as any;
    const call = mockCallContext();

    await handleDeleteOne(host, 1, call);
    expect(service.delete).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
  });
});
