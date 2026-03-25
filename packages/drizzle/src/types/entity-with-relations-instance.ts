import type { ExtractTablesWithRelations, One, Table } from 'drizzle-orm';

import type {
  InferTableSelect,
  ModelInstance,
  RelationTargetName,
  TableRelationKeys,
} from './helpers';

type ToPlain<T> = { [K in keyof T]: T[K] };

type IsOneRelation<
  TSchema extends Record<string, unknown>,
  TTableName extends string,
  R extends string,
> = TTableName extends keyof ExtractTablesWithRelations<TSchema>
  ? R extends keyof ExtractTablesWithRelations<TSchema>[TTableName]['relations']
    ? ExtractTablesWithRelations<TSchema>[TTableName]['relations'][R] extends One<string>
      ? true
      : false
    : false
  : false;

type OwnColumns<
  TSchema extends Record<string, unknown>,
  TKey extends string,
> = TKey extends keyof TSchema
  ? TSchema[TKey] extends Table
    ? InferTableSelect<TSchema[TKey]>
    : Record<string, unknown>
  : Record<string, unknown>;

// Entity model type with recursive relations (depth-limited)
// Uses ModelInstance: entity class -> InstanceType (with computed/derived), plain table -> InferTableSelect
export type EntityModelWithRelations<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
  Depth extends unknown[] = [],
> = ToPlain<ModelInstance<TSchema, TEntities, TKey>> &
  (Depth['length'] extends 3
    ? {}
    : {
        [R in TableRelationKeys<TKey, TSchema>]: IsOneRelation<TSchema, TKey, R> extends true
          ? EntityModelWithRelations<
              TSchema,
              TEntities,
              RelationTargetName<TKey, TSchema, R> & string,
              [...Depth, unknown]
            > | null
          : EntityModelWithRelations<
              TSchema,
              TEntities,
              RelationTargetName<TKey, TSchema, R> & string,
              [...Depth, unknown]
            >[];
      });

// Shorthand: extract schema + key from entity class statics
export type EntityModelFromClass<
  TEntityClass,
  TEntities extends Record<string, unknown>,
  Depth extends unknown[] = [],
> = TEntityClass extends {
  __schema: infer S extends Record<string, unknown>;
  __entityKey: infer K extends string;
}
  ? EntityModelWithRelations<S, TEntities, K, Depth>
  : never;

// Build full model from instance type + entities map
// Finds entity key by matching TEntity against TEntities values, then adds relations
type FindEntityKey<TEntity, TEntities extends Record<string, unknown>> = {
  [K in keyof TEntities & string]: TEntities[K] extends new (...args: unknown[]) => TEntity
    ? K
    : never;
}[keyof TEntities & string];

type SchemaFromEntities<TEntities extends Record<string, unknown>> = {
  [K in keyof TEntities & string]: TEntities[K] extends {
    __schema: infer S;
  }
    ? S
    : never;
}[keyof TEntities & string];

export type EntityModelFromInstance<TEntity, TEntities extends Record<string, unknown>> =
  SchemaFromEntities<TEntities> extends infer S extends Record<string, unknown>
    ? FindEntityKey<TEntity, TEntities> extends infer K extends string
      ? ToPlain<TEntity> &
          (TableRelationKeys<K, S> extends never
            ? {}
            : {
                [R in TableRelationKeys<K, S>]: IsOneRelation<S, K, R> extends true
                  ? EntityModelWithRelations<
                      S,
                      TEntities,
                      RelationTargetName<K, S, R> & string,
                      [unknown]
                    > | null
                  : EntityModelWithRelations<
                      S,
                      TEntities,
                      RelationTargetName<K, S, R> & string,
                      [unknown]
                    >[];
              })
      : ToPlain<TEntity>
    : ToPlain<TEntity>;

// Entity instance type with recursive relations (depth-limited, schema-only, no computed/derived)
export type EntityInstanceWithRelations<
  TSchema extends Record<string, unknown>,
  TKey extends string,
  Depth extends unknown[] = [],
> = OwnColumns<TSchema, TKey> &
  (Depth['length'] extends 3
    ? {}
    : {
        [R in TableRelationKeys<TKey, TSchema>]: IsOneRelation<TSchema, TKey, R> extends true
          ? EntityInstanceWithRelations<
              TSchema,
              RelationTargetName<TKey, TSchema, R> & string,
              [...Depth, unknown]
            > | null
          : EntityInstanceWithRelations<
              TSchema,
              RelationTargetName<TKey, TSchema, R> & string,
              [...Depth, unknown]
            >[];
      });
