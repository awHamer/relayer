import type {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  NumberOperators,
  RelayerEntityClass,
  StringOperators,
  WhereType,
} from '@relayerjs/core';

import type { CrudRouteName } from '../constants';
import type { DtoMapper } from '../relayer.dto-mapper';
import type { RelayerHooks } from '../relayer.hooks';
import type { Model } from './entity-repo';

type ModelKeys<TEntity, TEntities extends Record<string, unknown>> = keyof Model<
  TEntity,
  TEntities
> &
  string;

export type RelationKeys<TEntity, TEntities extends Record<string, unknown>> = {
  [K in keyof Model<TEntity, TEntities> & string]: NonNullable<
    Model<TEntity, TEntities>[K]
  > extends (infer Item)[]
    ? Item extends Record<string, unknown>
      ? K
      : never
    : NonNullable<Model<TEntity, TEntities>[K]> extends Record<string, unknown>
      ? NonNullable<Model<TEntity, TEntities>[K]> extends Date
        ? never
        : K
      : never;
}[keyof Model<TEntity, TEntities> & string];

export interface ZodLike {
  parse(data: unknown): unknown;
  safeParse?(data: unknown): { success: boolean; error?: { errors: unknown[] }; data?: unknown };
}

type SelectConfigOf<T> = {
  [K in keyof T & string]?: NonNullable<T[K]> extends (infer Item)[]
    ? Item extends Record<string, unknown>
      ? boolean | ({ $limit?: number } & SelectConfigOf<Item>)
      : boolean
    : NonNullable<T[K]> extends Record<string, unknown>
      ? NonNullable<T[K]> extends Date
        ? boolean
        : boolean | SelectConfigOf<NonNullable<T[K]>>
      : boolean;
};

export type SelectConfig<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
> = SelectConfigOf<Model<TEntity, TEntities>>;

export type OperatorName =
  | keyof StringOperators
  | keyof NumberOperators
  | keyof BooleanOperators
  | keyof DateOperators
  | keyof ArrayOperators;

export type WhereConfig<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
> = Partial<Record<ModelKeys<TEntity, TEntities>, boolean | { operators: OperatorName[] }>>;

/**
 * 'offset' — standard offset/limit pagination with total count.
 * 'cursor' — cursor-based pagination (no total count, uses limit+1 for hasMore).
 *   Order fields are fetched with `$raw` for full DB precision.
 *   Falls back to id asc if no orderBy provided.
 * 'cursor_UNSTABLE' — deprecated alias for 'cursor', kept for backward compatibility.
 */
export type PaginationMode = 'offset' | 'cursor' | 'cursor_UNSTABLE';

export interface ListRouteConfig<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  schema?: ZodLike;
  /**
   * 'offset' (default) — standard offset/limit with total count.
   * 'cursor' — cursor-based, no total count, limit+1 for hasMore.
   *   Order fields use $raw for full DB precision.
   */
  pagination?: PaginationMode;
  defaults?: {
    select?: SelectConfig<TEntity, TEntities>;
    where?: Partial<Record<ModelKeys<TEntity, TEntities>, unknown>>;
    orderBy?:
      | { field: ModelKeys<TEntity, TEntities>; order: 'asc' | 'desc' }
      | { field: ModelKeys<TEntity, TEntities>; order: 'asc' | 'desc' }[];
  };
  allow?: {
    select?: SelectConfig<TEntity, TEntities>;
    where?: WhereConfig<TEntity, TEntities>;
    orderBy?: ModelKeys<TEntity, TEntities>[];
  };
  maxLimit?: number;
  defaultLimit?: number;
  search?: (query: string) => WhereType<Model<TEntity, TEntities>>;
}

export interface FindByIdRouteConfig<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  defaults?: {
    select?: SelectConfig<TEntity, TEntities>;
  };
}

export interface MutationRouteConfig {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  schema?: ZodLike | Function;
}

export type RelationOperation = 'connect' | 'disconnect' | 'set';

export type RelationId = string | number | ({ _id: string | number } & Record<string, unknown>);

export interface RelationRouteConfig {
  connect?: boolean;
  disconnect?: boolean;
  set?: boolean;
}

export interface CrudRoutes<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  list?: boolean | ListRouteConfig<TEntity, TEntities>;
  findById?: boolean | FindByIdRouteConfig<TEntity, TEntities>;
  create?: boolean | MutationRouteConfig;
  update?: boolean | MutationRouteConfig;
  delete?: boolean;
  count?: boolean;
  aggregate?: boolean;
  relations?: {
    [K in RelationKeys<TEntity, TEntities>]?: boolean | RelationRouteConfig;
  };
}

export interface SwaggerRouteOverride {
  summary?: string;
  description?: string;
}

export interface SwaggerConfig {
  tag?: string;
  enabled?: boolean;
  list?: SwaggerRouteOverride;
  findById?: SwaggerRouteOverride;
  create?: SwaggerRouteOverride;
  update?: SwaggerRouteOverride;
  delete?: SwaggerRouteOverride;
  count?: SwaggerRouteOverride;
  aggregate?: SwaggerRouteOverride;
}

export interface DecoratorTargeted {
  apply: MethodDecorator[];
  for?: CrudRouteName[];
}

export type DecoratorEntry = MethodDecorator | DecoratorTargeted;

export interface CrudControllerConfig<
  TEntity = unknown,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  model: RelayerEntityClass & (new (...args: unknown[]) => TEntity);
  path?: string;
  id?: {
    field?: string;
    type?: 'number' | 'string' | 'uuid';
  };
  routes?: CrudRoutes<TEntity, TEntities>;
  decorators?: DecoratorEntry[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dtoMapper?: new (...args: any[]) => DtoMapper<any, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hooks?: new (...args: any[]) => RelayerHooks<TEntity, TEntities>;
  swagger?: SwaggerConfig | false;
  params?: Record<string, { field: string; type: 'number' | 'string' }>;
}

export interface RelayerModuleOptions {
  db: unknown;
  schema: Record<string, unknown>;
  entities: RelayerEntityClass[] | Record<string, RelayerEntityClass>;
  maxRelationDepth?: number;
  defaultRelationLimit?: number;
  baseUrl?: string | (() => string);
  envelope?: boolean;
}

export interface RelayerModuleAsyncOptions {
  imports?: unknown[];
  inject?: unknown[];
  useFactory: (...args: unknown[]) => Promise<RelayerModuleOptions> | RelayerModuleOptions;
}
