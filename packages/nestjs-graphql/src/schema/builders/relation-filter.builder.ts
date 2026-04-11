import type { EntityMetadata } from '../../metadata';
import { upperFirst } from '../../utils';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyInputType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';

type WhereResolver = (target: EntityMetadata) => ClassRef;

interface RelationFilterRecord {
  cls: ClassRef;
  parent: EntityMetadata;
  relationName: string;
  target: EntityMetadata;
}

export class RelationFilterBuilder {
  private getNestedWhere?: WhereResolver;
  private records: RelationFilterRecord[] = [];

  constructor(private readonly registry: SchemaRegistry) {}

  setNestedWhereResolver(resolver: WhereResolver): void {
    this.getNestedWhere = resolver;
  }

  ensureClass(parent: EntityMetadata, relationName: string, target: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(parent);
    if (!entry.relationFilter) entry.relationFilter = new Map();
    const cached = entry.relationFilter.get(relationName);
    if (cached) return cached;
    const cls = createGqlClass(this.gqlName(parent, relationName));
    entry.relationFilter.set(relationName, cls);
    this.records.push({ cls, parent, relationName, target });
    return cls;
  }

  enrichAllMetadata(): void {
    if (!this.getNestedWhere) {
      throw new Error('RelationFilterBuilder.setNestedWhereResolver was not called');
    }
    const resolver = this.getNestedWhere;
    for (const record of this.records) {
      const nested = resolver(record.target);
      defineField(record.cls, 'some', () => nested, { nullable: true });
      defineField(record.cls, 'every', () => nested, { nullable: true });
      defineField(record.cls, 'none', () => nested, { nullable: true });
      defineField(record.cls, 'exists', () => Boolean, { nullable: true });
      applyInputType(record.cls, this.gqlName(record.parent, record.relationName));
    }
    this.records = [];
  }

  private gqlName(parent: EntityMetadata, relationName: string): string {
    const parentName = this.registry.getGqlName(parent.name);
    const relName = upperFirst(relationName);
    return `${parentName}${relName}RelationFilter`;
  }
}
