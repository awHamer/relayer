import { taskRoutes } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export const GET = taskRoutes.list({
  defaultSelect: {
    id: true,
    title: true,
    status: true,
    label: true,
    taskCode: true,
    assigneeTaskCount: true,
    assignee: {
      name: true,
      taskCount: true,
      tasks: { id: true, title: true, assignee: { id: true, taskCount: true } },
    },
  },
  defaultOrderBy: { field: 'createdAt', order: 'desc' },
});

export const POST = taskRoutes.create({
  beforeCreate: async (data, ctx) => {
    data.createdBy = (ctx.userId as number) ?? 1;
    data.createdAt = new Date().toISOString();
    return data;
  },
});
