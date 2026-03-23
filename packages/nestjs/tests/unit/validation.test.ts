import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { validateBody, validateWithZod } from '../../src/pipes/validation.pipe';

describe('validateWithZod', () => {
  const schema = z.object({ name: z.string(), age: z.number() });

  it('returns parsed data on valid input', () => {
    const result = validateWithZod(schema, { name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws HttpException 422 on invalid input', () => {
    try {
      validateWithZod(schema, { name: 123 });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const response = (e as HttpException).getResponse() as Record<string, unknown>;
      expect(response.statusCode).toBe(422);
      expect(response.errors).toBeDefined();
      expect(Array.isArray(response.errors)).toBe(true);
    }
  });

  it('error includes path info', () => {
    try {
      validateWithZod(schema, { name: 123 });
    } catch (e) {
      const response = (e as HttpException).getResponse() as Record<string, unknown>;
      const errors = response.errors as Array<{ path: unknown[] }>;
      expect(errors.some((err) => err.path.includes('name'))).toBe(true);
    }
  });
});

describe('validateBody', () => {
  it('returns data unchanged when no schema', async () => {
    const data = { foo: 'bar' };
    expect(await validateBody(undefined, data)).toBe(data);
    expect(await validateBody(null, data)).toBe(data);
  });

  it('detects Zod schema and validates', async () => {
    const schema = z.object({ title: z.string() });
    const result = await validateBody(schema, { title: 'Hello' });
    expect(result).toEqual({ title: 'Hello' });
  });

  it('Zod schema throws on invalid data', async () => {
    const schema = z.object({ title: z.string() });
    await expect(validateBody(schema, { title: 42 })).rejects.toThrow(HttpException);
  });

  it('returns data for non-schema input', async () => {
    const data = { foo: 'bar' };
    expect(await validateBody('not-a-schema', data)).toBe(data);
  });

  it('detects class-validator DTO (function with prototype)', async () => {
    class TestDto {
      name!: string;
    }

    // validateBody will try to load class-validator/class-transformer dynamically
    // Since they're not installed, it should throw about missing deps
    await expect(validateBody(TestDto, { name: 'test' })).rejects.toThrow(
      'class-validator and class-transformer are required',
    );
  });
});

describe('validateWithZod edge cases', () => {
  it('re-throws non-ZodError exceptions', () => {
    const badSchema = {
      parse() {
        throw new Error('random error');
      },
    };
    expect(() => validateWithZod(badSchema, {})).toThrow('random error');
  });

  it('strips extra fields when schema uses strict', () => {
    const schema = z.object({ name: z.string() }).strict();
    expect(() => validateWithZod(schema, { name: 'ok', extra: true })).toThrow(HttpException);
  });
});
