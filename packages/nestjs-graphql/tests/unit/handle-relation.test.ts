import { describe, expect, it, vi } from 'vitest';

import { handleRelation } from '../../src/handlers';
import { mockCallContext, mockEntityMeta, mockHooks, mockHost, mockService } from '../helpers';

describe('handleRelation', () => {
  describe('operation mapping', () => {
    it('add (connect) with { _id } items calls service.update with connect structure', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      await handleRelation(host, 'connect', 1, [{ _id: 5 }, { _id: 6 }], 'tags', call);
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { tags: { connect: [{ _id: 5 }, { _id: 6 }] } },
        }),
      );
    });

    it('remove (disconnect) calls service.update with disconnect structure', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      await handleRelation(host, 'disconnect', 1, [{ _id: 3 }], 'tags', call);
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { tags: { disconnect: [{ _id: 3 }] } },
        }),
      );
    });

    it('set calls service.update with set structure', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      await handleRelation(host, 'set', 1, [{ _id: 10 }, { _id: 20 }], 'categories', call);
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { categories: { set: [{ _id: 10 }, { _id: 20 }] } },
        }),
      );
    });

    it('forwards extra pivot columns alongside _id', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      await handleRelation(
        host,
        'connect',
        1,
        [
          { _id: 5, isPrimary: true },
          { _id: 6, isPrimary: false },
        ],
        'postCategories',
        call,
      );
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: {
            postCategories: {
              connect: [
                { _id: 5, isPrimary: true },
                { _id: 6, isPrimary: false },
              ],
            },
          },
        }),
      );
    });

    it('forwards multiple extra columns', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      await handleRelation(
        host,
        'connect',
        1,
        [{ _id: 5, isPrimary: true, order: 1, note: 'pinned' }],
        'postCategories',
        call,
      );
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            postCategories: {
              connect: [{ _id: 5, isPrimary: true, order: 1, note: 'pinned' }],
            },
          },
        }),
      );
    });
  });

  describe('return value', () => {
    it('returns { success: true }', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      const result = await handleRelation(host, 'connect', 1, [{ _id: 5 }], 'tags', call);
      expect(result).toEqual({ success: true });
    });
  });

  describe('primary key resolution', () => {
    it('uses entity primary key field', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext({
        entity: mockEntityMeta({ primaryKeyField: { name: 'uuid' } }),
      });

      await handleRelation(host, 'connect', 'abc-123', [{ _id: 1 }], 'tags', call);
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { uuid: 'abc-123' } }),
      );
    });

    it('falls back to "id" when no primary key defined', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext({
        entity: mockEntityMeta({ primaryKeyField: null }),
      });

      await handleRelation(host, 'connect', 1, [{ _id: 5 }], 'tags', call);
      expect(service.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
    });
  });

  describe('context', () => {
    it('passes queryCtx to service', async () => {
      const queryCtx = { tenantId: 'acme' };
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      host.buildQueryContext = () => queryCtx as any;
      const call = mockCallContext();

      await handleRelation(host, 'connect', 1, [{ _id: 5 }], 'tags', call);
      expect(service.update).toHaveBeenCalledWith(expect.objectContaining({ context: queryCtx }));
    });
  });

  describe('hooks', () => {
    it('calls beforeRelation with operation, relationName, items, ctx', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const beforeRelation = vi.fn();
      const hooks = mockHooks({ beforeRelation });
      const host = mockHost(service, hooks);
      const call = mockCallContext();

      const items = [{ _id: 5 }, { _id: 6 }];
      await handleRelation(host, 'connect', 1, items, 'tags', call);
      expect(beforeRelation).toHaveBeenCalledWith('connect', 'tags', items, expect.anything());
    });

    it('beforeRelation can modify items array', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const modified = [{ _id: 99 }, { _id: 100 }];
      const beforeRelation = vi.fn().mockReturnValue(modified);
      const hooks = mockHooks({ beforeRelation });
      const host = mockHost(service, hooks);
      const call = mockCallContext();

      await handleRelation(host, 'connect', 1, [{ _id: 5 }, { _id: 6 }], 'tags', call);
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tags: { connect: modified } },
        }),
      );
    });

    it('uses original items when beforeRelation returns undefined', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const beforeRelation = vi.fn().mockReturnValue(undefined);
      const hooks = mockHooks({ beforeRelation });
      const host = mockHost(service, hooks);
      const call = mockCallContext();

      const items = [{ _id: 5 }, { _id: 6 }];
      await handleRelation(host, 'connect', 1, items, 'tags', call);
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tags: { connect: items } },
        }),
      );
    });

    it('calls afterRelation after service.update', async () => {
      const callOrder: string[] = [];
      const service = mockService({
        update: vi.fn().mockImplementation(() => {
          callOrder.push('update');
          return Promise.resolve({});
        }),
      });
      const afterRelation = vi.fn().mockImplementation(() => callOrder.push('afterRelation'));
      const hooks = mockHooks({ afterRelation });
      const host = mockHost(service, hooks);
      const call = mockCallContext();

      const items = [{ _id: 5 }];
      await handleRelation(host, 'connect', 1, items, 'tags', call);
      expect(callOrder).toEqual(['update', 'afterRelation']);
      expect(afterRelation).toHaveBeenCalledWith('connect', 'tags', items, expect.anything());
    });

    it('afterRelation is not called when service throws', async () => {
      const service = mockService({
        update: vi.fn().mockRejectedValue(new Error('DB error')),
      });
      const afterRelation = vi.fn();
      const hooks = mockHooks({ afterRelation });
      const host = mockHost(service, hooks);
      const call = mockCallContext();

      await expect(handleRelation(host, 'connect', 1, [{ _id: 5 }], 'tags', call)).rejects.toThrow(
        'DB error',
      );
      expect(afterRelation).not.toHaveBeenCalled();
    });

    it('works without hooks', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service, null);
      const call = mockCallContext();

      const result = await handleRelation(host, 'connect', 1, [{ _id: 5 }], 'tags', call);
      expect(result).toEqual({ success: true });
    });
  });

  describe('edge cases', () => {
    it('string IDs work (UUID support)', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      await handleRelation(
        host,
        'connect',
        'parent-uuid',
        [{ _id: 'child-uuid-1' }, { _id: 'child-uuid-2' }],
        'tags',
        call,
      );
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'parent-uuid' },
          data: { tags: { connect: [{ _id: 'child-uuid-1' }, { _id: 'child-uuid-2' }] } },
        }),
      );
    });

    it('empty ids array is valid', async () => {
      const service = mockService({ update: vi.fn().mockResolvedValue({}) });
      const host = mockHost(service);
      const call = mockCallContext();

      const result = await handleRelation(host, 'set', 1, [], 'tags', call);
      expect(result).toEqual({ success: true });
      expect(service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { tags: { set: [] } },
        }),
      );
    });
  });
});
