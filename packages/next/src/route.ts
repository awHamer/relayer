import {
  createAggregateHandler,
  createCountHandler,
  createCreateHandler,
  createFindByIdHandler,
  createListHandler,
  createRemoveHandler,
  createUpdateHandler,
  type TransactionalClient,
} from './handlers';
import type { RuntimeRouteConfig } from './handlers/handler-types';
import type {
  AggregateHooks,
  CountHooks,
  CreateHooks,
  FindByIdHooks,
  ListHandler,
  ListHooks,
  NextRouteHandler,
  RemoveHooks,
  RouteConfig,
  UpdateHooks,
} from './types';

export interface RelayerRoute<TClient = unknown, TEntity extends string = string> {
  list(hooks?: ListHooks<TClient, TEntity>): ListHandler<TClient, TEntity>;
  findById(hooks?: FindByIdHooks<TClient, TEntity>): NextRouteHandler;
  create(hooks?: CreateHooks<TClient, TEntity>): NextRouteHandler;
  update(hooks?: UpdateHooks<TClient, TEntity>): NextRouteHandler;
  remove(hooks?: RemoveHooks<TClient>): NextRouteHandler;
  count(hooks?: CountHooks<TClient>): NextRouteHandler;
  aggregate(hooks?: AggregateHooks<TClient>): NextRouteHandler;

  handlers(): { GET: ListHandler<TClient, TEntity>; POST: NextRouteHandler };
  detailHandlers(): { GET: NextRouteHandler; PATCH: NextRouteHandler; DELETE: NextRouteHandler };
  countHandlers(): { GET: NextRouteHandler };
  aggregateHandlers(): { GET: NextRouteHandler };
}

export function createRelayerRoute<
  TClient extends TransactionalClient,
  TEntity extends keyof TClient & string,
>(
  client: TClient,
  entityName: TEntity,
  config: RouteConfig<TClient, TEntity> = {} as RouteConfig<TClient, TEntity>,
): RelayerRoute<TClient, TEntity> {
  const entity = client[entityName];
  if (!entity || typeof entity !== 'object') {
    throw new Error(`Entity "${entityName}" not found on Relayer client`);
  }

  const e = entity as unknown as import('./handlers/handler-types').RuntimeEntityClient;
  const rc = config as unknown as RuntimeRouteConfig;

  return {
    list: (hooks?) =>
      createListHandler(e, rc, hooks as never) as unknown as ListHandler<TClient, TEntity>,
    findById: (hooks?) => createFindByIdHandler(e, rc, hooks as never) as NextRouteHandler,
    create: (hooks?) =>
      createCreateHandler(entityName, client, rc, hooks as never) as NextRouteHandler,
    update: (hooks?) =>
      createUpdateHandler(entityName, client, rc, hooks as never) as NextRouteHandler,
    remove: (hooks?) =>
      createRemoveHandler(entityName, client, rc, hooks as never) as NextRouteHandler,
    count: (hooks?) => createCountHandler(e, rc, hooks as never) as NextRouteHandler,
    aggregate: (hooks?) => createAggregateHandler(e, rc, hooks as never) as NextRouteHandler,

    handlers: () => ({
      GET: createListHandler(e, rc) as unknown as ListHandler<TClient, TEntity>,
      POST: createCreateHandler(entityName, client, rc) as NextRouteHandler,
    }),
    detailHandlers: () => ({
      GET: createFindByIdHandler(e, rc) as NextRouteHandler,
      PATCH: createUpdateHandler(entityName, client, rc) as NextRouteHandler,
      DELETE: createRemoveHandler(entityName, client, rc) as NextRouteHandler,
    }),
    countHandlers: () => ({ GET: createCountHandler(e, rc) as NextRouteHandler }),
    aggregateHandlers: () => ({ GET: createAggregateHandler(e, rc) as NextRouteHandler }),
  };
}
