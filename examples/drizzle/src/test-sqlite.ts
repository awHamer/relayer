// @ts-ignore - esModuleInterop
import Database from 'better-sqlite3';
import { relations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';

// ─── SQLite Schema ───────────────────────────────────────

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  metadata: text('metadata', { mode: 'json' }).$type<{ role: string; level: number }>(),
});

const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  published: integer('published', { mode: 'boolean' }).default(false).notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
});

const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

const schema = { users, posts, usersRelations, postsRelations };

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

async function main() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema, logger: true });

  // Create tables
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      metadata TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      published INTEGER DEFAULT 0 NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id)
    )
  `);

  // Seed
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
  ]);

  console.log('SQLite seeded!');

  const r = createRelayerDrizzle({
    db,
    schema,
    entities: {
      users: {
        fields: {
          fullName: {
            type: FieldType.Computed,
            valueType: 'string',
            resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
          },
        },
      },
    },
  });

  // ─── Basic queries ─────────────────────────────────────

  log(
    'findMany all users',
    await r.users.findMany({
      select: { id: true, firstName: true, email: true },
    }),
  );

  log(
    'findMany with where',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { contains: 'ihor' } },
    }),
  );

  // ─── Computed ──────────────────────────────────────────

  log(
    'computed: fullName',
    await r.users.findMany({
      select: { id: true, fullName: true },
    }),
  );

  // ─── Relations ─────────────────────────────────────────

  log(
    'users -> posts (one-to-many)',
    await r.users.findMany({
      select: { id: true, firstName: true, posts: { id: true, title: true } },
    }),
  );

  log(
    'posts -> author (many-to-one)',
    await r.posts.findMany({
      select: { id: true, title: true, author: { firstName: true } },
    }),
  );

  // ─── ilike fallback (COLLATE NOCASE) ──────────────────

  log(
    'ilike fallback',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { ilike: '%IHOR%' } },
    }),
  );

  // ─── JSON filtering ───────────────────────────────────

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

  // ─── Count ─────────────────────────────────────────────

  log('count', await r.users.count());

  // ─── Aggregate ─────────────────────────────────────────

  log(
    'aggregate: posts by published',
    await r.posts.aggregate({
      groupBy: ['published'],
      _count: true,
    }),
  );

  // ─── Create + returning ────────────────────────────────

  log(
    'create with returning',
    await r.users.create({
      data: { firstName: 'New', lastName: 'User', email: 'new@test.com' },
    }),
  );

  log('count after create', await r.users.count());

  // ─── isNull / isNotNull ─────────────────────────────────

  log(
    'isNull: email',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { isNull: true } },
    }),
  );

  log(
    'isNotNull: email',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { isNotNull: true } },
    }),
  );

  log(
    'isNull: metadata',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { isNull: true } },
    }),
  );

  log(
    'isNotNull: metadata',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { isNotNull: true } },
    }),
  );

  sqlite.close();
  console.log('\nSQLite tests complete!');
}

main().catch(console.error);
