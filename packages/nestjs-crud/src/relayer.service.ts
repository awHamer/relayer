export interface EntityClient {
  findMany(options?: Record<string, unknown>): Promise<unknown[]>;
  findFirst(options?: Record<string, unknown>): Promise<unknown>;
  count(options?: Record<string, unknown>): Promise<number>;
  create(options: { data: Record<string, unknown> }): Promise<unknown>;
  createMany(options: { data: Record<string, unknown>[] }): Promise<unknown[]>;
  update(options: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<unknown>;
  updateMany(options: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  delete(options: { where: Record<string, unknown> }): Promise<unknown>;
  deleteMany(options: { where: Record<string, unknown> }): Promise<{ count: number }>;
  aggregate(options?: Record<string, unknown>): Promise<unknown>;
}

export class RelayerService<TEntity> {
  constructor(protected readonly entityClient: EntityClient) {}

  protected getDefaultWhere(
    upstream?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    return upstream;
  }

  protected getDefaultSelect(
    upstream?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    return upstream;
  }

  protected getDefaultOrderBy(upstream?: unknown): unknown {
    return upstream;
  }

  async findMany(options: Record<string, unknown> = {}): Promise<TEntity[]> {
    const merged = this.mergeDefaults(options);
    return this.entityClient.findMany(merged) as Promise<TEntity[]>;
  }

  async findFirst(options: Record<string, unknown> = {}): Promise<TEntity | null> {
    const merged = this.mergeDefaults(options);
    return this.entityClient.findFirst(merged) as Promise<TEntity | null>;
  }

  async count(options: Record<string, unknown> = {}): Promise<number> {
    const where = this.getDefaultWhere(options.where as Record<string, unknown> | undefined);
    return this.entityClient.count(where ? { ...options, where } : options);
  }

  async create(data: Record<string, unknown>): Promise<TEntity> {
    return this.entityClient.create({ data }) as Promise<TEntity>;
  }

  async createMany(data: Record<string, unknown>[]): Promise<TEntity[]> {
    return this.entityClient.createMany({ data }) as Promise<TEntity[]>;
  }

  async update(where: Record<string, unknown>, data: Record<string, unknown>): Promise<TEntity> {
    return this.entityClient.update({ where, data }) as Promise<TEntity>;
  }

  async updateMany(
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<{ count: number }> {
    return this.entityClient.updateMany({ where, data });
  }

  async delete(where: Record<string, unknown>): Promise<TEntity> {
    return this.entityClient.delete({ where }) as Promise<TEntity>;
  }

  async deleteMany(where: Record<string, unknown>): Promise<{ count: number }> {
    return this.entityClient.deleteMany({ where });
  }

  async aggregate(options: Record<string, unknown> = {}): Promise<unknown> {
    return this.entityClient.aggregate(options);
  }

  private mergeDefaults(options: Record<string, unknown>): Record<string, unknown> {
    const result = { ...options };

    const where = this.getDefaultWhere(options.where as Record<string, unknown> | undefined);
    if (where) result.where = where;

    const select = this.getDefaultSelect(options.select as Record<string, unknown> | undefined);
    if (select) result.select = select;

    const orderBy = this.getDefaultOrderBy(options.orderBy);
    if (orderBy) result.orderBy = orderBy;

    return result;
  }
}
