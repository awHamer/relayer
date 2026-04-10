import type { EntityMetadata } from '../../metadata';
import type { FieldsConfig } from '../../types';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyObjectType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';
import { getScalarReturnType } from './scalar-type';

export class ObjectTypeBuilder {
  constructor(private readonly registry: SchemaRegistry) {}

  ensureClass(entity: EntityMetadata): ClassRef {
    const entry = this.registry.getEntry(entity);
    if (entry.objectType) return entry.objectType;
    entry.objectType = createGqlClass(this.registry.getGqlName(entity.name));
    return entry.objectType;
  }

  enrichMetadata(entity: EntityMetadata, fieldsConfig?: FieldsConfig): void {
    const cls = this.ensureClass(entity);
    const gqlName = this.registry.getGqlName(entity.name);

    this.applyScalarFields(entity, cls, fieldsConfig);
    this.applyComputedDerivedFields(entity, cls, fieldsConfig);
    this.applyRelationFields(entity, cls, fieldsConfig);

    applyObjectType(cls, gqlName);
  }

  private isFieldAllowed(name: string, fieldsConfig?: FieldsConfig): boolean {
    if (!fieldsConfig) return true;
    if (fieldsConfig.include) return fieldsConfig.include.includes(name);
    if (fieldsConfig.exclude) return !fieldsConfig.exclude.includes(name);
    return true;
  }

  private applyScalarFields(
    entity: EntityMetadata,
    cls: ClassRef,
    fieldsConfig?: FieldsConfig,
  ): void {
    for (const field of entity.getScalarFields()) {
      if (!this.isFieldAllowed(field.name, fieldsConfig)) continue;
      defineField(cls, field.name, getScalarReturnType(field.scalar), {
        nullable: field.nullable,
      });
    }
  }

  private applyComputedDerivedFields(
    entity: EntityMetadata,
    cls: ClassRef,
    fieldsConfig?: FieldsConfig,
  ): void {
    for (const field of entity.getComputedFields()) {
      if (!this.isFieldAllowed(field.name, fieldsConfig)) continue;
      defineField(cls, field.name, getScalarReturnType(field.scalar), { nullable: true });
    }
    for (const field of entity.getDerivedFields()) {
      if (!this.isFieldAllowed(field.name, fieldsConfig)) continue;
      defineField(cls, field.name, getScalarReturnType(field.scalar), { nullable: true });
    }
  }

  private applyRelationFields(
    entity: EntityMetadata,
    cls: ClassRef,
    fieldsConfig?: FieldsConfig,
  ): void {
    for (const rel of entity.getRelationFields()) {
      if (!this.isFieldAllowed(rel.name, fieldsConfig)) continue;
      const target = entity.getRelatedEntityMetadata(rel.name);
      if (!target) continue;
      const targetCls = this.ensureClass(target);
      const returnType = rel.cardinality === 'many' ? () => [targetCls] : () => targetCls;
      defineField(cls, rel.name, returnType, { nullable: rel.cardinality === 'one' });
    }
  }
}
