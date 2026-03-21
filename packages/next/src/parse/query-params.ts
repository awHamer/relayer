export interface ParsedListParams {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  limit?: number;
  offset?: number;
}

export function parseNumericOrString(value: string): string | number {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function parseJsonParam(url: URL, name: string): unknown | undefined {
  const raw = url.searchParams.get(name);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in "${name}" query parameter`);
  }
}

export function parseListParams(
  url: URL,
  defaultLimit: number,
  maxLimit: number,
): ParsedListParams {
  const result: ParsedListParams = {};

  result.where = parseJsonParam(url, 'where') as ParsedListParams['where'];
  result.select = parseJsonParam(url, 'select') as ParsedListParams['select'];
  result.orderBy = parseJsonParam(url, 'orderBy') as ParsedListParams['orderBy'];

  const sortStr = url.searchParams.get('sort');
  if (sortStr && !result.orderBy) {
    result.orderBy = parseSortString(sortStr);
  }

  const limitStr = url.searchParams.get('limit');
  if (limitStr) {
    const limit = parseInt(limitStr, 10);
    if (!isNaN(limit) && limit > 0) {
      result.limit = Math.min(limit, maxLimit);
    }
  }
  if (result.limit === undefined) {
    result.limit = defaultLimit;
  }

  const offsetStr = url.searchParams.get('offset');
  if (offsetStr) {
    const offset = parseInt(offsetStr, 10);
    if (!isNaN(offset) && offset >= 0) {
      result.offset = offset;
    }
  }

  return result;
}

export function parseSortString(sort: string): Record<string, string>[] {
  return sort.split(',').map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith('-')) {
      return { field: trimmed.slice(1), order: 'desc' };
    }
    if (trimmed.startsWith('+')) {
      return { field: trimmed.slice(1), order: 'asc' };
    }
    return { field: trimmed, order: 'asc' };
  });
}

export function parseAggregateParams(url: URL): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  result.groupBy = parseJsonParam(url, 'groupBy');
  result.where = parseJsonParam(url, 'where');

  for (const key of ['_count', '_sum', '_avg', '_min', '_max']) {
    const val = url.searchParams.get(key);
    if (val) {
      result[key] = val === 'true' ? true : parseJsonParam(url, key);
    }
  }

  return result;
}
