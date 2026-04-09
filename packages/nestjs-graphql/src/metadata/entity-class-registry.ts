import type { RelayerEntityClass } from '@relayerjs/core';

export class EntityClassRegistry {
  private static instance: EntityClassRegistry | null = null;
  private entries = new Map<string, RelayerEntityClass>();

  static getInstance(): EntityClassRegistry {
    if (!this.instance) this.instance = new EntityClassRegistry();
    return this.instance;
  }

  register(entityKey: string, entityClass: RelayerEntityClass): void {
    this.entries.set(entityKey, entityClass);
  }

  get(entityKey: string): RelayerEntityClass | undefined {
    return this.entries.get(entityKey);
  }
}
