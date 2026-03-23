import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { lastValueFrom, of } from 'rxjs';

import { EnvelopeInterceptor } from '../../src/interceptors/envelope.interceptor';

function callInterceptor(data: unknown): Promise<unknown> {
  const interceptor = new EnvelopeInterceptor();
  const ctx = {} as ExecutionContext;
  const next: CallHandler = { handle: () => of(data) };
  return lastValueFrom(interceptor.intercept(ctx, next));
}

describe('EnvelopeInterceptor', () => {
  it('wraps plain value in { data }', async () => {
    expect(await callInterceptor('hello')).toEqual({ data: 'hello' });
  });

  it('wraps object without data/error keys', async () => {
    expect(await callInterceptor({ id: 1, title: 'Test' })).toEqual({
      data: { id: 1, title: 'Test' },
    });
  });

  it('passes through object with data key', async () => {
    const input = { data: [{ id: 1 }], meta: { total: 1 } };
    expect(await callInterceptor(input)).toBe(input);
  });

  it('passes through object with error key', async () => {
    const input = { error: { code: 'NOT_FOUND', message: 'Not found' } };
    expect(await callInterceptor(input)).toBe(input);
  });

  it('wraps null in { data: null }', async () => {
    expect(await callInterceptor(null)).toEqual({ data: null });
  });

  it('wraps array in { data }', async () => {
    expect(await callInterceptor([1, 2, 3])).toEqual({ data: [1, 2, 3] });
  });
});
