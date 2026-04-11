import { ID } from '@nestjs/graphql';
import type { RelationId, RelationOperation } from '@relayerjs/nestjs-common';

import { handleRelation } from '../../handlers';
import type { AnyHandlerHost, HandlerCallContext } from '../../handlers';
import type { EntityMetadata } from '../../metadata';
import { RelationIdInput, RelationMutationResult } from '../../schema/builders';
import type { RelayerBuilders } from '../../schema/builders';
import type { RelationMutationConfig } from '../../types';
import type { RelationMutationNames } from '../resolve-operation-names';
import { defineMethod } from './method-utils';

export interface BuildRelationMethodsOptions {
  target: { prototype: object; name: string };
  entity: EntityMetadata;
  builders: RelayerBuilders;
  relations: Record<string, RelationMutationNames>;
  relationsConfig: Record<string, boolean | RelationMutationConfig>;
}

type OperationType = 'add' | 'remove' | 'set';

const OperationMap: Record<OperationType, RelationOperation> = {
  add: 'connect',
  remove: 'disconnect',
  set: 'set',
};

export function buildRelationMethods(opts: BuildRelationMethodsOptions): void {
  for (const [relationName, names] of Object.entries(opts.relations)) {
    const target = opts.entity.getRelatedEntityMetadata(relationName);
    if (!target) {
      throw new Error(
        `Relation "${relationName}" on entity "${opts.entity.name}" has no resolvable target entity. Register the target in RelayerGraphqlModule.forRoot().`,
      );
    }

    const relConfig = opts.relationsConfig[relationName];
    const include =
      typeof relConfig === 'object' && relConfig.include ? relConfig.include : undefined;

    // per-relation input is only needed for add/set (they carry extra pivot columns)
    const needsRichInput = Boolean(names.add) || Boolean(names.set);
    const richInputCls = needsRichInput
      ? opts.builders.relationInput.ensureClass(opts.entity, relationName, target, include)
      : null;

    for (const [op, schemaName] of Object.entries(names) as [OperationType, string][]) {
      if (!schemaName) continue;

      const relayerOp = OperationMap[op];
      // remove only needs _id to identify the link; extras are meaningless for disconnect
      const itemsType = op === 'remove' ? RelationIdInput : richInputCls!;

      defineMethod({
        target: opts.target,
        methodName: `__relayer_relation_${op}_${relationName}_${opts.entity.name}`,
        schemaName,
        isMutation: true,
        returnType: () => RelationMutationResult,
        args: [
          { name: 'id', type: () => ID, nullable: false },
          { name: 'items', type: () => [itemsType], nullable: false },
        ],
        handler: async function (
          this: AnyHandlerHost,
          id: string | number,
          items: RelationId[],
          info: unknown,
          gqlContext: unknown,
        ): Promise<{ success: boolean }> {
          const call: HandlerCallContext = {
            info: info as HandlerCallContext['info'],
            gqlContext: gqlContext as HandlerCallContext['gqlContext'],
            entity: opts.entity,
          };
          return handleRelation(this, relayerOp, id, items, relationName, call);
        },
      });
    }
  }
}
