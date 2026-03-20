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

const usersRelations = relations(users, ({ many }) => ({ posts: many(posts) }));
const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

const schema = { users, posts, usersRelations, postsRelations };

const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql`count(*)`, authorId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived, eq }) => eq(parent.id, derived.authorId),
  })
  postsCount!: number;
}

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

async function main() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema, logger: false });

  sqlite.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, metadata TEXT);
    CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT, published INTEGER DEFAULT 0 NOT NULL, author_id INTEGER NOT NULL REFERENCES users(id));
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
    { title: 'TypeScript Tips', content: 'TS is great', published: true, authorId: 1 },
    { title: 'Draft Post', content: 'WIP', published: false, authorId: 2 },
  ]);

  const r = createRelayerDrizzle({ db, schema, entities: { users: User } });

  // 1. Kitchen sink
  log(
    'findMany: nested relations + computed + derived + JSON filter',
    await r.users.findMany({
      select: {
        id: true,
        fullName: true,
        postsCount: true,
        posts: { title: true, author: { fullName: true } },
      },
      where: {
        metadata: { role: 'admin' },
        posts: { some: { published: true } },
      },
      orderBy: { field: 'postsCount', order: 'desc' },
    }),
  );

  // 2. OR + every + JSON orderBy
  log(
    'findMany: OR + every + JSON sort',
    await r.users.findMany({
      select: { id: true, fullName: true },
      where: {
        OR: [{ metadata: { role: 'admin' } }, { postsCount: { gte: 2 } }],
        posts: { every: { published: true } },
      },
      orderBy: { field: 'metadata.level', order: 'desc' },
    }),
  );

  // 3. findFirst
  log(
    'findFirst: top author',
    await r.users.findFirst({
      select: { id: true, fullName: true, postsCount: true },
      orderBy: { field: 'postsCount', order: 'desc' },
    }),
  );

  // 4. Aggregation
  log(
    'aggregate: posts by author',
    await r.posts.aggregate({
      groupBy: ['author.fullName'],
      _count: true,
    }),
  );

  // 5. Count
  log(
    'count: authors with published posts',
    await r.users.count({
      where: { posts: { some: { published: true } } },
    }),
  );

  sqlite.close();
  console.log('\nSQLite example complete!');
}

main().catch(console.error);
