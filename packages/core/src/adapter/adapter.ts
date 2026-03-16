import type {
  CountOptions,
  CreateManyOptions,
  CreateOptions,
  DeleteManyOptions,
  DeleteOptions,
  FindFirstOptions,
  FindManyOptions,
  MutationResult,
  UpdateManyOptions,
  UpdateOptions,
} from '../types';

export interface RelayerAdapter {
  findMany(entity: string, options: FindManyOptions): Promise<unknown[]>;
  findFirst(entity: string, options: FindFirstOptions): Promise<unknown | null>;
  count(entity: string, options: CountOptions): Promise<number>;

  create(entity: string, options: CreateOptions): Promise<unknown>;
  createMany(entity: string, options: CreateManyOptions): Promise<unknown[]>;

  update(entity: string, options: UpdateOptions): Promise<unknown>;
  updateMany(entity: string, options: UpdateManyOptions): Promise<MutationResult>;

  delete(entity: string, options: DeleteOptions): Promise<unknown>;
  deleteMany(entity: string, options: DeleteManyOptions): Promise<MutationResult>;
}
