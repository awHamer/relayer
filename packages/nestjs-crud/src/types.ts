import type {
  ArrayOperators,
  BooleanOperators,
  DateOperators,
  NumberOperators,
  RelayerEntityClass,
  StringOperators,
  WhereType,
} from '@relayerjs/core';

import type { CrudRouteName } from './constants';
import type { DtoMapper } from './dto-mapper';
import type { RelayerHooks } from './hooks';

export interface RequestContext {
  request: unknown;
  user?: unknown;
  tx?: unknown;
  [key: string]: unknown;
}

export interface ValidationError {
  code: string;
  message: string;
  path: (string | number)[];
  [key: string]: unknown;
}

type EntityKeys<TEntity> = keyof TEntity & string;

export interface ZodLike {
  parse(data: unknown): unknown;
  safeParse?(data: unknown): { success: boolean; error?: { errors: unknown[] }; data?: unknown };
}

export type SelectConfig<TEntity> = Partial<Record<EntityKeys<TEntity>, boolean>> &
  Record<string, unknown>;

export type OperatorName =
  | keyof StringOperators
  | keyof NumberOperators
  | keyof BooleanOperators
  | keyof DateOperators
  | keyof ArrayOperators;

export type WhereConfig<TEntity> = Partial<
  Record<EntityKeys<TEntity>, boolean | { operators: OperatorName[] }>
>;

/**
 * 'offset' — standard offset/limit pagination with total count
 * 'cursor_UNSTABLE' — cursor-based pagination (no total count, uses limit+1 for hasMore).
 *   Limitations:
 *   - Requires orderBy (falls back to id asc if not provided)
 *   - Date fields in cursor lose microsecond precision (JS Date = ms, PG = μs),
 *     may cause skipped/duplicated items when sorting by high-precision timestamps.
 *     Works reliably with: numeric IDs, string IDs, dates with ≤ms precision.
 *   - Will be stabilized when cursor logic moves to Relayer core (ORM level)
 */
export type PaginationMode = 'offset' | 'cursor_UNSTABLE';

export interface ListRouteConfig<TEntity> {
  schema?: ZodLike;
  /**
   * 'offset' (default) — standard offset/limit with total count.
   * 'cursor_UNSTABLE' — cursor-based, no total count, limit+1 for hasMore.
   *   Limitations: date fields lose μs precision (JS Date = ms, PG = μs).
   *   Works reliably with numeric/string IDs and dates with ≤ms precision.
   */
  pagination?: PaginationMode;
  defaults?: {
    select?: SelectConfig<TEntity>;
    where?: Partial<Record<EntityKeys<TEntity>, unknown>>;
    orderBy?:
      | { field: EntityKeys<TEntity>; order: 'asc' | 'desc' }
      | { field: EntityKeys<TEntity>; order: 'asc' | 'desc' }[];
  };
  allow?: {
    select?: SelectConfig<TEntity> & Record<string, boolean | { $limit?: number }>;
    where?: WhereConfig<TEntity>;
    orderBy?: EntityKeys<TEntity>[];
  };
  maxLimit?: number;
  defaultLimit?: number;
  search?: (query: string) => WhereType<TEntity>;
}

export interface FindByIdRouteConfig<TEntity> {
  defaults?: {
    select?: SelectConfig<TEntity>;
  };
}

export interface MutationRouteConfig {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  schema?: ZodLike | Function;
}

export interface CrudRoutes<TEntity> {
  list?: boolean | ListRouteConfig<TEntity>;
  findById?: boolean | FindByIdRouteConfig<TEntity>;
  create?: boolean | MutationRouteConfig;
  update?: boolean | MutationRouteConfig;
  delete?: boolean;
  count?: boolean;
  aggregate?: boolean;
}

export interface DecoratorTargeted {
  apply: MethodDecorator[];
  for?: CrudRouteName[];
}

export type DecoratorEntry = MethodDecorator | DecoratorTargeted;

export interface CrudControllerConfig<TEntity = unknown> {
  model: RelayerEntityClass & (new (...args: unknown[]) => TEntity);
  path?: string;
  id?: {
    field?: string;
    type?: 'number' | 'string' | 'uuid';
  };
  routes?: CrudRoutes<TEntity>;
  decorators?: DecoratorEntry[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dtoMapper?: new (...args: any[]) => DtoMapper<TEntity, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hooks?: new (...args: any[]) => RelayerHooks<TEntity>;
  swagger?: Record<string, unknown>;
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
