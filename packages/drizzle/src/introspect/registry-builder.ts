import type { EntitiesConfig, EntityMetadata } from '@relayerjs/core';
import { EntityRegistry, isRelayerEntityClass } from '@relayerjs/core';

import { readRelations } from './relation-reader';
import type { TableInfo } from './schema-reader';
import { readSchema } from './schema-reader';

export function buildRegistry(
  schema: Record<string, unknown>,
  entities?: EntitiesConfig | Record<string, unknown>,
): { registry: EntityRegistry; tables: Map<string, TableInfo> } {
  const tables = readSchema(schema);
  const relations = readRelations(schema);
  const registry = new EntityRegistry();

  for (const [tsName, tableInfo] of tables) {
    const entityConfig = entities?.[tsName];
    const metadata: EntityMetadata = {
      name: tsName,
      scalarFields: tableInfo.scalarFields,
      relationFields: relations.get(tsName) ?? new Map(),
      computedFields: new Map(),
      derivedFields: new Map(),
    };

    if (isRelayerEntityClass(entityConfig)) {
      for (const [fieldName, fieldDef] of entityConfig.__computed) {
        metadata.computedFields.set(fieldName, fieldDef);
      }
      for (const [fieldName, fieldDef] of entityConfig.__derived) {
        metadata.derivedFields.set(fieldName, fieldDef);
      }
    }

    registry.register(metadata);
  }

  return { registry, tables };
}
