import type { SelectConfig } from '../types';

function isRelationValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function applySelectPolicy(
  userSelect: Record<string, unknown> | undefined,
  config: SelectConfig | undefined,
): Record<string, unknown> | undefined {
  if (!config) return userSelect;
  if (!userSelect) return undefined;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(userSelect)) {
    const policy = config[key];

    if (policy === false) continue;

    if (isRelationValue(value)) {
      if (policy === undefined) continue;
      if (policy === true) {
        result[key] = value;
      } else if (typeof policy === 'object') {
        const filtered: Record<string, unknown> = {};
        for (const [subKey, subVal] of Object.entries(value)) {
          if ((policy as Record<string, boolean>)[subKey]) {
            filtered[subKey] = subVal;
          }
        }
        if (Object.keys(filtered).length > 0) {
          result[key] = filtered;
        }
      }
    } else {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
