import { createRelayerRoute } from '@relayerjs/next';

import { r } from './relayer';

export const taskRoutes = createRelayerRoute(r, 'tasks', {
  allowSelect: {
    assignee: { name: true, email: true },
  },
  allowWhere: {
    createdBy: false,
  },
  allowOrderBy: [
    'title',
    'status',
    'priority',
    'createdAt',
    'assignee.name',
    'taskCode',
    'assigneeTaskCount',
  ],
  maxLimit: 50,
  defaultLimit: 25,
  hooks: {
    beforeRequest: async (ctx, req) => {
      const userId = req.headers.get('x-user-id');
      if (userId) ctx.userId = Number(userId);
    },
  },
});

export const userRoutes = createRelayerRoute(r, 'users', {
  maxLimit: 100,
  defaultLimit: 50,
});
