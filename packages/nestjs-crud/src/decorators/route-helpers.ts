import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

import type { CrudRouteName } from '../constants';
import type { DecoratorEntry, DecoratorTargeted } from '../types';

export function setMethodMetadata(
  target: object,
  methodName: string,
  httpMethod: RequestMethod,
  routePath: string,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
  if (!descriptor) return;
  Reflect.defineMetadata(PATH_METADATA, routePath, descriptor.value as object);
  Reflect.defineMetadata(METHOD_METADATA, httpMethod, descriptor.value as object);
}

export function setRouteArgs(
  target: object,
  methodName: string,
  args: Record<string, unknown>,
): void {
  Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target.constructor, methodName);
}

export function createRouteArg(paramType: RouteParamtypes, index: number, data?: string) {
  const key = `${paramType}:${index}`;
  return {
    [key]: {
      index,
      data,
      pipes: [],
    },
  };
}

function isDecoratorTargeted(entry: DecoratorEntry): entry is DecoratorTargeted {
  return typeof entry === 'object' && 'apply' in entry;
}

export function applyDecorators(
  target: object,
  methodName: string,
  routeName: CrudRouteName,
  decorators: DecoratorEntry[] | undefined,
): void {
  if (!decorators) return;
  const descriptor = Object.getOwnPropertyDescriptor(target, methodName);
  if (!descriptor) return;

  for (const entry of decorators) {
    if (isDecoratorTargeted(entry)) {
      if (entry.for && !entry.for.includes(routeName)) continue;
      for (const dec of entry.apply) {
        dec(target, methodName, descriptor);
      }
    } else {
      (entry as MethodDecorator)(target, methodName, descriptor);
    }
  }
}
