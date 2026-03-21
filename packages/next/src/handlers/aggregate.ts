import { parseAggregateParams } from '../parse/query-params';
import type {
  RuntimeAggregateHooks,
  RuntimeEntityClient,
  RuntimeRouteConfig,
} from './handler-types';
import { attachContext, initContext, withErrorHandling, type NextHandler } from './shared';

export function createAggregateHandler(
  entity: RuntimeEntityClient,
  config: RuntimeRouteConfig,
  hooks?: RuntimeAggregateHooks,
): NextHandler {
  return withErrorHandling('aggregate', async (req) => {
    const ctx = await initContext(config, req);
    const url = new URL(req.url);
    const options = parseAggregateParams(url);
    attachContext(options, ctx);

    if (hooks?.beforeAggregate) await hooks.beforeAggregate(options, ctx);

    return Response.json({ data: await entity.aggregate(options) });
  });
}
