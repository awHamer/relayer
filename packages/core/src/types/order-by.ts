import type { DotPaths } from './dot-paths';

export interface OrderByType<T> {
  field: DotPaths<T>;
  order: 'asc' | 'desc';
}
