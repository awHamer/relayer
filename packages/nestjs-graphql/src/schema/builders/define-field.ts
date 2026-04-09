import { addFieldMetadata, type ReturnTypeFunc } from '@nestjs/graphql';

import type { ClassRef } from '../class-ref';

export interface DefineFieldOptions {
  nullable?: boolean;
  description?: string;
}

export function defineField(
  cls: ClassRef,
  name: string,
  returnType: ReturnTypeFunc,
  options: DefineFieldOptions = {},
): void {
  addFieldMetadata(
    returnType,
    { nullable: options.nullable, description: options.description },
    cls.prototype as object,
    name,
    undefined,
    // write metadata immediately, bypass NestJS lazy queue
    true,
  );
}
