import { describe, expect, it } from 'vitest';

import {
  createOrderBySchema,
  createSelectSchema,
  createWhereSchema,
} from '../../src/validate/standalone';

describe('createWhereSchema', () => {
  it('accepts any record without config', () => {
    const schema = createWhereSchema(null);
    expect(schema.parse({ name: 'test' })).toEqual({ name: 'test' });
  });

  it('returns undefined for undefined input', () => {
    const schema = createWhereSchema(null);
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('strips denied fields', () => {
    const schema = createWhereSchema(null, { password: false });
    expect(schema.parse({ name: 'test', password: '123' })).toEqual({ name: 'test' });
  });

  it('passes through logical operators', () => {
    const schema = createWhereSchema(null, {});
    const input = { AND: [{ a: 1 }], OR: [{ b: 2 }] };
    expect(schema.parse(input)).toEqual(input);
  });

  it('filters operators by policy', () => {
    const schema = createWhereSchema(null, { email: { operators: ['eq'] } });
    const input = { email: { eq: 'a@b.com', contains: 'test' } };
    expect(schema.parse(input)).toEqual({ email: { eq: 'a@b.com' } });
  });

  it('returns undefined when all fields stripped', () => {
    const schema = createWhereSchema(null, { secret: false });
    expect(schema.parse({ secret: 'x' })).toBeUndefined();
  });
});

describe('createSelectSchema', () => {
  it('accepts any record without config', () => {
    const schema = createSelectSchema(null);
    expect(schema.parse({ id: true })).toEqual({ id: true });
  });

  it('returns undefined for undefined input', () => {
    const schema = createSelectSchema(null);
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('strips denied fields', () => {
    const schema = createSelectSchema(null, { password: false });
    expect(schema.parse({ id: true, password: true })).toEqual({ id: true });
  });

  it('strips unconfigured relations', () => {
    const schema = createSelectSchema(null, {});
    expect(schema.parse({ id: true, posts: { title: true } })).toEqual({ id: true });
  });

  it('allows configured relations', () => {
    const schema = createSelectSchema(null, { posts: true });
    const input = { id: true, posts: { title: true } };
    expect(schema.parse(input)).toEqual(input);
  });
});

describe('createOrderBySchema', () => {
  it('accepts any orderBy without allowedFields', () => {
    const schema = createOrderBySchema(null);
    const ob = { field: 'name', order: 'asc' };
    expect(schema.parse(ob)).toEqual(ob);
  });

  it('accepts array orderBy', () => {
    const schema = createOrderBySchema(null);
    const ob = [{ field: 'a', order: 'asc' }];
    expect(schema.parse(ob)).toEqual(ob);
  });

  it('returns undefined for undefined input', () => {
    const schema = createOrderBySchema(null);
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('allows valid field', () => {
    const schema = createOrderBySchema(null, ['name', 'id']);
    expect(schema.parse({ field: 'name', order: 'asc' })).toEqual({ field: 'name', order: 'asc' });
  });

  it('rejects disallowed field', () => {
    const schema = createOrderBySchema(null, ['name']);
    expect(() => schema.parse({ field: 'secret', order: 'asc' })).toThrow();
  });

  it('rejects array with disallowed field', () => {
    const schema = createOrderBySchema(null, ['name']);
    expect(() =>
      schema.parse([
        { field: 'name', order: 'asc' },
        { field: 'bad', order: 'desc' },
      ]),
    ).toThrow();
  });
});
