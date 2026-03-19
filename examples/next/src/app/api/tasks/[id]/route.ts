import { taskRoutes } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = taskRoutes.detailHandlers();
