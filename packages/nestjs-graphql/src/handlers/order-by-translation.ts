type OrderByInputObject = Record<string, unknown>;

export interface FlatOrderBy {
  field: string;
  order: 'asc' | 'desc';
}

export function translateOrderByInput(
  input: OrderByInputObject | OrderByInputObject[] | undefined,
): FlatOrderBy[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];
  const out: FlatOrderBy[] = [];
  for (const obj of list) {
    out.push(...flatten(obj, []));
  }
  return out;
}

function flatten(input: OrderByInputObject, prefix: string[]): FlatOrderBy[] {
  const out: FlatOrderBy[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const dir = value === 'desc' ? 'desc' : 'asc';
      out.push({ field: [...prefix, key].join('.'), order: dir });
    } else if (typeof value === 'object') {
      out.push(...flatten(value as OrderByInputObject, [...prefix, key]));
    }
  }
  return out;
}
