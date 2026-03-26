import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { RelayerExceptionFilter } from '../../src/interceptors/relayer-exception.filter';

function createMockHost() {
  const response = {
    statusCode: 200,
    json: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('RelayerExceptionFilter', () => {
  const filter = new RelayerExceptionFilter();

  it('maps 400 to BAD_REQUEST', () => {
    const { host, response } = createMockHost();
    filter.catch(new BadRequestException('Bad input'), host);
    expect(response.statusCode).toBe(400);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'BAD_REQUEST', message: 'Bad input', status: 400 },
    });
  });

  it('maps 401 to UNAUTHORIZED', () => {
    const { host, response } = createMockHost();
    filter.catch(new UnauthorizedException(), host);
    expect(response.statusCode).toBe(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
    );
  });

  it('maps 403 to FORBIDDEN', () => {
    const { host, response } = createMockHost();
    filter.catch(new ForbiddenException(), host);
    expect(response.statusCode).toBe(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }),
    );
  });

  it('maps 404 to NOT_FOUND', () => {
    const { host, response } = createMockHost();
    filter.catch(new NotFoundException('Not found'), host);
    expect(response.statusCode).toBe(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'NOT_FOUND' }) }),
    );
  });

  it('maps 422 to VALIDATION_ERROR', () => {
    const { host, response } = createMockHost();
    filter.catch(new HttpException({ message: 'Validation failed', statusCode: 422 }, 422), host);
    expect(response.statusCode).toBe(422);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('maps 409 to CONFLICT', () => {
    const { host, response } = createMockHost();
    filter.catch(new HttpException('Conflict', 409), host);
    expect(response.statusCode).toBe(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'CONFLICT' }) }),
    );
  });

  it('extracts message from string response', () => {
    const { host, response } = createMockHost();
    filter.catch(new HttpException('String message', 400), host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'String message' }),
      }),
    );
  });

  it('extracts message from object response', () => {
    const { host, response } = createMockHost();
    filter.catch(new HttpException({ message: 'Object message', statusCode: 400 }, 400), host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Object message' }),
      }),
    );
  });

  it('handles non-HTTP Error as 500 INTERNAL_ERROR', () => {
    const { host, response } = createMockHost();
    filter.catch(new Error('Something broke'), host);
    expect(response.statusCode).toBe(500);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Something broke', status: 500 },
    });
  });

  it('handles non-Error throw as 500', () => {
    const { host, response } = createMockHost();
    filter.catch('string-error', host);
    expect(response.statusCode).toBe(500);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 },
    });
  });
});
