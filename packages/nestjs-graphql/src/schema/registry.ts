import type { EntityMetadata } from '../metadata';
import type { FieldsConfig } from '../types';
import type { ClassRef } from './class-ref';

interface RegistryEntry {
  objectType?: ClassRef;
  whereInput?: ClassRef;
  orderByInput?: ClassRef;
  relationFilter?: Map<string, ClassRef>;
  createInput?: ClassRef;
  updateInput?: ClassRef;
  listResult?: ClassRef;
  connection?: ClassRef;
  edge?: ClassRef;
  aggregate?: ClassRef;
  aggregateNumericFieldsInput?: ClassRef;
  aggregateAllFieldsInput?: ClassRef;
}

export interface BuildJob {
  entity: EntityMetadata;
  fieldsConfig?: FieldsConfig;
  filterable?: readonly string[];
  orderable?: readonly string[];
}

export class SchemaRegistry {
  private static instance: SchemaRegistry | null = null;
  private entries = new Map<string, RegistryEntry>();
  private gqlNames = new Map<string, string>();
  private buildJobs = new Map<string, BuildJob>();

  static getInstance(): SchemaRegistry {
    if (!this.instance) this.instance = new SchemaRegistry();
    return this.instance;
  }

  setGqlName(entityKey: string, gqlName: string): void {
    this.gqlNames.set(entityKey, gqlName);
  }

  getGqlName(entityKey: string): string {
    return this.gqlNames.get(entityKey) ?? this.toGqlName(entityKey);
  }

  toGqlName(entityKey: string): string {
    const stripped = entityKey.replace(/Entity$/, '');
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }

  getEntry(entity: EntityMetadata): RegistryEntry {
    const key = entity.name;
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {};
      this.entries.set(key, entry);
    }
    return entry;
  }

  enqueueBuild(
    entity: EntityMetadata,
    fieldsConfig?: FieldsConfig,
    filterable?: readonly string[],
    orderable?: readonly string[],
  ): void {
    if (!this.buildJobs.has(entity.name)) {
      this.buildJobs.set(entity.name, { entity, fieldsConfig, filterable, orderable });
    }
  }

  takeBuildJobs(): BuildJob[] {
    const jobs = Array.from(this.buildJobs.values());
    this.buildJobs.clear();
    return jobs;
  }

  reset(): void {
    this.entries.clear();
    this.gqlNames.clear();
    this.buildJobs.clear();
  }
}
