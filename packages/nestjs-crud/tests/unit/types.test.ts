import { describe, expectTypeOf, it } from 'vitest';

import type {
  CrudRoutes,
  EntityRepo,
  ListRouteConfig,
  RelayerInstance,
  RequestContext,
} from '../../src';
import { RelayerController } from '../../src/relayer.controller';
import type { DtoMapper } from '../../src/relayer.dto-mapper';
import { RelayerHooks } from '../../src/relayer.hooks';
import { RelayerService } from '../../src/relayer.service';

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

// ---------------------------------------------------------------------------
// typed context: type-level assertions
// ---------------------------------------------------------------------------
// Verifies that the TContext / TCtx / TQueryCtx generics narrow correctly
// across RelayerService, RelayerHooks, RelayerController, and that the
// default `unknown`/`RequestContext` behavior is preserved when generics
// are not provided.

interface TenantContext {
  tenantId: string;
}

interface AppCtx extends RequestContext {
  currentUser: { id: number; role: 'admin' | 'user' };
}

interface AppQueryCtx {
  currentUserId: number;
  isAdmin: boolean;
}

describe('RelayerService typed context', () => {
  it('default TContext is unknown', () => {
    type DefaultService = RelayerService<PostEntity, TestEntities>;
    type FindManyParam = Parameters<DefaultService['findMany']>[0];
    // context should be optional and unknown
    expectTypeOf<NonNullable<FindManyParam>['context']>().toEqualTypeOf<unknown>();
  });

  it('TContext narrows context option in findMany', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type FindManyParam = Parameters<ScopedService['findMany']>[0];
    expectTypeOf<NonNullable<FindManyParam>['context']>().toEqualTypeOf<
      TenantContext | undefined
    >();
  });

  it('TContext narrows context option in findFirst', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['findFirst']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in count', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['count']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in update (new)', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['update']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in updateMany (new)', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['updateMany']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in delete (new)', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['delete']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in deleteMany (new)', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['deleteMany']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in create (new)', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['create']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  it('TContext narrows context option in createMany (new)', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    type Param = Parameters<ScopedService['createMany']>[0];
    expectTypeOf<NonNullable<Param>['context']>().toEqualTypeOf<TenantContext | undefined>();
  });

  // Negative type-level test: passing a wrong context shape must error
  it('rejects wrong context type at compile time', () => {
    type ScopedService = RelayerService<PostEntity, TestEntities, TenantContext>;
    // The line below is a compile-time assertion: TS would error if uncommented
    // because { unrelated: 'x' } is not assignable to TenantContext.
    type Call = (svc: ScopedService) => Promise<unknown>;
    const _ok: Call = (svc) => svc.findMany({ context: { tenantId: 'x' } });
    // @ts-expect-error - context shape does not match TenantContext
    const _bad: Call = (svc) => svc.findMany({ context: { unrelated: 'x' } });
    expectTypeOf<Call>().toBeFunction();
    void _ok;
    void _bad;
  });
});

describe('RelayerHooks typed context', () => {
  it('default TCtx is RequestContext', () => {
    type DefaultHooks = RelayerHooks<PostEntity, TestEntities>;
    type BeforeCreate = NonNullable<DefaultHooks['beforeCreate']>;
    expectTypeOf<Parameters<BeforeCreate>[1]>().toMatchTypeOf<RequestContext>();
  });

  it('TCtx narrows beforeCreate ctx', () => {
    type AppHooks = RelayerHooks<PostEntity, TestEntities, AppCtx>;
    type BeforeCreate = NonNullable<AppHooks['beforeCreate']>;
    expectTypeOf<Parameters<BeforeCreate>[1]>().toEqualTypeOf<AppCtx>();
  });

  it('TCtx narrows ctx for ALL hook methods', () => {
    type AppHooks = RelayerHooks<PostEntity, TestEntities, AppCtx>;

    // Read hooks
    type BeforeFind = NonNullable<AppHooks['beforeFind']>;
    type AfterFind = NonNullable<AppHooks['afterFind']>;
    type BeforeFindOne = NonNullable<AppHooks['beforeFindOne']>;
    type AfterFindOne = NonNullable<AppHooks['afterFindOne']>;
    type BeforeCount = NonNullable<AppHooks['beforeCount']>;
    type BeforeAggregate = NonNullable<AppHooks['beforeAggregate']>;
    type AfterAggregate = NonNullable<AppHooks['afterAggregate']>;

    expectTypeOf<Parameters<BeforeFind>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterFind>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<BeforeFindOne>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterFindOne>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<BeforeCount>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<BeforeAggregate>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterAggregate>[1]>().toEqualTypeOf<AppCtx>();

    // Write hooks
    type BeforeCreate = NonNullable<AppHooks['beforeCreate']>;
    type AfterCreate = NonNullable<AppHooks['afterCreate']>;
    type BeforeUpdate = NonNullable<AppHooks['beforeUpdate']>;
    type AfterUpdate = NonNullable<AppHooks['afterUpdate']>;
    type BeforeDelete = NonNullable<AppHooks['beforeDelete']>;
    type AfterDelete = NonNullable<AppHooks['afterDelete']>;

    expectTypeOf<Parameters<BeforeCreate>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterCreate>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<BeforeUpdate>[2]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterUpdate>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<BeforeDelete>[1]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterDelete>[1]>().toEqualTypeOf<AppCtx>();

    // Relation hooks (4-arg signature, ctx is the 4th)
    type BeforeRelation = NonNullable<AppHooks['beforeRelation']>;
    type AfterRelation = NonNullable<AppHooks['afterRelation']>;
    expectTypeOf<Parameters<BeforeRelation>[3]>().toEqualTypeOf<AppCtx>();
    expectTypeOf<Parameters<AfterRelation>[3]>().toEqualTypeOf<AppCtx>();
  });
});

describe('RelayerController typed context', () => {
  it('default TCtx is RequestContext and TQueryCtx is unknown', () => {
    // Construct a default controller class to inspect protected method signatures
    class DefaultCtrl extends RelayerController<PostEntity, TestEntities> {
      callBuild(req: unknown) {
        return this.buildContext(req);
      }
      callBuildQuery(ctx: any) {
        return this.buildQueryContext(ctx);
      }
    }
    type Build = DefaultCtrl['callBuild'];
    type BuildQuery = DefaultCtrl['callBuildQuery'];

    expectTypeOf<ReturnType<Build>>().toMatchTypeOf<RequestContext>();
    expectTypeOf<ReturnType<BuildQuery>>().toMatchTypeOf<unknown>();
  });

  it('TCtx narrows buildContext return type', () => {
    class TypedCtrl extends RelayerController<
      PostEntity,
      TestEntities,
      DtoMapper<PostEntity, PostEntity, PostEntity>,
      AppCtx,
      AppQueryCtx
    > {
      callBuild(req: unknown) {
        return this.buildContext(req);
      }
    }
    type Build = TypedCtrl['callBuild'];
    expectTypeOf<ReturnType<Build>>().toEqualTypeOf<AppCtx>();
  });

  it('TQueryCtx narrows buildQueryContext signature', () => {
    class TypedCtrl extends RelayerController<
      PostEntity,
      TestEntities,
      DtoMapper<PostEntity, PostEntity, PostEntity>,
      AppCtx,
      AppQueryCtx
    > {
      callBuildQuery(ctx: AppCtx) {
        return this.buildQueryContext(ctx);
      }
    }
    type BuildQuery = TypedCtrl['callBuildQuery'];
    // Returns AppQueryCtx | undefined (because base default returns undefined)
    expectTypeOf<ReturnType<BuildQuery>>().toEqualTypeOf<AppQueryCtx | undefined>();
    // Argument must be AppCtx
    expectTypeOf<Parameters<BuildQuery>[0]>().toEqualTypeOf<AppCtx>();
  });

  it('controller TQueryCtx must align with service TContext', () => {
    // Critical: the constructor requires RelayerService<E, EM, TQueryCtx>.
    // Mismatch should be a compile error.
    class TypedCtrl extends RelayerController<
      PostEntity,
      TestEntities,
      DtoMapper<PostEntity, PostEntity, PostEntity>,
      AppCtx,
      AppQueryCtx
    > {}

    type CtorParam = ConstructorParameters<typeof TypedCtrl>[0];
    expectTypeOf<CtorParam>().toMatchTypeOf<
      RelayerService<PostEntity, TestEntities, AppQueryCtx>
    >();
  });
});
