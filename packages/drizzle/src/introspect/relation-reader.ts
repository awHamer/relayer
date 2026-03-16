import { createTableRelationsHelpers, extractTablesRelationalConfig, One } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import type { RelationFieldDef } from '@relayerjs/core';

export function readRelations(
  schema: Record<string, unknown>,
): Map<string, Map<string, RelationFieldDef>> {
  const result = new Map<string, Map<string, RelationFieldDef>>();

  let extracted: ReturnType<typeof extractTablesRelationalConfig>;
  try {
    extracted = extractTablesRelationalConfig(schema, (table: Table) =>
      createTableRelationsHelpers(table),
    );
  } catch {
    return result;
  }

  const { tables } = extracted;

  // Build dbName -> tsName lookup
  const dbNameToTsName = new Map<string, string>();
  for (const [tsName, tableConfig] of Object.entries(tables)) {
    dbNameToTsName.set(tableConfig.dbName, tsName);
  }

  for (const [tsName, tableConfig] of Object.entries(tables)) {
    const fields = new Map<string, RelationFieldDef>();

    for (const [relationName, relation] of Object.entries(tableConfig.relations)) {
      fields.set(relationName, {
        kind: 'relation',
        name: relationName,
        relationType: relation instanceof One ? 'one' : 'many',
        targetEntity: dbNameToTsName.get(relation.referencedTableName) ?? relation.referencedTableName,
      });
    }

    if (fields.size > 0) {
      result.set(tsName, fields);
    }
  }

  return result;
}
