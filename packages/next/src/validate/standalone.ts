import { z } from 'zod';

import type { SelectConfig, WhereConfig } from '../types';

// TODO: move to a separate package once more integrations are added

export function createWhereSchema(
  _entity: unknown,
  config?: WhereConfig,
): z.ZodType<Record<string, unknown> | undefined> {
  if (!config) {
    return z.record(z.unknown()).optional();
  }

  return z
    .record(z.unknown())
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val)) {
        if (key === 'AND' || key === 'OR' || key === 'NOT' || key === '$raw') {
          result[key] = value;
          continue;
        }
        const policy = config[key];
        if (policy === false) continue;
        if (
          typeof policy === 'object' &&
          'operators' in policy &&
          typeof value === 'object' &&
          value !== null
        ) {
          const filtered: Record<string, unknown> = {};
          for (const [op, opVal] of Object.entries(value as Record<string, unknown>)) {
            if (policy.operators.includes(op)) {
              filtered[op] = opVal;
            }
          }
          if (Object.keys(filtered).length > 0) result[key] = filtered;
        } else {
          result[key] = value;
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    });
}

export function createSelectSchema(
  _entity: unknown,
  config?: SelectConfig,
): z.ZodType<Record<string, unknown> | undefined> {
  if (!config) {
    return z.record(z.unknown()).optional();
  }

  return z
    .record(z.unknown())
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val)) {
        const policy = config[key];
        if (policy === false) continue;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (policy === undefined) continue;
          result[key] = value;
        } else {
          result[key] = value;
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    });
}

export function createOrderBySchema(
  _entity: unknown,
  allowedFields?: string[],
): z.ZodType<Record<string, unknown> | Record<string, unknown>[] | undefined> {
  if (!allowedFields) {
    return z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional();
  }

  const allowed = new Set(allowedFields);
  return z
    .union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const entries = Array.isArray(val) ? val : [val];
        return entries.every((e) => allowed.has(e.field as string));
      },
      { message: `orderBy field must be one of: ${allowedFields.join(', ')}` },
    );
}
