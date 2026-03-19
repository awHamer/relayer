import { notFoundError } from '../errors';
import { applySelectPolicy } from '../validate/select-schema';
import type {
  RuntimeEntityClient,
  RuntimeFindByIdHooks,
  RuntimeRouteConfig,
} from './handler-types';
import {
  attachContext,
  initContext,
  parseIdParam,
  parseJsonQueryParam,
  withErrorHandling,
  type NextHandler,
} from './shared';

export function createFindByIdHandler(
  entity: RuntimeEntityClient,
  config: RuntimeRouteConfig,
  hooks?: RuntimeFindByIdHooks,
): NextHandler {
  return withErrorHandling('findById', async (req, routeCtx) => {
    const ctx = await initContext(config, req);
    const params = await routeCtx.params;
    const idValue = parseIdParam(params);

    const url = new URL(req.url);
    const select = applySelectPolicy(
      parseJsonQueryParam(url, 'select') ?? hooks?.defaultSelect,
      config.allowSelect,
    );

    const options: Record<string, unknown> = { where: { id: idValue } };
    if (select) options.select = select;
    attachContext(options, ctx);

    let result = await entity.findFirst(options);
    if (!result) return notFoundError();

    if (hooks?.afterFind) {
      const hookResult = await hooks.afterFind(result, ctx);
      if (hookResult instanceof Response) return hookResult;
      if (!hookResult) return notFoundError();
      result = hookResult;
    }

    return Response.json({ data: result });
  });
}
