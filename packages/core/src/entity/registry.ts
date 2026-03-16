import type {
  ComputedFieldDef,
  DerivedFieldDef,
  RelationFieldDef,
  ScalarFieldDef,
} from '../fields';

export interface EntityMetadata {
  name: string;
  scalarFields: Map<string, ScalarFieldDef>;
  relationFields: Map<string, RelationFieldDef>;
  computedFields: Map<string, ComputedFieldDef>;
  derivedFields: Map<string, DerivedFieldDef>;
}

export class EntityRegistry {
  private entities = new Map<string, EntityMetadata>();

  register(metadata: EntityMetadata): void {
    this.entities.set(metadata.name, metadata);
  }

  get(name: string): EntityMetadata | undefined {
    return this.entities.get(name);
  }

  getOrThrow(name: string): EntityMetadata {
    const entity = this.entities.get(name);
    if (!entity) {
      throw new Error(`Entity "${name}" is not registered`);
    }
    return entity;
  }

  has(name: string): boolean {
    return this.entities.has(name);
  }

  all(): IterableIterator<EntityMetadata> {
    return this.entities.values();
  }

  names(): IterableIterator<string> {
    return this.entities.keys();
  }
}
