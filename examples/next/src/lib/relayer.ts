import { db } from '@/db';
import * as schema from '@/db/schema';
import { createRelayerDrizzle, createRelayerEntity } from '@relayerjs/drizzle';

const UserEntity = createRelayerEntity(schema, 'users');
const { derived: userDerived } = UserEntity;

class User extends UserEntity {
  @userDerived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({
          [field()]: sql<number>`count(*)`,
          assigneeId: s.tasks.assigneeId,
        })
        .from(s.tasks)
        .groupBy(s.tasks.assigneeId),
    on: ({ parent, derived: d, eq }) => eq(parent.id, d.assigneeId),
  })
  taskCount!: number;
}

const TaskEntity = createRelayerEntity(schema, 'tasks');
const { computed, derived } = TaskEntity;

class Task extends TaskEntity {
  @computed({
    resolve: ({ table, sql }) => sql`'TASK-' || ${table.id}`,
  })
  taskCode!: string;

  @derived({
    query: ({ db, schema: s, sql, field }) =>
      db
        .select({
          [field()]: sql<number>`count(*)`,
          assigneeId: s.tasks.assigneeId,
        })
        .from(s.tasks)
        .groupBy(s.tasks.assigneeId),
    on: ({ parent, derived: d, eq }) => eq(parent.assigneeId, d.assigneeId),
  })
  assigneeTaskCount!: number;
}

export const r = createRelayerDrizzle({
  db,
  schema,
  entities: { users: User, tasks: Task },
});