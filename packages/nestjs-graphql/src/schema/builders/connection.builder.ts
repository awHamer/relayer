import { Int } from '@nestjs/graphql';

import type { EntityMetadata } from '../../metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { PageInfo } from '../types';
import { applyObjectType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { ObjectTypeBuilder } from './object-type.builder';

export class ConnectionBuilder {
  constructor(
    private readonly registry: SchemaRegistry,
    private readonly objectTypeBuilder: ObjectTypeBuilder,
  ) {}

  ensureClasses(entity: EntityMetadata): { connection: ClassRef; edge: ClassRef } {
    const entry = this.registry.getEntry(entity);
    if (!entry.edge) entry.edge = createGqlClass(this.edgeName(entity));
    if (!entry.connection) entry.connection = createGqlClass(this.connectionName(entity));
    return { connection: entry.connection!, edge: entry.edge! };
  }

  enrichMetadata(entity: EntityMetadata): void {
    const { connection, edge } = this.ensureClasses(entity);
    const objectType = this.objectTypeBuilder.ensureClass(entity);

    defineField(edge, 'node', () => objectType, { nullable: false });
    defineField(edge, 'cursor', () => String, { nullable: false });
    applyObjectType(edge, this.edgeName(entity));

    defineField(connection, 'edges', () => [edge], { nullable: false });
    defineField(connection, 'pageInfo', () => PageInfo, { nullable: false });
    defineField(connection, 'totalCount', () => Int, { nullable: true });
    applyObjectType(connection, this.connectionName(entity));
  }

  private edgeName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}Edge`;
  }

  private connectionName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}Connection`;
  }
}
