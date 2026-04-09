import { Int } from '@nestjs/graphql';

import type { EntityMetadata } from '../../metadata/entity-metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyObjectType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { ObjectTypeBuilder } from './object-type.builder';

export class ListResultBuilder {
  constructor(
    private readonly registry: SchemaRegistry,
    private readonly objectTypeBuilder: ObjectTypeBuilder,
  ) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.listResult) return entry.listResult;
    entry.listResult = createGqlClass(this.gqlName(entity));
    return entry.listResult;
  }

  enrichMetadata(entity: EntityMetadata): void {
    const cls = this.ensureClass(entity);
    const objectType = this.objectTypeBuilder.ensureClass(entity);
    defineField(cls, 'items', () => [objectType], { nullable: false });
    defineField(cls, 'totalCount', () => Int, { nullable: false });
    defineField(cls, 'hasMore', () => Boolean, { nullable: false });
    applyObjectType(cls, this.gqlName(entity));
  }

  private gqlName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}ListResult`;
  }
}
