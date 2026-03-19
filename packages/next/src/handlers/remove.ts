import { notFoundError } from '../errors';
import type { RuntimeEntityClient, RuntimeRemoveHooks, RuntimeRouteConfig } from './handler-types';
import {
  hookIntercepted,
  hookResponse,
  initContext,
  parseIdParam,
  runMutation,
  withErrorHandling,
  type NextHandler,
  type TransactionalClient,
} from './shared';

export function createRemoveHandler(
  entityName: string,
  client: TransactionalClient,
  config: RuntimeRouteConfig,
  hooks?: RuntimeRemoveHooks,
): NextHandler {
  return withErrorHandling('remove', async (req, routeCtx) => {
    const ctx = await initContext(config, req);
    const params = await routeCtx.params;
    let where: Record<string, unknown> = { id: parseIdParam(params) };

    if (hooks?.beforeDelete) {
      const result = await hooks.beforeDelete(where, ctx);
      if (hookIntercepted(result)) {
        return hookResponse(result, notFoundError());
      }
      where = result;
    }

    const entity = client[entityName] as RuntimeEntityClient;
    let deleted = hooks?.afterDelete
      ? await runMutation(client, entityName, ctx, (tx) => tx.delete({ where }))
      : await entity.delete({ where });

    if (hooks?.afterDelete && deleted) {
      const afterResult = await hooks.afterDelete(deleted, ctx);
      if (afterResult instanceof Response) return afterResult;
      deleted = afterResult;
    }

    return Response.json({ data: deleted });
  });
}
