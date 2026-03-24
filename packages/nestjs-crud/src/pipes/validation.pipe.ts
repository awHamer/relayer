import { HttpException } from '@nestjs/common';

import type { ValidationError, ZodLike } from '../types';

interface ZodError {
  errors: Array<{
    code: string;
    message: string;
    path: (string | number)[];
    [key: string]: unknown;
  }>;
}

interface ClassValidatorError {
  property: string;
  constraints?: Record<string, string>;
  children?: ClassValidatorError[];
}

function isZodSchema(schema: unknown): schema is ZodLike {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'parse' in schema &&
    typeof (schema as Record<string, unknown>).parse === 'function'
  );
}

type DtoConstructor = new (...args: unknown[]) => object;

function isClassValidatorDto(schema: unknown): schema is DtoConstructor {
  return typeof schema === 'function' && schema.prototype !== undefined;
}

function flattenClassValidatorErrors(
  errors: ClassValidatorError[],
  parentPath: (string | number)[] = [],
): ValidationError[] {
  const result: ValidationError[] = [];
  for (const error of errors) {
    const path = [...parentPath, error.property];
    if (error.constraints) {
      for (const [code, message] of Object.entries(error.constraints)) {
        result.push({ code, message, path });
      }
    }
    if (error.children?.length) {
      result.push(...flattenClassValidatorErrors(error.children, path));
    }
  }
  return result;
}

function createValidationException(errors: ValidationError[]): HttpException {
  return new HttpException(
    {
      statusCode: 422,
      message: 'Validation failed',
      errors,
    },
    422,
  );
}

export function validateWithZod(schema: ZodLike, data: unknown): unknown {
  try {
    return schema.parse(data);
  } catch (e: unknown) {
    const zodError = e as ZodError;
    if (zodError.errors) {
      const errors: ValidationError[] = zodError.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }));
      throw createValidationException(errors);
    }
    throw e;
  }
}

async function loadClassValidator(): Promise<{
  plainToInstance: (cls: unknown, data: unknown) => unknown;
  validate: (instance: unknown) => Promise<ClassValidatorError[]>;
}> {
  try {
    const [ct, cv] = await Promise.all([
      import('class-transformer' as string),
      import('class-validator' as string),
    ]);
    return {
      plainToInstance: ct.plainToInstance,
      validate: cv.validate,
    };
  } catch {
    throw new Error(
      'class-validator and class-transformer are required for DTO validation. Install them: npm i class-validator class-transformer',
    );
  }
}

export async function validateWithClassValidator(
  DtoClass: DtoConstructor,
  data: unknown,
): Promise<unknown> {
  const { plainToInstance, validate } = await loadClassValidator();
  const instance = plainToInstance(DtoClass, data);
  const errors = (await validate(instance)) as ClassValidatorError[];

  if (errors.length > 0) {
    throw createValidationException(flattenClassValidatorErrors(errors));
  }

  return instance;
}

export async function validateBody(schema: unknown, data: unknown): Promise<unknown> {
  if (!schema) return data;

  if (isZodSchema(schema)) {
    return validateWithZod(schema, data);
  }

  if (isClassValidatorDto(schema)) {
    return validateWithClassValidator(schema, data);
  }

  return data;
}
