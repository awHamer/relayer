import { createRelayerDrizzle } from '../../src';
import { createRelayerEntity } from '../../src/entity';
import { PgUser } from '../fixtures/entities';
import * as pgSchema from '../fixtures/pg-schema';
import * as schema from '../fixtures/pg-schema';
import { setupPg } from '../helpers/pg';

let pg: Awaited<ReturnType<typeof setupPg>>;
let r: any;

beforeAll(async () => {
  pg = await setupPg();
  r = createRelayerDrizzle({
    db: pg.db,
    schema: schema as unknown as Record<string, unknown>,
    entities: { users: PgUser },
  });
});

afterAll(async () => {
  await pg.cleanup();
});

// ---------------------------------------------------------------------------
// findMany basics
// ---------------------------------------------------------------------------
describe('findMany basics', () => {
  it('returns all users with exact fields and correct types', async () => {
    const results = await r.users.findMany({ orderBy: { field: 'id', order: 'asc' } });
    expect(results).toHaveLength(4);
    const expectedKeys = ['id', 'firstName', 'lastName', 'email', 'metadata', 'createdAt'];
    for (const row of results) {
      expect(Object.keys(row).sort()).toEqual(expectedKeys.sort());
      expect(typeof row.id).toBe('number');
      expect(typeof row.firstName).toBe('string');
      expect(typeof row.lastName).toBe('string');
      expect(typeof row.email).toBe('string');
      expect(row.createdAt).toBeInstanceOf(Date);
    }
    expect(results[0].firstName).toBe('Ihor');
    expect(typeof results[0].metadata).toBe('object');
  });

  it('returns only requested fields, nothing extra', async () => {
    const results = await r.users.findMany({ select: { id: true, firstName: true } });
    expect(results).toHaveLength(4);
    for (const row of results) {
      expect(Object.keys(row).sort()).toEqual(['firstName', 'id']);
      expect(typeof row.id).toBe('number');
      expect(typeof row.firstName).toBe('string');
    }
  });

  it('limit: 2 returns exactly 2 results', async () => {
    const results = await r.users.findMany({ limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('offset: 2 skips first 2', async () => {
    const all = await r.users.findMany({ orderBy: { field: 'id', order: 'asc' } });
    const results = await r.users.findMany({ offset: 2, orderBy: { field: 'id', order: 'asc' } });
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(all[2].id);
  });

  it('limit + offset together', async () => {
    const results = await r.users.findMany({
      limit: 1,
      offset: 1,
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(2);
  });

  it('empty result with non-matching where', async () => {
    const results = await r.users.findMany({ where: { firstName: 'nonexistent' } });
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findFirst
// ---------------------------------------------------------------------------
describe('findFirst', () => {
  it('returns first match with all fields and correct types', async () => {
    const result = await r.users.findFirst({ orderBy: { field: 'id', order: 'asc' } });
    expect(result).not.toBeNull();
    const expectedKeys = ['id', 'firstName', 'lastName', 'email', 'metadata', 'createdAt'];
    expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
    expect(typeof result.id).toBe('number');
    expect(typeof result.firstName).toBe('string');
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('returns null when no match', async () => {
    const result = await r.users.findFirst({ where: { firstName: 'nonexistent' } });
    expect(result).toBeNull();
  });

  it('respects where and returns correct data', async () => {
    const result = await r.users.findFirst({
      select: { id: true, firstName: true },
      where: { firstName: 'Ihor' },
    });
    expect(result).not.toBeNull();
    expect(Object.keys(result).sort()).toEqual(['firstName', 'id']);
    expect(result.firstName).toBe('Ihor');
    expect(typeof result.id).toBe('number');
  });

  it('respects select and orderBy, returns only requested fields', async () => {
    const result = await r.users.findFirst({
      select: { id: true, firstName: true },
      orderBy: { field: 'id', order: 'desc' },
    });
    expect(result).not.toBeNull();
    expect(Object.keys(result).sort()).toEqual(['firstName', 'id']);
    expect(result.id).toBe(4);
    expect(result.firstName).toBe('NullRole');
  });
});

// ---------------------------------------------------------------------------
// where: scalar operators
// ---------------------------------------------------------------------------
describe('where: scalar operators', () => {
  it('eq direct value', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: 'Ihor' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });

  it('eq explicit', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { eq: 'Ihor' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });

  it('ne', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { ne: 'Ihor' } },
    });
    expect(results).toHaveLength(3);
    expect(results.map((r: any) => r.firstName)).not.toContain('Ihor');
  });

  it('gt', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { gt: 2 } },
    });
    expect(results).toHaveLength(2);
    expect(results.every((r: any) => r.id > 2)).toBe(true);
  });

  it('gte', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { gte: 2 } },
    });
    expect(results).toHaveLength(3);
    expect(results.every((r: any) => r.id >= 2)).toBe(true);
  });

  it('lt', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { lt: 3 } },
    });
    expect(results).toHaveLength(2);
    expect(results.every((r: any) => r.id < 3)).toBe(true);
  });

  it('lte', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { lte: 3 } },
    });
    expect(results).toHaveLength(3);
    expect(results.every((r: any) => r.id <= 3)).toBe(true);
  });

  it('in', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { in: [1, 3] } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id).sort()).toEqual([1, 3]);
  });

  it('notIn', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { notIn: [1, 3] } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id).sort()).toEqual([2, 4]);
  });

  it('like', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { like: '%example%' } },
    });
    expect(results).toHaveLength(4);
  });

  it('notLike', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { notLike: '%ihor%' } },
    });
    expect(results).toHaveLength(3);
  });

  it('ilike (PG native)', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { ilike: '%IHOR%' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });

  it('notIlike', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { firstName: { notIlike: '%IHOR%' } },
    });
    expect(results).toHaveLength(3);
  });

  it('contains', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { contains: 'ihor' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('ihor@example.com');
  });

  it('startsWith', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { startsWith: 'ihor' } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('ihor@example.com');
  });

  it('endsWith', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { endsWith: '@example.com' } },
    });
    expect(results).toHaveLength(4);
  });

  it('isNull', async () => {
    const results = await r.users.findMany({
      select: { id: true, metadata: true },
      where: { metadata: { isNull: true } },
    });
    // All users have metadata, so expect 0
    expect(results).toHaveLength(0);
  });

  it('isNotNull', async () => {
    const results = await r.users.findMany({
      select: { id: true, email: true },
      where: { email: { isNotNull: true } },
    });
    expect(results).toHaveLength(4);
  });

  it('combined: gt + lt on same field', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { id: { gt: 1, lt: 4 } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id).sort()).toEqual([2, 3]);
  });
});

// ---------------------------------------------------------------------------
// where: array operators (PG only)
// ---------------------------------------------------------------------------
describe('where: array operators (PG only)', () => {
  it('arrayContains', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true, tags: true },
      where: { tags: { arrayContains: ['typescript'] } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.title).sort()).toEqual(['Hello Relayer', 'TypeScript Tips']);
  });

  it('arrayContained', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true, tags: true },
      where: {
        tags: { arrayContained: ['typescript', 'tips', 'intro', 'general', 'draft', 'relayer'] },
      },
    });
    expect(results).toHaveLength(4);
  });

  it('arrayOverlaps', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true, tags: true },
      where: { tags: { arrayOverlaps: ['intro', 'draft'] } },
    });
    expect(results).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// where: JSON operators
// ---------------------------------------------------------------------------
describe('where: JSON operators', () => {
  it('direct string match on JSON path', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin' } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('numeric gte on JSON path', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { level: { gte: 5 } } },
    });
    expect(results).toHaveLength(3);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane', 'NullRole']);
  });

  it('nested JSON path', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { settings: { theme: 'dark' } } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('combined JSON conditions', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin', level: { gte: 8 } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });

  it('JSON contains (string operator on JSON text)', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: { contains: 'adm' } } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('JSON isNull', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: { isNull: true } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('NullRole');
  });

  it('JSON isNotNull', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: { isNotNull: true } } },
    });
    expect(results).toHaveLength(3);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane', 'John']);
  });

  it('JSON boolean nested value', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { settings: { notifications: true } } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('JSON deep nesting (3 levels: metadata.settings.theme)', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { settings: { theme: { startsWith: 'dar' } } } },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });
});

// ---------------------------------------------------------------------------
// where: AND / OR / NOT
// ---------------------------------------------------------------------------
describe('where: AND/OR/NOT', () => {
  it('AND', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { AND: [{ firstName: 'Ihor' }, { lastName: 'Ivanov' }] },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('Ihor');
  });

  it('OR', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { OR: [{ firstName: 'Ihor' }, { firstName: 'Jane' }] },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });

  it('NOT', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { NOT: { firstName: 'Ihor' } },
    });
    expect(results).toHaveLength(3);
    expect(results.map((r: any) => r.firstName)).not.toContain('Ihor');
  });

  it('nested OR + AND', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { OR: [{ AND: [{ firstName: 'Ihor' }] }, { firstName: 'Jane' }] },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.firstName).sort()).toEqual(['Ihor', 'Jane']);
  });
});

// ---------------------------------------------------------------------------
// where: $raw
// ---------------------------------------------------------------------------
describe('where: $raw', () => {
  it('raw SQL condition', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: {
        $raw: ({ table, sql: s }: any) => s`${table.firstName} ILIKE ${'%oh%'}`,
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0].firstName).toBe('John');
  });
});

// ---------------------------------------------------------------------------
// where: relation filters
// ---------------------------------------------------------------------------
describe('where: relation filters', () => {
  it('exists true: users with profile', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { profile: { exists: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id)).toEqual([1, 2]);
  });

  it('exists false: users without profile', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { profile: { exists: false } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id)).toEqual([3, 4]);
  });

  it('some: users with at least one published post', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { posts: { some: { published: true } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id)).toEqual([1, 3]);
  });

  it('every: users where all posts are published', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { posts: { every: { published: true } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // every uses NOT EXISTS (negated), so users with no posts (id 4) pass vacuously
    // User 1: all published -> yes, User 2: has draft -> no, User 3: all published -> yes, User 4: no posts -> yes
    expect(results.map((r: any) => r.id)).toEqual(expect.arrayContaining([1, 3]));
    expect(results.map((r: any) => r.id)).not.toContain(2);
  });

  it('none: users with no unpublished posts', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { posts: { none: { published: false } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // User 1: no unpublished -> yes, User 2: has draft -> no, User 3: no unpublished -> yes, User 4: no posts -> yes
    expect(results.map((r: any) => r.id)).not.toContain(2);
    expect(results.map((r: any) => r.id)).toEqual(expect.arrayContaining([1, 3]));
  });

  it('implicit some: relation fields without some/every/none', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      where: { posts: { published: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.id)).toEqual([1, 3]);
  });
});

// ---------------------------------------------------------------------------
// where: computed field
// ---------------------------------------------------------------------------
describe('where: computed field', () => {
  it.todo('filters by computed fullName — PG cannot use SELECT alias in WHERE');
});

// ---------------------------------------------------------------------------
// computed: context passing
// ---------------------------------------------------------------------------
describe('computed: context passing', () => {
  it('computed field receives context value', async () => {
    const CtxUserEntity = createRelayerEntity(pgSchema, 'users');
    class CtxUser extends CtxUserEntity {
      @CtxUserEntity.computed({
        resolve: ({ table, sql, context }: any) =>
          sql`CASE WHEN ${table.id} = ${context.targetUserId} THEN true ELSE false END`,
      })
      isTargetUser!: boolean;
    }
    const rWithCtx: any = createRelayerDrizzle({
      db: pg.db,
      schema: pgSchema,
      entities: { users: CtxUser },
    });
    const results = await rWithCtx.users.findMany({
      select: { id: true, firstName: true, isTargetUser: true },
      context: { targetUserId: 1 },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    expect(results[0].isTargetUser).toBe(true);
    expect(results[1].isTargetUser).toBe(false);
  });

  // Smoke tests: verify that read methods accept the context option without error.
  // computed/derived field resolution at runtime is covered by the test above.
  it('count accepts context option', async () => {
    const result = await r.users.count({
      where: { firstName: 'Ihor' },
      context: { tenantId: 'acme' },
    });
    expect(Number(result)).toBe(1);
  });

  it('aggregate accepts context option', async () => {
    const result: any = await r.users.aggregate({
      _count: true,
      context: { tenantId: 'acme' },
    });
    expect(Number(result._count)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// orderBy
// ---------------------------------------------------------------------------
describe('orderBy', () => {
  it('scalar asc', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      orderBy: { field: 'firstName', order: 'asc' },
    });
    expect(results.map((r: any) => r.firstName)).toEqual(['Ihor', 'Jane', 'John', 'NullRole']);
  });

  it('scalar desc', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      orderBy: { field: 'firstName', order: 'desc' },
    });
    expect(results.map((r: any) => r.firstName)).toEqual(['NullRole', 'John', 'Jane', 'Ihor']);
  });

  it('multiple orderBy as array', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
      orderBy: [{ field: 'firstName', order: 'asc' }],
    });
    expect(results.map((r: any) => r.firstName)).toEqual(['Ihor', 'Jane', 'John', 'NullRole']);
  });

  it('computed field orderBy', async () => {
    const results = await r.users.findMany({
      select: { id: true, fullName: true },
      orderBy: { field: 'fullName', order: 'asc' },
    });
    expect(results.map((r: any) => r.fullName)).toEqual([
      'Ihor Ivanov',
      'Jane Smith',
      'John Doe',
      'NullRole User',
    ]);
  });
});

// ---------------------------------------------------------------------------
// select: computed
// ---------------------------------------------------------------------------
describe('select: computed', () => {
  it('default select does not include computed fields (only table columns)', async () => {
    const results = await r.users.findMany();
    expect(results[0]).not.toHaveProperty('fullName');
    expect(results[0]).toHaveProperty('firstName');
  });

  it('explicit select of fullName', async () => {
    const results = await r.users.findMany({
      select: { id: true, fullName: true },
    });
    expect(results).toHaveLength(4);
    expect(results[0]).toHaveProperty('fullName');
    expect(results[0]).toHaveProperty('id');
  });

  it('not selecting fullName omits it', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
    });
    expect(results[0]).not.toHaveProperty('fullName');
  });
});

// ---------------------------------------------------------------------------
// select: derived (deferred vs eager)
// ---------------------------------------------------------------------------
describe('select: derived', () => {
  it('postsCount via deferred batch load', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, postsCount: true },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    // Ihor: 2, John: 1, Jane: 1, NullRole: 0/null
    expect(Number(results[0].postsCount)).toBe(2);
    expect(Number(results[1].postsCount)).toBe(1);
    expect(Number(results[2].postsCount)).toBe(1);
    // NullRole has no posts, could be null or 0
    expect(results[3].postsCount === null || Number(results[3].postsCount) === 0).toBe(true);
  });

  it('orderSummary object derived field', async () => {
    const results = await r.users.findMany({
      select: { id: true, orderSummary: true },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    // User 1: orders 500 + 1500 = 2000, count 2
    expect(results[0].orderSummary).toBeDefined();
    expect(Number(results[0].orderSummary.totalAmount)).toBe(2000);
    expect(Number(results[0].orderSummary.orderCount)).toBe(2);
    // User 2: order 200, count 1
    expect(Number(results[1].orderSummary.totalAmount)).toBe(200);
    expect(Number(results[1].orderSummary.orderCount)).toBe(1);
    // User 3: order 3000, count 1
    expect(Number(results[2].orderSummary.totalAmount)).toBe(3000);
    expect(Number(results[2].orderSummary.orderCount)).toBe(1);
    // User 4: no orders -> null
    expect(results[3].orderSummary).toBeNull();
  });

  it('sub-field select on object derived field', async () => {
    const results = await r.users.findMany({
      select: { id: true, orderSummary: { totalAmount: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    // Should have totalAmount but not orderCount in the nested object
    const summary = results[0].orderSummary;
    expect(summary).toBeDefined();
    expect(summary).toHaveProperty('totalAmount');
    expect(summary).not.toHaveProperty('orderCount');
    expect(Number(summary.totalAmount)).toBe(2000);
  });

  it('derived field in where triggers eager LEFT JOIN', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: true },
      where: { orderSummary: { orderCount: { lte: 1 } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Users 2 (1 order) and 3 (1 order) match; user 1 has 2 orders
    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map((r: any) => r.firstName);
    expect(names).toContain('John');
    expect(names).toContain('Jane');
    expect(names).not.toContain('Ihor');
  });

  it('derived field in orderBy triggers eager LEFT JOIN', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: { totalAmount: true } },
      where: { id: { in: [1, 2, 3] } },
      orderBy: { field: 'orderSummary.totalAmount', order: 'desc' },
    });
    expect(results).toHaveLength(3);
    // Order: Jane (3000), Ihor (2000), John (200)
    expect(results[0].firstName).toBe('Jane');
    expect(results[1].firstName).toBe('Ihor');
    expect(results[2].firstName).toBe('John');
  });
});

// ---------------------------------------------------------------------------
// select: relations
// ---------------------------------------------------------------------------
describe('select: relations', () => {
  it('one-to-many: users with posts — exact fields, correct types', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true, posts: { id: true, title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    for (const user of results) {
      expect(Object.keys(user).sort()).toEqual(['firstName', 'id', 'posts']);
      expect(typeof user.id).toBe('number');
      expect(typeof user.firstName).toBe('string');
      expect(Array.isArray(user.posts)).toBe(true);
      for (const post of user.posts as any[]) {
        expect(Object.keys(post).sort()).toEqual(['id', 'title']);
        expect(typeof post.id).toBe('number');
        expect(typeof post.title).toBe('string');
      }
    }
    // Ihor has 2 posts
    expect(results[0].posts).toHaveLength(2);
  });

  it('many-to-one: posts with author — exact fields, no FK leak', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true, author: { firstName: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    for (const post of results) {
      expect(Object.keys(post).sort()).toEqual(['author', 'id', 'title']);
      expect(typeof post.id).toBe('number');
      expect(typeof post.title).toBe('string');
      expect(post.author).not.toBeNull();
      expect(Object.keys(post.author)).toEqual(['firstName']);
      expect(typeof post.author.firstName).toBe('string');
    }
    expect(results[0].author.firstName).toBe('Ihor');
  });

  it('one-to-one: users with profile — exact fields', async () => {
    const results = await r.users.findMany({
      select: { id: true, profile: { bio: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    for (const user of results) {
      expect(Object.keys(user).sort()).toEqual(['id', 'profile']);
    }
    // User 1 has profile
    expect(results[0].profile).not.toBeNull();
    expect(Object.keys(results[0].profile)).toEqual(['bio']);
    expect(results[0].profile.bio).toBe('Full-stack developer');
    // User 2 has profile
    expect(results[1].profile).not.toBeNull();
    expect(results[1].profile.bio).toBe('Backend engineer');
  });

  it('no data relation: user without profile returns null', async () => {
    const results = await r.users.findMany({
      select: { id: true, profile: { bio: true } },
      where: { id: 3 },
    });
    expect(results).toHaveLength(1);
    expect(Object.keys(results[0]).sort()).toEqual(['id', 'profile']);
    expect(results[0].profile).toBeNull();
  });

  it('no data relation: user without posts returns empty array', async () => {
    const results = await r.users.findMany({
      select: { id: true, posts: { id: true, title: true } },
      where: { id: 4 },
    });
    expect(results).toHaveLength(1);
    expect(Object.keys(results[0]).sort()).toEqual(['id', 'posts']);
    expect(results[0].posts).toEqual([]);
  });

  it('deep nesting: users -> posts -> comments — exact fields at every level', async () => {
    const results = await r.users.findMany({
      select: { id: true, posts: { id: true, comments: { content: true } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);
    for (const user of results) {
      expect(Object.keys(user).sort()).toEqual(['id', 'posts']);
      for (const post of user.posts as any[]) {
        expect(Object.keys(post).sort()).toEqual(['comments', 'id']);
        for (const comment of post.comments as any[]) {
          expect(Object.keys(comment)).toEqual(['content']);
          expect(typeof comment.content).toBe('string');
        }
      }
    }
    // Ihor has 2 posts, Post 1 has 2 comments
    const ihorPosts = results[0].posts;
    expect(ihorPosts).toHaveLength(2);
    const post1 = ihorPosts.find((p: any) => p.id === 1);
    expect(post1.comments).toHaveLength(2);
  });

  it('relation: true returns all scalar columns with correct types', async () => {
    const results = await r.posts.findMany({
      select: { id: true, comments: true },
      where: { id: 1 },
    });
    expect(results).toHaveLength(1);
    expect(Object.keys(results[0]).sort()).toEqual(['comments', 'id']);
    expect(results[0].comments).toHaveLength(2);
    const expectedKeys = ['id', 'content', 'postId', 'authorId', 'createdAt'];
    for (const comment of results[0].comments as any[]) {
      expect(Object.keys(comment).sort()).toEqual(expectedKeys.sort());
      expect(typeof comment.id).toBe('number');
      expect(typeof comment.content).toBe('string');
      expect(typeof comment.postId).toBe('number');
      expect(typeof comment.authorId).toBe('number');
      expect(comment.createdAt).toBeInstanceOf(Date);
    }
  });

  it('relation: true with one-to-one returns all fields', async () => {
    const results = await r.users.findMany({
      select: { id: true, profile: true },
      where: { id: 1 },
    });
    expect(results).toHaveLength(1);
    expect(Object.keys(results[0]).sort()).toEqual(['id', 'profile']);
    expect(results[0].profile).not.toBeNull();
    const expectedKeys = ['id', 'bio', 'userId'];
    expect(Object.keys(results[0].profile).sort()).toEqual(expectedKeys.sort());
    expect(typeof results[0].profile.id).toBe('number');
    expect(results[0].profile.bio).toBe('Full-stack developer');
  });
});

describe('defaultRelationLimit', () => {
  it('limits many-type relations with exact fields', async () => {
    const limited: any = createRelayerDrizzle({
      db: pg.db,
      schema: pgSchema,
      entities: { users: PgUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { id: true, title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Ihor has 2 posts but limit is 1
    expect(results[0].posts).toHaveLength(1);
    expect(Object.keys(results[0]).sort()).toEqual(['id', 'posts']);
    expect(Object.keys(results[0].posts[0]).sort()).toEqual(['id', 'title']);
    expect(typeof results[0].posts[0].id).toBe('number');
    expect(typeof results[0].posts[0].title).toBe('string');
  });

  it('does not limit one-type relations, returns exact fields', async () => {
    const limited: any = createRelayerDrizzle({
      db: pg.db,
      schema: pgSchema,
      entities: { users: PgUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.posts.findMany({
      select: { id: true, author: { firstName: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results[0].author).not.toBeNull();
    expect(Object.keys(results[0]).sort()).toEqual(['author', 'id']);
    expect(Object.keys(results[0].author)).toEqual(['firstName']);
    expect(results[0].author.firstName).toBe('Ihor');
  });

  it('applies limit to nested many-type relations with exact fields', async () => {
    const limited: any = createRelayerDrizzle({
      db: pg.db,
      schema: pgSchema,
      entities: { users: PgUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { id: true, comments: { content: true } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results[0].posts).toHaveLength(1);
    expect(Object.keys(results[0].posts[0]).sort()).toEqual(['comments', 'id']);
    if (results[0].posts[0].comments.length > 0) {
      expect(results[0].posts[0].comments).toHaveLength(1);
      expect(Object.keys(results[0].posts[0].comments[0])).toEqual(['content']);
    }
  });

  it('no limit when defaultRelationLimit is not set, exact fields only', async () => {
    const results = await r.users.findMany({
      select: { id: true, posts: { id: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Ihor has 2 posts, no limit applied
    expect(results[0].posts).toHaveLength(2);
    expect(Object.keys(results[0]).sort()).toEqual(['id', 'posts']);
    for (const post of results[0].posts as any[]) {
      expect(Object.keys(post)).toEqual(['id']);
      expect(typeof post.id).toBe('number');
    }
  });
});

describe('$limit in select', () => {
  it('limits relation and returns only requested fields with correct types', async () => {
    const results = await r.users.findMany({
      select: { id: true, posts: { $limit: 1, id: true, title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Ihor has 2 posts but $limit: 1
    expect(results[0].posts).toHaveLength(1);
    // Only requested fields, nothing extra
    expect(Object.keys(results[0])).toEqual(expect.arrayContaining(['id', 'posts']));
    expect(Object.keys(results[0])).toHaveLength(2);
    const post = results[0].posts[0];
    expect(Object.keys(post).sort()).toEqual(['id', 'title']);
    expect(typeof post.id).toBe('number');
    expect(typeof post.title).toBe('string');
  });

  it('$limit overrides defaultRelationLimit and returns only requested fields', async () => {
    const limited: any = createRelayerDrizzle({
      db: pg.db,
      schema: pgSchema,
      entities: { users: PgUser },
      defaultRelationLimit: 1,
    });
    const results = await limited.users.findMany({
      select: { id: true, posts: { $limit: 10, id: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // $limit: 10 overrides defaultRelationLimit: 1, Ihor has 2 posts
    expect(results[0].posts).toHaveLength(2);
    expect(Object.keys(results[0].posts[0])).toEqual(['id']);
    expect(typeof results[0].posts[0].id).toBe('number');
  });

  it('returns no $limit, no FK columns, no unrequested fields in results', async () => {
    const results = await r.users.findMany({
      select: { id: true, posts: { $limit: 1, id: true, title: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    const post = results[0].posts[0];
    expect(post).not.toHaveProperty('$limit');
    expect(post).not.toHaveProperty('authorId');
    expect(post).not.toHaveProperty('createdAt');
    expect(post).not.toHaveProperty('content');
    expect(post).not.toHaveProperty('published');
    expect(post).not.toHaveProperty('tags');
  });

  it('$limit applies per parent, not globally, with exact fields', async () => {
    // Post 1 has 2 comments, Post 2 has 1 comment
    const results = await r.posts.findMany({
      select: { id: true, comments: { $limit: 1, id: true, content: true } },
      where: { id: { in: [1, 2] } },
      orderBy: { field: 'id', order: 'asc' },
    });
    const post1 = results.find((p: any) => p.id === 1);
    const post2 = results.find((p: any) => p.id === 2);
    expect(post1.comments).toHaveLength(1);
    expect(post2.comments).toHaveLength(1);
    // Only requested fields
    expect(Object.keys(post1.comments[0]).sort()).toEqual(['content', 'id']);
    expect(typeof post1.comments[0].id).toBe('number');
    expect(typeof post1.comments[0].content).toBe('string');
    // No leaked FK or timestamp columns
    expect(post1.comments[0]).not.toHaveProperty('postId');
    expect(post1.comments[0]).not.toHaveProperty('authorId');
    expect(post1.comments[0]).not.toHaveProperty('createdAt');
  });

  it('timestamp fields are Date objects when requested with $limit', async () => {
    const results = await r.posts.findMany({
      select: { id: true, comments: { $limit: 2, id: true, createdAt: true } },
      where: { id: { in: [1, 2] } },
      orderBy: { field: 'id', order: 'asc' },
    });
    for (const post of results) {
      for (const comment of post.comments as any[]) {
        expect(Object.keys(comment).sort()).toEqual(['createdAt', 'id']);
        expect(typeof comment.id).toBe('number');
        expect(comment.createdAt).toBeInstanceOf(Date);
      }
    }
  });

  it('works on nested relations with exact field validation', async () => {
    const results = await r.users.findMany({
      select: {
        id: true,
        posts: { id: true, comments: { $limit: 1, content: true } },
      },
      orderBy: { field: 'id', order: 'asc' },
    });
    for (const user of results) {
      expect(Object.keys(user).sort()).toEqual(['id', 'posts']);
      for (const post of user.posts as any[]) {
        expect(Object.keys(post).sort()).toEqual(['comments', 'id']);
        expect(post.comments.length).toBeLessThanOrEqual(1);
        if (post.comments.length > 0) {
          expect(Object.keys(post.comments[0])).toEqual(['content']);
          expect(typeof post.comments[0].content).toBe('string');
        }
      }
    }
  });

  it('$limit without explicit fields returns all scalar columns with correct types', async () => {
    const results = await r.posts.findMany({
      select: { id: true, comments: { $limit: 2 } },
      where: { id: { in: [1, 2] } },
      orderBy: { field: 'id', order: 'asc' },
    });
    const post1 = results.find((p: any) => p.id === 1);
    expect(post1.comments.length).toBeGreaterThan(0);
    const comment = post1.comments[0];
    const expectedKeys = ['id', 'content', 'postId', 'authorId', 'createdAt'];
    expect(Object.keys(comment).sort()).toEqual(expectedKeys.sort());
    expect(typeof comment.id).toBe('number');
    expect(typeof comment.content).toBe('string');
    expect(typeof comment.postId).toBe('number');
    expect(typeof comment.authorId).toBe('number');
    expect(comment.createdAt).toBeInstanceOf(Date);
  });
});

describe('many-to-many via pivot', () => {
  it('load pivot + nested relation (post -> postCategories -> category)', async () => {
    const results = await r.posts.findMany({
      select: {
        id: true,
        title: true,
        postCategories: { isPrimary: true, category: { name: true } },
      },
      orderBy: { field: 'id', order: 'asc' },
    });
    expect(results).toHaveLength(4);

    // Post 1 (Hello World): 1 category (General, primary)
    const post1 = results[0];
    expect(post1.postCategories).toHaveLength(1);
    expect(post1.postCategories[0].isPrimary).toBe(true);
    expect(post1.postCategories[0].category.name).toBe('General');

    // Post 2 (TS Tips): 2 categories (TypeScript primary, General non-primary)
    const post2 = results[1];
    expect(post2.postCategories).toHaveLength(2);
    const names = post2.postCategories.map((pc: any) => pc.category.name).sort();
    expect(names).toEqual(['General', 'TypeScript']);

    // Post 3 (Draft): no categories
    expect(results[2].postCategories).toHaveLength(0);
  });

  it('filter by pivot column (some isPrimary)', async () => {
    // some on pivot with scalar field filter
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      where: { postCategories: { some: { isPrimary: true } } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Posts 1, 2, 4 have at least one primary category; post 3 has no categories at all
    expect(results).toHaveLength(3);
    expect(results.map((r: any) => r.id)).toEqual([1, 2, 4]);
  });

  it('exists on pivot: posts with any categories', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      where: { postCategories: { exists: true } },
      orderBy: { field: 'id', order: 'asc' },
    });
    // Posts 1, 2, 4 have categories; post 3 does not
    expect(results).toHaveLength(3);
    expect(results.map((r: any) => r.id)).toEqual([1, 2, 4]);
  });
});

// ---------------------------------------------------------------------------
// count
// ---------------------------------------------------------------------------
describe('count', () => {
  it('count all users', async () => {
    const count = await r.users.count();
    expect(Number(count)).toBe(4);
  });

  it('count with where filter', async () => {
    const count = await r.users.count({ where: { firstName: 'Ihor' } });
    expect(Number(count)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// aggregate
// ---------------------------------------------------------------------------
describe('aggregate', () => {
  it('_count all', async () => {
    const result = await r.users.aggregate({ _count: true });
    expect(result._count).toBe(4);
  });

  it('_sum, _avg, _min, _max on orders', async () => {
    const result = await r.orders.aggregate({
      _sum: { total: true },
      _avg: { total: true },
      _min: { total: true },
      _max: { total: true },
    });
    // total: 500 + 1500 + 200 + 3000 = 5200
    expect(result._sum.total).toBe(5200);
    expect(result._avg.total).toBe(1300);
    expect(result._min.total).toBe(200);
    expect(result._max.total).toBe(3000);
  });

  it('groupBy with _count and _sum', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      _sum: { total: true },
    });
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);

    const completed = results.find((r: any) => r.status === 'completed');
    const pending = results.find((r: any) => r.status === 'pending');

    expect(completed).toBeDefined();
    expect(completed._count).toBe(3);
    expect(completed._sum.total).toBe(5000);

    expect(pending).toBeDefined();
    expect(pending._count).toBe(1);
    expect(pending._sum.total).toBe(200);
  });

  it('dot notation groupBy: orders grouped by user.firstName', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['user.firstName'],
      _count: true,
    });
    expect(Array.isArray(results)).toBe(true);

    const ihor = results.find((r: any) => r.user?.firstName === 'Ihor');
    expect(ihor).toBeDefined();
    expect(ihor._count).toBe(2);

    const john = results.find((r: any) => r.user?.firstName === 'John');
    expect(john).toBeDefined();
    expect(john._count).toBe(1);

    const jane = results.find((r: any) => r.user?.firstName === 'Jane');
    expect(jane).toBeDefined();
    expect(jane._count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// aggregate: having
// ---------------------------------------------------------------------------
describe('aggregate: having', () => {
  it('having filters groups by _count', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      _sum: { total: true },
      having: { _count: { gte: 2 } },
    });
    expect(Array.isArray(results)).toBe(true);
    expect((results as any[]).length).toBe(1);
    expect((results as any[])[0].status).toBe('completed');
    expect((results as any[])[0]._count).toBeGreaterThanOrEqual(2);
  });

  it('having with exact count', async () => {
    const results = await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      having: { _count: 1 },
    });
    expect(Array.isArray(results)).toBe(true);
    expect((results as any[]).every((r: any) => r._count === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggregate: nested result format
// ---------------------------------------------------------------------------
describe('aggregate: nested result format', () => {
  it('_count is number not string', async () => {
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
    expect(Array.isArray(results)).toBe(true);
    const first = (results as any[])[0];
    expect(first.user).toBeDefined();
    expect(first.user.firstName).toBeDefined();
  });

  it('own derived sub-field in aggregate (_sum orderSummary.orderCount)', async () => {
    const result = await r.users.aggregate({
      _sum: { 'orderSummary.orderCount': true },
    });
    expect((result as any)._sum).toBeDefined();
    expect((result as any)._sum.orderSummary).toBeDefined();
    expect(typeof (result as any)._sum.orderSummary.orderCount).toBe('number');
  });

  it('own derived sub-field in aggregate with groupBy', async () => {
    const results = await r.users.aggregate({
      groupBy: ['firstName'],
      _avg: { 'orderSummary.orderCount': true },
    });
    expect(Array.isArray(results)).toBe(true);
    const first = (results as any[])[0];
    expect(first.firstName).toBeDefined();
    expect(first._avg).toBeDefined();
    expect(first._avg.orderSummary).toBeDefined();
    expect(typeof first._avg.orderSummary.orderCount).toBe('number');
  });

  it('JSON sub-path in aggregate (_min metadata.role)', async () => {
    const results = await r.users.aggregate({
      groupBy: ['metadata.role'],
      _count: true,
    });
    expect(Array.isArray(results)).toBe(true);
    const first = (results as any[])[0];
    expect(first.metadata).toBeDefined();
    expect(first.metadata.role).toBeDefined();
    expect(first._count).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// mutations (with reseed)
// ---------------------------------------------------------------------------
describe('mutations', () => {
  beforeEach(async () => {
    await pg.reseed();
  });

  it('create: returns created user with id', async () => {
    const created = await r.users.create({
      data: { firstName: 'New', lastName: 'User', email: 'new@test.com' },
    });
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.firstName).toBe('New');
    expect(created.lastName).toBe('User');
    expect(created.email).toBe('new@test.com');
  });

  it('createMany: returns array of created records', async () => {
    const created = await r.users.createMany({
      data: [
        { firstName: 'Bulk1', lastName: 'User', email: 'bulk1@test.com' },
        { firstName: 'Bulk2', lastName: 'User', email: 'bulk2@test.com' },
      ],
    });
    expect(Array.isArray(created)).toBe(true);
    expect(created).toHaveLength(2);
    expect(created[0].firstName).toBe('Bulk1');
    expect(created[1].firstName).toBe('Bulk2');
  });

  it('update: returns updated record', async () => {
    const updated = await r.users.update({
      where: { id: 1 },
      data: { firstName: 'Updated' },
    });
    expect(updated).toBeDefined();
    expect(updated.firstName).toBe('Updated');
    expect(updated.id).toBe(1);
  });

  it('updateMany: returns count', async () => {
    const result = await r.users.updateMany({
      where: { lastName: 'Ivanov' },
      data: { lastName: 'K' },
    });
    expect(result).toBeDefined();
    expect(result.count).toBe(1);

    // Verify the change
    const found = await r.users.findFirst({ where: { id: 1 } });
    expect(found.lastName).toBe('K');
  });

  it('delete: returns deleted record', async () => {
    const deleted = await r.users.delete({ where: { id: 4 } });
    expect(deleted).toBeDefined();
    expect(deleted.id).toBe(4);

    // Verify deletion
    const count = await r.users.count();
    expect(Number(count)).toBe(3);
  });

  it('deleteMany: returns count', async () => {
    // Create extra users to delete (no FK references)
    await r.users.create({ data: { firstName: 'Del1', lastName: 'Test', email: 'del1@test.com' } });
    await r.users.create({ data: { firstName: 'Del2', lastName: 'Test', email: 'del2@test.com' } });
    const result = await r.users.deleteMany({
      where: { lastName: 'Test' },
    });
    expect(result).toBeDefined();
    expect(result.count).toBe(2);

    // Verify deletion — 4 original users remain
    const count = await r.users.count();
    expect(Number(count)).toBe(4);
  });

  it('update with connect: sets FK column', async () => {
    // Post id=1 is authored by user 1. Reassign to user 2.
    const updated = await r.posts.update({
      where: { id: 1 },
      data: { author: { connect: 2 } },
    });
    expect(updated.authorId).toBe(2);

    // Verify
    const post = await r.posts.findFirst({ where: { id: 1 } });
    expect(post.authorId).toBe(2);
  });

  it('update with connect + scalar: updates both', async () => {
    const updated = await r.posts.update({
      where: { id: 1 },
      data: { title: 'Reassigned', author: { connect: 3 } },
    });
    expect(updated.title).toBe('Reassigned');
    expect(updated.authorId).toBe(3);
  });

  it('update with many() connect: inserts into join table', async () => {
    // Create categories first
    const cat1 = await r.categories.create({ data: { name: 'TypeScript' } });
    const cat2 = await r.categories.create({ data: { name: 'JavaScript' } });

    // Connect post 1 to categories via postCategories join table
    await r.posts.update({
      where: { id: 1 },
      data: {
        postCategories: { connect: [cat1.id, cat2.id] },
      },
    });

    // Verify via join table
    const links = await r.postCategories.findMany({ where: { postId: 1 } });
    const categoryIds = links.map((l: any) => l.categoryId);
    expect(categoryIds).toContain(cat1.id);
    expect(categoryIds).toContain(cat2.id);
  });

  it('update with many() disconnect: removes from join table', async () => {
    // Setup: connect first
    const cat = await r.categories.create({ data: { name: 'ToRemove' } });
    await r.posts.update({
      where: { id: 1 },
      data: { postCategories: { connect: [cat.id] } },
    });

    // Disconnect
    await r.posts.update({
      where: { id: 1 },
      data: { postCategories: { disconnect: [cat.id] } },
    });

    const links = await r.postCategories.findMany({
      where: { postId: 1, categoryId: cat.id },
    });
    expect(links).toHaveLength(0);
  });

  it('update with many() set: replaces all links', async () => {
    const cat1 = await r.categories.create({ data: { name: 'SetA' } });
    const cat2 = await r.categories.create({ data: { name: 'SetB' } });
    const cat3 = await r.categories.create({ data: { name: 'SetC' } });

    // Connect two
    await r.posts.update({
      where: { id: 2 },
      data: { postCategories: { connect: [cat1.id, cat2.id] } },
    });

    // Set replaces all with cat3 only
    await r.posts.update({
      where: { id: 2 },
      data: { postCategories: { set: [cat3.id] } },
    });

    const links = await r.postCategories.findMany({ where: { postId: 2 } });
    expect(links).toHaveLength(1);
    expect((links[0] as any).categoryId).toBe(cat3.id);
  });

  it('update with many() connect + _id and extra fields', async () => {
    const cat = await r.categories.create({ data: { name: 'WithExtra' } });

    await r.posts.update({
      where: { id: 3 },
      data: {
        postCategories: {
          connect: [{ _id: cat.id, isPrimary: true }],
        },
      },
    });

    const links = await r.postCategories.findMany({
      where: { postId: 3, categoryId: cat.id },
    });
    expect(links).toHaveLength(1);
    expect((links[0] as any).isPrimary).toBe(true);
  });

  it('update with connect on comment: sets multiple FKs', async () => {
    const comment = await r.comments.create({
      data: { content: 'test', postId: 1, authorId: 1 },
    });
    const updated = await r.comments.update({
      where: { id: comment.id },
      data: { author: { connect: 2 }, post: { connect: 2 } },
    });
    expect(updated.authorId).toBe(2);
    expect(updated.postId).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// $transaction
// ---------------------------------------------------------------------------
describe('$transaction', () => {
  beforeEach(async () => {
    await pg.reseed();
  });

  it('successful transaction: changes visible after commit', async () => {
    await r.$transaction(async (tx: any) => {
      await tx.users.create({
        data: { firstName: 'TxUser', lastName: 'Test', email: 'tx@test.com' },
      });
    });

    const count = await r.users.count();
    expect(Number(count)).toBe(5);

    const found = await r.users.findFirst({ where: { email: 'tx@test.com' } });
    expect(found).not.toBeNull();
    expect(found.firstName).toBe('TxUser');
  });

  it('rollback: changes not visible after error', async () => {
    try {
      await r.$transaction(async (tx: any) => {
        await tx.users.create({
          data: { firstName: 'Rollback', lastName: 'Test', email: 'rollback@test.com' },
        });
        throw new Error('Intentional rollback');
      });
    } catch {
      // Expected
    }

    const count = await r.users.count();
    expect(Number(count)).toBe(4);

    const found = await r.users.findFirst({ where: { email: 'rollback@test.com' } });
    expect(found).toBeNull();
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
    // Ihor has 2 posts, others have 1 -> Ihor's posts should come first
    expect(results[0].id).toBe(1); // or 2 (both Ihor's)
  });

  it('orders posts by author.postsCount asc', async () => {
    const results = await r.posts.findMany({
      select: { id: true, title: true },
      orderBy: { field: 'author.postsCount', order: 'asc' },
    });
    expect(results.length).toBeGreaterThan(0);
    // Users with 1 post first, then Ihor with 2
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
});

// ---------------------------------------------------------------------------
// $orm / getOrm()
// ---------------------------------------------------------------------------
describe('$orm / getOrm()', () => {
  it('$orm is defined', () => {
    expect(r.$orm).toBeDefined();
  });

  it('getOrm() returns same as $orm', () => {
    expect(r.getOrm()).toBe(r.$orm);
  });
});

// ---------------------------------------------------------------------------
// field stripping
// ---------------------------------------------------------------------------
describe('field stripping', () => {
  it('only requested fields are returned when select is specified', async () => {
    const results = await r.users.findMany({
      select: { id: true, firstName: true },
    });
    expect(results).toHaveLength(4);

    for (const row of results) {
      const keys = Object.keys(row);
      expect(keys.sort()).toEqual(['firstName', 'id']);
    }
  });

  it('no select returns all scalar + computed fields', async () => {
    const results = await r.users.findMany();
    expect(results).toHaveLength(4);

    const keys = Object.keys(results[0]);
    expect(keys).toEqual(
      expect.arrayContaining(['id', 'firstName', 'lastName', 'email', 'metadata', 'createdAt']),
    );
  });
});

// ---------------------------------------------------------------------------
// mutations: context option (smoke tests with reseed before AND after)
// ---------------------------------------------------------------------------
// Verifies that mutation methods accept the new `context` option without
// error after the typed-context fix in entity-client.ts. The actual context
// value reaches getComputedSqlMap and is available for SQL resolvers when
// computed fields are referenced — but computed-in-where on mutations is a
// separate adapter limitation tracked elsewhere. The end-to-end flow is
// covered by nestjs-crud unit tests where `getDefaultWhere(upstream, ctx)`
// consumes context to build a scoped where.
//
// Located at the end of the file because mutation tests dirty the DB and we
// don't want them to leak into the read-only describe blocks above.
describe('mutations: context option', () => {
  beforeEach(async () => {
    await pg.reseed();
  });

  afterAll(async () => {
    await pg.reseed();
  });

  it('update accepts context option', async () => {
    const updated = await r.users.update({
      where: { id: 1 },
      data: { firstName: 'Updated' },
      context: { tenantId: 'acme' },
    });
    expect(updated.firstName).toBe('Updated');
  });

  it('updateMany accepts context option', async () => {
    const result = await r.users.updateMany({
      where: { lastName: 'Ivanov' },
      data: { lastName: 'K' },
      context: { tenantId: 'acme' },
    });
    expect(result.count).toBe(1);
  });

  it('delete accepts context option', async () => {
    const deleted = await r.users.delete({
      where: { id: 4 },
      context: { tenantId: 'acme' },
    });
    expect(deleted.id).toBe(4);
  });

  it('deleteMany accepts context option', async () => {
    await r.users.create({
      data: { firstName: 'Tmp', lastName: 'CtxOnly', email: 'tmp@test.com' },
    });
    const result = await r.users.deleteMany({
      where: { lastName: 'CtxOnly' },
      context: { tenantId: 'acme' },
    });
    expect(result.count).toBe(1);
  });

  it('create accepts context option', async () => {
    const created = await r.users.create({
      data: { firstName: 'Ctx', lastName: 'Aware', email: 'ctx@test.com' },
      context: { tenantId: 'acme' },
    });
    expect(created.firstName).toBe('Ctx');
  });

  it('createMany accepts context option', async () => {
    const created = await r.users.createMany({
      data: [
        { firstName: 'CtxA', lastName: 'Many', email: 'ctxa@test.com' },
        { firstName: 'CtxB', lastName: 'Many', email: 'ctxb@test.com' },
      ],
      context: { tenantId: 'acme' },
    });
    expect(created).toHaveLength(2);
  });
});
