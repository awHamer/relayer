import { parseListParams } from '../parse/query-params';
import { validateOrderBy } from '../validate/order-by-schema';
import { applySelectPolicy } from '../validate/select-schema';
import { validateWhere } from '../validate/where-schema';
import type {
  QueryOptions,
  RuntimeEntityClient,
  RuntimeHandlerContext,
  RuntimeListHooks,
  RuntimeRouteConfig,
} from './handler-types';
import { attachContext, initContext, withErrorHandling, type NextHandler } from './shared';

export interface RuntimeListHandler extends NextHandler {
  query: (options?: {
    where?: Record<string, unknown>;
    select?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    limit?: number;
    offset?: number;
    req?: Request;
    context?: unknown;
  }) => Promise<{
    data: Record<string, unknown>[];
    meta: { total: number; limit: number; offset: number };
  }>;
}

export function createListHandler(
  entity: RuntimeEntityClient,
  config: RuntimeRouteConfig,
  listHooks?: RuntimeListHooks,
): RuntimeListHandler {
  const { findMany, count: countFn } = entity;
  const maxLimit = config.maxLimit ?? 100;
  const defaultLimit = listHooks?.defaultLimit ?? config.defaultLimit ?? 20;

  async function executeList(params: QueryOptions, ctx: RuntimeHandlerContext) {
    let where = params.where;
    if (listHooks?.defaultWhere) where = { ...listHooks.defaultWhere, ...where };
    where = validateWhere(where, config.allowWhere);

    const select = applySelectPolicy(params.select ?? listHooks?.defaultSelect, config.allowSelect);
    const orderBy =
      validateOrderBy(params.orderBy, config.allowOrderBy) ?? listHooks?.defaultOrderBy;
    const limit = Math.min(params.limit ?? defaultLimit, maxLimit);
    const offset = params.offset ?? 0;

    const options: QueryOptions = { select, where, orderBy, limit, offset };
    attachContext(options, ctx);

    if (listHooks?.beforeFind) await listHooks.beforeFind(options, ctx);

    let results = await findMany(options);
    const total = await countFn(where ? { where: options.where } : undefined);

    if (listHooks?.afterFind) results = await listHooks.afterFind(results, ctx);

    return {
      data: results,
      meta: {
        total: Number(total),
        limit,
        offset,
      },
    };
  }

  const handler = withErrorHandling('list', async (req) => {
    const ctx = await initContext(config, req);
    const url = new URL(req.url);
    const params = parseListParams(url, defaultLimit, maxLimit);
    return Response.json(await executeList(params, ctx));
  });

  (handler as RuntimeListHandler).query = async (options?) => {
    const ctx: RuntimeHandlerContext = {};
    if (options?.context) {
      ctx.context = options.context;
    }
    if (options?.req && config.hooks?.beforeRequest) {
      await config.hooks.beforeRequest(ctx, options.req);
    }
    return executeList(
      {
        where: options?.where,
        select: options?.select,
        orderBy: options?.orderBy,
        limit: options?.limit,
        offset: options?.offset,
      },
      ctx,
    );
  };

  return handler as RuntimeListHandler;
}
