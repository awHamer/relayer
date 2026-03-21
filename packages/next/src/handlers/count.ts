import { validateWhere } from '../validate/where-schema';
import type { RuntimeCountHooks, RuntimeEntityClient, RuntimeRouteConfig } from './handler-types';
import { initContext, parseJsonQueryParam, withErrorHandling, type NextHandler } from './shared';

export function createCountHandler(
  entity: RuntimeEntityClient,
  config: RuntimeRouteConfig,
  hooks?: RuntimeCountHooks,
): NextHandler {
  return withErrorHandling('count', async (req) => {
    const ctx = await initContext(config, req);
    const url = new URL(req.url);

    const where = validateWhere(parseJsonQueryParam(url, 'where'), config.allowWhere);
    const options = { where, context: ctx.context };

    if (hooks?.beforeCount) await hooks.beforeCount(options, ctx);

    return Response.json({ data: { count: Number(await entity.count(options)) } });
  });
}
