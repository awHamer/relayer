import { Controller, type Type } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

import { CRUD_CONTROLLER_METADATA, type CrudRouteName } from '../constants';
import type { CrudControllerConfig, DecoratorEntry, DecoratorTargeted } from '../types';
import { getEntityKey } from '../utils';

function setMethodMetadata(
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

function setRouteArgs(target: object, methodName: string, args: Record<string, unknown>): void {
  Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target.constructor, methodName);
}

function createRouteArg(paramType: RouteParamtypes, index: number, data?: string) {
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

function applyDecorators(
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

export function CrudController<TEntity>(config: CrudControllerConfig<TEntity>): ClassDecorator {
  const path = config.path ?? getEntityKey(config.model);
  const routes = config.routes ?? {
    list: true,
    findById: true,
    create: true,
    update: true,
    delete: true,
    count: true,
  };

  return (target: object) => {
    Reflect.defineMetadata(CRUD_CONTROLLER_METADATA, { ...config, routes }, target);

    const proto = (target as Type).prototype;

    if (routes.list) {
      proto.__crudList = async function (req: unknown) {
        return this.handleList(req);
      };
      setMethodMetadata(proto, '__crudList', RequestMethod.GET, '/');
      setRouteArgs(proto, '__crudList', createRouteArg(RouteParamtypes.REQUEST, 0));
      applyDecorators(proto, '__crudList', 'list', config.decorators);
    }

    if (routes.count) {
      proto.__crudCount = async function (req: unknown) {
        return this.handleCount(req);
      };
      setMethodMetadata(proto, '__crudCount', RequestMethod.GET, '/count');
      setRouteArgs(proto, '__crudCount', createRouteArg(RouteParamtypes.REQUEST, 0));
      applyDecorators(proto, '__crudCount', 'count', config.decorators);
    }

    if (routes.findById) {
      proto.__crudFindById = async function (id: string, req: unknown) {
        return this.handleFindById(id, req);
      };
      setMethodMetadata(proto, '__crudFindById', RequestMethod.GET, '/:id');
      setRouteArgs(proto, '__crudFindById', {
        ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
        ...createRouteArg(RouteParamtypes.REQUEST, 1),
      });
      applyDecorators(proto, '__crudFindById', 'findById', config.decorators);
    }

    if (routes.create) {
      proto.__crudCreate = async function (body: unknown, req: unknown) {
        return this.handleCreate(body, req);
      };
      setMethodMetadata(proto, '__crudCreate', RequestMethod.POST, '/');
      setRouteArgs(proto, '__crudCreate', {
        ...createRouteArg(RouteParamtypes.BODY, 0),
        ...createRouteArg(RouteParamtypes.REQUEST, 1),
      });
      applyDecorators(proto, '__crudCreate', 'create', config.decorators);
    }

    if (routes.update) {
      proto.__crudUpdate = async function (id: string, body: unknown, req: unknown) {
        return this.handleUpdate(id, body, req);
      };
      setMethodMetadata(proto, '__crudUpdate', RequestMethod.PATCH, '/:id');
      setRouteArgs(proto, '__crudUpdate', {
        ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
        ...createRouteArg(RouteParamtypes.BODY, 1),
        ...createRouteArg(RouteParamtypes.REQUEST, 2),
      });
      applyDecorators(proto, '__crudUpdate', 'update', config.decorators);
    }

    if (routes.delete) {
      proto.__crudDelete = async function (id: string, req: unknown) {
        return this.handleDelete(id, req);
      };
      setMethodMetadata(proto, '__crudDelete', RequestMethod.DELETE, '/:id');
      setRouteArgs(proto, '__crudDelete', {
        ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
        ...createRouteArg(RouteParamtypes.REQUEST, 1),
      });
      applyDecorators(proto, '__crudDelete', 'delete', config.decorators);
    }

    Controller(path)(target as Type);
  };
}
