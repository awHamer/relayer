import type { SelectResult, SelectType, WhereType, OrderByType } from '@relayerjs/core';
import type { EntityModelFromInstance } from '@relayerjs/drizzle';

type Model<TEntity, TEntities extends Record<string, unknown>> =
  EntityModelFromInstance<TEntity, TEntities>;

type Where<TEntity, TEntities extends Record<string, unknown>> =
  WhereType<Model<TEntity, TEntities>>;

type Select<TEntity, TEntities extends Record<string, unknown>> =
  SelectType<Model<TEntity, TEntities>>;

type OrderBy<TEntity, TEntities extends Record<string, unknown>> =
  OrderByType<Model<TEntity, TEntities>> | OrderByType<Model<TEntity, TEntities>>[];

export interface FindManyOptions<TEntity, TEntities extends Record<string, unknown>> {
  select?: Select<TEntity, TEntities>;
  where?: Where<TEntity, TEntities>;
  orderBy?: OrderBy<TEntity, TEntities>;
  limit?: number;
  offset?: number;
}

export interface FindFirstOptions<TEntity, TEntities extends Record<string, unknown>> {
  select?: Select<TEntity, TEntities>;
  where?: Where<TEntity, TEntities>;
  orderBy?: OrderBy<TEntity, TEntities>;
}

// Typed client for a single entity — what this.repo exposes
interface EntityRepo<TEntity, TEntities extends Record<string, unknown>> {
  findMany<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FindManyOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect>[]>;
  findFirst<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FindFirstOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect> | null>;
  count(options?: { where?: Where<TEntity, TEntities> }): Promise<number>;
  create(options: { data: Record<string, unknown> }): Promise<Model<TEntity, TEntities>>;
  createMany(options: { data: Record<string, unknown>[] }): Promise<Model<TEntity, TEntities>[]>;
  update(options: { where: Where<TEntity, TEntities>; data: Record<string, unknown> }): Promise<Model<TEntity, TEntities>>;
  updateMany(options: { where: Where<TEntity, TEntities>; data: Record<string, unknown> }): Promise<{ count: number }>;
  delete(options: { where: Where<TEntity, TEntities> }): Promise<Model<TEntity, TEntities>>;
  deleteMany(options: { where: Where<TEntity, TEntities> }): Promise<{ count: number }>;
  aggregate(options: Record<string, unknown>): Promise<unknown>;
}

// Full client — all entities accessible via this.r
export type RelayerInstance<TEntities extends Record<string, unknown>> = {
  [K in keyof TEntities & string]: TEntities[K] extends new (...args: unknown[]) => infer I
    ? EntityRepo<I, TEntities>
    : never;
};

export class RelayerService<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
> {
  protected readonly repo!: EntityRepo<TEntity, TEntities>;
  protected readonly r!: RelayerInstance<TEntities>;

  constructor(r: RelayerInstance<TEntities>, entity: { __entityKey: string } | string) {
    this.r = r;
    const key = typeof entity === 'string' ? entity : entity.__entityKey;
    this.repo = (r as Record<string, unknown>)[key] as EntityRepo<TEntity, TEntities>;
  }

  findMany<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FindManyOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect>[]> {
    return this.repo.findMany(options as any) as any;
  }

  findFirst<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FindFirstOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect> | null> {
    return this.repo.findFirst(options as any) as any;
  }

  count(options?: { where?: Where<TEntity, TEntities> }): Promise<number> {
    return this.repo.count(options as any);
  }

  create(options: { data: Record<string, unknown> }): Promise<Model<TEntity, TEntities>> {
    return this.repo.create(options as any) as any;
  }

  createMany(options: { data: Record<string, unknown>[] }): Promise<Model<TEntity, TEntities>[]> {
    return this.repo.createMany(options as any) as any;
  }

  update(options: {
    where: Where<TEntity, TEntities>;
    data: Record<string, unknown>;
  }): Promise<Model<TEntity, TEntities>> {
    return this.repo.update(options as any) as any;
  }

  updateMany(options: {
    where: Where<TEntity, TEntities>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }> {
    return this.repo.updateMany(options as any);
  }

  delete(options: { where: Where<TEntity, TEntities> }): Promise<Model<TEntity, TEntities>> {
    return this.repo.delete(options as any) as any;
  }

  deleteMany(options: { where: Where<TEntity, TEntities> }): Promise<{ count: number }> {
    return this.repo.deleteMany(options as any);
  }

  aggregate(options: Record<string, unknown>): Promise<unknown> {
    return this.repo.aggregate(options as any) as any;
  }
}
