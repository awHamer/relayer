import { createRelayerEntity } from '../../src/entity';
import * as pgSchema from './pg-schema';

const UserEntity = createRelayerEntity(pgSchema, 'users');

export class PgUser extends UserEntity {
  @UserEntity.computed({
    resolve: ({ table, sql }: any) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserEntity.derived({
    query: ({ db, schema: s, sql, field }: any) =>
      db
        .select({
          [field()]: sql`count(*)::int`,
          userId: s.posts.authorId,
        })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived: d, eq }: any) => eq(parent.id, d.userId),
  })
  postsCount!: number;

  @UserEntity.derived({
    shape: { totalAmount: 'string', orderCount: 'number' },
    query: ({ db, schema: s, sql, field }: any) =>
      db
        .select({
          [field('totalAmount')]: sql`COALESCE(sum(${s.orders.total}), 0)::text`,
          [field('orderCount')]: sql`count(*)::int`,
          userId: s.orders.userId,
        })
        .from(s.orders)
        .groupBy(s.orders.userId),
    on: ({ parent, derived: d, eq }: any) => eq(parent.id, d.userId),
  })
  orderSummary!: { totalAmount: string; orderCount: number };
}
