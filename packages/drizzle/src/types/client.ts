import type { AggregateResult, SelectResult } from '@relayerjs/core';

import type { SchemaTableKeys } from './entity-config';
import type {
  EntityWithRelations,
  ExtractMeta,
  InferTableInsert,
  InferTableSelect,
  ModelInstance,
  ModelMeta,
} from './helpers';
import type { AggregateType, OrderByType, SelectType, WhereType } from './model';

type ResolvedModel<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  K extends string,
> = ModelInstance<TSchema, TEntities, K> & ModelMeta<TSchema, TEntities, K>;

type InstanceOf<TModel> =
  ExtractMeta<TModel> extends {
    schema: infer S extends Record<string, unknown>;
    entities: infer E extends Record<string, unknown>;
    key: infer K extends string;
  }
    ? ModelInstance<S, E, K>
    : Record<string, unknown>;

type EntityOf<TModel> =
  ExtractMeta<TModel> extends {
    schema: infer S extends Record<string, unknown>;
    entities: infer E extends Record<string, unknown>;
    key: infer K extends string;
  }
    ? EntityWithRelations<S, E, K>
    : Record<string, unknown>;

export interface TypedEntityClient<TModel, TContext = unknown> {
  findMany<TSelect extends SelectType<TModel> | undefined = undefined>(options?: {
    select?: TSelect;
    where?: WhereType<TModel>;
    orderBy?: OrderByType<TModel> | OrderByType<TModel>[];
    limit?: number;
    offset?: number;
    context?: TContext;
  }): Promise<SelectResult<InstanceOf<TModel>, TSelect>[]>;

  findManyStream(options?: {
    select?: SelectType<TModel>;
    where?: WhereType<TModel>;
    orderBy?: OrderByType<TModel> | OrderByType<TModel>[];
    limit?: number;
    offset?: number;
    context?: TContext;
  }): AsyncGenerator<Record<string, unknown>>;

  findFirst<TSelect extends SelectType<TModel> | undefined = undefined>(options?: {
    select?: TSelect;
    where?: WhereType<TModel>;
    orderBy?: OrderByType<TModel> | OrderByType<TModel>[];
    context?: TContext;
  }): Promise<SelectResult<InstanceOf<TModel>, TSelect> | null>;

  count(options?: { where?: WhereType<TModel>; context?: TContext }): Promise<number>;

  aggregate<const TOptions extends AggregateType<TModel>>(
    options: TOptions,
  ): Promise<
    TOptions extends { groupBy: readonly string[] }
      ? AggregateResult<EntityOf<TModel>, TOptions>[]
      : AggregateResult<EntityOf<TModel>, TOptions>
  >;

  create(options: {
    data: ExtractMeta<TModel> extends { schema: infer S; key: infer K }
      ? InferTableInsert<(S & Record<string, unknown>)[K & keyof S]>
      : Record<string, unknown>;
  }): Promise<
    ExtractMeta<TModel> extends { schema: infer S; key: infer K }
      ? InferTableSelect<(S & Record<string, unknown>)[K & keyof S]>
      : Record<string, unknown>
  >;

  createMany(options: {
    data: (ExtractMeta<TModel> extends { schema: infer S; key: infer K }
      ? InferTableInsert<(S & Record<string, unknown>)[K & keyof S]>
      : Record<string, unknown>)[];
  }): Promise<
    (ExtractMeta<TModel> extends { schema: infer S; key: infer K }
      ? InferTableSelect<(S & Record<string, unknown>)[K & keyof S]>
      : Record<string, unknown>)[]
  >;

  update(options: {
    where: WhereType<TModel>;
    data: Partial<
      ExtractMeta<TModel> extends { schema: infer S; key: infer K }
        ? InferTableInsert<(S & Record<string, unknown>)[K & keyof S]>
        : Record<string, unknown>
    >;
  }): Promise<
    ExtractMeta<TModel> extends { schema: infer S; key: infer K }
      ? InferTableSelect<(S & Record<string, unknown>)[K & keyof S]>
      : Record<string, unknown>
  >;

  updateMany(options: {
    where: WhereType<TModel>;
    data: Partial<
      ExtractMeta<TModel> extends { schema: infer S; key: infer K }
        ? InferTableInsert<(S & Record<string, unknown>)[K & keyof S]>
        : Record<string, unknown>
    >;
  }): Promise<{ count: number }>;

  delete(options: {
    where: WhereType<TModel>;
  }): Promise<
    ExtractMeta<TModel> extends { schema: infer S; key: infer K }
      ? InferTableSelect<(S & Record<string, unknown>)[K & keyof S]>
      : Record<string, unknown>
  >;

  deleteMany(options: { where: WhereType<TModel> }): Promise<{ count: number }>;
}

export type RelayerClient<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TContext = unknown,
  TDb = unknown,
> = {
  [K in SchemaTableKeys<TSchema>]: TypedEntityClient<
    ResolvedModel<TSchema, TEntities, K>,
    TContext
  >;
} & {
  $orm: TDb;
  getOrm(): TDb;
  $transaction<T>(
    callback: (tx: RelayerClient<TSchema, TEntities, TContext, TDb>) => Promise<T>,
    config?: {
      isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
      accessMode?: 'read only' | 'read write';
      deferrable?: boolean;
    },
  ): Promise<T>;
};
