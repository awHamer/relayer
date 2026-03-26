export interface OffsetMeta {
  total: number;
  limit: number;
  offset: number;
  nextPageUrl?: string;
}

export interface CursorMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  nextPageUrl?: string;
}

export interface ListResponse<T> {
  data: T[];
  meta: OffsetMeta;
}

export interface CursorListResponse<T> {
  data: T[];
  meta: CursorMeta;
}

export interface DetailResponse<T> {
  data: T;
}

export interface CountResponse {
  data: { count: number };
}
