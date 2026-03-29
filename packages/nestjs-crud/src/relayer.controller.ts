import { Inject, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { CRUD_CONTROLLER_METADATA, RELAYER_BASE_URL } from './constants';
import {
  buildCursorWhere,
  decodeCursor,
  encodeCursor,
  ParseIdPipe,
  parseListQuery,
  tryParseJson,
  validateBody,
  type ParsedListQuery,
} from './pipes';
import type { DtoMapper } from './relayer.dto-mapper';
import type { RelayerHooks } from './relayer.hooks';
import type { RelayerService } from './relayer.service';
import type {
  CrudControllerConfig,
  FindByIdRouteConfig,
  FirstOptions,
  ListRouteConfig,
  ManyOptions,
  MutationRouteConfig,
  RelationErrorResponse,
  RelationId,
  RelationKeys,
  RelationOperation,
  RelationResponse,
  RequestContext,
  Where,
} from './types';
import { buildNextPageUrl, enforceAllowSelectLimits, getRouteConfig } from './utils';

/**
 * Base controller for auto-generated CRUD + relation endpoints.
 * Extend this class and apply `@CrudController()` to get REST API routes.
 *
 * Override any `handle*` method to customize behavior while keeping other routes auto-generated.
 *
 * @typeParam TEntity - The entity class (e.g., PostEntity)
 * @typeParam EM - Entity map for relation-aware types
 */
export class RelayerController<
  TEntity,
  EM extends Record<string, unknown> = Record<string, unknown>,
  _TDtoMapper extends DtoMapper<TEntity, unknown, unknown> = DtoMapper<TEntity, TEntity, TEntity>,
> implements OnModuleInit {
  @Inject(ModuleRef)
  private moduleRef!: ModuleRef;

  @Inject(RELAYER_BASE_URL)
  private baseUrlConfig!: string | (() => string);

  private resolvedDtoMapper: DtoMapper<TEntity> | null = null;
  private resolvedHooks: RelayerHooks<TEntity, EM> | null = null;
  private dtoMapperResolved = false;
  private hooksResolved = false;

  constructor(private readonly service: RelayerService<TEntity, EM>) {}

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
        this.resolvedHooks = new config.hooks() as RelayerHooks<TEntity, EM>;
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

  protected getHooks(): RelayerHooks<TEntity, EM> | null {
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

  /**
   * Handle GET / -- list entities with pagination.
   *
   * Supports offset and cursor pagination, default/client select/where/orderBy,
   * search callback, relation loading, and `$limit` on nested relations.
   *
   * Override to customize list behavior while keeping other routes auto-generated.
   */
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
    query.select = enforceAllowSelectLimits(
      query.select,
      listConfig?.allow?.select as Record<string, boolean | { $limit?: number }> | undefined,
    );

    const limit = Math.min(
      query.limit ?? listConfig?.defaultLimit ?? 20,
      listConfig?.maxLimit ?? 100,
    );

    if (paginationMode === 'cursor' || paginationMode === 'cursor_UNSTABLE') {
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
      await hooks.beforeFind(findOptions as ManyOptions<TEntity, EM>, ctx);
    }

    // eslint-disable-next-line prefer-const
    let [data, total] = await Promise.all([
      this.service.findMany(findOptions as ManyOptions<TEntity, EM>) as Promise<TEntity[]>,
      this.service.count(query.where ? { where: query.where as Where<TEntity, EM> } : {}),
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
      await hooks.beforeFind(findOptions as ManyOptions<TEntity, EM>, ctx);
    }

    const rawData = (await this.service.findMany(
      findOptions as ManyOptions<TEntity, EM>,
    )) as TEntity[];
    const hasMore = rawData.length > limit;
    let results = hasMore ? rawData.slice(0, limit) : rawData;

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

  /**
   * Handle GET /:id -- find a single entity by primary key.
   *
   * Applies `findById.defaults.select` from config if present.
   * Runs `beforeFindOne`/`afterFindOne` hooks and DtoMapper `toSingleItem`.
   * Throws `NotFoundException` if entity not found.
   */
  protected async handleFindById(id: string, request: unknown): Promise<unknown> {
    const parsedId = this.parseId(id);
    const config = this.getConfig();
    const idField = config.id?.field ?? 'id';
    const findByIdConfig = getRouteConfig(config.routes, 'findById') as
      | FindByIdRouteConfig<TEntity>
      | undefined;

    const findOptions = {
      where: { [idField]: parsedId } as Where<TEntity, EM>,
      ...(findByIdConfig?.defaults?.select ? { select: findByIdConfig.defaults.select } : {}),
    };

    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeFindOne) {
      await hooks.beforeFindOne(findOptions as FirstOptions<TEntity, EM>, ctx);
    }

    let result = (await this.service.findFirst(
      findOptions as FirstOptions<TEntity, EM>,
    )) as TEntity | null;
    if (!result) {
      throw new NotFoundException('Entity not found');
    }

    if (hooks?.afterFindOne) {
      const modified = await hooks.afterFindOne(result, ctx);
      if (modified) result = modified;
    }

    const dtoMapper = this.getDtoMapper();
    const transformed = dtoMapper ? await dtoMapper.toSingleItem(result, ctx) : result;
    return { data: transformed };
  }

  /**
   * Handle POST / -- create a new entity.
   *
   * Validates body against `create.schema` (Zod or class-validator).
   * Runs `toCreateInput` from DtoMapper and `beforeCreate`/`afterCreate` hooks.
   * Returns the created entity through `toSingleItem` if DtoMapper is configured.
   */
  protected async handleCreate(body: Record<string, unknown>, request: unknown): Promise<unknown> {
    const config = this.getConfig();
    const createConfig = getRouteConfig(config.routes, 'create') as MutationRouteConfig | undefined;
    const ctx = this.buildContext(request);
    const dtoMapper = this.getDtoMapper();
    const hooks = this.getHooks();

    let data: Partial<TEntity> = (await validateBody(
      createConfig?.schema,
      body,
    )) as Partial<TEntity>;

    if (dtoMapper?.toCreateInput) {
      data = (await dtoMapper.toCreateInput(data, ctx)) as Partial<TEntity>;
    }

    if (hooks?.beforeCreate) {
      const modified = (await hooks.beforeCreate(data, ctx)) as Partial<TEntity>;
      if (modified) data = modified;
    }

    const created = (await this.service.create({ data })) as TEntity;

    if (hooks?.afterCreate) {
      await hooks.afterCreate(created, ctx);
    }

    const transformed = dtoMapper ? await dtoMapper.toSingleItem(created, ctx) : created;
    return { data: transformed };
  }

  private extractRelationOps(body: Record<string, unknown>): {
    scalarBody: Record<string, unknown>;
    relationOps: Record<string, unknown>;
  } {
    const config = this.getConfig();
    const relationNames = config.routes?.relations
      ? new Set(Object.keys(config.routes.relations))
      : new Set<string>();

    if (relationNames.size === 0) return { scalarBody: body, relationOps: {} };

    const scalarBody: Record<string, unknown> = {};
    const relationOps: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
      if (relationNames.has(key) && typeof value === 'object' && value !== null) {
        relationOps[key] = value;
      } else {
        scalarBody[key] = value;
      }
    }

    return { scalarBody, relationOps };
  }

  /**
   * Handle PATCH /:id -- update an entity by primary key.
   *
   * Separates relation operations from scalar data before validation,
   * so Zod/class-validator schemas don't need to account for relation fields.
   * Runs `toUpdateInput` from DtoMapper and `beforeUpdate`/`afterUpdate` hooks.
   * Supports inline relation ops: `{ title: "New", postCategories: { connect: [1] } }`.
   */
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

    const { scalarBody, relationOps } = this.extractRelationOps(body);

    let data = (await validateBody(updateConfig?.schema, scalarBody)) as Record<string, unknown>;
    data = { ...data, ...relationOps };

    if (dtoMapper?.toUpdateInput) {
      data = (await dtoMapper.toUpdateInput(data as Partial<TEntity>, ctx)) as Record<
        string,
        unknown
      >;
    }

    if (hooks?.beforeUpdate) {
      const modified = await hooks.beforeUpdate(
        data as Partial<TEntity>,
        where as Where<TEntity, EM>,
        ctx,
      );
      if (modified) data = modified as Record<string, unknown>;
    }

    const updated = (await this.service.update({
      where: where as Where<TEntity, EM>,
      data: data as Partial<TEntity>,
    })) as TEntity | undefined;

    if (updated && hooks?.afterUpdate) {
      await hooks.afterUpdate(updated, ctx);
    }

    if (!updated) {
      return { data: { success: true } };
    }

    const transformed = dtoMapper ? await dtoMapper.toSingleItem(updated, ctx) : updated;
    return { data: transformed };
  }

  /**
   * Handle DELETE /:id -- delete an entity by primary key.
   *
   * Runs `beforeDelete`/`afterDelete` hooks.
   * Throws `NotFoundException` if entity not found.
   */
  protected async handleDelete(id: string, request: unknown): Promise<unknown> {
    const parsedId = this.parseId(id);
    const config = this.getConfig();
    const idField = config.id?.field ?? 'id';
    const where = { [idField]: parsedId };
    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeDelete) {
      await hooks.beforeDelete(where as Where<TEntity, EM>, ctx);
    }

    const deleted = (await this.service.delete({ where: where as Where<TEntity, EM> })) as TEntity;

    if (!deleted) {
      throw new NotFoundException('Entity not found');
    }

    if (hooks?.afterDelete) {
      await hooks.afterDelete(deleted, ctx);
    }

    return { data: deleted };
  }

  /**
   * Handle GET /count -- count entities matching the filter.
   *
   * Applies `defaults.where` from list config and search callback.
   * Runs `beforeCount` hook.
   */
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
    const countOptions = query.where ? { where: query.where as Where<TEntity, EM> } : {};

    if (hooks?.beforeCount) {
      await hooks.beforeCount(countOptions, ctx);
    }

    const count = await this.service.count(countOptions);
    return { data: { count: Number(count) } };
  }

  /**
   * Handle GET /aggregate -- run aggregation queries.
   *
   * Parses `where`, `groupBy`, `_count`, `_sum`, `_avg`, `_min`, `_max`, `having` from query params.
   * Runs `beforeAggregate`/`afterAggregate` hooks.
   */
  protected async handleAggregate(request: { query: Record<string, string> }): Promise<unknown> {
    const raw = request.query;
    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    const options: Record<string, unknown> = {} as Record<string, unknown>;

    const where = tryParseJson(raw.where);
    if (where) options.where = where as Record<string, unknown>;

    if (raw.groupBy) {
      options.groupBy =
        (tryParseJson(raw.groupBy) as string[]) ?? raw.groupBy.split(',').map((s) => s.trim());
    }

    if (raw._count) {
      options._count = raw._count === 'true' || raw._count === '1';
    }

    for (const key of ['_sum', '_avg', '_min', '_max', 'having'] as const) {
      const parsed = tryParseJson(raw[key]);
      if (parsed) (options as Record<string, unknown>)[key] = parsed;
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

  private async handleRelationOp(
    operation: RelationOperation,
    id: string,
    relationName: RelationKeys<TEntity, EM>,
    body: Record<string, unknown>,
    request: unknown,
  ): Promise<RelationResponse | RelationErrorResponse> {
    const parsedId = this.parseId(id);
    const config = this.getConfig();
    const idField = config.id?.field ?? 'id';
    let ids = body.data as RelationId[];
    if (!Array.isArray(ids)) {
      return { error: { code: 'BAD_REQUEST', message: 'body.data must be an array' } };
    }

    const ctx = this.buildContext(request);
    const hooks = this.getHooks();

    if (hooks?.beforeRelation) {
      const modified = await hooks.beforeRelation(operation, relationName, ids, ctx);
      if (modified) ids = modified;
    }

    await this.service.update({
      where: { [idField]: parsedId } as Where<TEntity, EM>,
      data: { [relationName]: { [operation]: ids } } as Partial<TEntity>,
    });

    if (hooks?.afterRelation) {
      await hooks.afterRelation(operation, relationName, ids, ctx);
    }

    return { data: { success: true } };
  }

  /**
   * Handle POST /:id/relations/:name -- add links to a many-to-many relation.
   *
   * Body: `{ data: [1, 2] }` or `{ data: [{ _id: 1, isPrimary: true }] }`.
   * Runs `beforeRelation`/`afterRelation` hooks with operation `'connect'`.
   */
  protected async handleRelationConnect(
    id: string,
    relationName: RelationKeys<TEntity, EM>,
    body: Record<string, unknown>,
    request: unknown = {},
  ): Promise<RelationResponse | RelationErrorResponse> {
    return this.handleRelationOp('connect', id, relationName, body, request);
  }

  /**
   * Handle DELETE /:id/relations/:name -- remove links from a many-to-many relation.
   *
   * Body: `{ data: [1, 2] }`.
   * Runs `beforeRelation`/`afterRelation` hooks with operation `'disconnect'`.
   */
  protected async handleRelationDisconnect(
    id: string,
    relationName: RelationKeys<TEntity, EM>,
    body: Record<string, unknown>,
    request: unknown = {},
  ): Promise<RelationResponse | RelationErrorResponse> {
    return this.handleRelationOp('disconnect', id, relationName, body, request);
  }

  /**
   * Handle PUT /:id/relations/:name -- replace all links in a many-to-many relation.
   *
   * Deletes all existing links and creates the ones specified in body.
   * Body: `{ data: [1, 2, 3] }`.
   * Runs `beforeRelation`/`afterRelation` hooks with operation `'set'`.
   */
  protected async handleRelationSet(
    id: string,
    relationName: RelationKeys<TEntity, EM>,
    body: Record<string, unknown>,
    request: unknown = {},
  ): Promise<RelationResponse | RelationErrorResponse> {
    return this.handleRelationOp('set', id, relationName, body, request);
  }
}
