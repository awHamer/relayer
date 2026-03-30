import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ParseIdPipe } from '../../src/pipes/parse-id.pipe';

describe('ParseIdPipe', () => {
  describe('number type', () => {
    const pipe = new ParseIdPipe('number');

    it('parses valid integer string', () => {
      expect(pipe.transform('123')).toBe(123);
    });

    it('parses max valid int32', () => {
      expect(pipe.transform('2147483647')).toBe(2147483647);
    });

    it('throws on non-numeric string', () => {
      expect(() => pipe.transform('abc')).toThrow(BadRequestException);
    });

    it('throws on out-of-range integer (> int32 max)', () => {
      expect(() => pipe.transform('9999999999')).toThrow(BadRequestException);
    });

    it('throws on zero', () => {
      expect(() => pipe.transform('0')).toThrow(BadRequestException);
    });

    it('throws on negative', () => {
      expect(() => pipe.transform('-1')).toThrow(BadRequestException);
    });

    it('throws on float', () => {
      expect(() => pipe.transform('1.5')).toThrow(BadRequestException);
    });
  });

  describe('string type', () => {
    const pipe = new ParseIdPipe('string');

    it('passes through as-is', () => {
      expect(pipe.transform('my-slug')).toBe('my-slug');
    });
  });

  describe('uuid type', () => {
    const pipe = new ParseIdPipe('uuid');

    it('accepts valid UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(pipe.transform(uuid)).toBe(uuid);
    });

    it('throws BadRequestException on invalid UUID', () => {
      expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
    });
  });

  it('defaults to number type', () => {
    const pipe = new ParseIdPipe();
    expect(pipe.transform('42')).toBe(42);
  });
});
