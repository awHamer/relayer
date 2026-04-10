import type { FieldNode, SelectionSetNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import { selectionIncludes } from '../../src/info/selection-includes';

function field(name: string, subSelSet?: SelectionSetNode): FieldNode {
  return {
    kind: 'Field',
    name: { kind: 'Name', value: name },
    ...(subSelSet ? { selectionSet: subSelSet } : {}),
  } as FieldNode;
}

function selSet(...selections: FieldNode[]): SelectionSetNode {
  return { kind: 'SelectionSet', selections } as SelectionSetNode;
}

function makeInfo(rootSelSet: SelectionSetNode) {
  return {
    fieldNodes: [field('root', rootSelSet)],
    fragments: {},
  } as any;
}

describe('selectionIncludes', () => {
  it('returns true when field is selected at root', () => {
    const info = makeInfo(selSet(field('items'), field('totalCount')));
    expect(selectionIncludes(info, [], 'totalCount')).toBe(true);
  });

  it('returns false when field is not selected', () => {
    const info = makeInfo(selSet(field('items')));
    expect(selectionIncludes(info, [], 'totalCount')).toBe(false);
  });

  it('navigates path before checking', () => {
    const inner = selSet(field('id'), field('title'));
    const info = makeInfo(selSet(field('edges', inner)));
    expect(selectionIncludes(info, ['edges'], 'id')).toBe(true);
    expect(selectionIncludes(info, ['edges'], 'missing')).toBe(false);
  });

  it('returns false when path does not exist', () => {
    const info = makeInfo(selSet(field('items')));
    expect(selectionIncludes(info, ['nonexistent'], 'id')).toBe(false);
  });

  it('returns false when no selectionSet', () => {
    const info = {
      fieldNodes: [{ kind: 'Field', name: { kind: 'Name', value: 'root' } }],
      fragments: {},
    } as any;
    expect(selectionIncludes(info, [], 'anything')).toBe(false);
  });

  it('navigates multi-level path', () => {
    const deepSel = selSet(field('id'), field('name'));
    const midSel = selSet(field('node', deepSel));
    const info = makeInfo(selSet(field('edges', midSel)));

    expect(selectionIncludes(info, ['edges', 'node'], 'id')).toBe(true);
    expect(selectionIncludes(info, ['edges', 'node'], 'name')).toBe(true);
    expect(selectionIncludes(info, ['edges', 'node'], 'email')).toBe(false);
  });
});
