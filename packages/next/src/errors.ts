export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export class WhereValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhereValidationError';
  }
}

export class OrderByValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderByValidationError';
  }
}

export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
  }
}

export class IdParamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdParamError';
  }
}

export function validationError(message: string): Response {
  return Response.json(
    { error: { code: 'VALIDATION_ERROR', message, status: 422 } },
    { status: 422 },
  );
}

export function notFoundError(message = 'Record not found'): Response {
  return Response.json({ error: { code: 'NOT_FOUND', message, status: 404 } }, { status: 404 });
}

export function badRequestError(message: string): Response {
  return Response.json({ error: { code: 'BAD_REQUEST', message, status: 400 } }, { status: 400 });
}

export function internalError(message = 'Internal server error'): Response {
  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message, status: 500 } },
    { status: 500 },
  );
}
