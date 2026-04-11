// Re-exported from @relayerjs/nestjs-common
export { RelayerModule, RelayerService, DtoMapper, RelayerHooks } from '@relayerjs/nestjs-common';

// CRUD-specific
export { RelayerController } from './relayer.controller';

export {
  CrudController,
  ListQuery,
  InjectEntity,
  getEntityToken,
  InjectQueryService,
  getServiceToken,
  InjectRelayer,
} from './decorators';

export { EnvelopeInterceptor, RelayerExceptionFilter } from './interceptors';

export {
  ParseIdPipe,
  parseListQuery,
  type ParsedListQuery,
  validateBody,
  validateWithZod,
  validateWithClassValidator,
  encodeCursor,
  decodeCursor,
  buildCursorWhere,
} from './pipes';

// Types — common re-exports + CRUD-specific (all via ./types barrel)
export type {
  RelayerInstance,
  EntityRepo,
  Model,
  Where,
  Select,
  OrderBy,
  ManyOptions,
  FirstOptions,
  AggregateOptions,
  AggregateHaving,
  RequestContext,
  RelationId,
  RelationOperation,
  RelationKeys,
  RelayerModuleOptions,
  RelayerModuleAsyncOptions,
  ValidationError,
} from './types';

export type {
  ListResponse,
  CursorListResponse,
  DetailResponse,
  CountResponse,
  OffsetMeta,
  CursorMeta,
} from './types';

export type {
  CrudControllerConfig,
  CrudRoutes,
  RelationRouteConfig,
  SelectConfig,
  WhereConfig,
  OperatorName,
  PaginationMode,
  ListRouteConfig,
  FindByIdRouteConfig,
  MutationRouteConfig,
  DecoratorEntry,
  DecoratorTargeted,
} from './types';

export type { CrudRouteName } from './constants';
