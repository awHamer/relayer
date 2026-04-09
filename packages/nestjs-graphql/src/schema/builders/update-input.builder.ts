import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyInputType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { getScalarReturnType } from './scalar-type';

export class UpdateInputBuilder {
  constructor(private readonly registry: SchemaRegistry) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.updateInput) return entry.updateInput;
    entry.updateInput = createGqlClass(this.gqlName(entity));
    return entry.updateInput;
  }

  enrichMetadata(entity: EntityMetadata): void {
    const cls = this.ensureClass(entity);
    for (const field of entity.getScalarFields()) {
      if (field.isPrimaryKey) continue;
      defineField(cls, field.name, getScalarReturnType(field.scalar), { nullable: true });
    }
    applyInputType(cls, this.gqlName(entity));
  }

  private gqlName(entity: EntityMetadata): string {
    return `Update${this.registry.getGqlName(entity.name)}Input`;
  }
}
