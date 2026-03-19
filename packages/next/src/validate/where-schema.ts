import { WhereValidationError } from '../errors';
import type { WhereConfig } from '../types';

const LOGICAL_KEYS = new Set(['AND', 'OR', 'NOT', '$raw']);

export function validateWhere(
  where: Record<string, unknown> | undefined,
  config: WhereConfig | undefined,
): Record<string, unknown> | undefined {
  if (!where) return undefined;
  if (!config) return where;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(where)) {
    if (LOGICAL_KEYS.has(key)) {
      result[key] = value;
      continue;
    }

    const policy = config[key];

    if (policy === false) {
      throw new WhereValidationError(`Field "${key}" is not allowed in where`);
    }

    if (policy === undefined || policy === true) {
      result[key] = value;
      continue;
    }

    if (typeof policy === 'object' && 'operators' in policy) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const op of Object.keys(value as Record<string, unknown>)) {
          if (!policy.operators.includes(op)) {
            throw new WhereValidationError(
              `Operator "${op}" is not allowed for field "${key}". Allowed: ${policy.operators.join(', ')}`,
            );
          }
        }
        result[key] = value;
      } else {
        if (!policy.operators.includes('eq')) {
          throw new WhereValidationError(
            `Direct value (eq) is not allowed for field "${key}". Allowed: ${policy.operators.join(', ')}`,
          );
        }
        result[key] = value;
      }
      continue;
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
