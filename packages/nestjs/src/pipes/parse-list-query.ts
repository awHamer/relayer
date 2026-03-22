export interface ParsedListQuery {
  select?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: { field: string; order: 'asc' | 'desc' } | { field: string; order: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  cursor?: string;
  search?: string;
  [key: string]: unknown;
}

function tryParseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function parseSort(
  sort: string | undefined,
): { field: string; order: 'asc' | 'desc' }[] | undefined {
  if (!sort) return undefined;
  return sort.split(',').map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith('-')) {
      return { field: trimmed.slice(1), order: 'desc' as const };
    }
    if (trimmed.startsWith('+')) {
      return { field: trimmed.slice(1), order: 'asc' as const };
    }
    return { field: trimmed, order: 'asc' as const };
  });
}

export function parseListQuery(query: Record<string, string | undefined>): ParsedListQuery {
  const result: ParsedListQuery = {};

  const select = tryParseJson(query.select);
  if (select && typeof select === 'object') {
    result.select = select as Record<string, unknown>;
  }

  const where = tryParseJson(query.where);
  if (where && typeof where === 'object') {
    result.where = where as Record<string, unknown>;
  }

  const orderBy = tryParseJson(query.orderBy);
  if (orderBy) {
    result.orderBy = orderBy as ParsedListQuery['orderBy'];
  } else if (query.sort) {
    const parsed = parseSort(query.sort);
    if (parsed && parsed.length > 0) {
      result.orderBy = parsed.length === 1 ? parsed[0] : parsed;
    }
  }

  if (query.limit) {
    const limit = parseInt(query.limit, 10);
    if (!isNaN(limit) && limit > 0) {
      result.limit = limit;
    }
  }

  if (query.offset) {
    const offset = parseInt(query.offset, 10);
    if (!isNaN(offset) && offset >= 0) {
      result.offset = offset;
    }
  }

  if (query.cursor) {
    result.cursor = query.cursor;
  }

  if (query.search) {
    result.search = query.search;
  }

  return result;
}
