import type { Column, SQL } from 'drizzle-orm';

import type { DerivedFieldResolution } from '../resolvers';
import { derivedSubFieldKey } from './join-keys';

/**
 * Flattens derived field resolutions into a name -> column map
 * for where/orderBy builders.
 * Object-type fields expand to `name_subField` entries.
 */
export function buildDerivedAliasMap(
  resolutions: Map<string, DerivedFieldResolution>,
): Map<string, { column: Column | SQL }> {
  const aliasMap = new Map<string, { column: Column | SQL }>();
  for (const [name, res] of resolutions) {
    if (res.isObjectType && res.valueColumns) {
      for (const [subField, col] of res.valueColumns) {
        aliasMap.set(derivedSubFieldKey(name, subField), { column: col });
      }
    } else {
      aliasMap.set(name, { column: res.valueColumn });
    }
  }
  return aliasMap;
}
