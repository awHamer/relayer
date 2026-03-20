import type { ModelAggregateOptions as AggregateInternal } from './aggregate';
import type { TypedEntityClient } from './client';
import type { ModelDotPaths as DotPathsInternal, ExtractMeta } from './helpers';
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

// Extract resolved model from RelayerClient
// TypedEntityClient<TModel, TContext> -> TModel = ModelInstance & ModelMeta
export type InferModel<TClient, K extends string> = K extends keyof TClient
  ? TClient[K] extends TypedEntityClient<infer TModel, unknown>
    ? TModel
    : never
  : never;

export type SelectType<TModel> = Delegate<TModel, 'select'>;
export type WhereType<TModel> = Delegate<TModel, 'where'>;
export type DotPaths<TModel> = Delegate<TModel, 'dotpaths'>;
export type OrderByType<TModel> = Delegate<TModel, 'orderby'>;
export type AggregateType<TModel> = Delegate<TModel, 'aggregate'>;
