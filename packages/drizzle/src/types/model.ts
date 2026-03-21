import type { ModelAggregateOptions as AggregateInternal } from './aggregate';
import type { TypedEntityClient } from './client';
import type { ModelDotPaths as DotPathsInternal, ExtractMeta, OpsForTSType } from './helpers';
import type { ModelOrderBy as OrderByInternal } from './order-by';
import type { ModelSelect as SelectInternal } from './select';
import type { ModelWhere as WhereInternal } from './where';

type Delegate<TModel, TType> =
  ExtractMeta<TModel> extends infer M extends {
    schema: Record<string, unknown>;
    entities: Record<string, unknown>;
    key: string;
  }
    ? TType extends 'select'
      ? SelectInternal<M['schema'], M['entities'], M['key']>
      : TType extends 'where'
        ? WhereInternal<M['schema'], M['entities'], M['key']>
        : TType extends 'dotpaths'
          ? DotPathsInternal<M['schema'], M['entities'], M['key']>
          : TType extends 'orderby'
            ? OrderByInternal<M['schema'], M['entities'], M['key']>
            : TType extends 'aggregate'
              ? AggregateInternal<M['schema'], M['entities'], M['key']>
              : never
    : never;

// Fallback types for raw instance types (no MODEL_META)
type SimpleSelect<T> = { [K in keyof T & string]?: boolean };

type SimpleWhere<T> = {
  [K in keyof T & string]?: OpsForTSType<T[K]>;
} & {
  AND?: SimpleWhere<T>[];
  OR?: SimpleWhere<T>[];
  NOT?: SimpleWhere<T>;
};

type SimpleDotPaths<T> = keyof T & string;

type SimpleOrderBy<T> = { field: keyof T & string; order: 'asc' | 'desc' };

type HasMeta<T> = ExtractMeta<T> extends never ? false : true;

// Resolve instance type from class constructor or plain type
type ResolveInstance<T> = T extends new (...args: unknown[]) => infer I ? I : T;

export type InferModel<TClient, K extends string> = K extends keyof TClient
  ? TClient[K] extends TypedEntityClient<infer TModel, unknown>
    ? TModel
    : never
  : never;

export type SelectType<T> =
  HasMeta<T> extends true ? Delegate<T, 'select'> : SimpleSelect<ResolveInstance<T>>;

export type WhereType<T> =
  HasMeta<T> extends true ? Delegate<T, 'where'> : SimpleWhere<ResolveInstance<T>>;

export type DotPaths<T> =
  HasMeta<T> extends true ? Delegate<T, 'dotpaths'> : SimpleDotPaths<ResolveInstance<T>>;

export type OrderByType<T> =
  HasMeta<T> extends true ? Delegate<T, 'orderby'> : SimpleOrderBy<ResolveInstance<T>>;

export type AggregateType<T> = HasMeta<T> extends true ? Delegate<T, 'aggregate'> : never;
