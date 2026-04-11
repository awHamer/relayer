import { encodeCursor } from '@relayerjs/nestjs-common';

import { fetchCursorPage } from './fetch-cursor-page';
import type { AnyHandlerHost, CursorListHandlerArgs, HandlerCallContext } from './handler-types';

export interface CursorResult {
  items: unknown[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number | null;
}

export async function handleListCursor(
  host: AnyHandlerHost,
  args: CursorListHandlerArgs,
  call: HandlerCallContext,
): Promise<CursorResult> {
  const page = await fetchCursorPage(host, args, call, ['items']);

  const first = page.items[0];
  const last = page.items[page.items.length - 1];
  const startCursor = first ? encodeCursor(first, page.orderBy, page.idField) : null;
  const endCursor = last ? encodeCursor(last, page.orderBy, page.idField) : null;

  return {
    items: page.items,
    pageInfo: {
      hasNextPage: page.hasNextPage,
      hasPreviousPage: page.hasPreviousPage,
      startCursor,
      endCursor,
    },
    totalCount: page.totalCount,
  };
}
