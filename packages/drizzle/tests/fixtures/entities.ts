import { FieldType } from '@relayerjs/core';

export function pgEntities() {
  return {
    users: {
      fields: {
        fullName: {
          type: FieldType.Computed,
          valueType: 'string' as const,
          resolve: ({ table, sql }: any) => sql`${table.firstName} || ' ' || ${table.lastName}`,
        },
        postsCount: {
          type: FieldType.Derived,
          valueType: 'number' as const,
          query: ({ db, schema: s, sql, field }: any) =>
            db
              .select({
                [field()]: sql`count(*)::int`,
                userId: s.posts.authorId,
              })
              .from(s.posts)
              .groupBy(s.posts.authorId),
          on: ({ parent, derived: d, eq }: any) => eq(parent.id, d.userId),
        },
        orderSummary: {
          type: FieldType.Derived,
          valueType: {
            totalAmount: 'string',
            orderCount: 'number',
          },
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
        },
      },
    },
  };
}
