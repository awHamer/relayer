import type {
  InferCreateData,
  InferEntityOrderBy,
  InferEntityResult,
  InferEntitySelect,
  InferEntityWhere,
} from '@relayerjs/core';

export interface HandlerContext<TClient = unknown> {
  context?: unknown;
  tx?: TClient;
  user?: unknown;
  [key: string]: unknown;
}

type SelectConfigFromInfer<TClient, TEntity extends string> = {
  [K in keyof InferEntitySelect<TClient, TEntity> & string]?: InferEntitySelect<
    TClient,
    TEntity
  >[K] extends boolean | undefined
    ? boolean
    :
        | boolean
        | Partial<
            Record<
              keyof Exclude<InferEntitySelect<TClient, TEntity>[K], boolean | undefined> & string,
              boolean
            >
          >;
};

type WhereConfigFromInfer<TClient, TEntity extends string> = {
  [K in keyof InferEntityWhere<TClient, TEntity> & string]?: boolean | WhereFieldOperators;
};

type OrderByFieldFromInfer<TClient, TEntity extends string> =
  InferEntityOrderBy<TClient, TEntity> extends { field: infer F } ? F & string : string;

export interface WhereFieldOperators {
  operators: string[];
}

export type SelectConfig = Record<string, boolean | Record<string, boolean>>;
export type WhereConfig = Record<string, boolean | WhereFieldOperators>;

export interface RouteConfig<TClient = unknown, TEntity extends string = string> {
  allowSelect?: SelectConfigFromInfer<TClient, TEntity>;
  allowWhere?: WhereConfigFromInfer<TClient, TEntity>;
  allowOrderBy?: OrderByFieldFromInfer<TClient, TEntity>[];
  maxLimit?: number;
  defaultLimit?: number;
  hooks?: GlobalHooks<TClient>;
}

export interface GlobalHooks<TClient = unknown> {
  beforeRequest?: (ctx: HandlerContext<TClient>, req: Request) => Promise<void> | void;
}

export interface ListHooks<TClient = unknown, TEntity extends string = string> {
  beforeFind?: (
    options: Record<string, unknown>,
    ctx: HandlerContext<TClient>,
  ) => Promise<void> | void;
  afterFind?: (
    results: InferEntityResult<TClient, TEntity>[],
    ctx: HandlerContext<TClient>,
  ) => Promise<InferEntityResult<TClient, TEntity>[]> | InferEntityResult<TClient, TEntity>[];
  defaultSelect?: Partial<InferEntitySelect<TClient, TEntity>>;
  defaultWhere?: Partial<InferEntityWhere<TClient, TEntity>>;
  defaultOrderBy?: InferEntityOrderBy<TClient, TEntity> | InferEntityOrderBy<TClient, TEntity>[];
  defaultLimit?: number;
}

export interface FindByIdHooks<TClient = unknown, TEntity extends string = string> {
  defaultSelect?: Partial<InferEntitySelect<TClient, TEntity>>;
  afterFind?: (
    result: InferEntityResult<TClient, TEntity> | null,
    ctx: HandlerContext<TClient>,
  ) =>
    | Promise<InferEntityResult<TClient, TEntity> | null>
    | InferEntityResult<TClient, TEntity>
    | null;
}

export interface CreateHooks<TClient = unknown, TEntity extends string = string> {
  beforeCreate?: (
    data: InferCreateData<TClient, TEntity>,
    ctx: HandlerContext<TClient>,
  ) =>
    | Promise<InferCreateData<TClient, TEntity> | false | Response>
    | InferCreateData<TClient, TEntity>
    | false
    | Response;
  afterCreate?: (
    created: InferEntityResult<TClient, TEntity>,
    ctx: HandlerContext<TClient>,
  ) =>
    | Promise<InferEntityResult<TClient, TEntity> | Response>
    | InferEntityResult<TClient, TEntity>
    | Response;
}

export interface UpdateHooks<TClient = unknown, TEntity extends string = string> {
  beforeUpdate?: (
    data: Record<string, unknown>,
    where: Record<string, unknown>,
    ctx: HandlerContext<TClient>,
  ) =>
    | Promise<Record<string, unknown> | false | Response>
    | Record<string, unknown>
    | false
    | Response;
  afterUpdate?: (
    updated: InferEntityResult<TClient, TEntity>,
    ctx: HandlerContext<TClient>,
  ) =>
    | Promise<InferEntityResult<TClient, TEntity> | Response>
    | InferEntityResult<TClient, TEntity>
    | Response;
}

export interface RemoveHooks<TClient = unknown> {
  beforeDelete?: (
    where: Record<string, unknown>,
    ctx: HandlerContext<TClient>,
  ) =>
    | Promise<Record<string, unknown> | false | Response>
    | Record<string, unknown>
    | false
    | Response;
  afterDelete?: (
    deleted: Record<string, unknown>,
    ctx: HandlerContext<TClient>,
  ) => Promise<Record<string, unknown> | Response> | Record<string, unknown> | Response;
}

export interface CountHooks<TClient = unknown> {
  beforeCount?: (
    options: Record<string, unknown>,
    ctx: HandlerContext<TClient>,
  ) => Promise<void> | void;
}

export interface AggregateHooks<TClient = unknown> {
  beforeAggregate?: (
    options: Record<string, unknown>,
    ctx: HandlerContext<TClient>,
  ) => Promise<void> | void;
}

export type NextRouteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

export interface ListHandler<
  TClient = unknown,
  TEntity extends string = string,
> extends NextRouteHandler {
  query: (options?: {
    where?: Partial<InferEntityWhere<TClient, TEntity>>;
    select?: Partial<InferEntitySelect<TClient, TEntity>>;
    orderBy?: InferEntityOrderBy<TClient, TEntity> | InferEntityOrderBy<TClient, TEntity>[];
    limit?: number;
    offset?: number;
    req?: Request;
    context?: unknown;
  }) => Promise<{
    data: InferEntityResult<TClient, TEntity>[];
    meta: { total: number; limit: number; offset: number };
  }>;
}
