import {
  IdParamError,
  internalError,
  JsonParseError,
  OrderByValidationError,
  validationError,
  WhereValidationError,
} from '../errors';
import { parseNumericOrString } from '../parse/query-params';
import type {
  RuntimeEntityClient,
  RuntimeHandlerContext,
  RuntimeRouteConfig,
} from './handler-types';

export interface TransactionalClient {
  $transaction<T>(cb: (tx: TransactionalClient) => Promise<T>): Promise<T>;
  [entityName: string]: unknown;
}

export type NextHandler = (
  req: Request,
  routeCtx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

export function parseIdParam(params: Record<string, string>): string | number {
  const id = params.id;
  if (!id) throw new IdParamError('Missing "id" parameter');
  return parseNumericOrString(id);
}

export function parseJsonQueryParam(
  url: URL,
  paramName: string,
): Record<string, unknown> | undefined {
  const str = url.searchParams.get(paramName);
  if (!str) return undefined;
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    throw new JsonParseError(`Invalid JSON in "${paramName}" query parameter`);
  }
}

export async function runMutation<T>(
  client: TransactionalClient,
  entityName: string,
  ctx: RuntimeHandlerContext,
  operation: (entity: RuntimeEntityClient) => Promise<T | false>,
): Promise<T | null> {
  const result = await client.$transaction(async (tx) => {
    ctx.tx = tx;
    const entity = tx[entityName] as RuntimeEntityClient;
    return operation(entity);
  });
  if (result === false) return null;
  return result as T;
}

export function withErrorHandling(name: string, handler: NextHandler): NextHandler {
  return async (req, routeCtx) => {
    try {
      return await handler(req, routeCtx);
    } catch (err) {
      if (err instanceof WhereValidationError || err instanceof OrderByValidationError) {
        return validationError(err.message);
      }
      if (err instanceof JsonParseError || err instanceof IdParamError) {
        return validationError(err.message);
      }
      console.error(`[relayer/next] ${name} error:`, err);
      return internalError();
    }
  };
}

export async function initContext(
  config: RuntimeRouteConfig,
  req: Request,
): Promise<RuntimeHandlerContext> {
  const ctx: RuntimeHandlerContext = {};
  if (config.hooks?.beforeRequest) await config.hooks.beforeRequest(ctx, req);
  return ctx;
}

export function attachContext(options: { context?: unknown }, ctx: RuntimeHandlerContext): void {
  if (ctx.context) options.context = ctx.context;
}

export function hookIntercepted(result: unknown): result is Response | false {
  return result === false || result instanceof Response;
}

export function hookResponse(result: Response | false, fallback: Response): Response {
  return result instanceof Response ? result : fallback;
}

export { IdParamError, JsonParseError } from '../errors';
