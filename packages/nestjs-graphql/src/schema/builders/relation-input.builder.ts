import { ID } from '@nestjs/graphql';

import type { EntityMetadata } from '../../metadata';
import { upperFirst } from '../../utils';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyInputType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { getScalarReturnType } from './scalar-type';

export class RelationInputBuilder {
  constructor(private readonly registry: SchemaRegistry) {}

  ensureClass(
    parent: EntityMetadata,
    relationName: string,
    target: EntityMetadata,
    includeColumns: readonly string[] = [],
  ): ClassRef {
    const entry = this.registry.getEntry(parent);
    if (!entry.relationInput) entry.relationInput = new Map();
    const existing = entry.relationInput.get(relationName);
    if (existing) return existing;

    const gqlName = this.gqlName(parent, relationName);
    const cls = createGqlClass(gqlName);

    defineField(cls, '_id', () => ID, { nullable: false });

    if (includeColumns.length > 0) {
      const scalars = new Map(target.getScalarFields().map((f) => [f.name, f]));
      for (const col of includeColumns) {
        const field = scalars.get(col);
        if (!field) {
          throw new Error(
            `Relation include column "${col}" not found on target entity "${target.name}" for relation "${relationName}" on "${parent.name}"`,
          );
        }
        // required if column is NOT NULL without a default, optional otherwise
        const nullable = field.nullable || field.hasDefault;
        defineField(cls, field.name, getScalarReturnType(field.scalar), { nullable });
      }
    }

    applyInputType(cls, gqlName);
    entry.relationInput.set(relationName, cls);
    return cls;
  }

  private gqlName(parent: EntityMetadata, relationName: string): string {
    const parentName = this.registry.getGqlName(parent.name);
    return `${parentName}${upperFirst(relationName)}RelationInput`;
  }
}
