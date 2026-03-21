type AnyRecord = Record<string, unknown>;

export interface QueryOptions {
  select?: AnyRecord;
  where?: AnyRecord;
  orderBy?: AnyRecord | AnyRecord[];
  limit?: number;
  offset?: number;
  context?: unknown;
}

export interface RuntimeEntityClient {
  findMany(opts?: QueryOptions): Promise<AnyRecord[]>;
  findFirst(opts?: QueryOptions): Promise<AnyRecord | null>;
  count(opts?: { where?: AnyRecord; context?: unknown }): Promise<number>;
  aggregate(opts: unknown): Promise<unknown>;
  create(opts: unknown): Promise<AnyRecord>;
  update(opts: unknown): Promise<AnyRecord>;
  delete(opts: unknown): Promise<AnyRecord>;
}

export interface RuntimeHandlerContext {
  context?: unknown;
  tx?: unknown;
  [key: string]: unknown;
}

export interface RuntimeRouteConfig {
  allowSelect?: Record<string, boolean | Record<string, boolean>>;
  allowWhere?: Record<string, boolean | { operators: string[] }>;
  allowOrderBy?: string[];
  maxLimit?: number;
  defaultLimit?: number;
  hooks?: {
    beforeRequest?: (ctx: RuntimeHandlerContext, req: Request) => Promise<void> | void;
  };
}

export interface RuntimeListHooks {
  beforeFind?: (options: QueryOptions, ctx: RuntimeHandlerContext) => Promise<void> | void;
  afterFind?: (
    results: AnyRecord[],
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord[]> | AnyRecord[];
  defaultSelect?: AnyRecord;
  defaultWhere?: AnyRecord;
  defaultOrderBy?: AnyRecord | AnyRecord[];
  defaultLimit?: number;
}

export interface RuntimeFindByIdHooks {
  defaultSelect?: AnyRecord;
  afterFind?: (
    result: AnyRecord | null,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | null> | AnyRecord | null;
}

export interface RuntimeCreateHooks {
  beforeCreate?: (
    data: AnyRecord,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | false | Response> | AnyRecord | false | Response;
  afterCreate?: (
    created: AnyRecord,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | Response> | AnyRecord | Response;
}

export interface RuntimeUpdateHooks {
  beforeUpdate?: (
    data: AnyRecord,
    where: AnyRecord,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | false | Response> | AnyRecord | false | Response;
  afterUpdate?: (
    updated: AnyRecord,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | Response> | AnyRecord | Response;
}

export interface RuntimeRemoveHooks {
  beforeDelete?: (
    where: AnyRecord,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | false | Response> | AnyRecord | false | Response;
  afterDelete?: (
    deleted: AnyRecord,
    ctx: RuntimeHandlerContext,
  ) => Promise<AnyRecord | Response> | AnyRecord | Response;
}

export interface RuntimeCountHooks {
  beforeCount?: (options: AnyRecord, ctx: RuntimeHandlerContext) => Promise<void> | void;
}

export interface RuntimeAggregateHooks {
  beforeAggregate?: (options: AnyRecord, ctx: RuntimeHandlerContext) => Promise<void> | void;
}
