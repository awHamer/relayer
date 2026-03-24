import 'reflect-metadata';

import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CRUD_CONTROLLER_METADATA } from '../../src/constants';
import { CrudController } from '../../src/decorators/crud-controller.decorator';
import { DtoMapper } from '../../src/dto-mapper';
import { RelayerHooks } from '../../src/hooks';
import { RelayerController } from '../../src/relayer.controller';
import { RelayerService, type EntityClient } from '../../src/relayer.service';
import { mockEntityClient, TestEntity } from '../helpers';

function createController<T extends RelayerController<any>>(
  Ctrl: new (service: RelayerService<any>) => T,
  client: EntityClient,
  baseUrl = 'http://test',
): T {
  const service = new RelayerService(client);
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
        orderBy: { field: 'id' as any, order: 'desc' },
      },
    },
    findById: true,
    create: true,
    update: true,
    delete: true,
    count: true,
    aggregate: true,
  },
})
class TestController extends RelayerController<any> {
  constructor(service: RelayerService<any>) {
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
  let client: EntityClient;

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
    it('returns data and meta', async () => {
      const result = (await controller.list(req())) as any;
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.meta).toEqual(expect.objectContaining({ total: 2, limit: 20, offset: 0 }));
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

    it('generates nextPageUrl when more results', async () => {
      (client.count as any).mockResolvedValue(100);
      const result = (await controller.list(req())) as any;
      expect(result.meta.nextPageUrl).toContain('offset=20');
      expect(result.meta.nextPageUrl).toContain('limit=20');
    });

    it('no nextPageUrl when at end', async () => {
      (client.count as any).mockResolvedValue(2);
      const result = (await controller.list(req())) as any;
      expect(result.meta.nextPageUrl).toBeUndefined();
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
    it('returns { data } for found entity', async () => {
      const result = (await controller.findOne('1', {})) as any;
      expect(result.data).toEqual({ id: 1, title: 'Test' });
    });

    it('throws NotFoundException when not found', async () => {
      (client.findFirst as any).mockResolvedValue(null);
      await expect(controller.findOne('1', {})).rejects.toThrow(NotFoundException);
    });

    it('parses numeric id by default', async () => {
      await controller.findOne('42', {});
      expect(client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
    });
  });

  describe('handleCreate', () => {
    it('returns { data } with created entity', async () => {
      const result = (await controller.doCreate({ title: 'New' }, {})) as any;
      expect(result.data).toEqual({ id: 3, title: 'New' });
    });

    it('passes data to service.create', async () => {
      await controller.doCreate({ title: 'New' }, {});
      expect(client.create).toHaveBeenCalledWith({ data: { title: 'New' } });
    });
  });

  describe('handleUpdate', () => {
    it('returns { data } with updated entity', async () => {
      const result = (await controller.doUpdate('1', { title: 'Updated' }, {})) as any;
      expect(result.data).toEqual({ id: 1, title: 'Updated' });
    });

    it('passes parsed id as where', async () => {
      await controller.doUpdate('5', { title: 'X' }, {});
      expect(client.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { title: 'X' },
      });
    });
  });

  describe('handleDelete', () => {
    it('returns { data } with deleted entity', async () => {
      const result = (await controller.doDelete('1', {})) as any;
      expect(result.data).toEqual({ id: 1 });
    });

    it('throws NotFoundException when delete returns falsy', async () => {
      (client.delete as any).mockResolvedValue(null);
      await expect(controller.doDelete('1', {})).rejects.toThrow(NotFoundException);
    });

    it('passes parsed id as where', async () => {
      await controller.doDelete('3', {});
      expect(client.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    });
  });

  describe('handleCount', () => {
    it('returns { data: { count } }', async () => {
      const result = (await controller.doCount(req())) as any;
      expect(result.data).toEqual({ count: 2 });
    });

    it('applies where from query', async () => {
      await controller.doCount(req({ where: '{"published":true}' }));
      expect(client.count).toHaveBeenCalledWith({ where: { published: true } });
    });
  });
});

describe('RelayerController with hooks', () => {
  let controller: any;
  let client: EntityClient;
  let hookSpies: Record<string, ReturnType<typeof vi.fn>>;

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
    class HookedController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
  let client: EntityClient;
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
      toResponse: vi.fn((entity) => ({ ...entity, detailed: true })),
      toCreateInput: vi.fn((data) => ({ ...data, authorId: 99 })),
      toUpdateInput: vi.fn((data) => ({ ...data, updatedBy: 99 })),
    };

    @CrudController({
      model: TestEntity as any,
      routes: { list: true, findById: true, create: true, update: true },
    })
    class MappedController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    expect(mapperSpies.toResponse).toHaveBeenCalled();
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
  let client: EntityClient;

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
    class SearchController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
  let client: EntityClient;

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
    class DefaultsController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
  let client: EntityClient;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]),
      count: vi.fn().mockResolvedValue(0),
    });

    @CrudController({
      model: TestEntity as any,
      routes: {
        list: {
          pagination: 'cursor_UNSTABLE' as any,
          defaultLimit: 2,
        },
      },
    })
    class CursorController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
        super(service);
      }
      list(r: any) {
        return this.handleList(r);
      }
    }

    controller = createController(CursorController, client);
  });

  it('returns hasMore=true when more results than limit', async () => {
    const result = (await controller.list(req())) as any;
    expect(result.meta.hasMore).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('returns hasMore=false when no more results', async () => {
    (client.findMany as any).mockResolvedValue([{ id: 1 }]);
    const result = (await controller.list(req())) as any;
    expect(result.meta.hasMore).toBe(false);
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('returns nextCursor when hasMore', async () => {
    const result = (await controller.list(req())) as any;
    expect(result.meta.nextCursor).toBeDefined();
    expect(typeof result.meta.nextCursor).toBe('string');
  });

  it('no nextCursor when not hasMore', async () => {
    (client.findMany as any).mockResolvedValue([{ id: 1 }]);
    const result = (await controller.list(req())) as any;
    expect(result.meta.nextCursor).toBeUndefined();
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

  it('nextPageUrl includes cursor and limit', async () => {
    const result = (await controller.list(req())) as any;
    expect(result.meta.nextPageUrl).toContain('cursor=');
    expect(result.meta.nextPageUrl).toContain('limit=2');
  });

  it('ensures cursor fields are added to select', async () => {
    await controller.list(
      req({
        select: '{"title":true}',
        orderBy: '{"field":"createdAt","order":"desc"}',
      }),
    );
    const callArgs = (client.findMany as any).mock.calls[0][0];
    expect(callArgs.select.createdAt).toBe(true);
    expect(callArgs.select.id).toBe(true);
  });

  it('calls beforeFind hook in cursor mode', async () => {
    const hookSpies = { beforeFind: vi.fn() };
    (controller as any).resolvedHooks = hookSpies;
    (controller as any).hooksResolved = true;

    await controller.list(req());
    expect(hookSpies.beforeFind).toHaveBeenCalled();
  });

  it('applies dtoMapper.toListItem in cursor mode', async () => {
    const mapperSpies = {
      toListItem: vi.fn((entity: any) => ({ ...entity, mapped: true })),
      toResponse: vi.fn(),
    };
    (controller as any).resolvedDtoMapper = mapperSpies;
    (controller as any).dtoMapperResolved = true;

    const result = (await controller.list(req())) as any;
    expect(mapperSpies.toListItem).toHaveBeenCalled();
    expect(result.data[0]).toHaveProperty('mapped', true);
  });

  it('merges cursor where with existing where', async () => {
    // First get a cursor from a normal request
    const first = (await controller.list(req())) as any;
    const cursor = first.meta.nextCursor;

    // Then use cursor + where
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
  let client: EntityClient;

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
    class LimitController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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

describe('RelayerControllerBase (via controller.base)', () => {
  let controller: any;
  let client: EntityClient;

  beforeEach(() => {
    client = mockEntityClient({
      findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
      findFirst: vi.fn().mockResolvedValue({ id: 1 }),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 1 }),
      count: vi.fn().mockResolvedValue(5),
    });

    @CrudController({ model: TestEntity as any })
    class BaseTestController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
        super(service);
      }
    }

    controller = createController(BaseTestController, client, '');
  });

  it('base.list delegates to service.findMany', async () => {
    const result = await controller.base.list({ where: { active: true } });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('base.findById delegates to service.findFirst', async () => {
    const result = await controller.base.findById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('base.create delegates to service.create', async () => {
    await controller.base.create({ title: 'Test' });
    expect(client.create).toHaveBeenCalledWith({ data: { title: 'Test' } });
  });

  it('base.update delegates to service.update', async () => {
    await controller.base.update({ id: 1 }, { title: 'X' });
    expect(client.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { title: 'X' } });
  });

  it('base.delete delegates to service.delete', async () => {
    await controller.base.delete({ id: 1 });
    expect(client.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('base.count delegates to service.count', async () => {
    const result = await controller.base.count({ where: { active: true } });
    expect(result).toBe(5);
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
    class SelectController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    class UrlController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    class InitController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    class InitController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    const mapperInstance = { toListItem: vi.fn(), toResponse: vi.fn() };

    class TestMapper extends DtoMapper<any> {
      toListItem = vi.fn();
      toResponse = vi.fn();
    }

    @CrudController({
      model: TestEntity as any,
      dtoMapper: TestMapper as any,
    })
    class InitController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    class SchemaController extends RelayerController<any> {
      constructor(service: RelayerService<any>) {
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
    await controller.doAggregate(
      req({ _sum: 'bad', _avg: 'bad', _min: 'bad', _max: 'bad' }),
    );
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
