import type { GraphQLResolveInfo } from 'graphql';

import { expandSelections, getNestedSelectionSet, getRootSelectionSet } from './walk-selection';

export function selectionIncludes(
  info: GraphQLResolveInfo,
  path: string[],
  targetField: string,
): boolean {
  const root = getRootSelectionSet(info);
  if (!root) return false;
  const target = getNestedSelectionSet(root, path, info.fragments);
  if (!target) return false;
  for (const node of expandSelections(target.selections, info.fragments)) {
    if (node.name.value === targetField) return true;
  }
  return false;
}
