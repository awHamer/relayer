import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ParseIdPipe } from '../../src/pipes/parse-id.pipe';

describe('ParseIdPipe', () => {
  describe('number type', () => {
    const pipe = new ParseIdPipe('number');

    it('parses valid integer string', () => {
      expect(pipe.transform('123')).toBe(123);
    });

    it('throws BadRequestException on non-numeric string', () => {
      expect(() => pipe.transform('abc')).toThrow(BadRequestException);
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
