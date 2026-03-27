import { relations } from 'drizzle-orm';
import {
  decimal,
  int,
  json,
  boolean as mysqlBoolean,
  mysqlTable,
  serial,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';
import { createRelayerDrizzle, createRelayerEntity } from '@relayerjs/drizzle';

const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  metadata: json('metadata').$type<{ role: string; level: number }>(),
});

const posts = mysqlTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  published: mysqlBoolean('published').default(false).notNull(),
  authorId: int('author_id')
    .notNull()
    .references(() => users.id),
});

const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  userId: int('user_id')
    .notNull()
    .references(() => users.id),
});

const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  orders: many(orders),
}));
const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

const schema = { users, posts, orders, usersRelations, postsRelations, ordersRelations };

const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`CONCAT(${table.firstName}, ' ', ${table.lastName})`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql<number>`COUNT(*)`, userId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived: d, eq }) => eq(parent.id, d.userId),
  })
  postsCount!: number;

  @UserEntity.derived({
    shape: { totalAmount: 'string', orderCount: 'number' },
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({
          [field('totalAmount')]: sql<string>`COALESCE(SUM(${s.orders.total}), 0)`,
          [field('orderCount')]: sql<number>`COUNT(*)`,
          userId: s.orders.userId,
        })
        .from(s.orders)
        .groupBy(s.orders.userId),
    on: ({ parent, derived: d, eq }) => eq(parent.id, d.userId),
  })
  orderSummary!: { totalAmount: string; orderCount: number };
}

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'relayer',
    password: 'relayer',
    database: 'relayer_dev',
  });

  await connection.query('DROP TABLE IF EXISTS orders, posts, users');
  await connection.query(
    `CREATE TABLE users (id SERIAL PRIMARY KEY, first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, metadata JSON)`,
  );
  await connection.query(
    `CREATE TABLE posts (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT, published BOOLEAN DEFAULT FALSE NOT NULL, author_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (author_id) REFERENCES users(id))`,
  );
  await connection.query(
    `CREATE TABLE orders (id SERIAL PRIMARY KEY, total DECIMAL(10,2) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'pending', user_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`,
  );

  const db = drizzle(connection, { schema, mode: 'default', logger: false });

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
    { title: 'TypeScript Tips', content: 'TS is great', published: true, authorId: 1 },
    { title: 'Draft Post', content: 'WIP', published: false, authorId: 2 },
    { title: 'Hello Relayer', content: 'Testing', published: true, authorId: 3 },
  ]);
  await db.insert(orders).values([
    { total: '500.00', status: 'completed', userId: 1 },
    { total: '1500.00', status: 'completed', userId: 1 },
    { total: '200.00', status: 'pending', userId: 2 },
    { total: '3000.00', status: 'completed', userId: 3 },
  ]);

  const r = createRelayerDrizzle({ db, schema, entities: { users: User } });

  // 1. Kitchen sink
  log(
    'findMany: power users',
    await r.users.findMany({
      select: {
        id: true,
        fullName: true,
        postsCount: true,
        orderSummary: true,
        posts: { title: true, author: { fullName: true, postsCount: true } },
      },
      where: {
        metadata: { role: 'admin' },
        postsCount: { gte: 1 },
        posts: { some: { published: true } },
      },
      orderBy: { field: 'orderSummary.totalAmount', order: 'desc' },
      limit: 10,
    }),
  );

  // 2. OR + every + JSON sort
  log(
    'findMany: OR + every + JSON sort',
    await r.users.findMany({
      select: { id: true, fullName: true, orderSummary: { orderCount: true } },
      where: {
        OR: [{ metadata: { role: 'admin' } }, { orderSummary: { orderCount: { gte: 3 } } }],
        posts: { every: { published: true } },
      },
      orderBy: { field: 'metadata.level', order: 'desc' },
    }),
  );

  // 3. findFirst
  log(
    'findFirst: top author',
    await r.users.findFirst({
      select: { id: true, fullName: true, postsCount: true, orderSummary: true },
      where: { postsCount: { gte: 1 } },
      orderBy: { field: 'postsCount', order: 'desc' },
    }),
  );

  // 4. Aggregation
  log(
    'aggregate: orders by author + status',
    await r.orders.aggregate({
      groupBy: ['user.fullName', 'status'],
      where: { status: 'completed' },
      _count: true,
      _sum: { total: true },
      _avg: { total: true },
      _min: { total: true },
      _max: { total: true },
    }),
  );

  // 5. Count
  log(
    'count: admin authors with orders',
    await r.users.count({
      where: {
        metadata: { role: 'admin' },
        posts: { some: { published: true } },
        orderSummary: { orderCount: { gte: 1 } },
      },
    }),
  );

  // Bonus: MySQL streaming
  console.log('\n=== findManyStream ===');
  const stream = r.users.findManyStream({
    select: { id: true, fullName: true, postsCount: true },
    orderBy: { field: 'fullName', order: 'asc' },
  });
  for await (const user of stream) {
    console.log('  streamed:', user);
  }

  // 6. count() bigint fix
  const countResult = await r.users.count();
  log('count: type check', { count: countResult, type: typeof countResult });

  // 7. mode: 'insensitive'
  log(
    'findMany: mode insensitive contains',
    await r.users.findMany({
      select: { id: true, fullName: true },
      where: { firstName: { contains: 'ih', mode: 'insensitive' } },
    }),
  );

  // 8. $raw select
  log(
    'findFirst: $raw email returns string',
    await r.users.findFirst({
      select: { id: true, firstName: true, email: { $raw: true } },
    }),
  );

  await connection.end();
  console.log('\nMySQL example complete!');
}

main().catch(console.error);
