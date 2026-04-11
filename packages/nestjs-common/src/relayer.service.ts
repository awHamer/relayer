import { mergeWhere } from '@relayerjs/core';
import type { AggregateResult, SelectResult } from '@relayerjs/core';

import type {
  AggregateOptions,
  EntityRepo,
  FirstOptions,
  ManyOptions,
  Model,
  OrderBy,
  PartialDataOptions,
  RelayerInstance,
  Select,
  UpdateOptions,
  Where,
  WhereOptions,
} from './types';

export type { EntityRepo, RelayerInstance } from './types';
export type { Model, Where, Select, OrderBy, ManyOptions, FirstOptions } from './types';

export class RelayerService<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
  TContext = unknown,
> {
  protected readonly repo!: EntityRepo<TEntity, TEntities>;
  protected readonly r!: RelayerInstance<TEntities>;

  constructor(r: RelayerInstance<TEntities>, entity: { __entityKey: string } | string) {
    this.r = r;
    this.repo = r[typeof entity === 'string' ? entity : entity.__entityKey] as EntityRepo<
      TEntity,
      TEntities
    >;
  }

  protected getDefaultWhere(
    upstream?: Where<TEntity, TEntities>,
    _context?: TContext,
  ): Where<TEntity, TEntities> | undefined {
    return upstream;
  }

  protected getDefaultOrderBy(
    upstream?: OrderBy<TEntity, TEntities> | OrderBy<TEntity, TEntities>[],
  ): OrderBy<TEntity, TEntities> | OrderBy<TEntity, TEntities>[] | undefined {
    return upstream;
  }

  protected getDefaultSelect(
    upstream?: Select<TEntity, TEntities>,
  ): Select<TEntity, TEntities> | undefined {
    return upstream;
  }

  private combineWhere(
    defaultWhere?: Where<TEntity, TEntities>,
    where?: Where<TEntity, TEntities>,
  ): Where<TEntity, TEntities> | undefined {
    return mergeWhere(defaultWhere, where) as Where<TEntity, TEntities> | undefined;
  }

  findMany<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: ManyOptions<TEntity, TEntities> & { select?: TSelect; context?: TContext },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect>[]> {
    const where = this.combineWhere(
      this.getDefaultWhere(undefined, options?.context),
      options?.where,
    );
    const orderBy = options?.orderBy ?? this.getDefaultOrderBy();
    const select = options?.select ?? this.getDefaultSelect();
    return this.repo.findMany({ ...options, where, orderBy, select }) as Promise<
      SelectResult<Model<TEntity, TEntities>, TSelect>[]
    >;
  }

  findFirst<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FirstOptions<TEntity, TEntities> & { select?: TSelect; context?: TContext },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect> | null> {
    const where = this.combineWhere(
      this.getDefaultWhere(undefined, options?.context),
      options?.where,
    );
    const orderBy = options?.orderBy ?? this.getDefaultOrderBy();
    const select = options?.select ?? this.getDefaultSelect();
    return this.repo.findFirst({ ...options, where, orderBy, select }) as Promise<SelectResult<
      Model<TEntity, TEntities>,
      TSelect
    > | null>;
  }

  count(options?: WhereOptions<TEntity, TEntities> & { context?: TContext }): Promise<number> {
    const { where: optionsWhere, context, ...otherOptions } = options ?? {};
    const where = this.combineWhere(this.getDefaultWhere(undefined, context), optionsWhere);
    return this.repo.count({ where, context, ...otherOptions });
  }

  create(
    options: PartialDataOptions<TEntity> & { context?: TContext },
  ): Promise<Model<TEntity, TEntities>> {
    return this.repo.create(options);
  }

  createMany(options: {
    data: Partial<TEntity>[];
    context?: TContext;
  }): Promise<Model<TEntity, TEntities>[]> {
    return this.repo.createMany(options);
  }

  update(
    options: UpdateOptions<TEntity, TEntities> & { context?: TContext },
  ): Promise<Model<TEntity, TEntities>> {
    const where =
      this.combineWhere(this.getDefaultWhere(undefined, options.context), options.where) ??
      options.where;
    return this.repo.update({ ...options, where });
  }

  updateMany(
    options: UpdateOptions<TEntity, TEntities> & { context?: TContext },
  ): Promise<{ count: number }> {
    const where =
      this.combineWhere(this.getDefaultWhere(undefined, options.context), options.where) ??
      options.where;
    return this.repo.updateMany({ ...options, where });
  }

  delete(options: {
    where: Where<TEntity, TEntities>;
    context?: TContext;
  }): Promise<Model<TEntity, TEntities>> {
    const where =
      this.combineWhere(this.getDefaultWhere(undefined, options.context), options.where) ??
      options.where;
    return this.repo.delete({ ...options, where });
  }

  deleteMany(options: {
    where: Where<TEntity, TEntities>;
    context?: TContext;
  }): Promise<{ count: number }> {
    const where =
      this.combineWhere(this.getDefaultWhere(undefined, options.context), options.where) ??
      options.where;
    return this.repo.deleteMany({ ...options, where });
  }

  aggregate<const TOptions extends AggregateOptions<TEntity, TEntities> & { context?: TContext }>(
    options: TOptions,
  ): Promise<AggregateResult<Model<TEntity, TEntities>, TOptions>[]> {
    const where = this.combineWhere(
      this.getDefaultWhere(undefined, options.context),
      options.where,
    );
    return this.repo.aggregate({ ...options, ...(where ? { where } : {}) });
  }
}
