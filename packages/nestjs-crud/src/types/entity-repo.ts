import type {
  AggregateResult,
  DotPaths,
  FindFirstOptions,
  FindManyOptions,
  NumberOperators,
  OrderByType,
  SelectResult,
  SelectType,
  WhereType,
} from '@relayerjs/core';
import type { EntityModelFromInstance } from '@relayerjs/drizzle';

export type Model<TEntity, TEntities extends Record<string, unknown>> = EntityModelFromInstance<
  TEntity,
  TEntities
>;

export type Where<TEntity, TEntities extends Record<string, unknown>> = WhereType<
  Model<TEntity, TEntities>
>;

export type Select<TEntity, TEntities extends Record<string, unknown>> = SelectType<
  Model<TEntity, TEntities>
>;

export type OrderBy<TEntity, TEntities extends Record<string, unknown>> = OrderByType<
  Model<TEntity, TEntities>
>;

export type ManyOptions<TEntity, TEntities extends Record<string, unknown>> = FindManyOptions<
  Select<TEntity, TEntities>,
  Where<TEntity, TEntities>,
  OrderBy<TEntity, TEntities>
>;

export type FirstOptions<TEntity, TEntities extends Record<string, unknown>> = FindFirstOptions<
  Select<TEntity, TEntities>,
  Where<TEntity, TEntities>,
  OrderBy<TEntity, TEntities>
>;

export type WhereOptions<TEntity, TEntities extends Record<string, unknown>> = {
  where?: Where<TEntity, TEntities>;
};

export type PartialDataOptions<TEntity> = { data: Partial<TEntity> };

export type UpdateOptions<TEntity, TEntities extends Record<string, unknown>> = Required<
  WhereOptions<TEntity, TEntities>
> &
  PartialDataOptions<TEntity>;

type ModelPaths<TEntity, TEntities extends Record<string, unknown>> = DotPaths<
  Model<TEntity, TEntities>
>;

export interface AggregateHaving {
  _count?: number | NumberOperators;
  [key: string]: number | NumberOperators | undefined;
}

export interface AggregateOptions<TEntity, TEntities extends Record<string, unknown>> {
  where?: Where<TEntity, TEntities>;
  groupBy?: readonly ModelPaths<TEntity, TEntities>[];
  _count?: boolean;
  _sum?: Partial<Record<ModelPaths<TEntity, TEntities>, boolean>>;
  _avg?: Partial<Record<ModelPaths<TEntity, TEntities>, boolean>>;
  _min?: Partial<Record<ModelPaths<TEntity, TEntities>, boolean>>;
  _max?: Partial<Record<ModelPaths<TEntity, TEntities>, boolean>>;
  having?: AggregateHaving;
}

export interface EntityRepo<TEntity, TEntities extends Record<string, unknown>> {
  findMany<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: ManyOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect>[]>;
  findFirst<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FirstOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect> | null>;
  count(options?: WhereOptions<TEntity, TEntities>): Promise<number>;
  create(options: { data: Record<string, unknown> }): Promise<Model<TEntity, TEntities>>;
  createMany(options: { data: Record<string, unknown>[] }): Promise<Model<TEntity, TEntities>[]>;
  update(options: UpdateOptions<TEntity, TEntities>): Promise<Model<TEntity, TEntities>>;
  updateMany(options: UpdateOptions<TEntity, TEntities>): Promise<{ count: number }>;
  delete(options: WhereOptions<TEntity, TEntities>): Promise<Model<TEntity, TEntities>>;
  deleteMany(options: WhereOptions<TEntity, TEntities>): Promise<{ count: number }>;
  aggregate<const TOptions extends AggregateOptions<TEntity, TEntities>>(
    options: TOptions,
  ): Promise<AggregateResult<Model<TEntity, TEntities>, TOptions>[]>;
}

export type RelayerInstance<TEntities extends Record<string, unknown>> = {
  [K in keyof TEntities & string]: TEntities[K] extends new (...args: unknown[]) => infer I
    ? EntityRepo<I, TEntities>
    : never;
};
