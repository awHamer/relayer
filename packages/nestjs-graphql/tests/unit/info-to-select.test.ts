import type { FieldNode, SelectionSetNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import { infoToRelayerSelect } from '../../src/info/info-to-select';
import { mockEntityMeta } from '../helpers';

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
  const root = field('root', rootSelSet) as any;
  return {
    fieldNodes: [root],
    fragments: {},
  } as any;
}

describe('infoToRelayerSelect', () => {
  it('builds select tree for scalar fields', () => {
    const info = makeInfo(selSet(field('id'), field('title')));
    const entity = mockEntityMeta({ fields: new Set(['id', 'title', 'content']) });

    const result = infoToRelayerSelect(info, entity);
    expect(result).toEqual({ id: true, title: true });
  });

  it('skips fields not on entity', () => {
    const info = makeInfo(selSet(field('id'), field('__typename'), field('unknown')));
    const entity = mockEntityMeta({ fields: new Set(['id', 'title']) });

    const result = infoToRelayerSelect(info, entity);
    expect(result).toEqual({ id: true });
  });

  it('builds nested select for relation with sub-selection', () => {
    const authorSel = selSet(field('id'), field('name'));
    const info = makeInfo(selSet(field('id'), field('author', authorSel)));

    const authorMeta = mockEntityMeta({
      name: 'users',
      fields: new Set(['id', 'name']),
    });
    const entity = mockEntityMeta({
      fields: new Set(['id', 'title']),
      relations: new Map([
        ['author', { name: 'author', cardinality: 'one', targetEntity: 'users' } as any],
      ]),
      relatedMeta: new Map([['author', authorMeta as any]]),
    });

    const result = infoToRelayerSelect(info, entity);
    expect(result).toEqual({
      id: true,
      author: { id: true, name: true },
    });
  });

  it('sets relation to true when no sub-selection', () => {
    const info = makeInfo(selSet(field('id'), field('author')));
    const entity = mockEntityMeta({
      fields: new Set(['id']),
      relations: new Map([
        ['author', { name: 'author', cardinality: 'one', targetEntity: 'users' } as any],
      ]),
    });

    const result = infoToRelayerSelect(info, entity);
    expect(result).toEqual({ id: true, author: true });
  });

  it('navigates rootPath', () => {
    const innerSel = selSet(field('id'), field('title'));
    const info = makeInfo(selSet(field('items', innerSel)));
    const entity = mockEntityMeta({ fields: new Set(['id', 'title']) });

    const result = infoToRelayerSelect(info, entity, ['items']);
    expect(result).toEqual({ id: true, title: true });
  });

  it('returns undefined when no root selectionSet', () => {
    const info = {
      fieldNodes: [{ kind: 'Field', name: { kind: 'Name', value: 'root' } }],
      fragments: {},
    } as any;
    const entity = mockEntityMeta();

    expect(infoToRelayerSelect(info, entity)).toBeUndefined();
  });

  it('returns undefined when rootPath does not match', () => {
    const info = makeInfo(selSet(field('id')));
    const entity = mockEntityMeta();

    expect(infoToRelayerSelect(info, entity, ['nonexistent'])).toBeUndefined();
  });
});
