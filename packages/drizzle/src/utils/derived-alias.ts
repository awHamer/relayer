import type { Column, SQL } from 'drizzle-orm';

import type { DerivedFieldResolution } from '../resolvers/derived';

export function buildDerivedAliasMap(
  resolutions: Map<string, DerivedFieldResolution>,
): Map<string, { column: Column | SQL }> {
  const aliasMap = new Map<string, { column: Column | SQL }>();
  for (const [name, res] of resolutions) {
    if (res.isObjectType && res.valueColumns) {
      for (const [subField, col] of res.valueColumns) {
        aliasMap.set(`${name}_${subField}`, { column: col });
      }
    } else {
      aliasMap.set(name, { column: res.valueColumn });
    }
  }
  return aliasMap;
}
