import type { CrudControllerConfig, CrudRoutes, SwaggerConfig } from '../../types';
import { getRouteConfig } from '../../utils';
import { resolveBodyMeta, setSwaggerMetadata, setSwaggerTag } from './metadata';
import {
  aggregateQueryParams,
  countQueryParams,
  idParam,
  listQueryParams,
  relationBodySchema,
} from './params';

export function applySwagger<TEntity, TEntities extends Record<string, unknown>>(
  proto: object,
  target: object,
  config: CrudControllerConfig<TEntity, TEntities>,
  routes: CrudRoutes<TEntity, TEntities>,
  path: string,
): void {
  const sw = (typeof config.swagger === 'object' ? config.swagger : {}) as SwaggerConfig;
  const entityName = sw.tag ?? path;

  setSwaggerTag(target, entityName);

  if (routes.list) {
    setSwaggerMetadata(proto, 'list', {
      operationId: `list_${entityName}`,
      summary: sw.list?.summary ?? `List ${entityName}`,
      description:
        sw.list?.description ??
        'Returns { data: [...], meta: { total, limit, offset, nextPageUrl? } } for offset pagination, or { data: [...], meta: { limit, hasMore, nextCursor?, nextPageUrl? } } for cursor pagination.',
      params: listQueryParams,
      responses: [{ status: 200, description: 'Paginated list with data and meta' }],
    });
  }

  if (routes.count) {
    setSwaggerMetadata(proto, 'count', {
      operationId: `count_${entityName}`,
      summary: sw.count?.summary ?? `Count ${entityName}`,
      description: sw.count?.description ?? 'Returns { data: { count: number } }.',
      params: countQueryParams,
      responses: [{ status: 200, description: '{ data: { count: number } }' }],
    });
  }

  if (routes.aggregate) {
    setSwaggerMetadata(proto, 'aggregate', {
      operationId: `aggregate_${entityName}`,
      summary: sw.aggregate?.summary ?? `Aggregate ${entityName}`,
      description: sw.aggregate?.description,
      params: aggregateQueryParams,
      responses: [{ status: 200, description: 'Aggregation result' }],
    });
  }

  if (routes.findById) {
    setSwaggerMetadata(proto, 'findById', {
      operationId: `findById_${entityName}`,
      summary: sw.findById?.summary ?? `Get ${entityName} by ID`,
      description: sw.findById?.description,
      params: [idParam],
      responses: [
        { status: 200, description: 'Entity found' },
        { status: 404, description: 'Not found' },
      ],
    });
  }

  if (routes.create) {
    const createConfig = getRouteConfig(routes, 'create') as { schema?: unknown } | undefined;
    setSwaggerMetadata(proto, 'create', {
      operationId: `create_${entityName}`,
      summary: sw.create?.summary ?? `Create ${entityName}`,
      description: sw.create?.description,
      body: resolveBodyMeta(createConfig?.schema),
      responses: [{ status: 201, description: 'Created' }],
    });
  }

  if (routes.update) {
    const updateConfig = getRouteConfig(routes, 'update') as { schema?: unknown } | undefined;
    setSwaggerMetadata(proto, 'update', {
      operationId: `update_${entityName}`,
      summary: sw.update?.summary ?? `Update ${entityName}`,
      description: sw.update?.description,
      params: [idParam],
      body: resolveBodyMeta(updateConfig?.schema),
      responses: [{ status: 200, description: 'Updated' }],
    });
  }

  if (routes.delete) {
    setSwaggerMetadata(proto, 'delete', {
      operationId: `delete_${entityName}`,
      summary: sw.delete?.summary ?? `Delete ${entityName}`,
      description: sw.delete?.description,
      params: [idParam],
      responses: [
        { status: 200, description: 'Deleted' },
        { status: 404, description: 'Not found' },
      ],
    });
  }

  if (routes.relations) {
    for (const [relationName, relationConfig] of Object.entries(routes.relations)) {
      if (!relationConfig) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rc = relationConfig as any;
      const enableConnect = relationConfig === true || rc.connect !== false;
      const enableDisconnect = relationConfig === true || rc.disconnect !== false;
      const enableSet = relationConfig === true || rc.set !== false;

      if (enableConnect) {
        setSwaggerMetadata(proto, `relationConnect_${relationName}`, {
          operationId: `connect_${relationName}_${entityName}`,
          summary: `Connect ${relationName}`,
          description: `Add links to ${relationName} relation. Body: { data: [id, ...] } or { data: [{ _id, ...extraFields }] }`,
          params: [idParam],
          body: relationBodySchema,
          responses: [{ status: 200, description: 'Connected' }],
        });
      }
      if (enableDisconnect) {
        setSwaggerMetadata(proto, `relationDisconnect_${relationName}`, {
          operationId: `disconnect_${relationName}_${entityName}`,
          summary: `Disconnect ${relationName}`,
          description: `Remove links from ${relationName} relation. Body: { data: [id, ...] }`,
          params: [idParam],
          body: relationBodySchema,
          responses: [{ status: 200, description: 'Disconnected' }],
        });
      }
      if (enableSet) {
        setSwaggerMetadata(proto, `relationSet_${relationName}`, {
          operationId: `set_${relationName}_${entityName}`,
          summary: `Set ${relationName}`,
          description: `Replace all links in ${relationName} relation. Body: { data: [id, ...] }`,
          params: [idParam],
          body: relationBodySchema,
          responses: [{ status: 200, description: 'Set' }],
        });
      }
    }
  }
}
