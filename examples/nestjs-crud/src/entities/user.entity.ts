import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

const UserBase = createRelayerEntity(schema, 'users');

export class UserEntity extends UserBase {
  @UserBase.computed({
    resolve: ({ table, sql }) => sql`${table.firstName} || ' ' || ${table.lastName}`,
  })
  fullName!: string;

  @UserBase.derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({ [field()]: sql<number>`count(*)::int`, userId: s.posts.authorId })
        .from(s.posts)
        .groupBy(s.posts.authorId),
    on: ({ parent, derived: d, eq }) => eq(parent.id, d.userId),
  })
  postsCount!: number;
}
