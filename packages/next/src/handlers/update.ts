import { notFoundError } from '../errors';
import { parseJsonBody } from '../parse/body';
import type { RuntimeEntityClient, RuntimeRouteConfig, RuntimeUpdateHooks } from './handler-types';
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

export function createUpdateHandler(
  entityName: string,
  client: TransactionalClient,
  config: RuntimeRouteConfig,
  hooks?: RuntimeUpdateHooks,
): NextHandler {
  return withErrorHandling('update', async (req, routeCtx) => {
    const ctx = await initContext(config, req);
    const params = await routeCtx.params;
    const where = { id: parseIdParam(params) };
    let data = await parseJsonBody(req);

    if (hooks?.beforeUpdate) {
      const result = await hooks.beforeUpdate(data, where, ctx);
      if (hookIntercepted(result)) {
        return hookResponse(result, notFoundError());
      }
      data = result;
    }

    const entity = client[entityName] as RuntimeEntityClient;
    let updated = hooks?.afterUpdate
      ? await runMutation(client, entityName, ctx, (tx) => tx.update({ where, data }))
      : await entity.update({ where, data });

    if (hooks?.afterUpdate && updated) {
      const afterResult = await hooks.afterUpdate(updated, ctx);
      if (afterResult instanceof Response) return afterResult;
      updated = afterResult;
    }

    return Response.json({ data: updated });
  });
}
