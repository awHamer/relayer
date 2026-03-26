import { describe, expectTypeOf, it } from 'vitest';

import type {
  CrudRoutes,
  EntityRepo,
  ListRouteConfig,
  RelayerInstance,
  RequestContext,
} from '../../src';
import type { DtoMapper } from '../../src/relayer.dto-mapper';
import type { RelayerHooks } from '../../src/relayer.hooks';
import type { RelayerService } from '../../src/relayer.service';

// Use Record<string, unknown> compatible type via intersection
type TestEntities = Record<string, unknown> & {
  posts: typeof PostEntity;
  comments: typeof CommentEntity;
};

class PostEntity {
  static __entityKey = 'posts' as const;
  static __schema = {};
  static __table = {};
  static __relayer = true as const;
  static __computed = new Map();
  static __derived = new Map();

  id!: number;
  title!: string;
  published!: boolean;
  authorId!: number;
}

class CommentEntity {
  static __entityKey = 'comments' as const;
  static __schema = {};
  static __table = {};
  static __relayer = true as const;
  static __computed = new Map();
  static __derived = new Map();

  id!: number;
  text!: string;
  postId!: number;
}

describe('RelayerService types', () => {
  it('service generic preserves entity type', () => {
    type PostService = RelayerService<PostEntity, TestEntities>;

    expectTypeOf<PostService['findMany']>().toBeFunction();
    expectTypeOf<PostService['findFirst']>().toBeFunction();
    expectTypeOf<PostService['create']>().toBeFunction();
    expectTypeOf<PostService['update']>().toBeFunction();
    expectTypeOf<PostService['delete']>().toBeFunction();
    expectTypeOf<PostService['count']>().toBeFunction();
    expectTypeOf<PostService['aggregate']>().toBeFunction();
    expectTypeOf<PostService['updateMany']>().toBeFunction();
    expectTypeOf<PostService['deleteMany']>().toBeFunction();
    expectTypeOf<PostService['createMany']>().toBeFunction();
  });

  it('findMany returns Promise of array', () => {
    type PostService = RelayerService<PostEntity, TestEntities>;
    type FindManyReturn = ReturnType<PostService['findMany']>;
    expectTypeOf<FindManyReturn>().toMatchTypeOf<Promise<unknown[]>>();
  });

  it('count returns Promise<number>', () => {
    type PostService = RelayerService<PostEntity, TestEntities>;
    type CountReturn = ReturnType<PostService['count']>;
    expectTypeOf<CountReturn>().toMatchTypeOf<Promise<number>>();
  });

  it('updateMany returns Promise with count', () => {
    type PostService = RelayerService<PostEntity, TestEntities>;
    type UpdateManyReturn = ReturnType<PostService['updateMany']>;
    expectTypeOf<UpdateManyReturn>().toMatchTypeOf<Promise<{ count: number }>>();
  });

  it('deleteMany returns Promise with count', () => {
    type PostService = RelayerService<PostEntity, TestEntities>;
    type DeleteManyReturn = ReturnType<PostService['deleteMany']>;
    expectTypeOf<DeleteManyReturn>().toMatchTypeOf<Promise<{ count: number }>>();
  });
});

describe('RelayerHooks types', () => {
  it('hook methods have correct signatures', () => {
    type PostHooks = RelayerHooks<PostEntity, TestEntities>;

    // beforeCreate accepts Partial<TEntity> and RequestContext
    type BeforeCreate = NonNullable<PostHooks['beforeCreate']>;
    expectTypeOf<BeforeCreate>().toBeFunction();
    expectTypeOf<Parameters<BeforeCreate>[0]>().toMatchTypeOf<Partial<PostEntity>>();
    expectTypeOf<Parameters<BeforeCreate>[1]>().toMatchTypeOf<RequestContext>();

    // afterCreate accepts TEntity and RequestContext
    type AfterCreate = NonNullable<PostHooks['afterCreate']>;
    expectTypeOf<AfterCreate>().toBeFunction();
    expectTypeOf<Parameters<AfterCreate>[0]>().toMatchTypeOf<PostEntity>();

    // afterFind accepts TEntity[] and RequestContext
    type AfterFind = NonNullable<PostHooks['afterFind']>;
    expectTypeOf<AfterFind>().toBeFunction();
    expectTypeOf<Parameters<AfterFind>[0]>().toMatchTypeOf<PostEntity[]>();
  });

  it('all hook methods are optional', () => {
    type PostHooks = RelayerHooks<PostEntity, TestEntities>;

    expectTypeOf<{}>().toMatchTypeOf<PostHooks>();
  });
});

describe('DtoMapper types', () => {
  it('requires toListItem and toSingleItem', () => {
    type Mapper = DtoMapper<
      PostEntity,
      { id: number; title: string },
      { id: number; title: string; extra: boolean }
    >;

    expectTypeOf<Mapper['toListItem']>().toBeFunction();
    expectTypeOf<Mapper['toSingleItem']>().toBeFunction();
  });

  it('toCreateInput and toUpdateInput are optional', () => {
    type Mapper = DtoMapper<PostEntity>;

    // Optional methods should be nullable
    expectTypeOf<Mapper['toCreateInput']>().toBeNullable();
    expectTypeOf<Mapper['toUpdateInput']>().toBeNullable();
  });

  it('default generic parameters make output types match entity', () => {
    type Mapper = DtoMapper<PostEntity>;

    type ListItemReturn = ReturnType<Mapper['toListItem']>;
    expectTypeOf<ListItemReturn>().toMatchTypeOf<PostEntity | Promise<PostEntity>>();

    type SingleItemReturn = ReturnType<Mapper['toSingleItem']>;
    expectTypeOf<SingleItemReturn>().toMatchTypeOf<PostEntity | Promise<PostEntity>>();
  });
});

describe('EntityRepo types', () => {
  it('has all CRUD methods', () => {
    type PostRepo = EntityRepo<PostEntity, TestEntities>;

    expectTypeOf<PostRepo['findMany']>().toBeFunction();
    expectTypeOf<PostRepo['findFirst']>().toBeFunction();
    expectTypeOf<PostRepo['count']>().toBeFunction();
    expectTypeOf<PostRepo['create']>().toBeFunction();
    expectTypeOf<PostRepo['createMany']>().toBeFunction();
    expectTypeOf<PostRepo['update']>().toBeFunction();
    expectTypeOf<PostRepo['updateMany']>().toBeFunction();
    expectTypeOf<PostRepo['delete']>().toBeFunction();
    expectTypeOf<PostRepo['deleteMany']>().toBeFunction();
    expectTypeOf<PostRepo['aggregate']>().toBeFunction();
  });
});

describe('RelayerInstance types', () => {
  it('maps entity keys to typed repos', () => {
    type Instance = RelayerInstance<TestEntities>;

    expectTypeOf<Instance>().toHaveProperty('posts');
    expectTypeOf<Instance>().toHaveProperty('comments');
  });
});

describe('Config types', () => {
  it('CrudRoutes accepts boolean or config objects', () => {
    type Routes = CrudRoutes<PostEntity, TestEntities>;

    expectTypeOf<{ list: true }>().toMatchTypeOf<Routes>();
    expectTypeOf<{ list: false }>().toMatchTypeOf<Routes>();
    expectTypeOf<{ create: true; delete: false }>().toMatchTypeOf<Routes>();
  });

  it('ListRouteConfig accepts typed defaults', () => {
    type Config = ListRouteConfig<PostEntity, TestEntities>;

    expectTypeOf<Config>().toHaveProperty('pagination');
    expectTypeOf<Config>().toHaveProperty('defaults');
    expectTypeOf<Config>().toHaveProperty('allow');
    expectTypeOf<Config>().toHaveProperty('maxLimit');
    expectTypeOf<Config>().toHaveProperty('defaultLimit');
    expectTypeOf<Config>().toHaveProperty('search');
  });
});
