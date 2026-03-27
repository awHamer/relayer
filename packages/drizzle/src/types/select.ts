import type { RawSelect } from '@relayerjs/core';

import type {
  CustomFieldKeys,
  ModelInstance,
  RelationTargetName,
  TableColumnKeys,
  TableRelationKeys,
} from './helpers';

export type ModelSelect<
  TSchema extends Record<string, unknown>,
  TEntities extends Record<string, unknown>,
  TKey extends string,
> =
  // Scalar columns
  (TKey extends keyof TSchema
    ? { [K in TableColumnKeys<TSchema[TKey]>]?: boolean | RawSelect }
    : {}) &
    // Custom fields (computed/derived)
    {
      [K in CustomFieldKeys<TSchema, TEntities, TKey>]?: NonNullable<
        ModelInstance<TSchema, TEntities, TKey>[K]
      > extends Record<string, unknown>
        ? NonNullable<ModelInstance<TSchema, TEntities, TKey>[K]> extends Date | unknown[]
          ? boolean
          :
              | boolean
              | {
                  [Sub in keyof NonNullable<ModelInstance<TSchema, TEntities, TKey>[K]> &
                    string]?: boolean;
                }
        : boolean;
    } & {
    // Relations
    [R in TableRelationKeys<TKey, TSchema>]?:
      | boolean
      | (ModelSelect<TSchema, TEntities, RelationTargetName<TKey, TSchema, R> & string> & {
          $limit?: number;
        });
  };
