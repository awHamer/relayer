import type { AggregateResult, SelectResult } from '@relayerjs/core';

import type {
  EntityRepo,
  FirstOptions,
  ManyOptions,
  Model,
  OrderBy,
  RelayerInstance,
  Select,
  Where,
} from './types';
import type {
  AggregateOptions,
  PartialDataOptions,
  UpdateOptions,
  WhereOptions,
} from './types/entity-repo';

export type { EntityRepo, RelayerInstance } from './types/entity-repo';
export type { Model, Where, Select, OrderBy, ManyOptions, FirstOptions } from './types/entity-repo';

export class RelayerService<
  TEntity,
  TEntities extends Record<string, unknown> = Record<string, never>,
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
    if (!defaultWhere && !where) return undefined;
    if (!defaultWhere) return where;
    if (!where) return defaultWhere;
    return { AND: [defaultWhere, where] } as Where<TEntity, TEntities>;
  }

  findMany<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: ManyOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect>[]> {
    const where = this.combineWhere(this.getDefaultWhere(), options?.where);
    const orderBy = options?.orderBy ?? this.getDefaultOrderBy();
    const select = options?.select ?? this.getDefaultSelect();
    return this.repo.findMany({ ...options, where, orderBy, select }) as Promise<
      SelectResult<Model<TEntity, TEntities>, TSelect>[]
    >;
  }

  findFirst<TSelect extends Select<TEntity, TEntities> | undefined = undefined>(
    options?: FirstOptions<TEntity, TEntities> & { select?: TSelect },
  ): Promise<SelectResult<Model<TEntity, TEntities>, TSelect> | null> {
    const where = this.combineWhere(this.getDefaultWhere(), options?.where);
    const orderBy = options?.orderBy ?? this.getDefaultOrderBy();
    const select = options?.select ?? this.getDefaultSelect();
    return this.repo.findFirst({ ...options, where, orderBy, select }) as Promise<SelectResult<
      Model<TEntity, TEntities>,
      TSelect
    > | null>;
  }

  count(options?: WhereOptions<TEntity, TEntities>): Promise<number> {
    const { where: optionsWhere, ...otherOptions } = options ?? {};
    const where = this.combineWhere(this.getDefaultWhere(), optionsWhere);
    return this.repo.count({ where, ...otherOptions });
  }

  create(options: PartialDataOptions<TEntity>): Promise<Model<TEntity, TEntities>> {
    return this.repo.create(options);
  }

  createMany(options: { data: Partial<TEntity>[] }): Promise<Model<TEntity, TEntities>[]> {
    return this.repo.createMany(options);
  }

  update(options: UpdateOptions<TEntity, TEntities>): Promise<Model<TEntity, TEntities>> {
    const where = this.combineWhere(this.getDefaultWhere(), options.where) ?? options.where;
    return this.repo.update({ ...options, where });
  }

  updateMany(options: UpdateOptions<TEntity, TEntities>): Promise<{ count: number }> {
    const where = this.combineWhere(this.getDefaultWhere(), options.where) ?? options.where;
    return this.repo.updateMany({ ...options, where });
  }

  delete(options: { where: Where<TEntity, TEntities> }): Promise<Model<TEntity, TEntities>> {
    const where = this.combineWhere(this.getDefaultWhere(), options.where) ?? options.where;
    return this.repo.delete({ ...options, where });
  }

  deleteMany(options: { where: Where<TEntity, TEntities> }): Promise<{ count: number }> {
    const where = this.combineWhere(this.getDefaultWhere(), options.where) ?? options.where;
    return this.repo.deleteMany({ ...options, where });
  }

  aggregate<const TOptions extends AggregateOptions<TEntity, TEntities>>(
    options: TOptions,
  ): Promise<AggregateResult<Model<TEntity, TEntities>, TOptions>[]> {
    const where = this.combineWhere(this.getDefaultWhere(), options.where);
    return this.repo.aggregate({ ...options, ...(where ? { where } : {}) });
  }
}
