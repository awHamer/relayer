import type { ExecutionContext } from '@nestjs/common';
import type { RequestContext } from '@relayerjs/nestjs-crud';

export type GqlContext = RequestContext;

export interface GqlExecutionContextLike {
  getContext(): { req?: unknown; request?: unknown };
  getInfo(): unknown;
  getArgs(): Record<string, unknown>;
}

export function extractRequestFromGqlContext(
  ctxOrReq: ExecutionContext | { req?: unknown; request?: unknown } | unknown,
): unknown {
  if (!ctxOrReq || typeof ctxOrReq !== 'object') return ctxOrReq;
  const candidate = ctxOrReq as { req?: unknown; request?: unknown };
  return candidate.req ?? candidate.request ?? ctxOrReq;
}
