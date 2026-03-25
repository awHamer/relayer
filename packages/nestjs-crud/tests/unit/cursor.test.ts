import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { buildCursorWhere, decodeCursor, encodeCursor } from '../../src/pipes/cursor';

describe('encodeCursor', () => {
  it('encodes single-field orderBy', () => {
    const cursor = encodeCursor({ id: 10, title: 'Test' }, [{ field: 'id', order: 'asc' }], 'id');
    const decoded = decodeCursor(cursor);
    expect(decoded.f).toEqual(['id']);
    expect(decoded.v).toEqual([10]);
    expect(decoded.d).toEqual(['asc']);
    expect(decoded.t).toEqual(['n']);
  });

  it('appends idField as tiebreaker when not in orderBy', () => {
    const cursor = encodeCursor(
      { id: 5, title: 'Test' },
      [{ field: 'title', order: 'desc' }],
      'id',
    );
    const decoded = decodeCursor(cursor);
    expect(decoded.f).toEqual(['title', 'id']);
    expect(decoded.v).toEqual(['Test', 5]);
    expect(decoded.d).toEqual(['desc', 'desc']);
  });

  it('does not duplicate idField when already in orderBy', () => {
    const cursor = encodeCursor({ id: 1 }, [{ field: 'id', order: 'asc' }], 'id');
    const decoded = decodeCursor(cursor);
    expect(decoded.f).toEqual(['id']);
  });

  it('handles Date values with type marker d', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    const cursor = encodeCursor(
      { id: 1, createdAt: date },
      [{ field: 'createdAt', order: 'desc' }],
      'id',
    );
    const decoded = decodeCursor(cursor);
    expect(decoded.t[0]).toBe('d');
    expect(decoded.v[0]).toEqual(date);
  });

  it('marks string values as s, numbers as n', () => {
    const cursor = encodeCursor({ id: 1, slug: 'hello' }, [{ field: 'slug', order: 'asc' }], 'id');
    const decoded = decodeCursor(cursor);
    expect(decoded.t).toEqual(['s', 'n']);
  });
});

describe('decodeCursor', () => {
  it('roundtrip preserves values', () => {
    const item = { id: 42, title: 'Hello' };
    const orderBy = [
      { field: 'title', order: 'asc' as const },
      { field: 'id', order: 'asc' as const },
    ];
    const encoded = encodeCursor(item, orderBy, 'id');
    const decoded = decodeCursor(encoded);
    expect(decoded.v).toEqual(['Hello', 42]);
    expect(decoded.f).toEqual(['title', 'id']);
    expect(decoded.d).toEqual(['asc', 'asc']);
  });

  it('throws BadRequestException on invalid base64', () => {
    expect(() => decodeCursor('!!!invalid!!!')).toThrow(BadRequestException);
  });

  it('throws BadRequestException on malformed JSON', () => {
    const bad = Buffer.from('not-json').toString('base64');
    expect(() => decodeCursor(bad)).toThrow(BadRequestException);
  });

  it('throws BadRequestException on missing required fields', () => {
    const bad = Buffer.from(JSON.stringify({ v: 'not-array' })).toString('base64');
    expect(() => decodeCursor(bad)).toThrow(BadRequestException);
  });
});

describe('buildCursorWhere', () => {
  it('single field asc -> gt', () => {
    const result = buildCursorWhere({
      v: [10],
      f: ['id'],
      d: ['asc'],
      t: ['n'],
    });
    expect(result).toEqual({ id: { gt: 10 } });
  });

  it('single field desc -> lt', () => {
    const result = buildCursorWhere({
      v: [10],
      f: ['id'],
      d: ['desc'],
      t: ['n'],
    });
    expect(result).toEqual({ id: { lt: 10 } });
  });

  it('multi-field -> OR branches with gte/lte intermediate', () => {
    const result = buildCursorWhere({
      v: ['2025-01-01', 5],
      f: ['createdAt', 'id'],
      d: ['desc', 'desc'],
      t: ['s', 'n'],
    });
    expect(result).toEqual({
      OR: [
        { createdAt: { lt: '2025-01-01' } },
        { createdAt: { lte: '2025-01-01' }, id: { lt: 5 } },
      ],
    });
  });

  it('multi-field asc uses gt/gte', () => {
    const result = buildCursorWhere({
      v: ['A', 1],
      f: ['title', 'id'],
      d: ['asc', 'asc'],
      t: ['s', 'n'],
    });
    expect(result).toEqual({
      OR: [{ title: { gt: 'A' } }, { title: { gte: 'A' }, id: { gt: 1 } }],
    });
  });
});
