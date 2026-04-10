import type { EntityMetadata } from '../../metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyInputType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { getScalarReturnType } from './scalar-type';

export class CreateInputBuilder {
  constructor(private readonly registry: SchemaRegistry) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.createInput) return entry.createInput;
    entry.createInput = createGqlClass(this.gqlName(entity));
    return entry.createInput;
  }

  enrichMetadata(entity: EntityMetadata): void {
    const cls = this.ensureClass(entity);
    for (const field of entity.getScalarFields()) {
      if (field.isPrimaryKey) continue;
      // auto-generated columns like created_at are optional, even if the db column is "not null"
      const nullable = field.nullable || field.hasDefault;
      defineField(cls, field.name, getScalarReturnType(field.scalar), { nullable });
    }
    applyInputType(cls, this.gqlName(entity));
  }

  private gqlName(entity: EntityMetadata): string {
    return `Create${this.registry.getGqlName(entity.name)}Input`;
  }
}
