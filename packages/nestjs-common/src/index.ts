export { RelayerModule } from './relayer.module';
export { RelayerService } from './relayer.service';
export type {
  RelayerInstance,
  EntityRepo,
  Model,
  Where,
  Select,
  OrderBy,
  ManyOptions,
  FirstOptions,
} from './relayer.service';
export { DtoMapper } from './relayer.dto-mapper';
export { RelayerHooks } from './relayer.hooks';

export {
  InjectEntity,
  getEntityToken,
  InjectQueryService,
  getServiceToken,
  InjectRelayer,
} from './decorators';

export {
  ParseIdPipe,
  validateBody,
  validateWithZod,
  validateWithClassValidator,
  encodeCursor,
  decodeCursor,
  buildCursorWhere,
} from './pipes';

export {
  RELAYER_CLIENT,
  RELAYER_MODULE_OPTIONS,
  RELAYER_ENTITY_PREFIX,
  RELAYER_SERVICE_PREFIX,
  RELAYER_BASE_URL,
} from './constants';

export { getEntityKey, entitiesToRecord, isEntityWithKey } from './utils';
export type { RelayerEntityWithKey } from './utils';

export type {
  RequestContext,
  ValidationError,
  AggregateOptions,
  AggregateHaving,
  WhereOptions,
  PartialDataOptions,
  UpdateOptions,
  RelationOperation,
  RelationId,
  RelationKeys,
  ZodLike,
  RelayerModuleOptions,
  RelayerModuleAsyncOptions,
} from './types';
