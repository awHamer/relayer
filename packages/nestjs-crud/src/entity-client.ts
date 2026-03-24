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
