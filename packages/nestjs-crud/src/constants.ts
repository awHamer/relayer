export {
  RELAYER_CLIENT,
  RELAYER_MODULE_OPTIONS,
  RELAYER_ENTITY_PREFIX,
  RELAYER_SERVICE_PREFIX,
  RELAYER_BASE_URL,
} from '@relayerjs/nestjs-common';

export const CRUD_CONTROLLER_METADATA = Symbol('CRUD_CONTROLLER_METADATA');

export type CrudRouteName =
  | 'list'
  | 'findById'
  | 'create'
  | 'update'
  | 'delete'
  | 'count'
  | 'aggregate'
  | 'relationConnect'
  | 'relationDisconnect'
  | 'relationSet';

export const CRUD_ROUTE_NAMES: CrudRouteName[] = [
  'list',
  'findById',
  'create',
  'update',
  'delete',
  'count',
  'aggregate',
];
