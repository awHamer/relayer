import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { handleUpdateOne } from '../../src/handlers/handle-update-one';
import { mockCallContext, mockEntityMeta, mockHooks, mockHost, mockService } from '../helpers';

describe('handleUpdateOne', () => {
  it('returns updated entity', async () => {
    const updated = { id: 1, title: 'Updated' };
    const service = mockService({ update: vi.fn().mockResolvedValue(updated) });
    const host = mockHost(service);
    const call = mockCallContext();

    const result = await handleUpdateOne(host, 1, { title: 'Updated' }, call);
    expect(result).toBe(updated);
  });

  it('passes where with primary key and data to service', async () => {
    const service = mockService({ update: vi.fn().mockResolvedValue({ id: 1 }) });
    const host = mockHost(service);
    const call = mockCallContext();

    await handleUpdateOne(host, 1, { title: 'Updated' }, call);
    expect(service.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { title: 'Updated' },
      }),
    );
  });

  it('uses custom primary key field', async () => {
    const service = mockService({ update: vi.fn().mockResolvedValue({ uuid: 'abc' }) });
    const host = mockHost(service);
    const call = mockCallContext({
      entity: mockEntityMeta({ primaryKeyField: { name: 'uuid' } }),
    });

    await handleUpdateOne(host, 'abc', { title: 'Updated' }, call);
    expect(service.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uuid: 'abc' } }),
    );
  });

  it('throws NotFoundException when service returns null', async () => {
    const service = mockService({ update: vi.fn().mockResolvedValue(null) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 999, { title: 'X' }, call)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when service returns falsy', async () => {
    const service = mockService({ update: vi.fn().mockResolvedValue(undefined) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 1, { title: 'X' }, call)).rejects.toThrow(NotFoundException);
  });

  it('wraps "not found" service error in NotFoundException', async () => {
    const service = mockService({
      update: vi.fn().mockRejectedValue(new Error('Record not found')),
    });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 1, { title: 'X' }, call)).rejects.toThrow(NotFoundException);
  });

  it('wraps "Not Found" (case variation) in NotFoundException', async () => {
    const service = mockService({
      update: vi.fn().mockRejectedValue(new Error('Entity Not Found in database')),
    });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 1, {}, call)).rejects.toThrow(NotFoundException);
  });

  it('rethrows non-"not found" errors as-is', async () => {
    const err = new Error('Connection refused');
    const service = mockService({ update: vi.fn().mockRejectedValue(err) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 1, {}, call)).rejects.toThrow('Connection refused');
  });

  it('rethrows NotFoundException from service as-is', async () => {
    const err = new NotFoundException('Already a NestJS error');
    const service = mockService({ update: vi.fn().mockRejectedValue(err) });
    const host = mockHost(service);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 1, {}, call)).rejects.toThrow(NotFoundException);
  });

  it('beforeUpdate hook can override payload', async () => {
    const overridden = { title: 'Hooked', slug: 'hooked' };
    const service = mockService({ update: vi.fn().mockResolvedValue({ id: 1, ...overridden }) });
    const beforeUpdate = vi.fn().mockResolvedValue(overridden);
    const hooks = mockHooks({ beforeUpdate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleUpdateOne(host, 1, { title: 'Original' }, call);
    expect(service.update).toHaveBeenCalledWith(expect.objectContaining({ data: overridden }));
  });

  it('beforeUpdate receives both data and where', async () => {
    const service = mockService({ update: vi.fn().mockResolvedValue({ id: 1 }) });
    const beforeUpdate = vi.fn();
    const hooks = mockHooks({ beforeUpdate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleUpdateOne(host, 1, { title: 'X' }, call);
    expect(beforeUpdate).toHaveBeenCalledWith({ title: 'X' }, { id: 1 }, expect.anything());
  });

  it('afterUpdate called on success', async () => {
    const updated = { id: 1, title: 'Updated' };
    const service = mockService({ update: vi.fn().mockResolvedValue(updated) });
    const afterUpdate = vi.fn();
    const hooks = mockHooks({ afterUpdate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await handleUpdateOne(host, 1, { title: 'Updated' }, call);
    expect(afterUpdate).toHaveBeenCalledWith(updated, expect.anything());
  });

  it('afterUpdate is not called when entity not found', async () => {
    const service = mockService({ update: vi.fn().mockResolvedValue(null) });
    const afterUpdate = vi.fn();
    const hooks = mockHooks({ afterUpdate });
    const host = mockHost(service, hooks);
    const call = mockCallContext();

    await expect(handleUpdateOne(host, 1, {}, call)).rejects.toThrow(NotFoundException);
    expect(afterUpdate).not.toHaveBeenCalled();
  });
});
