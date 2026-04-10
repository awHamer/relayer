import type { FieldNode, FragmentDefinitionNode, SelectionSetNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  expandSelections,
  getNestedSelectionSet,
  getRootFieldNode,
  getRootSelectionSet,
} from '../../src/info';

function field(name: string, selSet?: SelectionSetNode): FieldNode {
  return {
    kind: 'Field',
    name: { kind: 'Name', value: name },
    ...(selSet ? { selectionSet: selSet } : {}),
  } as FieldNode;
}

function selSet(...selections: any[]): SelectionSetNode {
  return { kind: 'SelectionSet', selections } as SelectionSetNode;
}

function inlineFragment(selSet: SelectionSetNode) {
  return { kind: 'InlineFragment', selectionSet: selSet };
}

function fragmentSpread(name: string) {
  return { kind: 'FragmentSpread', name: { kind: 'Name', value: name } };
}

function fragmentDef(name: string, selections: any[]): FragmentDefinitionNode {
  return {
    kind: 'FragmentDefinition',
    name: { kind: 'Name', value: name },
    selectionSet: selSet(...selections),
  } as unknown as FragmentDefinitionNode;
}

describe('getRootFieldNode', () => {
  it('returns first fieldNode', () => {
    const node = field('users');
    const info = { fieldNodes: [node] } as any;
    expect(getRootFieldNode(info)).toBe(node);
  });

  it('returns null for empty fieldNodes', () => {
    const info = { fieldNodes: [] } as any;
    expect(getRootFieldNode(info)).toBeNull();
  });
});

describe('getRootSelectionSet', () => {
  it('returns selectionSet from root field', () => {
    const ss = selSet(field('id'));
    const node = field('users', ss);
    const info = { fieldNodes: [node] } as any;
    expect(getRootSelectionSet(info)).toBe(ss);
  });

  it('returns null when root has no selectionSet', () => {
    const node = field('count');
    const info = { fieldNodes: [node] } as any;
    expect(getRootSelectionSet(info)).toBeNull();
  });
});

describe('expandSelections', () => {
  it('passes Field nodes through', () => {
    const f1 = field('id');
    const f2 = field('title');
    const result = expandSelections([f1, f2], {});
    expect(result).toEqual([f1, f2]);
  });

  it('expands InlineFragment', () => {
    const f1 = field('id');
    const inline = inlineFragment(selSet(field('name'), field('email')));
    const result = expandSelections([f1, inline] as any, {});
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(f1);
    expect(result[1].name.value).toBe('name');
    expect(result[2].name.value).toBe('email');
  });

  it('expands FragmentSpread', () => {
    const spread = fragmentSpread('UserFields');
    const fragments = {
      UserFields: fragmentDef('UserFields', [field('id'), field('name')]),
    };
    const result = expandSelections([spread] as any, fragments);
    expect(result).toHaveLength(2);
    expect(result[0].name.value).toBe('id');
    expect(result[1].name.value).toBe('name');
  });

  it('skips unknown fragment spread', () => {
    const spread = fragmentSpread('Missing');
    const result = expandSelections([spread] as any, {});
    expect(result).toHaveLength(0);
  });

  it('handles nested inline fragments', () => {
    const inner = inlineFragment(selSet(field('email')));
    const outer = inlineFragment(selSet(field('id'), inner));
    const result = expandSelections([outer] as any, {});
    expect(result).toHaveLength(2);
    expect(result[0].name.value).toBe('id');
    expect(result[1].name.value).toBe('email');
  });
});

describe('getNestedSelectionSet', () => {
  it('returns input for empty path', () => {
    const ss = selSet(field('id'));
    expect(getNestedSelectionSet(ss, [], {})).toBe(ss);
  });

  it('returns null for null selectionSet', () => {
    expect(getNestedSelectionSet(null, ['items'], {})).toBeNull();
  });

  it('navigates single-level path', () => {
    const innerSs = selSet(field('id'), field('title'));
    const root = selSet(field('items', innerSs));
    expect(getNestedSelectionSet(root, ['items'], {})).toBe(innerSs);
  });

  it('navigates multi-level path', () => {
    const deepSs = selSet(field('id'));
    const midSs = selSet(field('node', deepSs));
    const root = selSet(field('edges', midSs));
    expect(getNestedSelectionSet(root, ['edges', 'node'], {})).toBe(deepSs);
  });

  it('returns null when path does not match', () => {
    const root = selSet(field('items', selSet(field('id'))));
    expect(getNestedSelectionSet(root, ['missing'], {})).toBeNull();
  });

  it('returns null for partial path match', () => {
    const root = selSet(field('items', selSet(field('id'))));
    expect(getNestedSelectionSet(root, ['items', 'nonexistent'], {})).toBeNull();
  });
});
