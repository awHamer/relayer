import { RelayerDialectError } from '@relayerjs/core';

import type { FindManyDeps, FindManyOptions } from './find-many';
import { buildFindManyQuery, hydrateRow, stripUnrequestedFields } from './find-many';

export async function* executeFindManyStream(
  deps: FindManyDeps,
  options: FindManyOptions = {},
): AsyncGenerator<Record<string, unknown>> {
  if (deps.adapter.dialect !== 'mysql') {
    throw new RelayerDialectError(
      deps.adapter.dialect,
      'findManyStream() is only supported for MySQL. PostgreSQL and SQLite iterator support is still WIP in Drizzle.',
    );
  }

  const { query, selectResult, eagerResolutions } = buildFindManyQuery(deps, options, true);

  if (selectResult.requestedRelations.length > 0) {
    throw new RelayerDialectError(
      deps.adapter.dialect,
      'findManyStream() does not support relation loading. Remove relations from select or use findMany() instead.',
    );
  }

  const objectDerivedFields = new Map<string, Set<string>>();
  for (const [name, res] of eagerResolutions) {
    if (res.isObjectType && res.valueColumns) {
      objectDerivedFields.set(name, new Set(res.valueColumns.keys()));
    }
  }
  const requestedKeys = options.select ? new Set<string>(Object.keys(options.select)) : null;

  const iterator = query.iterator();
  for await (const row of iterator) {
    const record = row as Record<string, unknown>;
    hydrateRow(record, objectDerivedFields);
    if (requestedKeys) {
      stripUnrequestedFields(record, requestedKeys);
    }
    yield record;
  }
}
