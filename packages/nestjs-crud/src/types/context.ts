export interface RequestContext {
  request: unknown;
  user?: unknown;
  tx?: unknown;
  [key: string]: unknown;
}

export interface ValidationError {
  code: string;
  message: string;
  path: (string | number)[];
  [key: string]: unknown;
}
