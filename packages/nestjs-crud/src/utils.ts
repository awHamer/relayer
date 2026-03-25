import type { RelayerEntityClass } from '@relayerjs/core';

export interface RelayerEntityWithKey extends RelayerEntityClass {
  readonly __entityKey: string;
  readonly __schema: Record<string, unknown>;
  readonly __table: unknown;
}

export function isEntityWithKey(entity: RelayerEntityClass): entity is RelayerEntityWithKey {
  return (
    '__entityKey' in entity && typeof (entity as RelayerEntityWithKey).__entityKey === 'string'
  );
}

export function getEntityKey(entity: RelayerEntityClass): string {
  if (!isEntityWithKey(entity)) {
    throw new Error(
      'Entity class must have __entityKey. Use createRelayerEntity() from @relayerjs/drizzle.',
    );
  }
  return entity.__entityKey;
}

export function getRouteConfig<T>(routes: T | undefined, name: string): unknown {
  if (!routes) return undefined;
  const value = (routes as Record<string, unknown>)[name];
  if (typeof value === 'object' && value !== null) return value;
  return undefined;
}

export function buildNextPageUrl(
  basePath: string,
  query: Record<string, unknown>,
  offset: number,
  limit: number,
  total: number,
): string | null {
  if (offset + limit >= total) return null;

  const nextOffset = offset + limit;
  const parts: string[] = [`offset=${nextOffset}`, `limit=${limit}`];

  if (query.where) parts.push(`where=${encodeURIComponent(JSON.stringify(query.where))}`);
  if (query.select) parts.push(`select=${encodeURIComponent(JSON.stringify(query.select))}`);
  if (query.orderBy) parts.push(`orderBy=${encodeURIComponent(JSON.stringify(query.orderBy))}`);
  if (query.search) parts.push(`search=${encodeURIComponent(String(query.search))}`);

  return `${basePath}?${parts.join('&')}`;
}

export function enforceAllowSelectLimits(
  select: Record<string, unknown> | undefined,
  allowSelect: Record<string, boolean | { $limit?: number; [field: string]: unknown }> | undefined,
): Record<string, unknown> | undefined {
  if (!select || !allowSelect) return select;

  const result = { ...select };
  for (const [key, allowValue] of Object.entries(allowSelect)) {
    if (typeof allowValue === 'object' && allowValue !== null && '$limit' in allowValue) {
      const configLimit = (allowValue as { $limit: number }).$limit;
      const selectValue = result[key];

      if (typeof selectValue === 'object' && selectValue !== null) {
        const clientLimit = (selectValue as Record<string, unknown>).$limit as number | undefined;
        (result[key] as Record<string, unknown>) = {
          ...(selectValue as Record<string, unknown>),
          $limit: clientLimit ? Math.min(clientLimit, configLimit) : configLimit,
        };
      } else if (selectValue === true) {
        result[key] = { $limit: configLimit };
      }
    }
  }

  return result;
}

export function entitiesToRecord(
  entities: RelayerEntityClass[] | Record<string, RelayerEntityClass>,
): Record<string, RelayerEntityClass> {
  if (!Array.isArray(entities)) {
    return entities;
  }
  const result: Record<string, RelayerEntityClass> = {};
  for (const entity of entities) {
    const key = getEntityKey(entity);
    result[key] = entity;
  }
  return result;
}
