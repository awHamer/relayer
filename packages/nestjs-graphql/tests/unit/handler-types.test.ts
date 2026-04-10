import { describe, expect, it, vi } from 'vitest';

import { buildOperationContext } from '../../src/handlers/handler-types';

describe('buildOperationContext', () => {
  it('extracts req from gqlCtx.req', () => {
    const fakeReq = { headers: { 'x-user-id': '1' } };
    const buildContext = vi.fn().mockReturnValue({ request: fakeReq });
    const buildQueryContext = vi.fn().mockReturnValue(undefined);
    const host = { buildContext, buildQueryContext };

    buildOperationContext(host, { req: fakeReq });

    expect(buildContext).toHaveBeenCalledWith(fakeReq);
  });

  it('extracts request from gqlCtx.request when req is absent', () => {
    const fakeReq = { headers: {} };
    const buildContext = vi.fn().mockReturnValue({ request: fakeReq });
    const buildQueryContext = vi.fn().mockReturnValue(undefined);
    const host = { buildContext, buildQueryContext };

    buildOperationContext(host, { request: fakeReq });

    expect(buildContext).toHaveBeenCalledWith(fakeReq);
  });

  it('falls back to gqlCtx itself when neither req nor request exists', () => {
    const gqlCtx = { custom: 'value' } as any;
    const buildContext = vi.fn().mockReturnValue({});
    const buildQueryContext = vi.fn().mockReturnValue(undefined);
    const host = { buildContext, buildQueryContext };

    buildOperationContext(host, gqlCtx);

    expect(buildContext).toHaveBeenCalledWith(gqlCtx);
  });

  it('passes buildContext result to buildQueryContext', () => {
    const ctx = { request: {}, currentUser: { id: 1 } };
    const buildContext = vi.fn().mockReturnValue(ctx);
    const buildQueryContext = vi.fn().mockReturnValue({ userId: 1 });
    const host = { buildContext, buildQueryContext };

    buildOperationContext(host, { req: {} });

    expect(buildQueryContext).toHaveBeenCalledWith(ctx);
  });

  it('returns ctx and queryCtx', () => {
    const ctx = { request: {} };
    const queryCtx = { tenantId: 'acme' };
    const host = {
      buildContext: vi.fn().mockReturnValue(ctx),
      buildQueryContext: vi.fn().mockReturnValue(queryCtx),
    };

    const result = buildOperationContext(host, { req: {} });

    expect(result).toEqual({ ctx, queryCtx });
  });

  it('queryCtx can be undefined', () => {
    const host = {
      buildContext: vi.fn().mockReturnValue({}),
      buildQueryContext: vi.fn().mockReturnValue(undefined),
    };

    const result = buildOperationContext(host, { req: {} });

    expect(result.queryCtx).toBeUndefined();
  });
});
