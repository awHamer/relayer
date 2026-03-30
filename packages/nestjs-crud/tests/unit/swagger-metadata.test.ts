import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CrudController, RelayerController } from '../../src';
import { resolveBodyMeta } from '../../src/decorators/swagger/metadata';
import { TestEntity } from '../helpers';

const API_OPERATION = 'swagger/apiOperation';
const API_RESPONSE = 'swagger/apiResponse';
const API_PARAMETERS = 'swagger/apiParameters';
const API_TAGS = 'swagger/apiUseTags';
const API_PRODUCES = 'swagger/apiProduces';

function getSwaggerMeta(proto: object, method: string) {
  const descriptor = Object.getOwnPropertyDescriptor(proto, method);
  if (!descriptor) return null;
  const fn = descriptor.value as object;
  return {
    operation: Reflect.getMetadata(API_OPERATION, fn) as Record<string, unknown> | undefined,
    responses: Reflect.getMetadata(API_RESPONSE, fn) as Record<string, unknown> | undefined,
    parameters: Reflect.getMetadata(API_PARAMETERS, fn) as unknown[] | undefined,
    produces: Reflect.getMetadata(API_PRODUCES, fn) as string[] | undefined,
  };
}

describe('Swagger metadata generation', () => {
  it('sets tag on controller class', () => {
    @CrudController({ model: TestEntity as any, routes: { list: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const tags = Reflect.getMetadata(API_TAGS, TestCtrl);
    expect(tags).toEqual(['tests']);
  });

  it('sets custom tag from swagger config', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { list: true },
      swagger: { tag: 'CustomTag' },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const tags = Reflect.getMetadata(API_TAGS, TestCtrl);
    expect(tags).toEqual(['CustomTag']);
  });

  it('generates operation metadata for list', () => {
    @CrudController({ model: TestEntity as any, routes: { list: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'list');
    expect(meta).not.toBeNull();
    expect(meta!.operation?.summary).toBe('List tests');
    expect(meta!.operation?.operationId).toBe('list_tests');
    expect(meta!.produces).toEqual(['application/json']);
  });

  it('generates operation metadata for findById', () => {
    @CrudController({ model: TestEntity as any, routes: { findById: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'findById');
    expect(meta!.operation?.summary).toBe('Get tests by ID');
    expect(meta!.responses).toHaveProperty('200');
    expect(meta!.responses).toHaveProperty('404');
  });

  it('generates operation metadata for create', () => {
    @CrudController({ model: TestEntity as any, routes: { create: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'create');
    expect(meta!.operation?.summary).toBe('Create tests');
    expect(meta!.responses).toHaveProperty('201');
  });

  it('generates operation metadata for update', () => {
    @CrudController({ model: TestEntity as any, routes: { update: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'update');
    expect(meta!.operation?.summary).toBe('Update tests');
    expect(meta!.parameters).toBeDefined();
    const pathParams = (meta!.parameters as any[]).filter((p: any) => p.in === 'path');
    expect(pathParams.length).toBeGreaterThan(0);
  });

  it('generates operation metadata for delete', () => {
    @CrudController({ model: TestEntity as any, routes: { delete: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'delete');
    expect(meta!.operation?.summary).toBe('Delete tests');
    expect(meta!.responses).toHaveProperty('404');
  });

  it('generates operation metadata for count', () => {
    @CrudController({ model: TestEntity as any, routes: { count: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'count');
    expect(meta!.operation?.summary).toBe('Count tests');
  });

  it('generates operation metadata for aggregate', () => {
    @CrudController({ model: TestEntity as any, routes: { aggregate: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'aggregate');
    expect(meta!.operation?.summary).toBe('Aggregate tests');
  });

  it('generates query params for list route', () => {
    @CrudController({ model: TestEntity as any, routes: { list: true } })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'list');
    const paramNames = (meta!.parameters as any[]).map((p: any) => p.name);
    expect(paramNames).toContain('where');
    expect(paramNames).toContain('select');
    expect(paramNames).toContain('orderBy');
    expect(paramNames).toContain('limit');
    expect(paramNames).toContain('offset');
    expect(paramNames).toContain('search');
  });

  it('allows custom summary override', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { list: true },
      swagger: { list: { summary: 'Search tests' } },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'list');
    expect(meta!.operation?.summary).toBe('Search tests');
  });

  it('skips swagger when swagger: false', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { list: true },
      swagger: false,
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'list');
    expect(meta!.operation).toBeUndefined();
  });

  it('generates swagger for relation connect route', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { relations: { tags: true } },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'relationConnect_tags');
    expect(meta).not.toBeNull();
    expect(meta!.operation?.summary).toBe('Connect tags');
    expect(meta!.operation?.operationId).toContain('connect');
  });

  it('generates swagger for relation disconnect route', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { relations: { tags: true } },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'relationDisconnect_tags');
    expect(meta!.operation?.summary).toBe('Disconnect tags');
  });

  it('generates swagger for relation set route', () => {
    @CrudController({
      model: TestEntity as any,
      routes: { relations: { tags: true } },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'relationSet_tags');
    expect(meta!.operation?.summary).toBe('Set tags');
  });

  it('create route includes body type from class DTO', () => {
    class CreateDto {
      title!: string;
      published?: boolean;
    }

    @CrudController({
      model: TestEntity as any,
      routes: { create: { schema: CreateDto } },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'create');
    const bodyParam = (meta!.parameters as any[])?.find((p: any) => p.in === 'body');
    expect(bodyParam).toBeDefined();
    expect(bodyParam.type).toBe(CreateDto);
  });

  it('create route includes body type from class-validator DTO', () => {
    class CreateDto {
      title!: string;
    }

    @CrudController({
      model: TestEntity as any,
      routes: { create: { schema: CreateDto } },
    })
    class TestCtrl extends RelayerController<any> {
      constructor() {
        super(null as any);
      }
    }

    const meta = getSwaggerMeta(TestCtrl.prototype, 'create');
    const bodyParam = (meta!.parameters as any[])?.find((p: any) => p.in === 'body');
    expect(bodyParam).toBeDefined();
    expect(bodyParam.type).toBe(CreateDto);
  });
});

describe('resolveBodyMeta', () => {
  it('returns undefined for falsy input', () => {
    expect(resolveBodyMeta(undefined)).toBeUndefined();
    expect(resolveBodyMeta(null)).toBeUndefined();
  });

  it('returns type for class constructor', () => {
    class MyDto {
      name!: string;
    }
    const result = resolveBodyMeta(MyDto);
    expect(result).toBeDefined();
    expect(result!.type).toBe(MyDto);
  });

  it('returns undefined for non-class values', () => {
    expect(resolveBodyMeta('string')).toBeUndefined();
    expect(resolveBodyMeta(42)).toBeUndefined();
  });
});
