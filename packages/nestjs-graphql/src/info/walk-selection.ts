import type {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';

export function getRootFieldNode(info: GraphQLResolveInfo): FieldNode | null {
  return info.fieldNodes[0] ?? null;
}

export function getRootSelectionSet(info: GraphQLResolveInfo): SelectionSetNode | null {
  const root = getRootFieldNode(info);
  return root?.selectionSet ?? null;
}

export function getNestedSelectionSet(
  selectionSet: SelectionSetNode | null,
  path: string[],
  fragments: Record<string, FragmentDefinitionNode>,
): SelectionSetNode | null {
  if (!selectionSet || path.length === 0) return selectionSet;
  const [head, ...tail] = path;
  for (const node of expandSelections(selectionSet.selections, fragments)) {
    if (node.kind === 'Field' && node.name.value === head) {
      return getNestedSelectionSet(node.selectionSet ?? null, tail, fragments);
    }
  }
  return null;
}

export function expandSelections(
  selections: readonly SelectionNode[],
  fragments: Record<string, FragmentDefinitionNode>,
): FieldNode[] {
  const out: FieldNode[] = [];
  for (const sel of selections) {
    if (sel.kind === 'Field') {
      out.push(sel);
    } else if (sel.kind === 'InlineFragment' && sel.selectionSet) {
      out.push(...expandSelections(sel.selectionSet.selections, fragments));
    } else if (sel.kind === 'FragmentSpread') {
      const fragment = fragments[sel.name.value];
      if (fragment) out.push(...expandSelections(fragment.selectionSet.selections, fragments));
    }
  }
  return out;
}
