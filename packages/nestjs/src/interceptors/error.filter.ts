import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';

interface HttpResponse {
  statusCode: number;
  json(body: unknown): void;
}

@Catch()
export class RelayerExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response.statusCode = status;
      response.json({
        error: {
          code: this.getErrorCode(status),
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : ((exceptionResponse as Record<string, unknown>).message ?? exception.message),
          status,
        },
      });
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    response.statusCode = 500;
    response.json({
      error: {
        code: 'INTERNAL_ERROR',
        message,
        status: 500,
      },
    });
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 422:
        return 'VALIDATION_ERROR';
      case 409:
        return 'CONFLICT';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
