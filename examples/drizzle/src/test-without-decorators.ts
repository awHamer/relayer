// @ts-ignore - esModuleInterop
import Database from 'better-sqlite3';
import { relations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createRelayerDrizzle, createRelayerEntity } from '@relayerjs/drizzle';

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
});

const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  published: integer('published', { mode: 'boolean' }).default(false).notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
});

const usersRelations = relations(users, ({ many }) => ({ posts: many(posts) }));
const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

const schema = { users, posts, usersRelations, postsRelations };

// Builder chain: no classes, no decorators
const User = createRelayerEntity(schema, 'users')
  .computed<string, 'fullName'>('fullName', {
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  .derived<number, 'postsCount'>('postsCount', {
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql`count(*)`, authorId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.authorId),
  });

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

async function main() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema, logger: false });

  sqlite.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL);
    CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, published INTEGER DEFAULT 0 NOT NULL, author_id INTEGER NOT NULL REFERENCES users(id));
  `);

  await db.insert(users).values([
    { firstName: 'Ihor', lastName: 'Ivanov', email: 'ihor@test.com' },
    { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
  ]);
  await db.insert(posts).values([
    { title: 'Hello World', published: true, authorId: 1 },
    { title: 'TypeScript Tips', published: true, authorId: 1 },
    { title: 'Draft', published: false, authorId: 2 },
  ]);

  const r = createRelayerDrizzle({ db, schema, entities: { users: User } });

  // 1. Kitchen sink
  log(
    'findMany: computed + derived + relations',
    await r.users.findMany({
      select: { id: true, fullName: true, postsCount: true, posts: { title: true } },
      where: { posts: { some: { published: true } } },
      orderBy: { field: 'postsCount', order: 'desc' },
    }),
  );

  // 2. findFirst
  log(
    'findFirst: top author',
    await r.users.findFirst({
      select: { id: true, fullName: true, postsCount: true },
      orderBy: { field: 'postsCount', order: 'desc' },
    }),
  );

  // 3. Aggregation
  log(
    'aggregate: posts by author',
    await r.posts.aggregate({ groupBy: ['author.fullName'], _count: true }),
  );

  // 4. Count
  log(
    'count: authors with published posts',
    await r.users.count({ where: { posts: { some: { published: true } } } }),
  );

  sqlite.close();
  console.log('\nBuilder chain (without decorators) example complete!');
}

main().catch(console.error);
