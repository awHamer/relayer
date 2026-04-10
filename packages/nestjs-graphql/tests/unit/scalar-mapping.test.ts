import { describe, expect, it } from 'vitest';

import {
  mapScalarFieldToGqlScalar,
  mapValueTypeToGqlScalar,
} from '../../src/metadata/scalar-mapping';

describe('mapValueTypeToGqlScalar', () => {
  it('maps number to Float', () => {
    expect(mapValueTypeToGqlScalar('number')).toBe('Float');
  });

  it('maps boolean to Boolean', () => {
    expect(mapValueTypeToGqlScalar('boolean')).toBe('Boolean');
  });

  it('maps date to DateTime', () => {
    expect(mapValueTypeToGqlScalar('date')).toBe('DateTime');
  });

  it('maps json to JSON', () => {
    expect(mapValueTypeToGqlScalar('json')).toBe('JSON');
  });

  it('maps array to JSON', () => {
    expect(mapValueTypeToGqlScalar('array')).toBe('JSON');
  });

  it('maps object string to JSON', () => {
    expect(mapValueTypeToGqlScalar('object')).toBe('JSON');
  });

  it('maps object type (typeof === object) to JSON', () => {
    expect(mapValueTypeToGqlScalar({ custom: true } as any)).toBe('JSON');
  });

  it('maps string to String', () => {
    expect(mapValueTypeToGqlScalar('string')).toBe('String');
  });

  it('maps enum to String', () => {
    expect(mapValueTypeToGqlScalar('enum')).toBe('String');
  });

  it('maps unknown to String', () => {
    expect(mapValueTypeToGqlScalar('unknown')).toBe('String');
  });
});

describe('mapScalarFieldToGqlScalar', () => {
  it('maps primary key to ID regardless of value type', () => {
    expect(
      mapScalarFieldToGqlScalar({ name: 'id', valueType: 'number', primaryKey: true } as any),
    ).toBe('ID');
  });

  it('maps primary key string to ID', () => {
    expect(
      mapScalarFieldToGqlScalar({ name: 'uuid', valueType: 'string', primaryKey: true } as any),
    ).toBe('ID');
  });

  it('maps number field with "id" in name to Int', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'authorId', valueType: 'number' } as any)).toBe('Int');
  });

  it('maps number field with "Id" in name to Int', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'categoryId', valueType: 'number' } as any)).toBe(
      'Int',
    );
  });

  it('maps number field without "id" in name to Float', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'rating', valueType: 'number' } as any)).toBe('Float');
  });

  it('maps number field named "price" to Float', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'price', valueType: 'number' } as any)).toBe('Float');
  });

  it('falls through to mapValueTypeToGqlScalar for boolean', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'published', valueType: 'boolean' } as any)).toBe(
      'Boolean',
    );
  });

  it('falls through for date', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'createdAt', valueType: 'date' } as any)).toBe(
      'DateTime',
    );
  });

  it('falls through for string', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'title', valueType: 'string' } as any)).toBe('String');
  });

  it('falls through for json', () => {
    expect(mapScalarFieldToGqlScalar({ name: 'metadata', valueType: 'json' } as any)).toBe('JSON');
  });
});
