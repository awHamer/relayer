import { parseJsonBody } from '../parse/body';
import type { RuntimeCreateHooks, RuntimeEntityClient, RuntimeRouteConfig } from './handler-types';
import {
  hookIntercepted,
  hookResponse,
  initContext,
  runMutation,
  withErrorHandling,
  type NextHandler,
  type TransactionalClient,
} from './shared';

export function createCreateHandler(
  entityName: string,
  client: TransactionalClient,
  config: RuntimeRouteConfig,
  hooks?: RuntimeCreateHooks,
): NextHandler {
  return withErrorHandling('create', async (req) => {
    const ctx = await initContext(config, req);
    let data = await parseJsonBody(req);

    if (hooks?.beforeCreate) {
      const result = await hooks.beforeCreate(data, ctx);
      if (hookIntercepted(result)) {
        return hookResponse(result, Response.json({ data: null }, { status: 201 }));
      }
      data = result;
    }

    const entity = client[entityName] as RuntimeEntityClient;
    let created = hooks?.afterCreate
      ? await runMutation(client, entityName, ctx, (tx) => tx.create({ data }))
      : await entity.create({ data });

    if (hooks?.afterCreate && created) {
      const afterResult = await hooks.afterCreate(created, ctx);
      if (afterResult instanceof Response) return afterResult;
      created = afterResult;
    }

    return Response.json({ data: created }, { status: 201 });
  });
}
