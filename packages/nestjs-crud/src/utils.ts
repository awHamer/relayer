import type { RelayerEntityClass } from '@relayerjs/core';

export interface RelayerEntityWithKey extends RelayerEntityClass {
  readonly __entityKey: string;
  readonly __schema: Record<string, unknown>;
  readonly __table: unknown;
}

export function isEntityWithKey(entity: RelayerEntityClass): entity is RelayerEntityWithKey {
  return (
    '__entityKey' in entity && typeof (entity as RelayerEntityWithKey).__entityKey === 'string'
  );
}

export function getEntityKey(entity: RelayerEntityClass): string {
  if (!isEntityWithKey(entity)) {
    throw new Error(
      'Entity class must have __entityKey. Use createRelayerEntity() from @relayerjs/drizzle.',
    );
  }
  return entity.__entityKey;
}

export function entitiesToRecord(
  entities: RelayerEntityClass[] | Record<string, RelayerEntityClass>,
): Record<string, RelayerEntityClass> {
  if (!Array.isArray(entities)) {
    return entities;
  }
  const result: Record<string, RelayerEntityClass> = {};
  for (const entity of entities) {
    const key = getEntityKey(entity);
    result[key] = entity;
  }
  return result;
}
