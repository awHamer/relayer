import {createRelayerDrizzle, FieldType } from '@relayerjs/drizzle';

import { client, db } from './db';
import * as schema from './schema';
import { seed } from './seed';

export interface RelayerContext {
  userId: number;
}

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

async function main() {
  await seed();

  const r = createRelayerDrizzle({
    db,
    schema,
    context: {} as RelayerContext,
    entities: {
      users: {
        fields: {
          fullName: {
            type: FieldType.Computed,
            valueType: 'string',
            resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
          },
          isCurrentUser: {
            type: FieldType.Computed,
            valueType: 'boolean',
            resolve: ({ table, sql, context }) => sql`${table.id} = ${context.userId}`,
          },
          postsCount: {
            type: FieldType.Derived,
            valueType: 'number',
            query: ({ db, schema: s, sql }) =>
              db
                .select({
                  postsCount: sql<number>`count(*)::int`,
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
            query: ({ db, schema: s, sql }) =>
              db
                .select({
                  orderSummary_totalAmount: sql<string>`COALESCE(sum(${s.orders.total}), 0)::text`,
                  orderSummary_orderCount: sql<number>`count(*)::int`,
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

  // ─── Eager: orderSummary in where (LEFT JOIN in main query) ──

  log('eager: where orderSummary.orderCount lte 2',
    await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: true },
      where: { orderSummary: { orderCount: { lte: 2 } } },
    }),
  );

  // ─── Deferred: orderSummary select only (batch after main) ───

  log(
    'deferred: select orderSummary { totalAmount }',
    await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: { totalAmount: true } },
    }),
  );

  // ─── Eager: orderBy dot notation (LEFT JOIN in main query) ───

  log('eager: orderBy orderSummary.orderCount desc',
    await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: true },
      orderBy: { field: 'orderSummary.orderCount', order: 'desc' },
    }),
  );

  log('eager: orderBy orderSummary.totalAmount asc',
    await r.users.findMany({
      select: { id: true, firstName: true, orderSummary: { totalAmount: true } },
      orderBy: { field: 'orderSummary.totalAmount', order: 'asc' },
    }),
  );

  // ─── Aggregations ───────────────────────────────────────

  log(
    'aggregate: total user count (no groupBy -> single object)',
    await r.users.aggregate({ _count: true }),
  );
  // expect: { _count: 3 }

  log(
    'aggregate: orders by status',
    await r.orders.aggregate({
      groupBy: ['status'],
      _count: true,
      _sum: { total: true },
      _avg: { total: true },
      _min: { total: true },
      _max: { total: true },
    }),
  );
  // expect: [{ status: 'completed', _count: 3, _sum_total, _avg_total, ... }, { status: 'pending', ... }]

  log(
    'aggregate: orders by user (dot notation groupBy)',
    await r.orders.aggregate({
      groupBy: ['user.firstName'],
      _count: true,
      _sum: { total: true },
    }),
  );
  // expect: [{ user_firstName: 'Ihor', _count: 2, _sum_total: 2000 }, ...]

  log(
    'aggregate: orders with where filter',
    await r.orders.aggregate({
      where: { status: 'completed' },
      groupBy: ['status'],
      _count: true,
      _sum: { total: true },
    }),
  );
  // expect: single group { status: 'completed', _count: 3, _sum_total: 5500 }

  // ─── Array operators ────────────────────────────────────

  log(
    'posts: arrayContains ["typescript"]',
    await r.posts.findMany({
      select: { id: true, title: true, tags: true },
      where: { tags: { arrayContains: ['typescript'] } },
    }),
  );
  // expect: posts 2 (TS Tips) and 4 (Hello Relayer) - both have 'typescript' tag

  log(
    'posts: arrayOverlaps ["intro", "draft"]',
    await r.posts.findMany({
      select: { id: true, title: true, tags: true },
      where: { tags: { arrayOverlaps: ['intro', 'draft'] } },
    }),
  );
  // expect: posts 1 (intro), 3 (draft), 4 (intro) - any overlap

  log(
    'posts: arrayContained ["typescript", "tips"]',
    await r.posts.findMany({
      select: { id: true, title: true, tags: true },
      where: {
        tags: { arrayContained: ['typescript', 'tips', 'intro', 'general', 'draft', 'relayer'] },
      },
    }),
  );
  // expect: all posts - all their tags are contained in the provided array

  // ─── $raw where ────────────────────────────────────────

  log(
    '$raw: custom SQL in where',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: {
        $raw: ({ table, sql }) =>
          sql`${table.firstName} ILIKE ${'%oh%'} OR ${table.lastName} ILIKE ${'%smith%'}`,
      },
    }),
  );
  // expect: Ihor (firstName has 'oh'... no), John (has 'oh'), Jane Smith (lastName has 'smith')

  // ─── JSON property filtering ────────────────────────────

  log(
    'json: metadata.role = admin',
    await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      where: { metadata: { role: 'admin' } },
    }),
  );
  // expect: Ihor + Jane (both admin)

  log(
    'json: metadata.level >= 5',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { level: { gte: 5 } } },
    }),
  );
  // expect: Ihor (10) + Jane (7)

  log(
    'json: nested settings.theme contains "dark"',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { settings: { theme: { contains: 'dark' } } } },
    }),
  );
  // expect: Ihor + Jane (both dark theme)

  log(
    'json: combined role=admin AND level >= 8',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: 'admin', level: { gte: 8 } } },
    }),
  );
  // expect: only Ihor (admin + level 10)

  log(
    'json: role contains adm',
    await r.users.findFirst({
      select: { id: true, firstName: true, metadata: true },
      where: { metadata: { role: { contains: 'user' } } },
    }),
  );

  // ─── isNull tests ──────────────────────────────────────

  log(
    'isNull: scalar field (email isNull)',
    await r.users.findMany({
      select: { id: true, firstName: true, email: true },
      where: { email: { isNull: true } },
    }),
  );
  // expect: empty (all users have email)

  log(
    'isNotNull: scalar field (email isNotNull)',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { email: { isNotNull: true } },
    }),
  );
  // expect: all 3 users

  log(
    'isNull: metadata (full column null)',
    await r.users.findMany({
      select: { id: true, firstName: true, metadata: true },
      where: { metadata: { isNull: true } },
    }),
  );
  // expect: empty (all users have metadata)

  log(
    'isNotNull: metadata',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { isNotNull: true } },
    }),
  );

  // JSON null key tests - NullRole user has metadata.role = null
  log(
    'json: metadata.role isNull (JSON null key)',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: { isNull: true } } },
    }),
  );
  // expect: NullRole user (role = null inside JSON)

  log(
    'json: metadata.role isNotNull',
    await r.users.findMany({
      select: { id: true, firstName: true },
      where: { metadata: { role: { isNotNull: true } } },
    }),
  );
  // expect: Ihor, John, Jane (all have non-null role)

  // ─── Many-to-Many via pivot table ────────────────────────

  log(
    'm2m: posts with categories via pivot',
    await r.posts.findMany({
      select: {
        id: true,
        title: true,
        postCategories: { isPrimary: true, category: { name: true } },
      },
      orderBy: { field: 'id', order: 'asc' },
    }),
  );
  // expect: post 1 -> [General(primary)], post 2 -> [TypeScript(primary), General], post 3 -> [], post 4 -> [TypeScript(primary)]

  log(
    'm2m: filter by pivot column ($some isPrimary)',
    await r.posts.findMany({
      select: { id: true, title: true },
      where: { postCategories: { $some: { isPrimary: true } } },
      orderBy: { field: 'id', order: 'asc' },
    }),
  );
  // expect: posts 1, 2, 4 (have primary category)

  log(
    'm2m: $exists on pivot (posts with any categories)',
    await r.posts.findMany({
      select: { id: true, title: true },
      where: { postCategories: { $exists: true } },
      orderBy: { field: 'id', order: 'asc' },
    }),
  );
  // expect: posts 1, 2, 4 (post 3 has no categories)

  await client.end();
}

main().catch(console.error);
