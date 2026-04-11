import { Int } from '@nestjs/graphql';

import type { EntityMetadata } from '../../metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { PageInfo } from '../types';
import { applyObjectType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { ObjectTypeBuilder } from './object-type.builder';

export class CursorResultBuilder {
  private readonly enriched = new Set<string>();

  constructor(
    private readonly registry: SchemaRegistry,
    private readonly objectTypeBuilder: ObjectTypeBuilder,
  ) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.cursorResult) return entry.cursorResult;
    entry.cursorResult = createGqlClass(this.gqlName(entity));
    return entry.cursorResult;
  }

  enrichMetadata(entity: EntityMetadata): void {
    if (this.enriched.has(entity.name)) return;
    this.enriched.add(entity.name);
    const cls = this.ensureClass(entity);
    const objectType = this.objectTypeBuilder.ensureClass(entity);
    defineField(cls, 'items', () => [objectType], { nullable: false });
    defineField(cls, 'pageInfo', () => PageInfo, { nullable: false });
    defineField(cls, 'totalCount', () => Int, { nullable: true });
    applyObjectType(cls, this.gqlName(entity));
  }

  private gqlName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}CursorResult`;
  }
}
