import type { EntityMetadata as CoreEntityMetadata } from '@relayerjs/core';
import { isRelayerEntityClass, type RelayerEntityClass } from '@relayerjs/core';
import { readRelations, readSchema } from '@relayerjs/drizzle';

import { EntityClassRegistry } from './entity-class-registry';
import { mapScalarFieldToGqlScalar, mapValueTypeToGqlScalar } from './scalar-mapping';
import type {
  ResolvedComputedField,
  ResolvedDerivedField,
  ResolvedRelationField,
  ResolvedScalarField,
} from './types';

interface EntityClassWithSchema extends RelayerEntityClass {
  __schema: Record<string, unknown>;
  __entityKey: string;
}

function hasSchema(value: unknown): value is EntityClassWithSchema {
  return isRelayerEntityClass(value) && '__schema' in value && '__entityKey' in value;
}

export class EntityMetadata {
  private constructor(
    public readonly name: string,
    public readonly entityClass: EntityClassWithSchema,
    public readonly core: CoreEntityMetadata,
  ) {}

  static fromEntityClass(entityClass: unknown): EntityMetadata {
    if (!hasSchema(entityClass)) {
      throw new Error(
        'GqlResolver entity must be a RelayerEntityClass produced by createRelayerEntity',
      );
    }
    EntityClassRegistry.getInstance().register(entityClass.__entityKey, entityClass);
    const tables = readSchema(entityClass.__schema);
    const relations = readRelations(entityClass.__schema);
    const tableInfo = tables.get(entityClass.__entityKey);
    if (!tableInfo) {
      throw new Error(`Entity "${entityClass.__entityKey}" not found in drizzle schema`);
    }
    const core: CoreEntityMetadata = {
      name: entityClass.__entityKey,
      scalarFields: tableInfo.scalarFields,
      relationFields: relations.get(entityClass.__entityKey) ?? new Map(),
      computedFields: new Map(entityClass.__computed),
      derivedFields: new Map(entityClass.__derived),
    };
    return new EntityMetadata(entityClass.__entityKey, entityClass, core);
  }

  getScalarFields(): ResolvedScalarField[] {
    const out: ResolvedScalarField[] = [];
    for (const field of this.core.scalarFields.values()) {
      out.push({
        name: field.name,
        scalar: mapScalarFieldToGqlScalar(field),
        nullable: field.nullable,
        isPrimaryKey: field.primaryKey ?? false,
        hasDefault: field.hasDefault ?? false,
        raw: field,
      });
    }
    return out;
  }

  getRelationFields(): ResolvedRelationField[] {
    const out: ResolvedRelationField[] = [];
    for (const field of this.core.relationFields.values()) {
      out.push({
        name: field.name,
        cardinality: field.relationType,
        targetEntity: field.targetEntity,
        raw: field,
      });
    }
    return out;
  }

  getComputedFields(): ResolvedComputedField[] {
    const out: ResolvedComputedField[] = [];
    for (const [name, def] of this.core.computedFields) {
      out.push({
        name,
        scalar: mapValueTypeToGqlScalar(def.valueType),
        nullable: true,
        raw: def,
      });
    }
    return out;
  }

  getDerivedFields(): ResolvedDerivedField[] {
    const out: ResolvedDerivedField[] = [];
    for (const [name, def] of this.core.derivedFields) {
      out.push({
        name,
        scalar: mapValueTypeToGqlScalar(def.valueType),
        nullable: true,
        raw: def,
      });
    }
    return out;
  }

  getPrimaryKeyField(): ResolvedScalarField | null {
    return this.getScalarFields().find((f) => f.isPrimaryKey) ?? null;
  }

  hasField(name: string): boolean {
    return (
      this.core.scalarFields.has(name) ||
      this.core.relationFields.has(name) ||
      this.core.computedFields.has(name) ||
      this.core.derivedFields.has(name)
    );
  }

  getRelation(name: string): ResolvedRelationField | null {
    const def = this.core.relationFields.get(name);
    if (!def) return null;
    return {
      name: def.name,
      cardinality: def.relationType,
      targetEntity: def.targetEntity,
      raw: def,
    };
  }

  getRelatedEntityMetadata(relationName: string): EntityMetadata | null {
    const rel = this.core.relationFields.get(relationName);
    if (!rel) return null;

    const registered = EntityClassRegistry.getInstance().get(rel.targetEntity);
    if (registered) return EntityMetadata.fromEntityClass(registered);

    const tables = readSchema(this.entityClass.__schema);
    const relations = readRelations(this.entityClass.__schema);
    const tableInfo = tables.get(rel.targetEntity);
    if (!tableInfo) return null;
    const core: CoreEntityMetadata = {
      name: rel.targetEntity,
      scalarFields: tableInfo.scalarFields,
      relationFields: relations.get(rel.targetEntity) ?? new Map(),
      computedFields: new Map(),
      derivedFields: new Map(),
    };
    return new EntityMetadata(rel.targetEntity, this.entityClass, core);
  }
}
