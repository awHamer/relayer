type TRecord = Record<string, unknown>;

export interface FindManyOptions<TSelect = TRecord, TWhere = TRecord, TOrderBy = TRecord> {
  select?: TSelect;
  where?: TWhere;
  orderBy?: TOrderBy | TOrderBy[];
  limit?: number;
  offset?: number;
}

export interface FindFirstOptions<TSelect = TRecord, TWhere = TRecord, TOrderBy = TRecord> {
  select?: TSelect;
  where?: TWhere;
  orderBy?: TOrderBy | TOrderBy[];
}

export interface CountOptions<TWhere = TRecord> {
  where?: TWhere;
}

export interface CreateOptions<TData = TRecord> {
  data: TData;
}

export interface CreateManyOptions<TData = TRecord> {
  data: TData[];
}

export interface UpdateOptions<TWhere = TRecord, TData = TRecord> {
  where: TWhere;
  data: TData;
}

export interface UpdateManyOptions<TWhere = TRecord, TData = TRecord> {
  where: TWhere;
  data: TData;
}

export interface DeleteOptions<TWhere = TRecord> {
  where: TWhere;
}

export interface DeleteManyOptions<TWhere = TRecord> {
  where: TWhere;
}

export interface MutationResult {
  count: number;
}
