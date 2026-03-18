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
import { createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';

// ─── MySQL Schema ────────────────────────────────────────

const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  metadata: json('metadata').$type<{
    role: string;
    level: number;
    settings: { theme: string; notifications: boolean };
  }>(),
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

const profiles = mysqlTable('profiles', {
  id: serial('id').primaryKey(),
  bio: text('bio'),
  userId: int('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
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

  // Create tables
  await connection.query(`DROP TABLE IF EXISTS profiles, orders, posts, users`);
  await connection.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      metadata JSON
    )
  `);
  await connection.query(`
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      published BOOLEAN DEFAULT FALSE NOT NULL,
      author_id BIGINT UNSIGNED NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);
  await connection.query(`
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      user_id BIGINT UNSIGNED NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await connection.query(`
    CREATE TABLE profiles (
      id SERIAL PRIMARY KEY,
      bio TEXT,
      user_id BIGINT UNSIGNED NOT NULL UNIQUE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const db = drizzle(connection, { schema, mode: 'default', logger: true });

  // Seed
  await db.insert(users).values([
    {
      firstName: 'Ihor',
      lastName: 'Ivanov',
      email: 'ihor@test.com',
      metadata: { role: 'admin', level: 10, settings: { theme: 'dark', notifications: true } },
    },
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      metadata: { role: 'user', level: 3, settings: { theme: 'light', notifications: false } },
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@test.com',
      metadata: { role: 'admin', level: 7, settings: { theme: 'dark', notifications: true } },
    },
  ]);
  await db.insert(posts).values([
    { title: 'Hello World', content: 'First post', published: true, authorId: 1 },
    { title: 'TypeScript Tips', content: 'TS is great', published: true, authorId: 1 },
    { title: 'Draft Post', content: 'WIP', published: false, authorId: 2 },
    { title: 'Hello Relayer', content: 'Testing relayer', published: true, authorId: 3 },
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

  console.log('MySQL seeded!\n');

  const r = createRelayerDrizzle({
    db,
    schema,
    entities: {
      users: {
        fields: {
          fullName: {
            type: FieldType.Computed,
            valueType: 'string',
            resolve: ({ table, sql }) => sql`CONCAT(${table.firstName}, ' ', ${table.lastName})`,
          },
          postsCount: {
            type: FieldType.Derived,
            valueType: 'number',
            query: ({ db, schema: s, sql, field }) =>
              db
                .select({
                  [field()]: sql<number>`COUNT(*)`,
                  userId: s.posts.authorId,
                })
                .from(s.posts)
                .groupBy(s.posts.authorId),
            on: ({ parent, derived: d, eq }) => eq(parent.id, d.userId),
          },
          orderSummary: {
            type: FieldType.Derived,
            valueType: {
              totalAmount: 'string',
              orderCount: 'number',
            },
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
          },
        },
      },
    },
  });

  // ═══════════════════════════════════════════════════════
  // BASIC QUERIES
  // ═══════════════════════════════════════════════════════

  log(
    'findMany all users',
    await r.users.findMany({ select: { id: true, firstName: true, email: true } }),
  );

  log(
    'where contains',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { contains: 'ihor' } },
    }),
  );

  log(
    'where AND/OR',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { OR: [{ firstName: 'Ihor' }, { firstName: 'Jane' }] },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════

  log('computed: fullName', await r.users.findMany({ select: { id: true, fullName: true } }));

  // ═══════════════════════════════════════════════════════
  // DERIVED (scalar + object-type)
  // ═══════════════════════════════════════════════════════

  log(
    'derived: postsCount',
    await r.users.findMany({ select: { id: true, firstName: true, postsCount: true } }),
  );

  log(
    'derived object: orderSummary',
    await r.users.findMany({ select: { id: true, firstName: true, orderSummary: true } }),
  );

  log(
    'derived object: orderSummary sub-field select',
    await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: { totalAmount: true } },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════

  log(
    'one-to-many: users -> posts',
    await r.users.findMany({
      select: { id: true, firstName: true, posts: { id: true, title: true } },
    }),
  );

  log(
    'one-to-many: users -> orders',
    await r.users.findMany({
      select: { id: true, firstName: true, orders: { total: true, status: true } },
    }),
  );

  log(
    'one-to-one: users -> profile',
    await r.users.findMany({ select: { id: true, firstName: true, profile: { bio: true } } }),
  );

  log(
    'many-to-one: posts -> author',
    await r.posts.findMany({ select: { id: true, title: true, author: { firstName: true } } }),
  );

  // ═══════════════════════════════════════════════════════
  // RELATION FILTERING
  // ═══════════════════════════════════════════════════════

  log(
    'where: posts $some published',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { posts: { $some: { published: true } } },
    }),
  );

  log(
    'where: profile $exists true',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { profile: { $exists: true } },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // ILIKE FALLBACK (LOWER LIKE)
  // ═══════════════════════════════════════════════════════

  log(
    'ilike fallback (LOWER LIKE)',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { ilike: '%IHOR%' } },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // JSON FILTERING
  // ═══════════════════════════════════════════════════════

  log(
    'json: metadata.role = admin',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin' } },
    }),
  );

  log(
    'json: metadata.level >= 5',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { level: { gte: 5 } } },
    }),
  );

  log(
    'json: nested settings.theme contains dark',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { settings: { theme: { contains: 'dark' } } } },
    }),
  );

  log(
    'json: combined role=admin AND level >= 8',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin', level: { gte: 8 } } },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // ORDER BY
  // ═══════════════════════════════════════════════════════

  log(
    'orderBy: firstName desc',
    await r.users.findMany({
      select: { id: true, firstName: true },
      orderBy: { field: 'firstName', order: 'desc' },
    }),
  );

  log(
    'orderBy: computed fullName asc',
    await r.users.findMany({
      select: { id: true, fullName: true },
      orderBy: { field: 'fullName', order: 'asc' },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // COUNT + AGGREGATE
  // ═══════════════════════════════════════════════════════

  log('count', await r.users.count());

  log(
    'aggregate: orders by status',
    await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      _sum: { total: true },
    }),
  );

  log(
    'aggregate: dot notation groupBy (user.firstName)',
    await r.orders.aggregate({
      groupBy: ['user.firstName'],
      _count: true,
      _sum: { total: true },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // $RAW
  // ═══════════════════════════════════════════════════════

  log(
    '$raw: custom SQL',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: {
        $raw: ({ table, sql }) =>
          sql`${table.firstName} LIKE ${'%oh%'} OR ${table.lastName} LIKE ${'%smith%'}`,
      },
    }),
  );

  // ═══════════════════════════════════════════════════════
  // ISNULL / ISNOTNULL
  // ═══════════════════════════════════════════════════════

  log(
    'isNull: email',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { isNull: true } },
    }),
  );
  // expect: empty

  log(
    'isNotNull: email',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { isNotNull: true } },
    }),
  );
  // expect: all 3

  log(
    'isNull: metadata (full column)',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { isNull: true } },
    }),
  );
  // expect: empty (all have metadata)

  log(
    'isNotNull: metadata',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { isNotNull: true } },
    }),
  );
  // expect: all 3

  // ═══════════════════════════════════════════════════════
  // ORDERBY: RELATION DOT NOTATION
  // ═══════════════════════════════════════════════════════

  log(
    'orderBy: posts by author.firstName asc',
    await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.firstName', order: 'asc' },
    }),
  );
  // expect: Ihor's posts first, then Jane's, then John's

  log(
    'orderBy: posts by author.firstName desc + title asc',
    await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: [
        { field: 'author.firstName', order: 'desc' },
        { field: 'title', order: 'asc' },
      ],
    }),
  );

  // ═══════════════════════════════════════════════════════
  // ORDERBY: JSON PATH
  // ═══════════════════════════════════════════════════════

  log(
    'orderBy: users by metadata.role asc',
    await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      orderBy: { field: 'metadata.role', order: 'asc' },
    }),
  );
  // expect: admins first (admin < user)

  log(
    'orderBy: users by metadata.level desc',
    await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      orderBy: { field: 'metadata.level', order: 'desc' },
    }),
  );
  // expect: highest level first

  log(
    'orderBy: users by metadata.settings.theme asc',
    await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      orderBy: { field: 'metadata.settings.theme', order: 'asc' },
    }),
  );

  await connection.end();
  console.log('\nMySQL tests complete!');
}

main().catch(console.error);
