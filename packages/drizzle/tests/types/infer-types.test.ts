// ---------------------------------------------------------------------------
// Table without relations — scalar where must still work
// ---------------------------------------------------------------------------
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { expectTypeOf } from 'vitest';

import { createRelayerDrizzle, FieldType } from '../../src';
import type { InferEntityOrderBy, InferEntitySelect, InferEntityWhere } from '../../src';
import * as schema from '../fixtures/pg-schema';

const r = createRelayerDrizzle({
  db: {} as any,
  schema,
  entities: {
    users: {
      fields: {
        fullName: {
          type: FieldType.Computed,
          valueType: 'string' as const,
          resolve: ({ table, sql }: any) => sql`${table.firstName}`,
        },
        postsCount: {
          type: FieldType.Derived,
          valueType: 'number' as const,
          query: ({ db, schema: s, sql }: any) =>
            db.select({ postsCount: sql`1`, userId: s.posts.authorId }).from(s.posts),
          on: ({ parent, derived, eq }: any) => eq(parent.id, derived.userId),
        },
        orderSummary: {
          type: FieldType.Derived,
          valueType: { totalAmount: 'string', orderCount: 'number' },
          query: ({ db, schema: s, sql }: any) =>
            db.select({ orderSummary_totalAmount: sql`1`, userId: s.orders.userId }).from(s.orders),
          on: ({ parent, derived, eq }: any) => eq(parent.id, derived.userId),
        },
      },
    },
  },
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
});

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
