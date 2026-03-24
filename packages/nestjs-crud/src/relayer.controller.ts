import { Inject, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { CRUD_CONTROLLER_METADATA, RELAYER_BASE_URL } from './constants';
import type { DtoMapper } from './dto-mapper';
import type { RelayerHooks } from './hooks';
import {
  buildCursorWhere,
  decodeCursor,
  encodeCursor,
  ParseIdPipe,
  parseListQuery,
  validateBody,
  type ParsedListQuery,
} from './pipes';
import type { RelayerService } from './relayer.service';
import type {
  CrudControllerConfig,
  FindByIdRouteConfig,
  ListRouteConfig,
  MutationRouteConfig,
  RequestContext,
} from './types';

function getRouteConfig(routes: CrudControllerConfig['routes'], name: string): unknown {
  if (!routes) return undefined;
  const value = (routes as Record<string, unknown>)[name];
  if (typeof value === 'object' && value !== null) return value;
  return undefined;
}

function buildNextPageUrl(
  basePath: string,
  query: Record<string, unknown>,
  offset: number,
  limit: number,
  total: number,
): string | null {
  if (offset + limit >= total) return null;

  const nextOffset = offset + limit;
  const parts: string[] = [`offset=${nextOffset}`, `limit=${limit}`];

  if (query.where) parts.push(`where=${encodeURIComponent(JSON.stringify(query.where))}`);
  if (query.select) parts.push(`select=${encodeURIComponent(JSON.stringify(query.select))}`);
  if (query.orderBy) parts.push(`orderBy=${encodeURIComponent(JSON.stringify(query.orderBy))}`);
  if (query.search) parts.push(`search=${encodeURIComponent(String(query.search))}`);

  return `${basePath}?${parts.join('&')}`;
}

function enforceAllowSelectLimits(
  select: Record<string, unknown> | undefined,
  allowSelect: Record<string, boolean | { $limit?: number; [field: string]: unknown }> | undefined,
): Record<string, unknown> | undefined {
  if (!select || !allowSelect) return select;

  const result = { ...select };
  for (const [key, allowValue] of Object.entries(allowSelect)) {
    if (typeof allowValue === 'object' && allowValue !== null && '$limit' in allowValue) {
      const configLimit = (allowValue as { $limit: number }).$limit;
      const selectValue = result[key];

      if (typeof selectValue === 'object' && selectValue !== null) {
        const clientLimit = (selectValue as Record<string, unknown>).$limit as number | undefined;
        (result[key] as Record<string, unknown>) = {
          ...(selectValue as Record<string, unknown>),
          $limit: clientLimit ? Math.min(clientLimit, configLimit) : configLimit,
        };
      } else if (selectValue === true) {
        result[key] = { $limit: configLimit };
      }
    }
  }

  return result;
}

export class RelayerController<
  TEntity,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _TDtoMapper extends DtoMapper<TEntity, any, any> = DtoMapper<TEntity, TEntity, TEntity>,
> implements OnModuleInit {
  protected readonly base: RelayerControllerBase;

  @Inject(ModuleRef)
  private moduleRef!: ModuleRef;

  @Inject(RELAYER_BASE_URL)
  private baseUrlConfig!: string | (() => string);

  private resolvedDtoMapper: DtoMapper<TEntity> | null = null;
  private resolvedHooks: RelayerHooks<TEntity> | null = null;
  private dtoMapperResolved = false;
  private hooksResolved = false;

  constructor(protected readonly service: RelayerService<TEntity>) {
    this.base = new RelayerControllerBase(service as RelayerService<unknown>);
  }

  onModuleInit(): void {
    const config = this.getConfig();

    if (config.dtoMapper) {
      try {
        this.resolvedDtoMapper = this.moduleRef.get(config.dtoMapper, { strict: false });
      } catch {
        this.resolvedDtoMapper = new config.dtoMapper() as DtoMapper<TEntity>;
      }
      this.dtoMapperResolved = true;
    }

    if (config.hooks) {
      try {
        this.resolvedHooks = this.moduleRef.get(config.hooks, { strict: false });
      } catch {
        this.resolvedHooks = new config.hooks() as RelayerHooks<TEntity>;
      }
      this.hooksResolved = true;
    }
  }

  protected getConfig(): CrudControllerConfig {
    return Reflect.getMetadata(CRUD_CONTROLLER_METADATA, this.constructor) ?? {};
  }

  protected getBasePath(): string {
    const base =
      typeof this.baseUrlConfig === 'function' ? this.baseUrlConfig() : this.baseUrlConfig;
    const path = Reflect.getMetadata('path', this.constructor) ?? this.getConfig().path ?? '';
    return (base ? base.replace(/\/$/, '') : '') + '/' + path;
  }

  protected buildContext(request: unknown): RequestContext {
    return { request };
  }

  protected parseId(id: string): string | number {
    const config = this.getConfig();
    const idType = config.id?.type ?? 'number';
    return new ParseIdPipe(idType).transform(id);
  }

  protected getDtoMapper(): DtoMapper<TEntity> | null {
    return this.dtoMapperResolved ? this.resolvedDtoMapper : null;
  }

  protected getHooks(): RelayerHooks<TEntity> | null {
    return this.hooksResolved ? this.resolvedHooks : null;
  }

  private applySearch(
    query: ParsedListQuery,
    listConfig: ListRouteConfig<TEntity> | undefined,
  ): void {
    const searchStr = query.search?.trim();
    if (!searchStr || !listConfig?.search) return;

    const searchWhere = listConfig.search(searchStr) as Record<string, unknown>;
    query.where = query.where ? { AND: [query.where, searchWhere] } : searchWhere;
  }

  protected async handleList(request: {
    query: Record<string, string>;
    path?: string;
    url?: string;
  }): Promise<unknown> {
    const config = this.getConfig();
    const listConfig = getRouteConfig(config.routes, 'list') as
      | ListRouteConfig<TEntity>
      | undefined;
    const paginationMode = listConfig?.pagination ?? 'offset';
    const idField = config.id?.field ?? 'id';

    const query = listConfig?.schema
      ? (listConfig.schema.parse(request.query) as ParsedListQuery)
      : parseListQuery(request.query);

    const defaults = listConfig?.defaults;
    if (defaults?.where) {
      query.where = { ...defaults.where, ...query.where };
    }
    if (defaults?.orderBy && !query.orderBy) {
      query.orderBy = defaults.orderBy;
    }
    if (defaults?.select && !query.select) {
      query.select = defaults.select;
    }

    this.applySearch(query, listConfig);
    query.select = enforceAllowSelectLimits(query.select, listConfig?.allow?.select);

    const limit = Math.min(
      query.limit ?? listConfig?.defaultLimit ?? 20,
      listConfig?.maxLimit ?? 100,
    );

    if (paginationMode === 'cursor_UNSTABLE') {
      return this.handleCursorList(request, query, limit, idField, listConfig);
    }

    return this.handleOffsetList(request, query, limit, listConfig);
  }

  private async handleOffsetList(
    request: unknown,
    query: ParsedListQuery,
    limit: number,
    _listConfig: ListRouteConfig<TEntity> | undefined,
  ): Promise<unknown> {
    const offset = query.offset ?? 0;
    const findOptions = { ...query, limit, offset };
    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeFind) {
      await hooks.beforeFind(findOptions as Record<string, unknown>, ctx);
    }

    let [data, total] = await Promise.all([
      this.service.findMany(findOptions as Record<string, unknown>),
      this.service.count(query.where ? { where: query.where } : {}),
    ]);

    if (hooks?.afterFind) {
      const modified = await hooks.afterFind(data, ctx);
      if (modified) data = modified;
    }

    const dtoMapper = this.getDtoMapper();
    const items = dtoMapper
      ? await Promise.all(data.map((e) => dtoMapper.toListItem(e, ctx)))
      : data;

    const totalNum = Number(total);
    const basePath = this.getBasePath();
    const nextPageUrl = buildNextPageUrl(basePath, query, offset, limit, totalNum);

    return {
      data: items,
      meta: { total: totalNum, limit, offset, ...(nextPageUrl ? { nextPageUrl } : {}) },
    };
  }

  private async handleCursorList(
    request: unknown,
    query: ParsedListQuery,
    limit: number,
    idField: string,
    _listConfig: ListRouteConfig<TEntity> | undefined,
  ): Promise<unknown> {
    const baseOrderBy = query.orderBy
      ? Array.isArray(query.orderBy)
        ? query.orderBy
        : [query.orderBy]
      : [];

    // Always add ID as tiebreaker for stable cursor pagination
    const hasIdInOrder = baseOrderBy.some((o) => o.field === idField);
    const orderBy = hasIdInOrder
      ? baseOrderBy
      : [
          ...baseOrderBy,
          { field: idField, order: (baseOrderBy[0]?.order ?? 'asc') as 'asc' | 'desc' },
        ];

    // Ensure cursor fields are in select
    if (query.select) {
      for (const { field } of orderBy) {
        if (!(field in query.select)) query.select[field] = true;
      }
      if (!(idField in query.select)) query.select[idField] = true;
    }

    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      const cursorWhere = buildCursorWhere(cursor);
      query.where = query.where ? { AND: [query.where, cursorWhere] } : cursorWhere;
    }

    const findOptions = {
      ...query,
      orderBy: orderBy.length === 1 ? orderBy[0] : orderBy,
      limit: limit + 1,
    };
    delete findOptions.cursor;
    delete findOptions.offset;

    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeFind) {
      await hooks.beforeFind(findOptions as Record<string, unknown>, ctx);
    }

    const data = await this.service.findMany(findOptions as Record<string, unknown>);
    const hasMore = data.length > limit;
    let results = hasMore ? data.slice(0, limit) : data;

    if (hooks?.afterFind) {
      const modified = await hooks.afterFind(results, ctx);
      if (modified) results = modified;
    }

    const dtoMapper = this.getDtoMapper();
    const items = dtoMapper
      ? await Promise.all(results.map((e) => dtoMapper.toListItem(e, ctx)))
      : results;

    const nextCursor = hasMore
      ? encodeCursor(results[results.length - 1] as Record<string, unknown>, orderBy, idField)
      : null;

    const basePath = this.getBasePath();
    const nextPageUrl = nextCursor
      ? `${basePath}?cursor=${encodeURIComponent(nextCursor)}&limit=${limit}`
      : null;

    return {
      data: items,
      meta: { limit, hasMore, ...(nextCursor ? { nextCursor, nextPageUrl } : {}) },
    };
  }

  protected async handleFindById(id: string, request: unknown): Promise<unknown> {
    const parsedId = this.parseId(id);
    const config = this.getConfig();
    const idField = config.id?.field ?? 'id';
    const findByIdConfig = getRouteConfig(config.routes, 'findById') as
      | FindByIdRouteConfig<TEntity>
      | undefined;

    const findOptions: Record<string, unknown> = {
      where: { [idField]: parsedId },
      ...(findByIdConfig?.defaults?.select ? { select: findByIdConfig.defaults.select } : {}),
    };

    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeFindOne) {
      await hooks.beforeFindOne(findOptions, ctx);
    }

    let result = await this.service.findFirst(findOptions);
    if (!result) {
      throw new NotFoundException('Entity not found');
    }

    if (hooks?.afterFindOne) {
      const modified = await hooks.afterFindOne(result, ctx);
      if (modified) result = modified;
    }

    const dtoMapper = this.getDtoMapper();
    const transformed = dtoMapper ? await dtoMapper.toResponse(result, ctx) : result;
    return { data: transformed };
  }

  protected async handleCreate(body: Record<string, unknown>, request: unknown): Promise<unknown> {
    const config = this.getConfig();
    const createConfig = getRouteConfig(config.routes, 'create') as MutationRouteConfig | undefined;
    const ctx = this.buildContext(request);
    const dtoMapper = this.getDtoMapper();
    const hooks = this.getHooks();

    let data = (await validateBody(createConfig?.schema, body)) as Record<string, unknown>;

    if (dtoMapper?.toCreateInput) {
      data = (await dtoMapper.toCreateInput(data, ctx)) as Record<string, unknown>;
    }

    if (hooks?.beforeCreate) {
      const modified = await hooks.beforeCreate(data, ctx);
      if (modified) data = modified;
    }

    const created = await this.service.create(data);

    if (hooks?.afterCreate) {
      await hooks.afterCreate(created, ctx);
    }

    const transformed = dtoMapper ? await dtoMapper.toResponse(created, ctx) : created;
    return { data: transformed };
  }

  protected async handleUpdate(
    id: string,
    body: Record<string, unknown>,
    request: unknown,
  ): Promise<unknown> {
    const parsedId = this.parseId(id);
    const config = this.getConfig();
    const updateConfig = getRouteConfig(config.routes, 'update') as MutationRouteConfig | undefined;
    const idField = config.id?.field ?? 'id';
    const where = { [idField]: parsedId };
    const ctx = this.buildContext(request);
    const dtoMapper = this.getDtoMapper();
    const hooks = this.getHooks();

    let data = (await validateBody(updateConfig?.schema, body)) as Record<string, unknown>;

    if (dtoMapper?.toUpdateInput) {
      data = (await dtoMapper.toUpdateInput(data, ctx)) as Record<string, unknown>;
    }

    if (hooks?.beforeUpdate) {
      const modified = await hooks.beforeUpdate(data, where, ctx);
      if (modified) data = modified;
    }

    const updated = await this.service.update(where, data);

    if (hooks?.afterUpdate) {
      await hooks.afterUpdate(updated, ctx);
    }

    const transformed = dtoMapper ? await dtoMapper.toResponse(updated, ctx) : updated;
    return { data: transformed };
  }

  protected async handleDelete(id: string, request: unknown): Promise<unknown> {
    const parsedId = this.parseId(id);
    const config = this.getConfig();
    const idField = config.id?.field ?? 'id';
    const where = { [idField]: parsedId };
    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeDelete) {
      await hooks.beforeDelete(where, ctx);
    }

    const deleted = await this.service.delete(where);

    if (!deleted) {
      throw new NotFoundException('Entity not found');
    }

    if (hooks?.afterDelete) {
      await hooks.afterDelete(deleted, ctx);
    }

    return { data: deleted };
  }

  protected async handleCount(request: { query: Record<string, string> }): Promise<unknown> {
    const query = parseListQuery(request.query);
    const config = this.getConfig();
    const listConfig = getRouteConfig(config.routes, 'list') as
      | ListRouteConfig<TEntity>
      | undefined;
    const defaults = listConfig?.defaults;

    if (defaults?.where) {
      query.where = { ...defaults.where, ...query.where };
    }
    this.applySearch(query, listConfig);

    const ctx = this.buildContext(request);
    const hooks = this.getHooks();
    const countOptions: Record<string, unknown> = query.where ? { where: query.where } : {};

    if (hooks?.beforeCount) {
      await hooks.beforeCount(countOptions, ctx);
    }

    const count = await this.service.count(countOptions);
    return { data: { count: Number(count) } };
  }

  protected async handleAggregate(request: {
    query: Record<string, string>;
  }): Promise<unknown> {
    const raw = request.query;
    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    const options: Record<string, unknown> = {};

    if (raw.where) {
      try {
        options.where = JSON.parse(raw.where);
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (raw.groupBy) {
      try {
        options.groupBy = JSON.parse(raw.groupBy);
      } catch {
        options.groupBy = raw.groupBy.split(',').map((s) => s.trim());
      }
    }
    if (raw._count) options._count = raw._count === 'true' || raw._count === '1';
    if (raw._sum) {
      try {
        options._sum = JSON.parse(raw._sum);
      } catch {
        /* ignore */
      }
    }
    if (raw._avg) {
      try {
        options._avg = JSON.parse(raw._avg);
      } catch {
        /* ignore */
      }
    }
    if (raw._min) {
      try {
        options._min = JSON.parse(raw._min);
      } catch {
        /* ignore */
      }
    }
    if (raw._max) {
      try {
        options._max = JSON.parse(raw._max);
      } catch {
        /* ignore */
      }
    }
    if (raw.having) {
      try {
        options.having = JSON.parse(raw.having);
      } catch {
        /* ignore */
      }
    }

    if (hooks?.beforeAggregate) {
      await hooks.beforeAggregate(options, ctx);
    }

    const result = await this.service.aggregate(options);

    if (hooks?.afterAggregate) {
      const modified = await hooks.afterAggregate(result, ctx);
      if (modified !== undefined) return { data: modified };
    }

    return { data: result };
  }
}

class RelayerControllerBase {
  constructor(private readonly service: RelayerService<unknown>) {}

  async list(query: Record<string, unknown> = {}): Promise<unknown[]> {
    return this.service.findMany(query);
  }

  async findById(id: string | number): Promise<unknown> {
    return this.service.findFirst({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    return this.service.create(data);
  }

  async update(where: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    return this.service.update(where, data);
  }

  async delete(where: Record<string, unknown>): Promise<unknown> {
    return this.service.delete(where);
  }

  async count(options: Record<string, unknown> = {}): Promise<number> {
    return this.service.count(options);
  }
}
