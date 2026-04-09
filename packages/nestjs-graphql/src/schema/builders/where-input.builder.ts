import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyInputType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { getFilterClassForScalar } from './filter-mapping';
import { RelationFilterBuilder } from './relation-filter.builder';

export class WhereInputBuilder {
  private enriched = new Set<string>();

  constructor(
    private readonly registry: SchemaRegistry,
    private readonly relationFilterBuilder: RelationFilterBuilder,
  ) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.whereInput) return entry.whereInput;
    const gqlName = `${this.registry.getGqlName(entity.name)}WhereInput`;
    entry.whereInput = createGqlClass(gqlName);
    return entry.whereInput;
  }

  enrichMetadata(entity: EntityMetadata): void {
    if (this.enriched.has(entity.name)) return;
    this.enriched.add(entity.name);

    const cls = this.ensureClass(entity);
    const gqlName = `${this.registry.getGqlName(entity.name)}WhereInput`;

    for (const field of entity.getScalarFields()) {
      defineField(cls, field.name, () => getFilterClassForScalar(field.scalar), { nullable: true });
    }
    for (const field of entity.getComputedFields()) {
      defineField(cls, field.name, () => getFilterClassForScalar(field.scalar), { nullable: true });
    }
    for (const field of entity.getDerivedFields()) {
      defineField(cls, field.name, () => getFilterClassForScalar(field.scalar), { nullable: true });
    }

    for (const rel of entity.getRelationFields()) {
      const target = entity.getRelatedEntityMetadata(rel.name);
      if (!target) continue;
      if (rel.cardinality === 'one') {
        const nestedWhere = this.ensureClass(target);
        defineField(cls, rel.name, () => nestedWhere, { nullable: true });
      } else {
        const filterCls = this.relationFilterBuilder.ensureClass(entity, rel.name, target);
        defineField(cls, rel.name, () => filterCls, { nullable: true });
      }
    }

    defineField(cls, 'AND', () => [cls], { nullable: true });
    defineField(cls, 'OR', () => [cls], { nullable: true });
    defineField(cls, 'NOT', () => cls, { nullable: true });

    applyInputType(cls, gqlName);
  }
}
