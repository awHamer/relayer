import { relations } from 'drizzle-orm';
import {
  decimal,
  int,
  json,
  boolean as mysqlBoolean,
  mysqlTable,
  serial,
  text,
} from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import { createRelayerDrizzle } from '../../src';
import { mysqlAdapter } from '../../src/dialect';
import { createRelayerEntity } from '../../src/entity';

// ---------------------------------------------------------------------------
// Schema (inline)
// ---------------------------------------------------------------------------
const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  metadata: json('metadata').$type<{ role: string; level: number }>(),
});

const posts = mysqlTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: mysqlBoolean('published').notNull().default(false),
  authorId: int('author_id')
    .notNull()
    .references(() => users.id),
});

const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull(),
  userId: int('user_id')
    .notNull()
    .references(() => users.id),
});

const profiles = mysqlTable('profiles', {
  id: serial('id').primaryKey(),
  bio: text('bio'),
  userId: int('user_id')
    .notNull()
    .references(() => users.id),
});

const usersRelations = relations(users, ({ many, one }) => ({
  posts: many(posts),
  orders: many(orders),
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
}));

const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

const schema = {
  users,
  posts,
  orders,
  profiles,
  usersRelations,
  postsRelations,
  ordersRelations,
  profilesRelations,
};

const UserEntity = createRelayerEntity(schema, 'users');

class MysqlUser extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }: any) => sql`CONCAT(${table.firstName}, ' ', ${table.lastName})`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db: d, schema: s, sql }: any) =>
      d
        .select({ postsCount: sql`COUNT(*)`, userId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived: d, eq }: any) => eq(parent.id, d.userId),
  })
  postsCount!: number;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const MYSQL_URL = process.env.MYSQL_URL ?? 'mysql://relayer:relayer@localhost:3307/relayer_test';

let connection: mysql.Connection;
let db: any;
let r: any;

beforeAll(async () => {
  const rootConn = await mysql.createConnection('mysql://root:relayer@localhost:3307');
  await rootConn.query('CREATE DATABASE IF NOT EXISTS relayer_test');
  await rootConn.end();

  connection = await mysql.createConnection(MYSQL_URL);
  db = drizzle(connection, { schema, mode: 'default', logger: false });

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DROP TABLE IF EXISTS profiles, orders, posts, users');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  await connection.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      metadata JSON
    )
  `);
  await connection.query(`
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      author_id INT NOT NULL REFERENCES users(id)
    )
  `);
  await connection.query(`
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      total DECIMAL(10,2) NOT NULL,
      status TEXT NOT NULL,
      user_id INT NOT NULL REFERENCES users(id)
    )
  `);
  await connection.query(`
    CREATE TABLE profiles (
      id SERIAL PRIMARY KEY,
      bio TEXT,
      user_id INT NOT NULL REFERENCES users(id)
    )
  `);

  await db.insert(users).values([
    {
      firstName: 'Ihor',
      lastName: 'Ivanov',
      email: 'ihor@test.com',
      metadata: { role: 'admin', level: 10 },
    },
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      metadata: { role: 'user', level: 3 },
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@test.com',
      metadata: { role: 'admin', level: 7 },
    },
  ]);
  await db.insert(posts).values([
    { title: 'Hello World', content: 'First post', published: true, authorId: 1 },
    { title: 'TS Tips', content: 'TS is great', published: true, authorId: 1 },
    { title: 'Draft', content: 'WIP', published: false, authorId: 2 },
    { title: 'Hello Relayer', content: 'Testing', published: true, authorId: 3 },
  ]);
  await db.insert(orders).values([
    { total: '500.00', status: 'completed', userId: 1 },
    { total: '1500.00', status: 'completed', userId: 1 },
    { total: '200.00', status: 'pending', userId: 2 },
    { total: '3000.00', status: 'completed', userId: 3 },
  ]);
  await db.insert(profiles).values([
    { bio: 'Full-stack developer', userId: 1 },
    { bio: 'Backend engineer', userId: 2 },
  ]);

  r = createRelayerDrizzle({
    db,
    schema: schema as unknown as Record<string, unknown>,
    entities: { users: MysqlUser },
  });
});

afterAll(async () => {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DROP TABLE IF EXISTS profiles, orders, posts, users');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  await connection.end();
});

// ---------------------------------------------------------------------------
// dialect-specific: ilike
// ---------------------------------------------------------------------------
describe('dialect-specific: ilike', () => {
  it('ilike uses LOWER...LIKE LOWER fallback', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { ilike: '%IHOR%' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });
});

// ---------------------------------------------------------------------------
// dialect-specific: array operators
// ---------------------------------------------------------------------------
describe('dialect-specific: array operators', () => {
  it('array operators throw on MySQL', () => {
    expect(() => mysqlAdapter.arrayContains({} as any, [])).toThrow('not supported in MySQL');
  });
});

// ---------------------------------------------------------------------------
// dialect-specific: JSON
// ---------------------------------------------------------------------------
describe('dialect-specific: JSON', () => {
  it('json string match: metadata.role = admin', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin' } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('json numeric gte: metadata.level >= 5', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { level: { gte: 5 } } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });
});

// ---------------------------------------------------------------------------
// core: findMany
// ---------------------------------------------------------------------------
describe('core: findMany', () => {
  it('returns all users', async () => {
    const results = await r.users.findMany();
    expect(results).toHaveLength(3);
  });

  it('filters with where: email contains ihor', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { contains: 'ihor' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('ihor@test.com');
  });
});

// ---------------------------------------------------------------------------
// core: computed field
// ---------------------------------------------------------------------------
describe('core: computed field', () => {
  it('select fullName returns CONCAT result', async () => {
    const results = await r.users.findMany({
      select: { id: true, fullName: true },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(3);
    expect(results[0].fullName).toBe('Ihor Ivanov');
    expect(results[1].fullName).toBe('John Doe');
    expect(results[2].fullName).toBe('Jane Smith');
  });
});

// ---------------------------------------------------------------------------
// core: derived field
// ---------------------------------------------------------------------------
describe('core: derived field', () => {
  it('postsCount via deferred batch load', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, postsCount: true },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(3);
    expect(Number(results[0].postsCount)).toBe(2);
    expect(Number(results[1].postsCount)).toBe(1);
    expect(Number(results[2].postsCount)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// core: relations
// ---------------------------------------------------------------------------
describe('core: relations', () => {
  it('one-to-many: users with posts', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, posts: { title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(3);
    expect(results[0].posts).toHaveLength(2);
    expect(results[0].posts.map((p: any) => p.title).sort()).toEqual(['Hello World', 'TS Tips']);
    expect(results[1].posts).toHaveLength(1);
    expect(results[2].posts).toHaveLength(1);
  });

  it('many-to-one: posts with author', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true, author: { firstName: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    expect(results[0].author).toBeDefined();
    expect(results[0].author.firstName).toBe('Ihor');
    expect(results[2].author.firstName).toBe('John');
    expect(results[3].author.firstName).toBe('Jane');
  });
});

// ---------------------------------------------------------------------------
// core: relation filters
// ---------------------------------------------------------------------------
describe('core: relation filters', () => {
  it('some: users with at least one published post', async () => {
    const results = await r.users.findMany({
      where: { posts: { some: { published: true } } },
      select: { id: true, firstName: true },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('exists: users with a profile', async () => {
    const results = await r.users.findMany({
      where: { profile: { exists: true } },
      select: { id: true, firstName: true },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'John']);
  });
});

// ---------------------------------------------------------------------------
// core: count
// ---------------------------------------------------------------------------
describe('core: count', () => {
  it('count all users', async () => {
    const count = await r.users.count();
    expect(Number(count)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// core: aggregate
// ---------------------------------------------------------------------------
describe('core: aggregate', () => {
  it('groupBy with _count and _sum', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      _sum: { total: true },
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);

    const completed = results.find((row: any) => row.status === 'completed');
    const pending = results.find((row: any) => row.status === 'pending');

    expect(completed).toBeDefined();
    expect(completed._count).toBe(3);
    expect(completed._sum.total).toBe(5000);

    expect(pending).toBeDefined();
    expect(pending._count).toBe(1);
    expect(pending._sum.total).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// aggregate: nested result format + having
// ---------------------------------------------------------------------------
describe('aggregate: nested format', () => {
  it('_count is number', async () => {
    const result = await r.users.aggregate({ _count: true });
    expect(typeof (result as any)._count).toBe('number');
  });

  it('_sum returns nested object', async () => {
    const result = await r.orders.aggregate({ _sum: { total: true } });
    expect((result as any)._sum).toBeDefined();
    expect(typeof (result as any)._sum.total).toBe('number');
  });

  it('groupBy dot path returns nested object', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['user.firstName'],
      _count: true,
    });
    const first = (results as any[])[0];
    expect(first.user).toBeDefined();
    expect(first.user.firstName).toBeDefined();
  });

  it('having filters groups', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      having: { _count: { gte: 2 } },
    });
    expect(Array.isArray(results)).toBe(true);
    for (const row of results as any[]) {
      expect(row._count).toBeGreaterThanOrEqual(2);
    }
  });

  it('own derived field in aggregate (_sum postsCount)', async () => {
    const result = await r.users.aggregate({
      _sum: { postsCount: true },
    });
    expect((result as any)._sum).toBeDefined();
    expect(typeof (result as any)._sum.postsCount).toBe('number');
  });

  it('CAST for sum on string-typed column (numeric -> DECIMAL)', async () => {
    const result = await r.orders.aggregate({ _sum: { total: true } });
    expect((result as any)._sum).toBeDefined();
    expect(typeof (result as any)._sum.total).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// dialect-specific: mutations without RETURNING (must be LAST — mutates data)
// ---------------------------------------------------------------------------
describe('relation limits', () => {
  it('defaultRelationLimit caps many-type relations', async () => {
    const limited: any = createRelayerDrizzle({
      db,
      schema: schema as unknown as Record<string, unknown>,
      entities: { users: MysqlUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { id: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results[0].posts.length).toBeLessThanOrEqual(1);
  });

  it('$limit in select caps relation rows', async () => {
    const results = await r.users.findMany({
      select: { id: true, posts: { $limit: 1, id: true, title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    for (const user of results) {
      expect(user.posts.length).toBeLessThanOrEqual(1);
    }
  });

  it('$limit overrides defaultRelationLimit', async () => {
    const limited: any = createRelayerDrizzle({
      db,
      schema: schema as unknown as Record<string, unknown>,
      entities: { users: MysqlUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { $limit: 10, id: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Ihor has 2 posts, $limit: 10 overrides defaultRelationLimit: 1
    expect(results[0].posts).toHaveLength(2);
  });
});

describe('dialect-specific: mutations without RETURNING', () => {
  it('create inserts record successfully', async () => {
    const countBefore = await r.users.count();
    await r.users.create({
      data: { firstName: 'New', lastName: 'U', email: 'new@t.com' },
    });
    const countAfter = await r.users.count();
    expect(Number(countAfter)).toBe(Number(countBefore) + 1);
  });
});
