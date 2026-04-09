import { Resolver } from '@nestjs/graphql';

import { RELAYER_GQL_RESOLVER_METADATA } from '../constants';
import { EntityMetadata } from '../metadata/entity-metadata';
import { getBuilders } from '../schema/builders';
import type { GqlResolverConfig, ResolvedResolverMetadata } from '../types';
import {
  buildAggregateMethod,
  buildCountMethod,
  buildCreateOneMethod,
  buildDeleteOneMethod,
  buildFindByIdMethod,
  buildListConnectionMethod,
  buildListMethod,
  buildUpdateOneMethod,
} from './method-builders';
import type { BuildListConnectionMethodOptions } from './method-builders/build-list-connection-method';
import { resolveOperationNames } from './resolve-operation-names';

export function GqlResolver<TEntity, EM extends Record<string, unknown>>(
  entityClass: new (...args: never[]) => TEntity,
  config: GqlResolverConfig<TEntity, EM> = {},
): ClassDecorator {
  return (target) => {
    const metadata: ResolvedResolverMetadata = {
      entityClass,
      config: config as GqlResolverConfig,
    };
    Reflect.defineMetadata(RELAYER_GQL_RESOLVER_METADATA, metadata, target);

    const entity = EntityMetadata.fromEntityClass(entityClass);
    const builders = getBuilders();

    const gqlName = config.name ?? builders.registry.toGqlName(entity.name);
    builders.registry.setGqlName(entity.name, gqlName);
    builders.registry.enqueueBuild(entity, config.fields);
    builders.ensureAllClasses(entity);

    const { queries, mutations } = resolveOperationNames(gqlName, config);
    const targetCls = target as unknown as BuildListConnectionMethodOptions['target'];

    if (queries.list) {
      buildListMethod({ target: targetCls, entity, builders, schemaName: queries.list });
    }
    if (queries.listConnection) {
      buildListConnectionMethod({
        target: targetCls,
        entity,
        builders,
        schemaName: queries.listConnection,
      });
    }
    if (queries.findById) {
      buildFindByIdMethod({ target: targetCls, entity, builders, schemaName: queries.findById });
    }
    if (queries.count) {
      buildCountMethod({ target: targetCls, entity, builders, schemaName: queries.count });
    }
    if (queries.aggregate) {
      buildAggregateMethod({ target: targetCls, entity, builders, schemaName: queries.aggregate });
    }
    if (mutations.createOne) {
      buildCreateOneMethod({
        target: targetCls,
        entity,
        builders,
        schemaName: mutations.createOne,
      });
    }
    if (mutations.updateOne) {
      buildUpdateOneMethod({
        target: targetCls,
        entity,
        builders,
        schemaName: mutations.updateOne,
      });
    }
    if (mutations.deleteOne) {
      buildDeleteOneMethod({
        target: targetCls,
        entity,
        builders,
        schemaName: mutations.deleteOne,
      });
    }

    Resolver()(target as never);
    builders.drainAndEnrich();
  };
}
