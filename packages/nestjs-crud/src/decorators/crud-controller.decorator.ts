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

export function CrudController<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
>(config: CrudControllerConfig<TEntity, TEntities>): ClassDecorator {
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
      proto.list = function (req: unknown) {
        return this.handleList(req);
      };
      setMethodMetadata(proto, 'list', RequestMethod.GET, '/');
      setRouteArgs(proto, 'list', createRouteArg(RouteParamtypes.REQUEST, 0));
      applyDecorators(proto, 'list', 'list', config.decorators);
    }

    if (routes.count) {
      proto.count = function (req: unknown) {
        return this.handleCount(req);
      };
      setMethodMetadata(proto, 'count', RequestMethod.GET, '/count');
      setRouteArgs(proto, 'count', createRouteArg(RouteParamtypes.REQUEST, 0));
      applyDecorators(proto, 'count', 'count', config.decorators);
    }

    if (routes.aggregate) {
      proto.aggregate = function (req: unknown) {
        return this.handleAggregate(req);
      };
      setMethodMetadata(proto, 'aggregate', RequestMethod.GET, '/aggregate');
      setRouteArgs(proto, 'aggregate', createRouteArg(RouteParamtypes.REQUEST, 0));
      applyDecorators(proto, 'aggregate', 'aggregate', config.decorators);
    }

    if (routes.findById) {
      proto.findById = function (id: string, req: unknown) {
        return this.handleFindById(id, req);
      };
      setMethodMetadata(proto, 'findById', RequestMethod.GET, '/:id');
      setRouteArgs(proto, 'findById', {
        ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
        ...createRouteArg(RouteParamtypes.REQUEST, 1),
      });
      applyDecorators(proto, 'findById', 'findById', config.decorators);
    }

    if (routes.create) {
      proto.create = function (body: unknown, req: unknown) {
        return this.handleCreate(body, req);
      };
      setMethodMetadata(proto, 'create', RequestMethod.POST, '/');
      setRouteArgs(proto, 'create', {
        ...createRouteArg(RouteParamtypes.BODY, 0),
        ...createRouteArg(RouteParamtypes.REQUEST, 1),
      });
      applyDecorators(proto, 'create', 'create', config.decorators);
    }

    if (routes.update) {
      proto.update = function (id: string, body: unknown, req: unknown) {
        return this.handleUpdate(id, body, req);
      };
      setMethodMetadata(proto, 'update', RequestMethod.PATCH, '/:id');
      setRouteArgs(proto, 'update', {
        ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
        ...createRouteArg(RouteParamtypes.BODY, 1),
        ...createRouteArg(RouteParamtypes.REQUEST, 2),
      });
      applyDecorators(proto, 'update', 'update', config.decorators);
    }

    if (routes.delete) {
      proto.delete = function (id: string, req: unknown) {
        return this.handleDelete(id, req);
      };
      setMethodMetadata(proto, 'delete', RequestMethod.DELETE, '/:id');
      setRouteArgs(proto, 'delete', {
        ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
        ...createRouteArg(RouteParamtypes.REQUEST, 1),
      });
      applyDecorators(proto, 'delete', 'delete', config.decorators);
    }

    Controller(path)(target as Type);
  };
}
