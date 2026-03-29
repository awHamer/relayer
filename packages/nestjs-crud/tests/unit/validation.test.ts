import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  validateBody,
  validateWithClassValidator,
  validateWithZod,
} from '../../src/pipes/validation.pipe';

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

  it('detects class-validator DTO and attempts validation', async () => {
    class TestDto {
      name!: string;
    }

    // class-validator is available -- validateBody detects class DTO and runs
    // class-validator pipeline. Without decorators it throws 422, not "not installed".
    await expect(validateBody(TestDto, { name: 'test' })).rejects.toThrow('Validation failed');
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

describe('validateWithClassValidator', () => {
  it('validates successfully when class-validator returns no errors', async () => {
    const mockInstance = { name: 'Alice' };

    vi.doMock('class-transformer' as string, () => ({
      plainToInstance: vi.fn().mockReturnValue(mockInstance),
    }));
    vi.doMock('class-validator' as string, () => ({
      validate: vi.fn().mockResolvedValue([]),
    }));

    class TestDto {
      name!: string;
    }

    const result = await validateWithClassValidator(TestDto, { name: 'Alice' });
    expect(result).toBe(mockInstance);

    vi.doUnmock('class-transformer' as string);
    vi.doUnmock('class-validator' as string);
  });

  it('throws 422 when class-validator returns errors', async () => {
    vi.doMock('class-transformer' as string, () => ({
      plainToInstance: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('class-validator' as string, () => ({
      validate: vi.fn().mockResolvedValue([
        {
          property: 'name',
          constraints: { isNotEmpty: 'name should not be empty' },
        },
      ]),
    }));

    class TestDto {
      name!: string;
    }

    try {
      await validateWithClassValidator(TestDto, {});
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const response = (e as HttpException).getResponse() as Record<string, unknown>;
      expect(response.statusCode).toBe(422);
      const errors = response.errors as Array<{ code: string; message: string; path: unknown[] }>;
      expect(errors).toHaveLength(1);
      expect(errors[0]!.code).toBe('isNotEmpty');
      expect(errors[0]!.path).toEqual(['name']);
    }

    vi.doUnmock('class-transformer' as string);
    vi.doUnmock('class-validator' as string);
  });

  it('flattens nested child errors', async () => {
    vi.doMock('class-transformer' as string, () => ({
      plainToInstance: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('class-validator' as string, () => ({
      validate: vi.fn().mockResolvedValue([
        {
          property: 'address',
          constraints: undefined,
          children: [
            {
              property: 'street',
              constraints: { isString: 'street must be a string' },
            },
          ],
        },
      ]),
    }));

    class TestDto {
      address!: { street: string };
    }

    try {
      await validateWithClassValidator(TestDto, {});
      expect.fail('should have thrown');
    } catch (e) {
      const response = (e as HttpException).getResponse() as Record<string, unknown>;
      const errors = response.errors as Array<{ path: unknown[] }>;
      expect(errors).toHaveLength(1);
      expect(errors[0]!.path).toEqual(['address', 'street']);
    }

    vi.doUnmock('class-transformer' as string);
    vi.doUnmock('class-validator' as string);
  });
});
