import { Controller, type Type } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

import { CRUD_CONTROLLER_METADATA } from '../constants';
import type { CrudControllerConfig } from '../types';
import { getEntityKey } from '../utils';
import { applyDecorators, createRouteArg, setMethodMetadata, setRouteArgs } from './route-helpers';
import { applySwagger } from './swagger';

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

    if (routes.relations) {
      for (const [relationName, relationConfig] of Object.entries(routes.relations)) {
        if (!relationConfig) continue;
        const rc = relationConfig as Record<string, unknown>;
        const enableConnect = relationConfig === true || rc.connect !== false;
        const enableDisconnect = relationConfig === true || rc.disconnect !== false;
        const enableSet = relationConfig === true || rc.set !== false;
        const relationPath = `/:id/relations/${relationName}`;

        if (enableConnect) {
          const methodName = `relationConnect_${relationName}`;
          proto[methodName] = function (id: string, body: unknown, _req: unknown) {
            return this.handleRelationConnect(id, relationName, body);
          };
          setMethodMetadata(proto, methodName, RequestMethod.POST, relationPath);
          setRouteArgs(proto, methodName, {
            ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
            ...createRouteArg(RouteParamtypes.BODY, 1),
            ...createRouteArg(RouteParamtypes.REQUEST, 2),
          });
          applyDecorators(proto, methodName, 'relationConnect', config.decorators);
        }

        if (enableDisconnect) {
          const methodName = `relationDisconnect_${relationName}`;
          proto[methodName] = function (id: string, body: unknown, _req: unknown) {
            return this.handleRelationDisconnect(id, relationName, body);
          };
          setMethodMetadata(proto, methodName, RequestMethod.DELETE, relationPath);
          setRouteArgs(proto, methodName, {
            ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
            ...createRouteArg(RouteParamtypes.BODY, 1),
            ...createRouteArg(RouteParamtypes.REQUEST, 2),
          });
          applyDecorators(proto, methodName, 'relationDisconnect', config.decorators);
        }

        if (enableSet) {
          const methodName = `relationSet_${relationName}`;
          proto[methodName] = function (id: string, body: unknown, _req: unknown) {
            return this.handleRelationSet(id, relationName, body);
          };
          setMethodMetadata(proto, methodName, RequestMethod.PUT, relationPath);
          setRouteArgs(proto, methodName, {
            ...createRouteArg(RouteParamtypes.PARAM, 0, 'id'),
            ...createRouteArg(RouteParamtypes.BODY, 1),
            ...createRouteArg(RouteParamtypes.REQUEST, 2),
          });
          applyDecorators(proto, methodName, 'relationSet', config.decorators);
        }
      }
    }

    if (config.swagger !== false) {
      applySwagger(proto, target, config, routes, path);
    }

    Controller(path)(target as Type);
  };
}
