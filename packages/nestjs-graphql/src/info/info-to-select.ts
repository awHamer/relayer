import type { FragmentDefinitionNode, GraphQLResolveInfo, SelectionSetNode } from 'graphql';

import type { EntityMetadata } from '../metadata';
import { expandSelections, getNestedSelectionSet, getRootSelectionSet } from './walk-selection';

export interface SelectTree {
  [key: string]: true | SelectTree;
}

export function infoToRelayerSelect(
  info: GraphQLResolveInfo,
  entity: EntityMetadata,
  rootPath: string[] = [],
): SelectTree | undefined {
  const rootSelection = getRootSelectionSet(info);
  if (!rootSelection) return undefined;
  const target = getNestedSelectionSet(rootSelection, rootPath, info.fragments);
  if (!target) return undefined;
  return buildSelect(target, entity, info.fragments);
}

function buildSelect(
  selectionSet: SelectionSetNode,
  entity: EntityMetadata,
  fragments: Record<string, FragmentDefinitionNode>,
): SelectTree {
  const result: SelectTree = {};
  for (const node of expandSelections(selectionSet.selections, fragments)) {
    const fieldName = node.name.value;
    if (!entity.hasField(fieldName)) continue;

    const relation = entity.getRelation(fieldName);
    if (relation) {
      const relatedEntity = entity.getRelatedEntityMetadata(fieldName);
      if (relatedEntity && node.selectionSet) {
        result[fieldName] = buildSelect(node.selectionSet, relatedEntity, fragments);
      } else {
        result[fieldName] = true;
      }
      continue;
    }

    result[fieldName] = true;
  }
  return result;
}
