import { createRelayerDrizzle, createRelayerEntity } from '@relayerjs/drizzle';

import { client, db } from './db';
import * as schema from './schema';
import { seed } from './seed';

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

const UserEntity = createRelayerEntity(schema, 'users');

class User extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql<number>`count(*)::int`, userId: s.posts.authorId })
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
          [field('totalAmount')]: sql<string>`COALESCE(sum(${s.orders.total}), 0)::text`,
          [field('orderCount')]: sql<number>`count(*)::int`,
          userId: s.orders.userId,
        })
        .from(s.orders)
        .groupBy(s.orders.userId),
    on: ({ parent, derived: d, eq }) => eq(parent.id, d.userId),
  })
  orderSummary!: { totalAmount: string; orderCount: number };
}

async function main() {
  await seed();

  const r = createRelayerDrizzle({ db, schema, entities: { users: User } });

  // 1. Kitchen sink: nested relations, computed, derived, JSON filter, relation filter, derived orderBy
  log(
    'findMany: power users',
    await r.users.findMany({
      select: {
        id: true,
        fullName: true,
        postsCount: true,
        orderSummary: true,
        metadata: true,
        posts: { title: true, author: { fullName: true, postsCount: true } },
      },
      where: {
        metadata: { role: 'admin', level: { gte: 5 } },
        postsCount: { gte: 1 },
        posts: { some: { published: true } },
      },
      orderBy: { field: 'orderSummary.totalAmount', order: 'desc' },
      limit: 10,
    }),
  );

  // 2. OR + every + JSON orderBy + derived object in where
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

  // 3. findFirst: top author
  log(
    'findFirst: top author',
    await r.users.findFirst({
      select: { id: true, fullName: true, postsCount: true, orderSummary: true },
      where: { postsCount: { gte: 1 } },
      orderBy: { field: 'postsCount', order: 'desc' },
    }),
  );

  // 4. Aggregation: orders by author + status, all functions
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

  log(
    'aggregate: posts by author derived fields',
    await r.posts.aggregate({
      groupBy: ['author.fullName'],
      _count: true,
      _sum: { 'author.postsCount': true },
    }),
  );

  // 5. Count: admins with published posts and orders
  log(
    'count: active admin authors with orders',
    await r.users.count({
      where: {
        metadata: { role: 'admin' },
        posts: { some: { published: true } },
        orderSummary: { orderCount: { gte: 1 } },
      },
    }),
  );

  // 6. count() bigint fix — should return number, not string
  const countResult = await r.users.count();
  log('count: type check', { count: countResult, type: typeof countResult });

  // 7. mode: 'insensitive' — case-insensitive contains/startsWith/endsWith
  log(
    'findMany: mode insensitive contains',
    await r.users.findMany({
      select: { id: true, fullName: true },
      where: { firstName: { contains: 'ih', mode: 'insensitive' } },
    }),
  );

  log(
    'findMany: mode insensitive startsWith',
    await r.users.findMany({
      select: { id: true, fullName: true },
      where: { firstName: { startsWith: 'IH', mode: 'insensitive' } },
    }),
  );

  // 8. $raw select — returns raw DB string instead of JS type
  log(
    'findFirst: $raw createdAt returns string',
    await r.users.findFirst({
      select: { id: true, firstName: true, createdAt: { $raw: true } },
    }),
  );

  await client.end();
}

main().catch(console.error);
