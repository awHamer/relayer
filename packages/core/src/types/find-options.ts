type TRecord = Record<string, unknown>;

export interface FindManyOptions<
  TSelect = TRecord,
  TWhere = TRecord,
  TOrderBy = TRecord,
  TContext = unknown,
> {
  select?: TSelect;
  where?: TWhere;
  orderBy?: TOrderBy | TOrderBy[];
  limit?: number;
  offset?: number;
  context?: TContext;
}

export interface FindFirstOptions<
  TSelect = TRecord,
  TWhere = TRecord,
  TOrderBy = TRecord,
  TContext = unknown,
> {
  select?: TSelect;
  where?: TWhere;
  orderBy?: TOrderBy | TOrderBy[];
  context?: TContext;
}

export interface CountOptions<TWhere = TRecord, TContext = unknown> {
  where?: TWhere;
  context?: TContext;
}

export interface CreateOptions<TData = TRecord, TContext = unknown> {
  data: TData;
  context?: TContext;
}

export interface CreateManyOptions<TData = TRecord, TContext = unknown> {
  data: TData[];
  context?: TContext;
}

export interface UpdateOptions<TWhere = TRecord, TData = TRecord, TContext = unknown> {
  where: TWhere;
  data: TData;
  context?: TContext;
}

export interface UpdateManyOptions<TWhere = TRecord, TData = TRecord, TContext = unknown> {
  where: TWhere;
  data: TData;
  context?: TContext;
}

export interface DeleteOptions<TWhere = TRecord, TContext = unknown> {
  where: TWhere;
  context?: TContext;
}

export interface DeleteManyOptions<TWhere = TRecord, TContext = unknown> {
  where: TWhere;
  context?: TContext;
}

export interface MutationResult {
  count: number;
}
