import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { parseListQuery } from '../pipes/parse-list-query';

export const ListQuery = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ query: Record<string, string> }>();
  return parseListQuery(request.query);
});
