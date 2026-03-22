import { CRUD_OVERRIDE_METADATA } from '../constants';
import type { CrudRouteName } from '../constants';

export function Override(routeName?: CrudRouteName): MethodDecorator {
  return (_target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const name = routeName ?? String(propertyKey);
    Reflect.defineMetadata(CRUD_OVERRIDE_METADATA, name, descriptor.value as object);
    return descriptor;
  };
}
