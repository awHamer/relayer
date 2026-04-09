import { InputType, ObjectType } from '@nestjs/graphql';

import type { ClassRef } from '../class-ref';

function nameClass<T extends ClassRef>(cls: T, gqlName: string): T {
  Object.defineProperty(cls, 'name', { value: gqlName, configurable: true });
  return cls;
}

export function createGqlClass(gqlName: string): ClassRef {
  class Generated {}
  return nameClass(Generated, gqlName);
}

export function applyObjectType(cls: ClassRef, gqlName: string): void {
  ObjectType(gqlName)(cls);
}

export function applyInputType(cls: ClassRef, gqlName: string): void {
  InputType(gqlName)(cls);
}
