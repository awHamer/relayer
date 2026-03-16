import Database from 'better-sqlite3';
import { relations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createRelayerDrizzle, FieldType } from '../../src';

// ---------------------------------------------------------------------------
// Schema (inline)
// ---------------------------------------------------------------------------
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
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let sqlite: InstanceType<typeof Database>;
let db: ReturnType<typeof drizzle>;
let r: any;

beforeAll(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema, logger: false });

  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      metadata TEXT
    );
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      author_id INTEGER NOT NULL REFERENCES users(id)
    );
  `);

  db.insert(users)
    .values([
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
    ])
    .run();

  db.insert(posts)
    .values([
      { title: 'Hello World', content: 'First post', published: true, authorId: 1 },
      { title: 'TS Tips', content: 'TS is great', published: true, authorId: 1 },
      { title: 'Draft', content: 'WIP', published: false, authorId: 2 },
    ])
    .run();

  r = createRelayerDrizzle({
    db,
    schema: schema as unknown as Record<string, unknown>,
    entities: {
      users: {
        fields: {
          fullName: {
            type: FieldType.Computed,
            valueType: 'string',
            resolve: ({ table, sql }: any) => sql`${table.firstName} || ' ' || ${table.lastName}`,
          },
        },
      },
    },
  });
});

afterAll(() => {
  sqlite.close();
});

// ---------------------------------------------------------------------------
// dialect-specific: ilike (COLLATE NOCASE)
// ---------------------------------------------------------------------------
describe('dialect-specific: ilike', () => {
  it('ilike uses COLLATE NOCASE', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { ilike: '%IHOR%' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });
});

// ---------------------------------------------------------------------------
// dialect-specific: array operators (unsupported)
// ---------------------------------------------------------------------------
describe('dialect-specific: array operators', () => {
  it('arrayContains throws on SQLite', async () => {
    await expect(
      r.users.findMany({
        where: { email: { arrayContains: ['test'] } },
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// dialect-specific: JSON
// ---------------------------------------------------------------------------
describe('dialect-specific: JSON', () => {
  it('json_extract string match: metadata.role = admin', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin' } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('json_extract numeric gte: metadata.level >= 5', async () => {
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

  it('filters with where: firstName = Ihor', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: 'Ihor' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });
});

// ---------------------------------------------------------------------------
// core: computed field
// ---------------------------------------------------------------------------
describe('core: computed field', () => {
  it('select fullName returns concatenated value', async () => {
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
// core: relations
// ---------------------------------------------------------------------------
describe('core: relations', () => {
  it('one-to-many: users with posts', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, posts: { title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(3);
    // Ihor has 2 posts
    expect(results[0].posts).toHaveLength(2);
    expect(results[0].posts.map((p: any) => p.title).sort()).toEqual(['Hello World', 'TS Tips']);
    // John has 1 post
    expect(results[1].posts).toHaveLength(1);
    // Jane has 0 posts
    expect(results[2].posts).toEqual([]);
  });

  it('many-to-one: posts with author', async () => {
    const results = await r.posts.findMany({
      select: { id: true, author: { firstName: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(3);
    expect(results[0].author).toBeDefined();
    expect(results[0].author.firstName).toBe('Ihor');
    expect(results[2].author.firstName).toBe('John');
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
// core: mutations
// ---------------------------------------------------------------------------
describe('core: mutations', () => {
  it('create returns with RETURNING (id present)', async () => {
    const created = await r.users.create({
      data: { firstName: 'New', lastName: 'U', email: 'new@t.com' },
    });
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.firstName).toBe('New');
    expect(created.lastName).toBe('U');
    expect(created.email).toBe('new@t.com');
  });
});

// ---------------------------------------------------------------------------
// core: AND / OR
// ---------------------------------------------------------------------------
describe('core: AND/OR', () => {
  it('OR: firstName Ihor or Jane', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { OR: [{ firstName: 'Ihor' }, { firstName: 'Jane' }] },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });
});
