import { GraphQLJSON } from 'graphql-scalars';

import type { EntityMetadata } from '../../metadata';
import type { ClassRef } from '../class-ref';
import { SchemaRegistry } from '../registry';
import { applyInputType, applyObjectType, createGqlClass } from './create-gql-class';
import { defineField } from './define-field';

export interface AggregateClasses {
  result: ClassRef;
  sumInput: ClassRef;
  avgInput: ClassRef;
  minInput: ClassRef;
  maxInput: ClassRef;
}

export class AggregateBuilder {
  private readonly enriched = new Set<string>();

  constructor(private readonly registry: SchemaRegistry) {}

  ensureClasses(entity: EntityMetadata): AggregateClasses {
    const entry = this.registry.getEntry(entity);
    if (!entry.aggregate) entry.aggregate = createGqlClass(this.resultName(entity));
    if (!entry.aggregateNumericFieldsInput) {
      entry.aggregateNumericFieldsInput = createGqlClass(this.numericInputName(entity));
    }
    if (!entry.aggregateAllFieldsInput) {
      entry.aggregateAllFieldsInput = createGqlClass(this.allInputName(entity));
    }
    return {
      result: entry.aggregate,
      sumInput: entry.aggregateNumericFieldsInput,
      avgInput: entry.aggregateNumericFieldsInput,
      minInput: entry.aggregateAllFieldsInput,
      maxInput: entry.aggregateAllFieldsInput,
    };
  }

  enrichMetadata(entity: EntityMetadata): void {
    if (this.enriched.has(entity.name)) return;
    this.enriched.add(entity.name);
    const { result, sumInput, minInput } = this.ensureClasses(entity);

    defineField(result, 'data', () => GraphQLJSON, { nullable: false });
    applyObjectType(result, this.resultName(entity));

    for (const name of this.collectNumericFieldNames(entity)) {
      defineField(sumInput, name, () => Boolean, { nullable: true });
    }
    applyInputType(sumInput, this.numericInputName(entity));

    for (const name of this.collectAllFieldNames(entity)) {
      defineField(minInput, name, () => Boolean, { nullable: true });
    }
    applyInputType(minInput, this.allInputName(entity));
  }

  private collectNumericFieldNames(entity: EntityMetadata): string[] {
    const out: string[] = [];
    for (const field of entity.getScalarFields()) {
      if (field.scalar === 'Int' || field.scalar === 'Float' || field.scalar === 'ID') {
        out.push(field.name);
      }
    }
    return out;
  }

  private collectAllFieldNames(entity: EntityMetadata): string[] {
    return entity.getScalarFields().map((f) => f.name);
  }

  private resultName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}Aggregate`;
  }

  private numericInputName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}AggregateNumericFieldsInput`;
  }

  private allInputName(entity: EntityMetadata): string {
    return `${this.registry.getGqlName(entity.name)}AggregateAllFieldsInput`;
  }
}
