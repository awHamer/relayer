import 'reflect-metadata';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../src';
import {
  CrudController,
  DtoMapper,
  RelayerController,
  RelayerHooks,
  RelayerService,
} from '../../src';
import { CRUD_CONTROLLER_METADATA } from '../../src/constants';
import { mockEntityClient, TestEntity } from '../helpers';

function createController<T extends RelayerController<any, Record<string, unknown>>>(
  Ctrl: new (service: RelayerService<any, Record<string, unknown>>) => T,
  client: unknown,
  baseUrl = 'http://test',
): T {
  const r = { tests: client } as any;
  const service = new RelayerService<any, Record<string, unknown>>(r, 'tests');
  const ctrl = new Ctrl(service);
  (ctrl as any).baseUrlConfig = baseUrl;
  (ctrl as any).moduleRef = {
    get: () => {
      throw new Error('not found');
    },
  };
  return ctrl;
}

function req(query: Record<string, string> = {}) {
  return { query, path: '/tests', url: '/tests' };
}

// Test controller exposing protected methods
@CrudController({
  model: TestEntity as any,
  routes: {
    list: {
      defaultLimit: 20,
      maxLimit: 50,
      defaults: {
        orderBy: { field: 'id', order: 'desc' },
      } as any,
    },
    findById: true,
    create: true,
    update: true,
    delete: true,
    count: true,
    aggregate: true,
  },
})
class TestController extends RelayerController<any, Record<string, unknown>> {
  constructor(service: RelayerService<any, Record<string, unknown>>) {
    super(service);
  }
  list(r: any) {
    return this.handleList(r);
  }
  findOne(id: string, r: unknown) {
    return this.handleFindById(id, r);
  }
  doCreate(body: any, r: unknown) {
    return this.handleCreate(body, r);
  }
  doUpdate(id: string, body: any, r: unknown) {
    return this.handleUpdate(id, body, r);
  }
  doDelete(id: string, r: unknown) {
    return this.handleDelete(id, r);
  }
  doCount(r: any) {
    return this.handleCount(r);
  }
  doAggregate(r: any) {
    return this.handleAggregate(r);
  }
}

describe('RelayerController', () => {
  let controller: TestController;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      findFirst: vi.fn().mockResolvedValue({ id: 1, title: 'Test' }),
      count: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockResolvedValue({ id: 3, title: 'New' }),
      update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    });
    controller = createController(TestController, client);
  });

  describe('handleList (offset)', () => {
    it('returns exact response shape with data and meta', async () => {
      const result = (await controller.list(req())) as any;
      expect(Object.keys(result).sort()).toEqual(['data', 'meta']);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.meta).toEqual({ total: 2, limit: 20, offset: 0 });
    });

    it('uses defaultLimit from config', async () => {
      await controller.list(req());
      expect(client.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
    });

    it('caps limit at maxLimit', async () => {
      await controller.list(req({ limit: '999' }));
      expect(client.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    });

    it('applies user limit when within maxLimit', async () => {
      await controller.list(req({ limit: '5' }));
      expect(client.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
    });

    it('applies defaults.orderBy when none in query', async () => {
      await controller.list(req());
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { field: 'id', order: 'desc' } }),
      );
    });

    it('uses query orderBy over defaults', async () => {
      await controller.list(req({ orderBy: '{"field":"title","order":"asc"}' }));
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { field: 'title', order: 'asc' } }),
      );
    });

    it('applies offset from query', async () => {
      await controller.list(req({ offset: '10' }));
      expect(client.findMany).toHaveBeenCalledWith(expect.objectContaining({ offset: 10 }));
    });

    it('generates nextPageUrl in meta when more results', async () => {
      (client.count as any).mockResolvedValue(100);
      const result = (await controller.list(req())) as any;
      expect(result.meta.nextPageUrl).toContain('offset=20');
      expect(result.meta.nextPageUrl).toContain('limit=20');
      expect(Object.keys(result.meta).sort()).toEqual(
        ['limit', 'nextPageUrl', 'offset', 'total'].sort(),
      );
    });

    it('no nextPageUrl in meta when at end', async () => {
      (client.count as any).mockResolvedValue(2);
      const result = (await controller.list(req())) as any;
      expect(result.meta).toEqual({ total: 2, limit: 20, offset: 0 });
    });

    it('applies where from query', async () => {
      await controller.list(req({ where: '{"published":true}' }));
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } }),
      );
    });

    it('applies select from query', async () => {
      await controller.list(req({ select: '{"id":true,"title":true}' }));
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, title: true } }),
      );
    });

    it('count receives where condition', async () => {
      await controller.list(req({ where: '{"published":true}' }));
      expect(client.count).toHaveBeenCalledWith({ where: { published: true } });
    });
  });

  describe('handleFindById', () => {
    it('returns exact { data } shape for found entity', async () => {
      const result = (await controller.findOne('1', {})) as any;
      expect(Object.keys(result)).toEqual(['data']);
      expect(result.data).toEqual({ id: 1, title: 'Test' });
      expect(typeof result.data.id).toBe('number');
      expect(typeof result.data.title).toBe('string');
    });

    it('throws NotFoundException when not found', async () => {
      (client.findFirst as any).mockResolvedValue(null);
      await expect(controller.findOne('9999', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for out-of-range numeric id', async () => {
      await expect(controller.findOne('9999999999', {})).rejects.toThrow(BadRequestException);
    });

    it('parses numeric id by default', async () => {
      await controller.findOne('42', {});
      expect(client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
    });
  });

  describe('handleCreate', () => {
    it('returns exact { data } shape with created entity', async () => {
      const result = (await controller.doCreate({ title: 'New' }, {})) as any;
      expect(Object.keys(result)).toEqual(['data']);
      expect(result.data).toEqual({ id: 3, title: 'New' });
    });

    it('passes data to service.create', async () => {
      await controller.doCreate({ title: 'New' }, {});
      expect(client.create).toHaveBeenCalledWith({ data: { title: 'New' } });
    });
  });

  describe('handleUpdate', () => {
    it('returns exact { data } shape with updated entity', async () => {
      const result = (await controller.doUpdate('1', { title: 'Updated' }, {})) as any;
      expect(Object.keys(result)).toEqual(['data']);
      expect(result.data).toEqual({ id: 1, title: 'Updated' });
    });

    it('passes parsed id as where', async () => {
      await controller.doUpdate('5', { title: 'X' }, {});
      expect(client.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { title: 'X' },
      });
    });

    it('throws NotFoundException when entity not found', async () => {
      (client.update as any).mockResolvedValue(null);
      await expect(controller.doUpdate('9999', { title: 'X' }, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException for out-of-range numeric id', async () => {
      await expect(controller.doUpdate('9999999999', { title: 'X' }, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleDelete', () => {
    it('returns exact { data } shape with deleted entity', async () => {
      const result = (await controller.doDelete('1', {})) as any;
      expect(Object.keys(result)).toEqual(['data']);
      expect(result.data).toEqual({ id: 1 });
    });

    it('throws NotFoundException when entity not found', async () => {
      (client.delete as any).mockResolvedValue(null);
      await expect(controller.doDelete('9999', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for out-of-range numeric id', async () => {
      await expect(controller.doDelete('9999999999', {})).rejects.toThrow(BadRequestException);
    });

    it('passes parsed id as where', async () => {
      await controller.doDelete('3', {});
      expect(client.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    });
  });

  describe('handleCount', () => {
    it('returns exact { data: { count } } shape with number type', async () => {
      const result = (await controller.doCount(req())) as any;
      expect(Object.keys(result)).toEqual(['data']);
      expect(result.data).toEqual({ count: 2 });
      expect(typeof result.data.count).toBe('number');
    });

    it('applies where from query', async () => {
      await controller.doCount(req({ where: '{"published":true}' }));
      expect(client.count).toHaveBeenCalledWith({ where: { published: true } });
    });
  });
});

describe('RelayerController with hooks', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;
  let hookSpies: {
    beforeFind: ReturnType<typeof vi.fn>;
    afterFind: ReturnType<typeof vi.fn>;
    beforeFindOne: ReturnType<typeof vi.fn>;
    afterFindOne: ReturnType<typeof vi.fn>;
    beforeCreate: ReturnType<typeof vi.fn>;
    afterCreate: ReturnType<typeof vi.fn>;
    beforeUpdate: ReturnType<typeof vi.fn>;
    afterUpdate: ReturnType<typeof vi.fn>;
    beforeDelete: ReturnType<typeof vi.fn>;
    afterDelete: ReturnType<typeof vi.fn>;
    beforeCount: ReturnType<typeof vi.fn>;
    beforeAggregate: ReturnType<typeof vi.fn>;
    afterAggregate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
    });

    hookSpies = {
      beforeFind: vi.fn(),
      afterFind: vi.fn(),
      beforeFindOne: vi.fn(),
      afterFindOne: vi.fn(),
      beforeCreate: vi.fn(),
      afterCreate: vi.fn(),
      beforeUpdate: vi.fn(),
      afterUpdate: vi.fn(),
      beforeDelete: vi.fn(),
      afterDelete: vi.fn(),
      beforeCount: vi.fn(),
      beforeAggregate: vi.fn(),
      afterAggregate: vi.fn(),
    };

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: true,
        findById: true,
        create: true,
        update: true,
        delete: true,
        count: true,
        aggregate: true,
      },
    })
    class HookedController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
      findOne(id: string, r: unknown) {
        return this.handleFindById(id, r);
      }
      doCreate(body: any, r: unknown) {
        return this.handleCreate(body, r);
      }
      doUpdate(id: string, body: any, r: unknown) {
        return this.handleUpdate(id, body, r);
      }
      doDelete(id: string, r: unknown) {
        return this.handleDelete(id, r);
      }
      doCount(r: any) {
        return this.handleCount(r);
      }
      doAggregate(r: any) {
        return this.handleAggregate(r);
      }
    }

    controller = createController(HookedController, client, '');
    (controller as any).resolvedHooks = hookSpies;
    (controller as any).hooksResolved = true;
  });

  it('calls beforeFind on list', async () => {
    await controller.list(req());
    expect(hookSpies.beforeFind).toHaveBeenCalled();
  });

  it('calls beforeCreate and afterCreate', async () => {
    await controller.doCreate({ title: 'Test' }, {});
    expect(hookSpies.beforeCreate).toHaveBeenCalled();
    expect(hookSpies.afterCreate).toHaveBeenCalled();
  });

  it('beforeCreate modified data is used', async () => {
    hookSpies.beforeCreate.mockReturnValue({ title: 'Modified', slug: 'modified' });
    await controller.doCreate({ title: 'Original' }, {});
    expect(client.create).toHaveBeenCalledWith({
      data: { title: 'Modified', slug: 'modified' },
    });
  });

  it('calls beforeUpdate and afterUpdate', async () => {
    await controller.doUpdate('1', { title: 'X' }, {});
    expect(hookSpies.beforeUpdate).toHaveBeenCalled();
    expect(hookSpies.afterUpdate).toHaveBeenCalled();
  });

  it('calls beforeDelete and afterDelete', async () => {
    await controller.doDelete('1', {});
    expect(hookSpies.beforeDelete).toHaveBeenCalled();
    expect(hookSpies.afterDelete).toHaveBeenCalled();
  });

  it('calls afterFind with list results', async () => {
    await controller.list(req());
    expect(hookSpies.afterFind).toHaveBeenCalledWith([{ id: 1 }], expect.anything());
  });

  it('afterFind replaces list data', async () => {
    hookSpies.afterFind.mockReturnValue([{ id: 1, extra: true }]);
    const result = (await controller.list(req())) as any;
    expect(result.data).toEqual([{ id: 1, extra: true }]);
  });

  it('afterFind void keeps original data', async () => {
    hookSpies.afterFind.mockReturnValue(undefined);
    const result = (await controller.list(req())) as any;
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('calls beforeFindOne with options', async () => {
    await controller.findOne('1', {});
    expect(hookSpies.beforeFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
      expect.anything(),
    );
  });

  it('afterFindOne replaces entity', async () => {
    hookSpies.afterFindOne.mockReturnValue({ id: 1, enriched: true });
    const result = (await controller.findOne('1', {})) as any;
    expect(result.data).toEqual({ id: 1, enriched: true });
  });

  it('calls beforeCount with options', async () => {
    await controller.doCount(req({ where: '{"published":true}' }));
    expect(hookSpies.beforeCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
      expect.anything(),
    );
  });

  it('calls beforeAggregate with options', async () => {
    await controller.doAggregate(req({ _count: 'true' }));
    expect(hookSpies.beforeAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ _count: true }),
      expect.anything(),
    );
  });

  it('afterAggregate replaces result', async () => {
    (client.aggregate as any).mockResolvedValue({ _count: 10 });
    hookSpies.afterAggregate.mockReturnValue({ _count: 10, enriched: true });
    const result = (await controller.doAggregate(req({ _count: 'true' }))) as any;
    expect(result.data).toEqual({ _count: 10, enriched: true });
  });

  it('afterAggregate void keeps original result', async () => {
    (client.aggregate as any).mockResolvedValue({ _count: 10 });
    hookSpies.afterAggregate.mockReturnValue(undefined);
    const result = (await controller.doAggregate(req({ _count: 'true' }))) as any;
    expect(result.data).toEqual({ _count: 10 });
  });
});

describe('RelayerController with dtoMapper', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;
  let mapperSpies: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1, title: 'Raw' }]),
      findFirst: vi.fn().mockResolvedValue({ id: 1, title: 'Raw' }),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({ id: 1, title: 'Created' }),
      update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
    });

    mapperSpies = {
      toListItem: vi.fn((entity) => ({ ...entity, mapped: true })),
      toSingleItem: vi.fn((entity) => ({ ...entity, detailed: true })),
      toCreateInput: vi.fn((data) => ({ ...data, authorId: 99 })),
      toUpdateInput: vi.fn((data) => ({ ...data, updatedBy: 99 })),
    };

    @CrudController({
      model: TestEntity as any,
      routes: { list: true, findById: true, create: true, update: true },
    })
    class MappedController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
      findOne(id: string, r: unknown) {
        return this.handleFindById(id, r);
      }
      doCreate(body: any, r: unknown) {
        return this.handleCreate(body, r);
      }
      doUpdate(id: string, body: any, r: unknown) {
        return this.handleUpdate(id, body, r);
      }
    }

    controller = createController(MappedController, client, '');
    (controller as any).resolvedDtoMapper = mapperSpies;
    (controller as any).dtoMapperResolved = true;
  });

  it('toListItem transforms list results', async () => {
    const result = (await controller.list(req())) as any;
    expect(result.data).toEqual([{ id: 1, title: 'Raw', mapped: true }]);
    expect(mapperSpies.toListItem).toHaveBeenCalled();
  });

  it('toResponse transforms findById result', async () => {
    const result = (await controller.findOne('1', {})) as any;
    expect(result.data).toEqual({ id: 1, title: 'Raw', detailed: true });
    expect(mapperSpies.toSingleItem).toHaveBeenCalled();
  });

  it('toCreateInput transforms create data', async () => {
    await controller.doCreate({ title: 'New' }, {});
    expect(client.create).toHaveBeenCalledWith({
      data: { title: 'New', authorId: 99 },
    });
  });

  it('toUpdateInput transforms update data', async () => {
    await controller.doUpdate('1', { title: 'X' }, {});
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'X', updatedBy: 99 },
    });
  });
});

describe('RelayerController with search', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
      count: vi.fn().mockResolvedValue(1),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: {
          search: (q: string) => ({
            OR: [{ title: { contains: q } }, { content: { contains: q } }],
          }),
        },
        count: true,
      },
    })
    class SearchController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
      doCount(r: any) {
        return this.handleCount(r);
      }
    }

    controller = createController(SearchController, client);
  });

  it('applies search fn and merges with where via AND', async () => {
    await controller.list(req({ search: 'hello', where: '{"published":true}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { published: true },
            { OR: [{ title: { contains: 'hello' } }, { content: { contains: 'hello' } }] },
          ],
        },
      }),
    );
  });

  it('applies search fn without existing where', async () => {
    await controller.list(req({ search: 'hello' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ title: { contains: 'hello' } }, { content: { contains: 'hello' } }] },
      }),
    );
  });

  it('ignores empty search string', async () => {
    await controller.list(req({ search: '  ' }));
    const callArgs = (client.findMany as any).mock.calls[0][0];
    expect(callArgs.where).toBeUndefined();
  });

  it('search preserved in nextPageUrl', async () => {
    (client.count as any).mockResolvedValue(100);
    const result = (await controller.list(req({ search: 'hello' }))) as any;
    expect(result.meta.nextPageUrl).toContain('search=hello');
  });

  it('search applied to count', async () => {
    await controller.doCount(req({ search: 'hello' }));
    expect(client.count).toHaveBeenCalledWith({
      where: { OR: [{ title: { contains: 'hello' } }, { content: { contains: 'hello' } }] },
    });
  });
});

describe('RelayerController with defaults.where and defaults.select', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: {
          defaults: {
            where: { published: true } as any,
            select: { id: true, title: true } as any,
          },
        },
        count: true,
      },
    })
    class DefaultsController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
      doCount(r: any) {
        return this.handleCount(r);
      }
    }

    controller = createController(DefaultsController, client, '');
  });

  it('applies defaults.where', async () => {
    await controller.list(req());
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('merges defaults.where with query where', async () => {
    await controller.list(req({ where: '{"authorId":1}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true, authorId: 1 } }),
    );
  });

  it('applies defaults.select when no query select', async () => {
    await controller.list(req());
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, title: true } }),
    );
  });

  it('query select overrides defaults.select', async () => {
    await controller.list(req({ select: '{"id":true}' }));
    expect(client.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true } }));
  });

  it('defaults.where applies to count', async () => {
    await controller.doCount(req());
    expect(client.count).toHaveBeenCalledWith({ where: { published: true } });
  });
});

describe('RelayerController cursor pagination', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]),
      count: vi.fn().mockResolvedValue(0),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: {
          pagination: 'cursor',
          defaultLimit: 2,
        },
      },
    })
    class CursorController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
    }

    controller = createController(CursorController, client);
  });

  it('returns exact response shape with hasMore=true', async () => {
    const result = (await controller.list(req())) as any;
    expect(result.data).toHaveLength(2);
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.meta.hasMore).toBe(true);
    expect(typeof result.meta.nextCursor).toBe('string');
    expect(result.meta.nextPageUrl).toContain('cursor=');
    expect(result.meta.nextPageUrl).toContain('limit=2');
    expect(result.meta.limit).toBe(2);
    expect(Object.keys(result)).toEqual(['data', 'meta']);
    expect(Object.keys(result.meta).sort()).toEqual(
      ['hasMore', 'limit', 'nextCursor', 'nextPageUrl'].sort(),
    );
  });

  it('returns exact response shape with hasMore=false', async () => {
    (client.findMany as any).mockResolvedValue([{ id: 1 }]);
    const result = (await controller.list(req())) as any;
    expect(result.meta.hasMore).toBe(false);
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta.nextCursor).toBeUndefined();
    expect(result.meta.nextPageUrl).toBeUndefined();
    expect(Object.keys(result.meta).sort()).toEqual(['hasMore', 'limit'].sort());
  });

  it('fetches limit+1 to detect hasMore', async () => {
    await controller.list(req());
    expect(client.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 3 }));
  });

  it('adds id as tiebreaker to orderBy', async () => {
    await controller.list(req({ orderBy: '{"field":"title","order":"desc"}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { field: 'title', order: 'desc' },
          { field: 'id', order: 'desc' },
        ],
      }),
    );
  });

  it('does not duplicate id if already in orderBy', async () => {
    await controller.list(req({ orderBy: '{"field":"id","order":"asc"}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { field: 'id', order: 'asc' } }),
    );
  });

  it('defaults to id asc when no orderBy', async () => {
    await controller.list(req());
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { field: 'id', order: 'asc' } }),
    );
  });

  it('adds cursor fields to select for query but strips them from response', async () => {
    (client.findMany as any).mockResolvedValue([
      { id: 1, title: 'A', createdAt: new Date('2025-01-01') },
      { id: 2, title: 'B', createdAt: new Date('2025-01-02') },
      { id: 3, title: 'C', createdAt: new Date('2025-01-03') },
    ]);
    const result = (await controller.list(
      req({
        select: '{"title":true}',
        orderBy: '{"field":"createdAt","order":"desc"}',
      }),
    )) as any;
    // Internal fields added for cursor building must be in the query
    const callArgs = (client.findMany as any).mock.calls[0][0];
    expect(callArgs.select.createdAt).toBe(true);
    expect(callArgs.select.id).toBe(true);
    // But stripped from response — only user-requested fields remain
    expect(result.data).toHaveLength(2);
    for (const item of result.data) {
      expect(Object.keys(item)).toEqual(['title']);
      expect(typeof item.title).toBe('string');
    }
    // Cursor still works despite stripping
    expect(typeof result.meta.nextCursor).toBe('string');
  });

  it('keeps user-requested cursor fields in response', async () => {
    (client.findMany as any).mockResolvedValue([
      { id: 1, title: 'A', createdAt: new Date('2025-01-01') },
      { id: 2, title: 'B', createdAt: new Date('2025-01-02') },
      { id: 3, title: 'C', createdAt: new Date('2025-01-03') },
    ]);
    const result = (await controller.list(
      req({
        select: '{"title":true,"createdAt":true,"id":true}',
        orderBy: '{"field":"createdAt","order":"desc"}',
      }),
    )) as any;
    // User explicitly requested these — they must stay
    for (const item of result.data) {
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('id');
      expect(Object.keys(item).sort()).toEqual(['createdAt', 'id', 'title']);
    }
  });

  it('does not strip fields when no select filter', async () => {
    const result = (await controller.list(req())) as any;
    // Without select, all fields are returned as-is
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('calls beforeFind hook in cursor mode', async () => {
    const hookSpies = { beforeFind: vi.fn() };
    (controller as any).resolvedHooks = hookSpies;
    (controller as any).hooksResolved = true;

    await controller.list(req());
    expect(hookSpies.beforeFind).toHaveBeenCalled();
  });

  it('applies dtoMapper.toListItem and returns mapped shape', async () => {
    const mapperSpies = {
      toListItem: vi.fn((entity: any) => ({ mappedId: entity.id })),
      toResponse: vi.fn(),
    };
    (controller as any).resolvedDtoMapper = mapperSpies;
    (controller as any).dtoMapperResolved = true;

    const result = (await controller.list(req())) as any;
    expect(mapperSpies.toListItem).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([{ mappedId: 1 }, { mappedId: 2 }]);
  });

  it('merges cursor where with existing where', async () => {
    const first = (await controller.list(req())) as any;
    const cursor = first.meta.nextCursor;

    (client.findMany as any).mockResolvedValue([{ id: 10 }]);
    await controller.list(req({ cursor, where: '{"published":true}' }));
    const callArgs = (client.findMany as any).mock.calls[1][0];
    expect(callArgs.where).toHaveProperty('AND');
    expect(callArgs.where.AND).toHaveLength(2);
    expect(callArgs.where.AND[0]).toEqual({ published: true });
  });
});

describe('RelayerController enforceAllowSelectLimits', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: {
          allow: {
            select: { comments: { $limit: 5 } } as any,
          },
        },
      },
    })
    class LimitController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
    }

    controller = createController(LimitController, client, '');
  });

  it('applies $limit from allow config when select is true', async () => {
    await controller.list(req({ select: '{"comments":true}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { comments: { $limit: 5 } } }),
    );
  });

  it('caps client $limit at config $limit', async () => {
    await controller.list(req({ select: '{"comments":{"$limit":10}}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { comments: { $limit: 5 } } }),
    );
  });

  it('uses client $limit when smaller than config', async () => {
    await controller.list(req({ select: '{"comments":{"$limit":2}}' }));
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { comments: { $limit: 2 } } }),
    );
  });
});

describe('RelayerController findById with defaults.select', () => {
  it('applies findById defaults.select', async () => {
    const client = mockEntityClient({
      findFirst: vi.fn().mockResolvedValue({ id: 1, title: 'Test' }),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        findById: {
          defaults: {
            select: { id: true, title: true } as any,
          },
        },
      },
    })
    class SelectController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      findOne(id: string, r: unknown) {
        return this.handleFindById(id, r);
      }
    }

    const controller = createController(SelectController, client, '');
    await controller.findOne('1', {});
    expect(client.findFirst).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, title: true },
    });
  });
});

describe('RelayerController getBasePath', () => {
  it('uses baseUrl function when provided', async () => {
    const client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(100),
    });

    @CrudController({
      model: TestEntity as any,
      routes: { list: true },
    })
    class UrlController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
    }

    const controller = createController(UrlController, client, '');
    (controller as any).baseUrlConfig = () => 'http://dynamic';
    const result = (await controller.list(req())) as any;
    expect(result.meta.nextPageUrl).toContain('http://dynamic/tests');
  });
});

describe('RelayerController onModuleInit', () => {
  it('resolves hooks from moduleRef', () => {
    const hookInstance = { beforeCreate: vi.fn() };

    class TestHooks extends RelayerHooks<any> {}

    @CrudController({
      model: TestEntity as any,
      hooks: TestHooks as any,
    })
    class InitController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
    }

    const client = mockEntityClient();
    const controller = createController(InitController, client, '');
    (controller as any).moduleRef = {
      get: vi.fn().mockReturnValue(hookInstance),
    };

    controller.onModuleInit();
    expect((controller as any).resolvedHooks).toBe(hookInstance);
    expect((controller as any).hooksResolved).toBe(true);
  });

  it('falls back to manual instantiation when moduleRef.get throws', () => {
    class TestHooks extends RelayerHooks<any> {}

    @CrudController({
      model: TestEntity as any,
      hooks: TestHooks as any,
    })
    class InitController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
    }

    const client = mockEntityClient();
    const controller = createController(InitController, client, '');
    controller.onModuleInit();
    expect((controller as any).resolvedHooks).toBeInstanceOf(TestHooks);
    expect((controller as any).hooksResolved).toBe(true);
  });

  it('resolves dtoMapper from moduleRef', () => {
    const mapperInstance = { toListItem: vi.fn(), toSingleItem: vi.fn() };

    class TestMapper extends DtoMapper<any> {
      toListItem = vi.fn();
      toSingleItem = vi.fn();
    }

    @CrudController({
      model: TestEntity as any,
      dtoMapper: TestMapper as any,
    })
    class InitController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
    }

    const client = mockEntityClient();
    const controller = createController(InitController, client, '');
    (controller as any).moduleRef = {
      get: vi.fn().mockReturnValue(mapperInstance),
    };

    controller.onModuleInit();
    expect((controller as any).resolvedDtoMapper).toBe(mapperInstance);
    expect((controller as any).dtoMapperResolved).toBe(true);
  });

  it('falls back to manual instantiation for dtoMapper when moduleRef.get throws', () => {
    class TestMapper extends DtoMapper<any> {
      toListItem() {
        return {};
      }
      toSingleItem() {
        return {};
      }
    }

    @CrudController({
      model: TestEntity as any,
      dtoMapper: TestMapper as any,
    })
    class InitController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
    }

    const client = mockEntityClient();
    const controller = createController(InitController, client, '');
    controller.onModuleInit();
    expect((controller as any).resolvedDtoMapper).toBeInstanceOf(TestMapper);
    expect((controller as any).dtoMapperResolved).toBe(true);
  });
});

describe('RelayerController with listConfig.schema', () => {
  it('uses schema.parse instead of parseListQuery', async () => {
    const client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    });

    const customParse = vi.fn().mockReturnValue({
      where: { custom: true },
      limit: 5,
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: {
          schema: { parse: customParse } as any,
        },
      },
    })
    class SchemaController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
    }

    const controller = createController(SchemaController, client, '');
    await controller.list(req({ foo: 'bar' }));
    expect(customParse).toHaveBeenCalledWith({ foo: 'bar' });
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { custom: true } }),
    );
  });
});

describe('handleAggregate', () => {
  it('returns count when _count=true', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({ _count: 42 }),
    });
    const controller = createController(TestController, client);
    const result = (await controller.doAggregate(req({ _count: 'true' }))) as any;
    expect(result.data).toEqual({ _count: 42 });
    expect(client.aggregate).toHaveBeenCalledWith(expect.objectContaining({ _count: true }));
  });

  it('passes groupBy as array', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue([{ _count: 1, status: 'active' }]),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _count: 'true', groupBy: 'status' }));
    expect(client.aggregate).toHaveBeenCalledWith(expect.objectContaining({ groupBy: ['status'] }));
  });

  it('parses JSON groupBy', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue([]),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _count: 'true', groupBy: '["status","authorId"]' }));
    expect(client.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ groupBy: ['status', 'authorId'] }),
    );
  });

  it('passes where filter', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({ _count: 5 }),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _count: 'true', where: '{"published":true}' }));
    expect(client.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true } }),
    );
  });

  it('passes _sum, _avg, _min, _max', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({}),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(
      req({
        _sum: '{"total":true}',
        _avg: '{"total":true}',
        _min: '{"total":true}',
        _max: '{"total":true}',
      }),
    );
    expect(client.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { total: true },
        _avg: { total: true },
        _min: { total: true },
        _max: { total: true },
      }),
    );
  });

  it('ignores invalid JSON in where', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({ _count: 0 }),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _count: 'true', where: 'not-json' }));
    expect(client.aggregate).toHaveBeenCalledWith(expect.objectContaining({ _count: true }));
  });

  it('ignores invalid JSON in _sum, _avg, _min, _max', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({}),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _sum: 'bad', _avg: 'bad', _min: 'bad', _max: 'bad' }));
    const callArgs = (client.aggregate as any).mock.calls[0][0];
    expect(callArgs._sum).toBeUndefined();
    expect(callArgs._avg).toBeUndefined();
    expect(callArgs._min).toBeUndefined();
    expect(callArgs._max).toBeUndefined();
  });

  it('passes having filter', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue([]),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(
      req({ _count: 'true', groupBy: 'status', having: '{"_count":{"gt":5}}' }),
    );
    expect(client.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ having: { _count: { gt: 5 } } }),
    );
  });

  it('ignores invalid JSON in having', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue([]),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _count: 'true', having: 'bad-json' }));
    const callArgs = (client.aggregate as any).mock.calls[0][0];
    expect(callArgs.having).toBeUndefined();
  });

  it('_count=1 is treated as true', async () => {
    const client = mockEntityClient({
      aggregate: vi.fn().mockResolvedValue({ _count: 10 }),
    });
    const controller = createController(TestController, client);
    await controller.doAggregate(req({ _count: '1' }));
    expect(client.aggregate).toHaveBeenCalledWith(expect.objectContaining({ _count: true }));
  });
});

describe('handleRelationConnect/Disconnect/Set', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      update: vi.fn().mockResolvedValue({}),
    });

    @CrudController({
      model: TestEntity as any,
      routes: { relations: { tags: true } },
    })
    class RelController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      connect(id: string, body: any) {
        return this.handleRelationConnect(id, 'tags', body);
      }
      disconnect(id: string, body: any) {
        return this.handleRelationDisconnect(id, 'tags', body);
      }
      set(id: string, body: any) {
        return this.handleRelationSet(id, 'tags', body);
      }
    }

    controller = createController(RelController, client, '');
  });

  it('connect calls service.update with connect', async () => {
    await controller.connect('1', { data: [5, 6] });
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { tags: { connect: [5, 6] } },
    });
  });

  it('disconnect calls service.update with disconnect', async () => {
    await controller.disconnect('1', { data: [3] });
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { tags: { disconnect: [3] } },
    });
  });

  it('set calls service.update with set', async () => {
    await controller.set('1', { data: [1, 2, 3] });
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { tags: { set: [1, 2, 3] } },
    });
  });

  it('returns error when ids is not an array', async () => {
    const result = await controller.connect('1', { data: 'not-an-array' });
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe('BAD_REQUEST');
  });

  it('calls beforeRelation hook and uses modified ids', async () => {
    const hookSpies = {
      beforeRelation: vi.fn().mockReturnValue([10, 20]),
      afterRelation: vi.fn(),
    };
    (controller as any).resolvedHooks = hookSpies;
    (controller as any).hooksResolved = true;

    await controller.connect('1', { data: [5, 6] });
    expect(hookSpies.beforeRelation).toHaveBeenCalledWith(
      'connect',
      'tags',
      [5, 6],
      expect.anything(),
    );
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { tags: { connect: [10, 20] } },
    });
  });

  it('calls afterRelation hook', async () => {
    const hookSpies = {
      afterRelation: vi.fn(),
    };
    (controller as any).resolvedHooks = hookSpies;
    (controller as any).hooksResolved = true;

    await controller.disconnect('1', { data: [3] });
    expect(hookSpies.afterRelation).toHaveBeenCalledWith(
      'disconnect',
      'tags',
      [3],
      expect.anything(),
    );
  });
});

describe('handleUpdate with inline relation ops', () => {
  let controller: any;
  let client: ReturnType<typeof mockEntityClient>;

  beforeEach(() => {
    client = mockEntityClient({
      update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        update: true,
        relations: { tags: true },
      },
    })
    class InlineRelController extends RelayerController<any, Record<string, unknown>> {
      constructor(service: RelayerService<any, Record<string, unknown>>) {
        super(service);
      }
      doUpdate(id: string, body: any, r: unknown) {
        return this.handleUpdate(id, body, r);
      }
    }

    controller = createController(InlineRelController, client, '');
  });

  it('separates relation ops from scalar data before update', async () => {
    await controller.doUpdate('1', { title: 'New', tags: { connect: [5, 6] } }, {});
    expect(client.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'New', tags: { connect: [5, 6] } },
    });
  });

  it('handles relation-only body (no scalar data)', async () => {
    (client.update as any).mockResolvedValue(undefined);
    const result = (await controller.doUpdate('1', { tags: { connect: [1] } }, {})) as any;
    expect(result.data).toEqual({ success: true });
  });

  it('returns entity data when mixed scalar + relation', async () => {
    const result = (await controller.doUpdate(
      '1',
      { title: 'Mixed', tags: { set: [1, 2] } },
      {},
    )) as any;
    expect(result.data.title).toBe('Updated');
  });
});

// ---------------------------------------------------------------------------
// typed context propagation
// ---------------------------------------------------------------------------
// Verifies that:
// 1. buildContext(request) is called with the raw request and produces TCtx
// 2. buildQueryContext(ctx) is called with TCtx and produces TQueryCtx
// 3. Hooks receive the TCtx (not RequestContext, not TQueryCtx)
// 4. Service methods receive the TQueryCtx (not the full TCtx)
// 5. The default buildContext / buildQueryContext behave as documented
//
// Critical insight: hooks ctx and service queryCtx are different objects
// flowing through different paths and tests verify they don't get confused.

interface TestAppUser {
  id: number;
  role: 'admin' | 'user';
}

interface TestAppContext extends RequestContext {
  currentUser: TestAppUser;
}

interface TestAppQueryContext {
  currentUserId: number;
  isAdmin: boolean;
}

@CrudController({
  model: TestEntity as any,
  routes: {
    list: { defaultLimit: 20, maxLimit: 50 },
    findById: true,
    create: true,
    update: true,
    delete: true,
    count: true,
    aggregate: true,
    relations: { tags: true },
  },
  id: { field: 'id', type: 'number' },
})
class TypedTestController extends RelayerController<
  any,
  Record<string, unknown>,
  DtoMapper<any, any, any>,
  TestAppContext,
  TestAppQueryContext
> {
  public buildContextSpy = vi.fn();
  public buildQueryContextSpy = vi.fn();

  constructor(service: RelayerService<any, Record<string, unknown>, TestAppQueryContext>) {
    super(service);
  }

  protected buildContext(request: unknown): TestAppContext {
    this.buildContextSpy(request);
    const user = (request as { user?: TestAppUser }).user ?? { id: 0, role: 'user' };
    return { request, currentUser: user };
  }

  protected buildQueryContext(ctx: TestAppContext): TestAppQueryContext {
    this.buildQueryContextSpy(ctx);
    return {
      currentUserId: ctx.currentUser.id,
      isAdmin: ctx.currentUser.role === 'admin',
    };
  }

  list(r: any) {
    return this.handleList(r);
  }
  findOne(id: string, r: unknown) {
    return this.handleFindById(id, r);
  }
  doCreate(body: any, r: unknown) {
    return this.handleCreate(body, r);
  }
  doUpdate(id: string, body: any, r: unknown) {
    return this.handleUpdate(id, body, r);
  }
  doDelete(id: string, r: unknown) {
    return this.handleDelete(id, r);
  }
  doCount(r: any) {
    return this.handleCount(r);
  }
  doAggregate(r: any) {
    return this.handleAggregate(r);
  }
  doRelationConnect(id: string, name: string, body: any, r: any) {
    return this.handleRelationConnect(id, name as any, body, r);
  }
}

function createTypedController() {
  const client = mockEntityClient({
    findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
    findFirst: vi.fn().mockResolvedValue({ id: 1, title: 'Test' }),
    count: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ id: 3, title: 'New' }),
    update: vi.fn().mockResolvedValue({ id: 1, title: 'Updated' }),
    delete: vi.fn().mockResolvedValue({ id: 1 }),
    aggregate: vi.fn().mockResolvedValue({ _count: 1 }),
  });
  const r = { tests: client } as any;
  const service = new RelayerService<any, Record<string, unknown>, TestAppQueryContext>(r, 'tests');
  const ctrl = new TypedTestController(service);
  (ctrl as any).baseUrlConfig = 'http://test';
  (ctrl as any).moduleRef = {
    get: () => {
      throw new Error('not found');
    },
  };
  return { ctrl, client, service };
}

// Default-behavior controller (no overrides) — to verify base class defaults
@CrudController({
  model: TestEntity as any,
  routes: { list: { defaultLimit: 20, maxLimit: 50 } },
})
class DefaultCtxController extends RelayerController<any, Record<string, unknown>> {
  // Expose protected helpers for direct unit assertions
  callBuildContext(request: unknown) {
    return this.buildContext(request);
  }
  callBuildQueryContext(ctx: any) {
    return this.buildQueryContext(ctx);
  }
}

describe('RelayerController: typed context propagation', () => {
  // ---- defaults ----
  describe('defaults', () => {
    it('default buildContext returns { request }', () => {
      const ctrl = new DefaultCtxController(
        new RelayerService<any, Record<string, unknown>>(
          { tests: mockEntityClient() } as any,
          'tests',
        ),
      );
      const ctx = ctrl.callBuildContext({ headers: {}, url: '/foo' });
      expect(ctx).toEqual({ request: { headers: {}, url: '/foo' } });
    });

    it('default buildQueryContext returns undefined', () => {
      const ctrl = new DefaultCtxController(
        new RelayerService<any, Record<string, unknown>>(
          { tests: mockEntityClient() } as any,
          'tests',
        ),
      );
      expect(ctrl.callBuildQueryContext({ request: {} })).toBeUndefined();
    });
  });

  // ---- handleList (offset) ----
  describe('handleList (offset)', () => {
    it('builds context from request and forwards queryCtx to service.findMany', async () => {
      const { ctrl, client } = createTypedController();
      const request = { ...req(), user: { id: 42, role: 'admin' } as TestAppUser };
      await ctrl.list(request);

      expect(ctrl.buildContextSpy).toHaveBeenCalledWith(request);
      expect(ctrl.buildQueryContextSpy).toHaveBeenCalledWith({
        request,
        currentUser: { id: 42, role: 'admin' },
      });
      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 42, isAdmin: true } }),
      );
    });

    it('forwards queryCtx to service.count', async () => {
      const { ctrl, client } = createTypedController();
      const request = { ...req(), user: { id: 5, role: 'user' } as TestAppUser };
      await ctrl.list(request);
      expect(client.count).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 5, isAdmin: false } }),
      );
    });

    it('passes typed AppContext to hooks.beforeFind', async () => {
      const { ctrl } = createTypedController();
      const beforeFind = vi.fn();
      (ctrl as any).resolvedHooks = { beforeFind };
      (ctrl as any).hooksResolved = true;
      const request = { ...req(), user: { id: 7, role: 'admin' } as TestAppUser };
      await ctrl.list(request);
      expect(beforeFind).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 7, role: 'admin' } }),
      );
    });

    it('passes typed AppContext to hooks.afterFind', async () => {
      const { ctrl } = createTypedController();
      const afterFind = vi.fn();
      (ctrl as any).resolvedHooks = { afterFind };
      (ctrl as any).hooksResolved = true;
      const request = { ...req(), user: { id: 8, role: 'user' } as TestAppUser };
      await ctrl.list(request);
      expect(afterFind).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ currentUser: { id: 8, role: 'user' } }),
      );
    });
  });

  // ---- handleCursorList ----
  describe('handleCursorList', () => {
    it('cursor list also builds queryCtx and forwards to service.findMany', async () => {
      // Build a cursor-paginated controller using the same TypedTestController + decorator override
      @CrudController({
        model: TestEntity as any,
        routes: { list: { pagination: 'cursor', defaultLimit: 20, maxLimit: 50 } },
        id: { field: 'id', type: 'number' },
      })
      class CursorCtrl extends TypedTestController {}

      const client = mockEntityClient({
        findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      });
      const r = { tests: client } as any;
      const service = new RelayerService<any, Record<string, unknown>, TestAppQueryContext>(
        r,
        'tests',
      );
      const ctrl = new CursorCtrl(service);
      (ctrl as any).baseUrlConfig = 'http://test';
      (ctrl as any).moduleRef = {
        get: () => {
          throw new Error('not found');
        },
      };

      const request = { ...req(), user: { id: 99, role: 'admin' } as TestAppUser };
      await ctrl.list(request);

      expect(client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 99, isAdmin: true } }),
      );
    });
  });

  // ---- handleFindById ----
  describe('handleFindById', () => {
    it('forwards queryCtx to service.findFirst', async () => {
      const { ctrl, client } = createTypedController();
      const request = { ...req(), user: { id: 11, role: 'admin' } as TestAppUser };
      await ctrl.findOne('1', request);
      expect(client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 11, isAdmin: true } }),
      );
    });

    it('passes typed AppContext to hooks.afterFindOne', async () => {
      const { ctrl } = createTypedController();
      const afterFindOne = vi.fn();
      (ctrl as any).resolvedHooks = { afterFindOne };
      (ctrl as any).hooksResolved = true;
      const request = { ...req(), user: { id: 12, role: 'user' } as TestAppUser };
      await ctrl.findOne('1', request);
      expect(afterFindOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 12, role: 'user' } }),
      );
    });
  });

  // ---- handleCount ----
  describe('handleCount', () => {
    it('forwards queryCtx to service.count', async () => {
      const { ctrl, client } = createTypedController();
      const request = { ...req(), user: { id: 21, role: 'admin' } as TestAppUser };
      await ctrl.doCount(request);
      expect(client.count).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 21, isAdmin: true } }),
      );
    });
  });

  // ---- handleAggregate ----
  describe('handleAggregate', () => {
    it('forwards queryCtx to service.aggregate', async () => {
      const { ctrl, client } = createTypedController();
      const request = {
        query: { _count: 'true' },
        user: { id: 31, role: 'admin' } as TestAppUser,
      };
      await ctrl.doAggregate(request);
      expect(client.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 31, isAdmin: true } }),
      );
    });

    it('passes typed AppContext to hooks.beforeAggregate', async () => {
      const { ctrl } = createTypedController();
      const beforeAggregate = vi.fn();
      (ctrl as any).resolvedHooks = { beforeAggregate };
      (ctrl as any).hooksResolved = true;
      const request = {
        query: { _count: 'true' },
        user: { id: 32, role: 'user' } as TestAppUser,
      };
      await ctrl.doAggregate(request);
      expect(beforeAggregate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 32, role: 'user' } }),
      );
    });
  });

  // ---- handleCreate ----
  describe('handleCreate', () => {
    it('forwards queryCtx to service.create', async () => {
      const { ctrl, client } = createTypedController();
      const request = { user: { id: 41, role: 'admin' } as TestAppUser };
      await ctrl.doCreate({ title: 'X' }, request);
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 41, isAdmin: true } }),
      );
    });

    it('passes typed AppContext to hooks.beforeCreate and afterCreate', async () => {
      const { ctrl } = createTypedController();
      const beforeCreate = vi.fn();
      const afterCreate = vi.fn();
      (ctrl as any).resolvedHooks = { beforeCreate, afterCreate };
      (ctrl as any).hooksResolved = true;
      const request = { user: { id: 42, role: 'user' } as TestAppUser };
      await ctrl.doCreate({ title: 'X' }, request);
      expect(beforeCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 42, role: 'user' } }),
      );
      expect(afterCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 42, role: 'user' } }),
      );
    });
  });

  // ---- handleUpdate ----
  describe('handleUpdate', () => {
    it('forwards queryCtx to service.update', async () => {
      const { ctrl, client } = createTypedController();
      const request = { user: { id: 51, role: 'admin' } as TestAppUser };
      await ctrl.doUpdate('1', { title: 'X' }, request);
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 51, isAdmin: true } }),
      );
    });

    it('passes typed AppContext to hooks.beforeUpdate and afterUpdate', async () => {
      const { ctrl } = createTypedController();
      const beforeUpdate = vi.fn();
      const afterUpdate = vi.fn();
      (ctrl as any).resolvedHooks = { beforeUpdate, afterUpdate };
      (ctrl as any).hooksResolved = true;
      const request = { user: { id: 52, role: 'user' } as TestAppUser };
      await ctrl.doUpdate('1', { title: 'X' }, request);
      expect(beforeUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 52, role: 'user' } }),
      );
      expect(afterUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 52, role: 'user' } }),
      );
    });
  });

  // ---- handleDelete ----
  describe('handleDelete', () => {
    it('forwards queryCtx to service.delete', async () => {
      const { ctrl, client } = createTypedController();
      const request = { user: { id: 61, role: 'admin' } as TestAppUser };
      await ctrl.doDelete('1', request);
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 61, isAdmin: true } }),
      );
    });

    it('passes typed AppContext to hooks.beforeDelete and afterDelete', async () => {
      const { ctrl } = createTypedController();
      const beforeDelete = vi.fn();
      const afterDelete = vi.fn();
      (ctrl as any).resolvedHooks = { beforeDelete, afterDelete };
      (ctrl as any).hooksResolved = true;
      const request = { user: { id: 62, role: 'user' } as TestAppUser };
      await ctrl.doDelete('1', request);
      expect(beforeDelete).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 62, role: 'user' } }),
      );
      expect(afterDelete).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ currentUser: { id: 62, role: 'user' } }),
      );
    });
  });

  // ---- handleRelationOp ----
  describe('handleRelationOp', () => {
    it('connect forwards queryCtx to service.update', async () => {
      const { ctrl, client } = createTypedController();
      const request = { user: { id: 71, role: 'admin' } as TestAppUser };
      await ctrl.doRelationConnect('1', 'tags', { data: [10, 11] }, request);
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({ context: { currentUserId: 71, isAdmin: true } }),
      );
    });

    it('passes typed AppContext to hooks.beforeRelation and afterRelation', async () => {
      const { ctrl } = createTypedController();
      const beforeRelation = vi.fn();
      const afterRelation = vi.fn();
      (ctrl as any).resolvedHooks = { beforeRelation, afterRelation };
      (ctrl as any).hooksResolved = true;
      const request = { user: { id: 72, role: 'user' } as TestAppUser };
      await ctrl.doRelationConnect('1', 'tags', { data: [10] }, request);
      expect(beforeRelation).toHaveBeenCalledWith(
        'connect',
        'tags',
        [10],
        expect.objectContaining({ currentUser: { id: 72, role: 'user' } }),
      );
      expect(afterRelation).toHaveBeenCalledWith(
        'connect',
        'tags',
        [10],
        expect.objectContaining({ currentUser: { id: 72, role: 'user' } }),
      );
    });
  });

  // ---- ordering and counts ----
  describe('build order and call counts', () => {
    it('buildContext is called once per handler invocation', async () => {
      const { ctrl } = createTypedController();
      const request = { ...req(), user: { id: 1, role: 'admin' } as TestAppUser };
      await ctrl.list(request);
      expect(ctrl.buildContextSpy).toHaveBeenCalledTimes(1);
    });

    it('buildQueryContext is called once per handler invocation', async () => {
      const { ctrl } = createTypedController();
      const request = { ...req(), user: { id: 1, role: 'admin' } as TestAppUser };
      await ctrl.list(request);
      expect(ctrl.buildQueryContextSpy).toHaveBeenCalledTimes(1);
    });

    it('buildContext runs before buildQueryContext', async () => {
      const { ctrl } = createTypedController();
      const order: string[] = [];
      ctrl.buildContextSpy.mockImplementation(() => order.push('build'));
      ctrl.buildQueryContextSpy.mockImplementation(() => order.push('queryCtx'));
      const request = { ...req(), user: { id: 1, role: 'admin' } as TestAppUser };
      await ctrl.list(request);
      expect(order).toEqual(['build', 'queryCtx']);
    });
  });

  // ---- critical: hooks ctx vs service queryCtx separation ----
  describe('hooks ctx vs service queryCtx', () => {
    it('hooks receive AppContext (with currentUser), service receives AppQueryContext (with currentUserId)', async () => {
      const { ctrl, client } = createTypedController();
      const beforeFind = vi.fn();
      (ctrl as any).resolvedHooks = { beforeFind };
      (ctrl as any).hooksResolved = true;
      const request = { ...req(), user: { id: 100, role: 'admin' } as TestAppUser };
      await ctrl.list(request);

      // Hooks: get the full AppContext with currentUser
      const hookCtxArg = beforeFind.mock.calls[0]?.[1] as TestAppContext & {
        currentUserId?: unknown;
      };
      expect(hookCtxArg).toEqual({
        request,
        currentUser: { id: 100, role: 'admin' },
      });
      expect(hookCtxArg.currentUserId).toBeUndefined(); // does not have flat fields

      // Service: gets the slim AppQueryContext, no `request` or `currentUser`
      const serviceCtxArg = (client.findMany as any).mock.calls[0][0].context;
      expect(serviceCtxArg).toEqual({ currentUserId: 100, isAdmin: true });
      expect(serviceCtxArg.request).toBeUndefined();
      expect(serviceCtxArg.currentUser).toBeUndefined();
    });
  });
});
