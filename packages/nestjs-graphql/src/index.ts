import 'reflect-metadata';

export { RelayerResolver } from './relayer.resolver';
export { RelayerGraphqlModule } from './relayer-graphql.module';
export type { RelayerGraphqlModuleOptions } from './relayer-graphql.module';
export { GqlResolver } from './decorators';
export { RELAYER_GQL_RESOLVER_METADATA } from './constants';

export * from './schema';

export type {
  FieldsConfig,
  GqlContext,
  GqlExecutionContextLike,
  GqlResolverConfig,
  ListQueryConfig,
  MutationOpConfig,
  MutationsConfig,
  PaginationMode,
  QueriesConfig,
  QueryOpConfig,
  ResolvedResolverMetadata,
} from './types';
