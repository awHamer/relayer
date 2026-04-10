export interface RequestContext<TUser = unknown> {
  request: unknown;
  user?: TUser;
  tx?: unknown;
  [key: string]: unknown;
}

export interface ValidationError {
  code: string;
  message: string;
  path: (string | number)[];
  [key: string]: unknown;
}
