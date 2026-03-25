import 'reflect-metadata';

import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { describe, expect, it, vi } from 'vitest';

import { CrudController, RelayerController } from '../../src';
import { CRUD_CONTROLLER_METADATA } from '../../src/constants';
import { TestEntity } from '../helpers';

function getMethodMeta(proto: object, method: string) {
  const descriptor = Object.getOwnPropertyDescriptor(proto, method);
  if (!descriptor) return null;
  return {
    httpMethod: Reflect.getMetadata(METHOD_METADATA, descriptor.value as object) as number,
    path: Reflect.getMetadata(PATH_METADATA, descriptor.value as object) as string,
  };
}

describe('CrudController decorator', () => {
  it('stores config in CRUD_CONTROLLER_METADATA', () => {
    @CrudController({ model: TestEntity as any, routes: { list: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = Reflect.getMetadata(CRUD_CONTROLLER_METADATA, TestCtrl);
    expect(meta).toBeDefined();
    expect(meta.model).toBe(TestEntity);
    expect(meta.routes.list).toBe(true);
  });

  it('enables all routes by default when routes omitted', () => {
    @CrudController({ model: TestEntity as any })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = Reflect.getMetadata(CRUD_CONTROLLER_METADATA, TestCtrl);
    expect(meta.routes).toEqual({
      list: true,
      findById: true,
      create: true,
      update: true,
      delete: true,
      count: true,
    });
  });

  it('generates list with GET /', () => {
    @CrudController({ model: TestEntity as any, routes: { list: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'list');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.GET);
    expect(meta!.path).toBe('/');
  });

  it('generates count with GET /count', () => {
    @CrudController({ model: TestEntity as any, routes: { count: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'count');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.GET);
    expect(meta!.path).toBe('/count');
  });

  it('generates findById with GET /:id', () => {
    @CrudController({ model: TestEntity as any, routes: { findById: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'findById');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.GET);
    expect(meta!.path).toBe('/:id');
  });

  it('generates create with POST /', () => {
    @CrudController({ model: TestEntity as any, routes: { create: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'create');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.POST);
    expect(meta!.path).toBe('/');
  });

  it('generates update with PATCH /:id', () => {
    @CrudController({ model: TestEntity as any, routes: { update: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'update');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.PATCH);
    expect(meta!.path).toBe('/:id');
  });

  it('generates delete with DELETE /:id', () => {
    @CrudController({ model: TestEntity as any, routes: { delete: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'delete');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.DELETE);
    expect(meta!.path).toBe('/:id');
  });

  it('generates aggregate with GET /aggregate', () => {
    @CrudController({ model: TestEntity as any, routes: { aggregate: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getMethodMeta(TestCtrl.prototype, 'aggregate');
    expect(meta).not.toBeNull();
    expect(meta!.httpMethod).toBe(RequestMethod.GET);
    expect(meta!.path).toBe('/aggregate');
  });

  it('does not create aggregate when disabled', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { list: true, aggregate: false },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    expect((TestCtrl.prototype as any).aggregate).toBeUndefined();
  });

  it('does not create method for disabled route', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { list: true, create: false, delete: false },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    expect((TestCtrl.prototype as any).list).toBeDefined();
    expect((TestCtrl.prototype as any).create).toBeUndefined();
    expect((TestCtrl.prototype as any).delete).toBeUndefined();
  });

  it('uses entity key as default path', () => {
    @CrudController({ model: TestEntity as any })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const controllerPath = Reflect.getMetadata('path', TestCtrl);
    expect(controllerPath).toBe('tests');
  });

  it('uses custom path from config', () => {
    @CrudController({ model: TestEntity as any, path: 'custom-path' })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const controllerPath = Reflect.getMetadata('path', TestCtrl);
    expect(controllerPath).toBe('custom-path');
  });

  it('applies global decorator to all routes', () => {
    const spy = vi.fn();
    const globalDecorator: MethodDecorator = (_target, _key, descriptor) => {
      spy(descriptor);
      return descriptor;
    };

    @CrudController({
      model: TestEntity as any,
      routes: { list: true, create: true },
      decorators: [globalDecorator],
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('applies targeted decorator only to matching routes', () => {
    const spy = vi.fn();
    const targetedDecorator: MethodDecorator = (_target, _key, descriptor) => {
      spy(descriptor);
      return descriptor;
    };

    @CrudController({
      model: TestEntity as any,
      routes: { list: true, create: true, delete: true },
      decorators: [{ apply: [targetedDecorator], for: ['create', 'delete'] }],
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
