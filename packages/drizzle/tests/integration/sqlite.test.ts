import Database from 'better-sqlite3';
import { relations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createRelayerDrizzle } from '../../src';
import { createRelayerEntity } from '../../src/entity';

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

const UserEntity = createRelayerEntity(schema, 'users');

class SqliteUser extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }: any) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }: any) =>
      db
        .select({ [field()]: sql`count(*)`, authorId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived, eq }: any) => eq(parent.id, derived.authorId),
  })
  postsCount!: number;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field, context }: any) =>
      db
        .select({ [field()]: sql`count(*)`, authorId: s.posts.authorId })
        .from(s.posts)
        .where(context?.minPostId ? sql`${s.posts.id} >= ${context.minPostId}` : sql`1=1`)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived, eq }: any) => eq(parent.id, derived.authorId),
  })
  recentPostsCount!: number;
}

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
    entities: { users: SqliteUser },
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
// ---------------------------------------------------------------------------
// orderBy: relation dot notation
// ---------------------------------------------------------------------------
describe('orderBy: relation dot notation', () => {
  it('orders posts by author.firstName asc', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.firstName', order: 'asc' },
    });
    expect(results.length).toBeGreaterThan(0);
    // Ihor (authorId=1) has posts 1,2; John (authorId=2) has post 3
    // asc by firstName: Ihor < John → Ihor's posts first
    const ihorPostIds = results.filter((_: any, i: number) => i < 2).map((r: any) => r.id);
    expect(ihorPostIds).toEqual(expect.arrayContaining([1, 2]));
    expect(results[results.length - 1].id).toBe(3);
  });

  it('orders posts by author.firstName desc', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.firstName', order: 'desc' },
    });
    // desc: John first, then Ihor
    expect(results[0].id).toBe(3);
  });

  it('works with multiple orderBy including relation', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: [
        { field: 'author.firstName', order: 'asc' },
        { field: 'title', order: 'desc' },
      ],
    });
    expect(results.length).toBe(3);
    // Ihor's posts sorted by title desc: TS Tips, Hello World
    expect(results[0].title).toBe('TS Tips');
    expect(results[1].title).toBe('Hello World');
    // John's post
    expect(results[2].title).toBe('Draft');
  });
});

// ---------------------------------------------------------------------------
// orderBy: JSON path
// ---------------------------------------------------------------------------
describe('orderBy: JSON path', () => {
  it('orders users by metadata.role asc', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      where: { metadata: { isNotNull: true } },
      orderBy: { field: 'metadata.role', order: 'asc' },
    });
    // admin < user alphabetically
    expect(results.length).toBeGreaterThan(0);
    const roles = results.map((u: any) => u.metadata?.role);
    for (let i = 1; i < roles.length; i++) {
      expect(roles[i]! >= roles[i - 1]!).toBe(true);
    }
  });

  it('orders users by metadata.role desc', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      where: { metadata: { isNotNull: true } },
      orderBy: { field: 'metadata.role', order: 'desc' },
    });
    const roles = results.map((u: any) => u.metadata?.role);
    for (let i = 1; i < roles.length; i++) {
      expect(roles[i]! <= roles[i - 1]!).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// aggregate: relation derived/computed groupBy
// ---------------------------------------------------------------------------
describe('aggregate: relation derived/computed groupBy', () => {
  it('groupBy author.postsCount (derived on relation)', async () => {
    const results = await r.posts.aggregate({
      groupBy: ['author.postsCount'],
      _count: true,
    });
    expect(Array.isArray(results)).toBe(true);
    const arr = results as Record<string, unknown>[];
    // Ihor has 2 posts (postsCount=2), John has 1, Jane has 1
    expect(arr.length).toBeGreaterThan(0);
    const group2 = arr.find((r) => Number((r as any).author?.postsCount) === 2);
    expect(group2).toBeDefined();
    expect(group2!._count).toBe(2); // Ihor's 2 posts
  });

  it('groupBy author.fullName (computed on relation)', async () => {
    const results = await r.posts.aggregate({
      groupBy: ['author.fullName'],
      _count: true,
    });
    expect(Array.isArray(results)).toBe(true);
    const arr = results as Record<string, unknown>[];
    const ihor = arr.find((r) => String((r as any).author?.fullName).includes('Ihor'));
    expect(ihor).toBeDefined();
    expect(ihor!._count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// aggregate: _sum/_avg with dot-path fields
// ---------------------------------------------------------------------------
describe('aggregate: _sum/_avg with relation fields', () => {
  it('_sum on derived field (postsCount)', async () => {
    const result = await r.users.aggregate({
      _sum: { postsCount: true },
    });
    // Ihor: 2, John: 1, Jane/NullRole: NULL -> SUM = 3
    expect((result as any)._sum.postsCount).toBe(3);
  });

  it('_avg on derived field (postsCount)', async () => {
    const result = await r.users.aggregate({
      _avg: { postsCount: true },
    });
    expect((result as any)._avg.postsCount).toBeGreaterThan(0);
  });

  it('_sum on relation.derived (author.postsCount)', async () => {
    const result = await r.posts.aggregate({
      _sum: { 'author.postsCount': true },
    });
    // Each post carries its author's postsCount: Ihor(2)+Ihor(2)+John(1) = 5
    expect((result as any)._sum.author.postsCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// aggregate: nested format + having
// ---------------------------------------------------------------------------
describe('aggregate: nested format + having', () => {
  it('_count is number', async () => {
    const result = await r.users.aggregate({ _count: true });
    expect(typeof (result as any)._count).toBe('number');
  });

  it('groupBy returns nested groupBy keys', async () => {
    const results = await r.posts.aggregate({
      groupBy: ['author.fullName'],
      _count: true,
    });
    const first = (results as any[])[0];
    expect(first.author).toBeDefined();
    expect(first.author.fullName).toBeDefined();
  });

  it('having filters groups by _count', async () => {
    const results = await r.posts.aggregate({
      groupBy: ['author.fullName'],
      _count: true,
      having: { _count: { gte: 2 } },
    });
    expect(Array.isArray(results)).toBe(true);
    for (const row of results as any[]) {
      expect(row._count).toBeGreaterThanOrEqual(2);
    }
  });
});

// ---------------------------------------------------------------------------
// orderBy: relation derived field
// ---------------------------------------------------------------------------
describe('orderBy: relation derived field', () => {
  it('orders posts by author.postsCount desc', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.postsCount', order: 'desc' },
    });
    expect(results.length).toBeGreaterThan(0);
    // Ihor has 2 posts, John has 1 -> Ihor's posts should come first
  });
});

// ---------------------------------------------------------------------------
// where: relation derived field
// ---------------------------------------------------------------------------
describe('where: relation derived field', () => {
  it('filters posts by author.postsCount', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      where: { author: { postsCount: { gte: 2 } } },
    });
    // Only Ihor has 2+ posts
    expect(results.length).toBe(2);
  });

  it('where: relation computed field author.fullName', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      where: { author: { fullName: { contains: 'Ihor' } } },
    });
    // Only Ihor's posts should match
    expect(results.length).toBe(2);
  });

  it('relation computed field: posts sorted by author.fullName', async () => {
    // Computed field on relation target: author.fullName
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.fullName', order: 'asc' },
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('context propagates to relation derived field in where', async () => {
    // With context minPostId=2: recentPostsCount counts posts with id >= 2
    // Ihor has posts 1,2 -> recentPostsCount = 1 (only post 2)
    // John has post 3 -> recentPostsCount = 1
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      where: { author: { recentPostsCount: { gte: 1 } } },
      context: { minPostId: 2 },
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('maxRelationDepth=0 disables relation derived orderBy', async () => {
    const rLimited: any = createRelayerDrizzle({
      db,
      schema: schema as unknown as Record<string, unknown>,
      entities: { users: SqliteUser },
      maxRelationDepth: 0,
    });
    // With depth 0, relation derived fields in orderBy should be silently ignored
    const results = await rLimited.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.postsCount', order: 'desc' },
    });
    // Should still return results (just not sorted by derived field)
    expect(results.length).toBeGreaterThan(0);
  });

  it('context propagates to relation derived field in orderBy', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.recentPostsCount', order: 'desc' },
      context: { minPostId: 3 },
    });
    expect(results.length).toBeGreaterThan(0);
    // John has post 3 (id >= 3) -> recentPostsCount = 1
    // Ihor has posts 1,2 (none >= 3) -> recentPostsCount = 0
    // John's post should come first
    expect(results[0].id).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// where: array shorthand for IN
// ---------------------------------------------------------------------------
describe('where: array shorthand', () => {
  it('array value as IN shorthand', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: ['Ihor', 'Jane'] },
    });
    expect(results).toHaveLength(2);
    expect(results.map((u: any) => u.firstName).sort()).toEqual(['Ihor', 'Jane']);
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

describe('relation limits', () => {
  it('defaultRelationLimit caps many-type relations', async () => {
    const limited: any = createRelayerDrizzle({
      db,
      schema: schema as unknown as Record<string, unknown>,
      entities: { users: SqliteUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { id: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Ihor has 2 posts but limit is 1
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
      entities: { users: SqliteUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { $limit: 10, id: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results[0].posts).toHaveLength(2);
  });
});
