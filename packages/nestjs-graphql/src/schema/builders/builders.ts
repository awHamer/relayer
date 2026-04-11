import type { EntityMetadata } from '../../metadata';
import { SchemaRegistry } from '../registry';
import { AggregateBuilder } from './aggregate.builder';
import { ConnectionBuilder } from './connection.builder';
import { CreateInputBuilder } from './create-input.builder';
import { CursorResultBuilder } from './cursor-result.builder';
import { ListResultBuilder } from './list-result.builder';
import { ObjectTypeBuilder } from './object-type.builder';
import { OrderByInputBuilder } from './order-by-input.builder';
import { RelationFilterBuilder } from './relation-filter.builder';
import { RelationInputBuilder } from './relation-input.builder';
import { UpdateInputBuilder } from './update-input.builder';
import { WhereInputBuilder } from './where-input.builder';

export interface RelayerBuilders {
  registry: SchemaRegistry;
  objectType: ObjectTypeBuilder;
  whereInput: WhereInputBuilder;
  orderByInput: OrderByInputBuilder;
  createInput: CreateInputBuilder;
  updateInput: UpdateInputBuilder;
  listResult: ListResultBuilder;
  cursorResult: CursorResultBuilder;
  connection: ConnectionBuilder;
  aggregate: AggregateBuilder;
  relationFilter: RelationFilterBuilder;
  relationInput: RelationInputBuilder;
  ensureAllClasses(entity: EntityMetadata): void;
  /** Enriches metadata for all enqueued entities since last drain. */
  drainAndEnrich(): void;
}

// singleton cache — shares state across all @GqlResolver decorations
let cached: RelayerBuilders | null = null;

export function getBuilders(): RelayerBuilders {
  if (cached) return cached;
  const registry = SchemaRegistry.getInstance();
  const objectType = new ObjectTypeBuilder(registry);
  const relationFilter = new RelationFilterBuilder(registry);
  const whereInput = new WhereInputBuilder(registry, relationFilter);
  relationFilter.setNestedWhereResolver((target) => whereInput.ensureClass(target));
  const orderByInput = new OrderByInputBuilder(registry);
  const createInput = new CreateInputBuilder(registry);
  const updateInput = new UpdateInputBuilder(registry);
  const listResult = new ListResultBuilder(registry, objectType);
  const cursorResult = new CursorResultBuilder(registry, objectType);
  const connection = new ConnectionBuilder(registry, objectType);
  const aggregate = new AggregateBuilder(registry);
  const relationInput = new RelationInputBuilder(registry);

  cached = {
    registry,
    objectType,
    whereInput,
    orderByInput,
    createInput,
    updateInput,
    listResult,
    cursorResult,
    connection,
    aggregate,
    relationFilter,
    relationInput,
    ensureAllClasses(entity) {
      objectType.ensureClass(entity);
      whereInput.ensureClass(entity);
      orderByInput.ensureClass(entity);
      createInput.ensureClass(entity);
      updateInput.ensureClass(entity);
      listResult.ensureClass(entity);
      cursorResult.ensureClass(entity);
      connection.ensureClasses(entity);
      aggregate.ensureClasses(entity);
    },
    drainAndEnrich() {
      // Loop: auto-enqueued relation targets may add new jobs mid-drain.
      // Keep draining until no new jobs appear.
      let jobs = registry.takeBuildJobs();
      while (jobs.length > 0) {
        for (const job of jobs) {
          objectType.enrichMetadata(job.entity, job.fieldsConfig);
          whereInput.enrichMetadata(job.entity, job.filterable);
          orderByInput.enrichMetadata(job.entity, job.orderable);
          createInput.enrichMetadata(job.entity);
          updateInput.enrichMetadata(job.entity);
          listResult.enrichMetadata(job.entity);
          cursorResult.enrichMetadata(job.entity);
          connection.enrichMetadata(job.entity);
          aggregate.enrichMetadata(job.entity);
        }
        jobs = registry.takeBuildJobs();
      }
      relationFilter.enrichAllMetadata();
    },
  };
  return cached;
}
