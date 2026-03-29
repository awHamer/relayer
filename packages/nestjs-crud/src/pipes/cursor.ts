import { BadRequestException } from '@nestjs/common';

declare const Buffer: {
  from(str: string, encoding?: string): { toString(encoding: string): string };
};

function toBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

function fromBase64(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8');
}

// t = types: 's' string, 'n' number, 'd' date
interface CursorData {
  v: unknown[];
  f: string[];
  d: string[];
  t: string[];
}

export function encodeCursor(
  lastItem: Record<string, unknown>,
  orderBy: { field: string; order: 'asc' | 'desc' }[],
  idField: string,
): string {
  const fields: string[] = [];
  const values: unknown[] = [];
  const directions: string[] = [];
  const types: string[] = [];

  for (const { field, order } of orderBy) {
    fields.push(field);
    const value = lastItem[field];
    if (value instanceof Date) {
      values.push(value.toISOString());
      types.push('d');
    } else if (typeof value === 'number') {
      values.push(value);
      types.push('n');
    } else {
      values.push(value);
      types.push('s');
    }
    directions.push(order);
  }

  if (!fields.includes(idField)) {
    fields.push(idField);
    const idValue = lastItem[idField];
    values.push(idValue);
    types.push(typeof idValue === 'number' ? 'n' : 's');
    directions.push(orderBy[0]?.order ?? 'asc');
  }

  return toBase64(JSON.stringify({ v: values, f: fields, d: directions, t: types }));
}

export function decodeCursor(cursor: string): CursorData {
  try {
    const parsed = JSON.parse(fromBase64(cursor));
    if (!Array.isArray(parsed.v) || !Array.isArray(parsed.f) || !Array.isArray(parsed.d)) {
      throw new Error();
    }
    const types = (parsed.t ?? []) as string[];
    const values = (parsed.v as unknown[]).map((v, i) => {
      if (types[i] === 'd' && typeof v === 'string') return new Date(v);
      if (types[i] === 'n' && typeof v === 'string') return Number(v);
      return v;
    });
    return { v: values, f: parsed.f, d: parsed.d, t: types };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

export function buildCursorWhere(cursor: CursorData): Record<string, unknown> {
  const { v: values, f: fields, d: directions } = cursor;

  if (fields.length === 1) {
    const op = directions[0] === 'desc' ? 'lt' : 'gt';
    return { [fields[0]!]: { [op]: values[0] } };
  }

  // Tuple comparison: (a, b) > (v1, v2)
  // Expanded as: (a > v1) OR (a <= v1 AND b > v2)
  // Using lte/gte for intermediate fields to handle timestamp ms precision.
  const orBranches: Record<string, unknown>[] = [];

  for (let i = 0; i < fields.length; i++) {
    const branch: Record<string, unknown> = {};
    for (let j = 0; j < i; j++) {
      const eqOp = directions[j] === 'desc' ? 'gte' : 'lte';
      branch[fields[j]!] = { [eqOp]: values[j] };
    }
    const op = directions[i] === 'desc' ? 'lt' : 'gt';
    branch[fields[i]!] = { [op]: values[i] };
    orBranches.push(branch);
  }

  return orBranches.length === 1 ? orBranches[0]! : { OR: orBranches };
}
