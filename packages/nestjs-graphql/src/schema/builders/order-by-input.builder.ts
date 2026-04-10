import type { EntityMetadata } from '../../metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { SortOrder } from '../scalars';
import { applyInputType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';

export class OrderByInputBuilder {
  private enriched = new Set<string>();

  constructor(private readonly registry: SchemaRegistry) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.orderByInput) return entry.orderByInput;
    const gqlName = `${this.registry.getGqlName(entity.name)}OrderByInput`;
    entry.orderByInput = createGqlClass(gqlName);
    return entry.orderByInput;
  }

  enrichMetadata(entity: EntityMetadata, orderable?: readonly string[]): void {
    if (this.enriched.has(entity.name)) return;
    this.enriched.add(entity.name);

    const cls = this.ensureClass(entity);
    const gqlName = `${this.registry.getGqlName(entity.name)}OrderByInput`;
    const allowed = orderable ? new Set(orderable) : null;

    for (const field of entity.getScalarFields()) {
      if (allowed && !allowed.has(field.name)) continue;
      defineField(cls, field.name, () => SortOrder, { nullable: true });
    }
    for (const field of entity.getComputedFields()) {
      if (allowed && !allowed.has(field.name)) continue;
      defineField(cls, field.name, () => SortOrder, { nullable: true });
    }
    for (const field of entity.getDerivedFields()) {
      if (allowed && !allowed.has(field.name)) continue;
      defineField(cls, field.name, () => SortOrder, { nullable: true });
    }

    for (const rel of entity.getRelationFields()) {
      if (rel.cardinality !== 'one') continue;
      if (allowed && !allowed.has(rel.name)) continue;
      const target = entity.getRelatedEntityMetadata(rel.name);
      if (!target) continue;
      const nested = this.ensureClass(target);
      defineField(cls, rel.name, () => nested, { nullable: true });
    }

    applyInputType(cls, gqlName);
  }
}
