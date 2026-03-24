import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { expectTypeOf } from 'vitest';

// ---------------------------------------------------------------------------
// Builder chain (without decorators)
// ---------------------------------------------------------------------------
import { createRelayerDrizzle, createRelayerEntity } from '../../src';
import type {
  DotPaths,
  InferEntityOrderBy,
  InferEntitySelect,
  InferEntityWhere,
  InferModel,
  OrderByType,
  SelectType,
  WhereType,
} from '../../src';
import { PgUser } from '../fixtures/entities';
import * as schema from '../fixtures/pg-schema';

const r = createRelayerDrizzle({
  db: {} as any,
  schema,
  entities: { users: PgUser },
});

type UserWhere = InferEntityWhere<typeof r, 'users'>;
type UserSelect = InferEntitySelect<typeof r, 'users'>;
type UserOrderBy = InferEntityOrderBy<typeof r, 'users'>;

describe('InferEntityWhere', () => {
  it('includes scalar column operators', () => {
    expectTypeOf<UserWhere>().toHaveProperty('firstName');
    expectTypeOf<UserWhere>().toHaveProperty('email');
    expectTypeOf<UserWhere>().toHaveProperty('id');
  });

  it('includes computed field operators', () => {
    expectTypeOf<UserWhere>().toHaveProperty('fullName');
  });

  it('includes derived field operators', () => {
    expectTypeOf<UserWhere>().toHaveProperty('postsCount');
    expectTypeOf<UserWhere>().toHaveProperty('orderSummary');
  });

  it('includes relation filters', () => {
    expectTypeOf<UserWhere>().toHaveProperty('posts');
    expectTypeOf<UserWhere>().toHaveProperty('profile');
  });

  it('includes logical combinators', () => {
    expectTypeOf<UserWhere>().toHaveProperty('AND');
    expectTypeOf<UserWhere>().toHaveProperty('OR');
    expectTypeOf<UserWhere>().toHaveProperty('NOT');
  });

  it('includes $raw', () => {
    expectTypeOf<UserWhere>().toHaveProperty('$raw');
  });

  it('is assignable with valid where objects', () => {
    const where1: UserWhere = { firstName: 'John' };
    const where2: UserWhere = { firstName: { contains: 'John' } };
    const where3: UserWhere = { id: { gt: 1 } };
    const where4: UserWhere = { AND: [{ firstName: 'A' }], OR: [{ id: 1 }] };
    expect(where1).toBeDefined();
    expect(where2).toBeDefined();
    expect(where3).toBeDefined();
    expect(where4).toBeDefined();
  });
});

describe('InferEntitySelect', () => {
  it('includes scalar columns', () => {
    expectTypeOf<UserSelect>().toHaveProperty('firstName');
    expectTypeOf<UserSelect>().toHaveProperty('email');
    expectTypeOf<UserSelect>().toHaveProperty('id');
  });

  it('includes computed fields', () => {
    expectTypeOf<UserSelect>().toHaveProperty('fullName');
  });

  it('includes derived fields', () => {
    expectTypeOf<UserSelect>().toHaveProperty('postsCount');
    expectTypeOf<UserSelect>().toHaveProperty('orderSummary');
  });

  it('includes relations', () => {
    expectTypeOf<UserSelect>().toHaveProperty('posts');
    expectTypeOf<UserSelect>().toHaveProperty('profile');
  });

  it('is assignable with valid select objects', () => {
    const select1: UserSelect = { id: true, firstName: true };
    const select2: UserSelect = { id: true, fullName: true };
    const select3: UserSelect = { id: true, posts: { id: true, title: true } };
    expect(select1).toBeDefined();
    expect(select2).toBeDefined();
    expect(select3).toBeDefined();
  });
});

describe('InferEntityOrderBy', () => {
  it('is assignable with scalar field', () => {
    const ob: UserOrderBy = { field: 'firstName', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('is assignable with computed field', () => {
    const ob: UserOrderBy = { field: 'fullName', order: 'desc' };
    expect(ob).toBeDefined();
  });

  it('is assignable with derived field', () => {
    const ob: UserOrderBy = { field: 'postsCount', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('is assignable with dot notation for object-type derived', () => {
    const ob: UserOrderBy = { field: 'orderSummary.totalAmount', order: 'desc' };
    expect(ob).toBeDefined();
  });

  it('restricts order to asc | desc', () => {
    expectTypeOf<UserOrderBy['order']>().toEqualTypeOf<'asc' | 'desc'>();
  });

  // ─── Relation dot notation ─────────────────────────────────

  it('is assignable with relation dot notation', () => {
    const ob: UserOrderBy = { field: 'posts.title', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('is assignable with one-to-one relation dot notation', () => {
    const ob: UserOrderBy = { field: 'profile.bio', order: 'desc' };
    expect(ob).toBeDefined();
  });

  // ─── JSON path dot notation ────────────────────────────────

  it('is assignable with JSON path (top level)', () => {
    const ob: UserOrderBy = { field: 'metadata.role', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('is assignable with JSON path (nested)', () => {
    const ob: UserOrderBy = { field: 'metadata.settings.theme', order: 'desc' };
    expect(ob).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Nested relation types — derived/computed on relations
// ---------------------------------------------------------------------------
type PostWhere = InferEntityWhere<typeof r, 'posts'>;
type PostSelect = InferEntitySelect<typeof r, 'posts'>;
type PostOrderBy = InferEntityOrderBy<typeof r, 'posts'>;

describe('nested relation: select', () => {
  it('relation with scalar columns', () => {
    const s: PostSelect = { id: true, author: { firstName: true } };
    expect(s).toBeDefined();
  });

  it('relation with computed field on target', () => {
    const s: PostSelect = { id: true, author: { fullName: true } };
    expect(s).toBeDefined();
  });

  it('relation with derived field on target', () => {
    const s: PostSelect = { id: true, author: { postsCount: true } };
    expect(s).toBeDefined();
  });

  it('relation with object derived field on target', () => {
    const s: PostSelect = { id: true, author: { orderSummary: true } };
    expect(s).toBeDefined();
  });

  it('relation with object derived sub-field select', () => {
    const s: PostSelect = { id: true, author: { orderSummary: { totalAmount: true } } };
    expect(s).toBeDefined();
  });

  it('deep nesting: relation -> relation -> computed/derived', () => {
    const s: PostSelect = {
      id: true,
      author: {
        posts: {
          title: true,
          author: { fullName: true, postsCount: true, orderSummary: true },
        },
      },
    };
    expect(s).toBeDefined();
  });
});

describe('nested relation: where', () => {
  it('relation with scalar filter', () => {
    const w: PostWhere = { author: { firstName: 'Ihor' } };
    expect(w).toBeDefined();
  });

  it('relation with computed field filter', () => {
    const w: PostWhere = { author: { fullName: { contains: 'Ihor' } } };
    expect(w).toBeDefined();
  });

  it('relation with derived field filter', () => {
    const w: PostWhere = { author: { postsCount: { gte: 2 } } };
    expect(w).toBeDefined();
  });

  it('relation with some + computed', () => {
    const w: PostWhere = { author: { some: { fullName: { contains: 'test' } } } };
    expect(w).toBeDefined();
  });

  it('relation with nested relation filter', () => {
    const w: PostWhere = { author: { posts: { title: { contains: 'Hello' } } } };
    expect(w).toBeDefined();
  });
});

describe('nested relation: orderBy', () => {
  it('relation scalar column', () => {
    const ob: PostOrderBy = { field: 'author.firstName', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('relation computed field', () => {
    const ob: PostOrderBy = { field: 'author.fullName', order: 'desc' };
    expect(ob).toBeDefined();
  });

  it('relation derived field', () => {
    const ob: PostOrderBy = { field: 'author.postsCount', order: 'desc' };
    expect(ob).toBeDefined();
  });

  it('relation object derived sub-field', () => {
    const ob: PostOrderBy = { field: 'author.orderSummary.totalAmount', order: 'desc' };
    expect(ob).toBeDefined();
  });

  it('relation object derived other sub-field', () => {
    const ob: PostOrderBy = { field: 'author.orderSummary.orderCount', order: 'asc' };
    expect(ob).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Nested relation: aggregate
// ---------------------------------------------------------------------------
describe('nested relation: aggregate', () => {
  it('groupBy with relation derived', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    const opts: Opts = { groupBy: ['author.postsCount'], _count: true };
    expect(opts).toBeDefined();
  });

  it('groupBy with relation computed', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    const opts: Opts = { groupBy: ['author.fullName'], _count: true };
    expect(opts).toBeDefined();
  });

  it('groupBy with relation object derived sub-field', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    const opts: Opts = { groupBy: ['author.orderSummary.totalAmount'], _count: true };
    expect(opts).toBeDefined();
  });

  it('_sum with relation derived', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    const opts: Opts = { _sum: { 'author.postsCount': true } };
    expect(opts).toBeDefined();
  });

  it('_avg with relation object derived sub-field', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    const opts: Opts = { _avg: { 'author.orderSummary.totalAmount': true } };
    expect(opts).toBeDefined();
  });

  it('_min/_max with relation computed', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    const opts: Opts = { _min: { 'author.fullName': true }, _max: { 'author.fullName': true } };
    expect(opts).toBeDefined();
  });

  it('_sum with own derived field', () => {
    type Opts = Parameters<typeof r.users.aggregate>[0];
    const opts: Opts = { _sum: { postsCount: true } };
    expect(opts).toBeDefined();
  });

  it('rejects invalid aggregate field name', () => {
    type Opts = Parameters<typeof r.posts.aggregate>[0];
    // @ts-expect-error - 'author.orderSummary.totalAmount222' is not a valid field
    const opts: Opts = { _max: { 'author.orderSummary.totalAmount222': true } };
    expect(opts).toBeDefined();
  });
});

describe('relation nested select on users', () => {
  it('relation nested select with scalar columns', () => {
    const s: UserSelect = { id: true, posts: { id: true, title: true } };
    expect(s).toBeDefined();
  });

  it('relation nested select on one-to-one', () => {
    const s: UserSelect = { id: true, profile: { bio: true } };
    expect(s).toBeDefined();
  });

  it('relation nested select on one-to-many (orders)', () => {
    const s: UserSelect = { id: true, orders: { total: true, status: true } };
    expect(s).toBeDefined();
  });

  it('relation as boolean (load all)', () => {
    const s: UserSelect = { id: true, posts: true };
    expect(s).toBeDefined();
  });

  it('select with computed + relation combined', () => {
    const s: UserSelect = { id: true, fullName: true, posts: { title: true } };
    expect(s).toBeDefined();
  });
});

const UserChain = createRelayerEntity(schema, 'users')
  .computed<string, 'chainedName'>('chainedName', {
    resolve: ({ table, sql }: any) => sql`${table.firstName}`,
  })
  .derived<number, 'chainedCount'>('chainedCount', {
    query: ({ db, schema: s, sql, field }: any) =>
      db.select({ [field()]: sql`1`, userId: s.posts.authorId }).from(s.posts),
    on: ({ parent, derived, eq }: any) => eq(parent.id, derived.userId),
  });

const rChain = createRelayerDrizzle({
  db: {} as any,
  schema,
  entities: { users: UserChain },
});

type ChainUserSelect = InferEntitySelect<typeof rChain, 'users'>;
type ChainUserWhere = InferEntityWhere<typeof rChain, 'users'>;

describe('builder chain: types', () => {
  it('includes scalar columns', () => {
    expectTypeOf<ChainUserSelect>().toHaveProperty('firstName');
    expectTypeOf<ChainUserSelect>().toHaveProperty('id');
  });

  it('includes chained computed field', () => {
    expectTypeOf<ChainUserSelect>().toHaveProperty('chainedName');
  });

  it('includes chained derived field', () => {
    expectTypeOf<ChainUserSelect>().toHaveProperty('chainedCount');
  });

  it('includes relations', () => {
    expectTypeOf<ChainUserSelect>().toHaveProperty('posts');
    expectTypeOf<ChainUserSelect>().toHaveProperty('profile');
  });

  it('select is assignable with chained fields', () => {
    const s: ChainUserSelect = { id: true, chainedName: true, chainedCount: true };
    expect(s).toBeDefined();
  });

  it('where is assignable with chained fields', () => {
    const w: ChainUserWhere = { chainedName: { contains: 'test' } };
    expect(w).toBeDefined();
  });

  it('relation nested select works', () => {
    const s: ChainUserSelect = { id: true, posts: { title: true } };
    expect(s).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Standalone table without relations
// ---------------------------------------------------------------------------
const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
});

const standaloneSchema = { tags };
const rStandalone = createRelayerDrizzle({ db: {} as any, schema: standaloneSchema });
type TagWhere = InferEntityWhere<typeof rStandalone, 'tags'>;
type TagSelect = InferEntitySelect<typeof rStandalone, 'tags'>;

describe('table without relations', () => {
  it('where accepts scalar operators', () => {
    const w1: TagWhere = { name: 'test' };
    const w2: TagWhere = { name: { contains: 'test' } };
    const w3: TagWhere = { id: { gt: 1 } };
    const w4: TagWhere = { id: { gt: 1 }, name: { startsWith: 'a' } };
    const w5: TagWhere = { AND: [{ name: 'a' }], OR: [{ id: 1 }] };
    expect(w1).toBeDefined();
    expect(w2).toBeDefined();
    expect(w3).toBeDefined();
    expect(w4).toBeDefined();
    expect(w5).toBeDefined();
  });

  it('select accepts scalar columns', () => {
    const s1: TagSelect = { id: true, name: true };
    const s2: TagSelect = { slug: true };
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
  });

  it('where has correct properties', () => {
    expectTypeOf<TagWhere>().toHaveProperty('id');
    expectTypeOf<TagWhere>().toHaveProperty('name');
    expectTypeOf<TagWhere>().toHaveProperty('slug');
    expectTypeOf<TagWhere>().toHaveProperty('AND');
    expectTypeOf<TagWhere>().toHaveProperty('OR');
    expectTypeOf<TagWhere>().toHaveProperty('NOT');
  });
});

// ---------------------------------------------------------------------------
// InferModel + single-generic types
// ---------------------------------------------------------------------------
type UserModel = InferModel<typeof r, 'users'>;
type PostModel = InferModel<typeof r, 'posts'>;

describe('InferModel', () => {
  it('includes scalar fields', () => {
    expectTypeOf<UserModel>().toHaveProperty('id');
    expectTypeOf<UserModel>().toHaveProperty('firstName');
  });

  it('includes computed fields', () => {
    expectTypeOf<UserModel>().toHaveProperty('fullName');
  });

  it('includes derived fields', () => {
    expectTypeOf<UserModel>().toHaveProperty('postsCount');
    expectTypeOf<UserModel>().toHaveProperty('orderSummary');
  });
});

describe('SelectType<TModel>', () => {
  it('is assignable with scalar + custom fields', () => {
    const s: SelectType<UserModel> = { id: true, fullName: true, postsCount: true };
    expect(s).toBeDefined();
  });

  it('relation nested select', () => {
    const s: SelectType<UserModel> = { id: true, posts: { title: true } };
    expect(s).toBeDefined();
  });

  it('object derived sub-field select', () => {
    const s: SelectType<UserModel> = { id: true, orderSummary: { totalAmount: true } };
    expect(s).toBeDefined();
  });
});

describe('WhereType<TModel>', () => {
  it('is assignable with computed filter', () => {
    const w: WhereType<UserModel> = { fullName: { contains: 'Ihor' } };
    expect(w).toBeDefined();
  });

  it('is assignable with derived filter', () => {
    const w: WhereType<UserModel> = { postsCount: { gte: 2 } };
    expect(w).toBeDefined();
  });

  it('is assignable with relation filter', () => {
    const w: WhereType<UserModel> = { posts: { some: { title: { contains: 'Hello' } } } };
    expect(w).toBeDefined();
  });

  it('cross-relation computed in where', () => {
    const w: WhereType<PostModel> = { author: { fullName: { contains: 'Ihor' } } };
    expect(w).toBeDefined();
  });
});

describe('DotPaths<TModel>', () => {
  it('includes scalar fields', () => {
    const p: DotPaths<UserModel> = 'firstName';
    expect(p).toBeDefined();
  });

  it('includes custom fields', () => {
    const p: DotPaths<UserModel> = 'fullName';
    expect(p).toBeDefined();
  });

  it('includes object derived sub-field paths', () => {
    const p: DotPaths<UserModel> = 'orderSummary.totalAmount';
    expect(p).toBeDefined();
  });

  it('includes relation dot paths', () => {
    const p: DotPaths<PostModel> = 'author.fullName';
    expect(p).toBeDefined();
  });

  it('includes relation derived dot paths', () => {
    const p: DotPaths<PostModel> = 'author.postsCount';
    expect(p).toBeDefined();
  });

  it('includes relation object derived sub-field', () => {
    const p: DotPaths<PostModel> = 'author.orderSummary.totalAmount';
    expect(p).toBeDefined();
  });
});

describe('OrderByType<TModel>', () => {
  it('is assignable with computed field', () => {
    const ob: OrderByType<UserModel> = { field: 'fullName', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('is assignable with cross-relation derived', () => {
    const ob: OrderByType<PostModel> = { field: 'author.postsCount', order: 'desc' };
    expect(ob).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Types directly from entity class (no InferModel needed)
// ---------------------------------------------------------------------------
describe('SelectType<EntityClass> (direct, no InferModel)', () => {
  it('scalar + custom fields', () => {
    const s: SelectType<PgUser> = { id: true, fullName: true, postsCount: true };
    expect(s).toBeDefined();
  });

  it('object derived as boolean', () => {
    const s: SelectType<PgUser> = { id: true, orderSummary: true };
    expect(s).toBeDefined();
  });
});

describe('WhereType<EntityClass> (direct, no InferModel)', () => {
  it('computed filter', () => {
    const w: WhereType<PgUser> = { fullName: { contains: 'Ihor' } };
    expect(w).toBeDefined();
  });

  it('derived filter', () => {
    const w: WhereType<PgUser> = { postsCount: { gte: 2 } };
    expect(w).toBeDefined();
  });

  it('AND/OR', () => {
    const w: WhereType<PgUser> = { OR: [{ fullName: 'a' }, { postsCount: 1 }] };
    expect(w).toBeDefined();
  });
});

describe('DotPaths<EntityClass> (direct, no InferModel)', () => {
  it('own fields', () => {
    const p: DotPaths<PgUser> = 'fullName';
    expect(p).toBeDefined();
  });

  it('scalar fields', () => {
    const p: DotPaths<PgUser> = 'firstName';
    expect(p).toBeDefined();
  });
});

describe('OrderByType<EntityClass> (direct, no InferModel)', () => {
  it('computed field', () => {
    const ob: OrderByType<PgUser> = { field: 'fullName', order: 'asc' };
    expect(ob).toBeDefined();
  });

  it('derived field', () => {
    const ob: OrderByType<PgUser> = { field: 'postsCount', order: 'desc' };
    expect(ob).toBeDefined();
  });
});

describe('SelectResult: findMany/findFirst return type narrows by select', () => {
  it('findMany without select returns full instance', () => {
    type Result = Awaited<ReturnType<typeof r.users.findMany>>;
    type Item = Result[number];
    expectTypeOf<Item>().toHaveProperty('id');
    expectTypeOf<Item>().toHaveProperty('firstName');
    expectTypeOf<Item>().toHaveProperty('email');
    expectTypeOf<Item>().toHaveProperty('fullName');
  });

  it('findMany with select narrows to selected fields', () => {
    const fn = () => r.users.findMany({ select: { id: true, firstName: true } });
    type Result = Awaited<ReturnType<typeof fn>>;
    type Item = Result[number];
    expectTypeOf<Item>().toHaveProperty('id');
    expectTypeOf<Item>().toHaveProperty('firstName');
    expectTypeOf<Item>().not.toHaveProperty('email');
    expectTypeOf<Item>().not.toHaveProperty('lastName');
  });

  it('findFirst without select returns full instance or null', () => {
    type Result = Awaited<ReturnType<typeof r.users.findFirst>>;
    expectTypeOf<Result>().toBeNullable();
  });

  it('findFirst with select narrows to selected fields', () => {
    const fn = () => r.users.findFirst({ select: { id: true, email: true } });
    type Result = NonNullable<Awaited<ReturnType<typeof fn>>>;
    expectTypeOf<Result>().toHaveProperty('id');
    expectTypeOf<Result>().toHaveProperty('email');
    expectTypeOf<Result>().not.toHaveProperty('firstName');
  });

  it('select with computed field includes it', () => {
    const fn = () => r.users.findMany({ select: { id: true, fullName: true } });
    type Result = Awaited<ReturnType<typeof fn>>;
    type Item = Result[number];
    expectTypeOf<Item>().toHaveProperty('id');
    expectTypeOf<Item>().toHaveProperty('fullName');
    expectTypeOf<Item>().not.toHaveProperty('email');
  });
});

describe('AggregateResult: aggregate return type narrows by options', () => {
  it('_count: true produces _count: number', () => {
    const fn = () => r.users.aggregate({ _count: true });
    type Result = Awaited<ReturnType<typeof fn>>;
    expectTypeOf<Result>().toHaveProperty('_count');
    expectTypeOf<Result['_count']>().toBeNumber();
  });

  it('_sum produces nested object with number | null', () => {
    const fn = () => r.posts.aggregate({ _sum: { id: true } });
    type Result = Awaited<ReturnType<typeof fn>>;
    expectTypeOf<Result>().toHaveProperty('_sum');
    expectTypeOf<Result['_sum']>().toHaveProperty('id');
  });

  it('without groupBy returns single object (not array)', () => {
    const fn = () => r.users.aggregate({ _count: true });
    type Result = Awaited<ReturnType<typeof fn>>;
    expectTypeOf<Result>().not.toBeArray();
  });

  it('with groupBy returns array', () => {
    const fn = () => r.orders.aggregate({ groupBy: ['status'], _count: true });
    type Result = Awaited<ReturnType<typeof fn>>;
    expectTypeOf<Result>().toBeArray();
  });

  it('groupBy materializes fields with original types', () => {
    const fn = () => r.orders.aggregate({ groupBy: ['status'], _count: true });
    type Result = Awaited<ReturnType<typeof fn>>;
    type Item = Result[number];
    expectTypeOf<Item>().toHaveProperty('status');
    expectTypeOf<Item>().toHaveProperty('_count');
  });

  it('multiple aggregate functions', () => {
    const fn = () =>
      r.orders.aggregate({
        groupBy: ['status'],
        _count: true,
        _sum: { total: true },
        _avg: { total: true },
      });
    type Result = Awaited<ReturnType<typeof fn>>;
    type Item = Result[number];
    expectTypeOf<Item>().toHaveProperty('status');
    expectTypeOf<Item>().toHaveProperty('_count');
    expectTypeOf<Item>().toHaveProperty('_sum');
    expectTypeOf<Item>().toHaveProperty('_avg');
  });

  it('relation dot path in groupBy', () => {
    const fn = () => r.posts.aggregate({ groupBy: ['author.firstName'], _count: true });
    type Result = Awaited<ReturnType<typeof fn>>;
    type Item = Result[number];
    expectTypeOf<Item>().toHaveProperty('author');
    expectTypeOf<Item>().toHaveProperty('_count');
  });

  it('relation dot path in _sum', () => {
    const fn = () => r.posts.aggregate({ _sum: { 'author.postsCount': true } });
    type Result = Awaited<ReturnType<typeof fn>>;
    expectTypeOf<Result>().toHaveProperty('_sum');
  });
});
