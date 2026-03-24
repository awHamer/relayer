export const RELAYER_CLIENT = Symbol('RELAYER_CLIENT');
export const RELAYER_MODULE_OPTIONS = Symbol('RELAYER_MODULE_OPTIONS');
export const RELAYER_ENTITY_PREFIX = 'RELAYER_ENTITY_';
export const RELAYER_SERVICE_PREFIX = 'RELAYER_SERVICE_';
export const RELAYER_BASE_URL = Symbol('RELAYER_BASE_URL');

export const CRUD_CONTROLLER_METADATA = Symbol('CRUD_CONTROLLER_METADATA');
export const CRUD_OVERRIDE_METADATA = Symbol('CRUD_OVERRIDE_METADATA');

export type CrudRouteName =
  | 'list'
  | 'findById'
  | 'create'
  | 'update'
  | 'delete'
  | 'count'
  | 'aggregate';

export const CRUD_ROUTE_NAMES: CrudRouteName[] = [
  'list',
  'findById',
  'create',
  'update',
  'delete',
  'count',
  'aggregate',
];
