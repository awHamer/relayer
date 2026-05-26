import { SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

import { buildAggregate } from '../../src/builders/aggregate';
import { buildOrderBy } from '../../src/builders/order-by-builder';
import { buildWhere } from '../../src/builders/where';
import type { WhereBuilderContext } from '../../src/builders/where';
import { buildFindManyQuery } from '../../src/client/find-many';
import type { FindManyDeps } from '../../src/client/find-many';
import { pgAdapter } from '../../src/dialect';
import { buildRegistry } from '../../src/introspect';
import { resolveComputedFields } from '../../src/resolvers';
import { PgUser } from '../fixtures/entities';
import * as pgSchema from '../fixtures/pg-schema';
import { users } from '../fixtures/pg-schema';

const mockDb = drizzle({} as any);
const schema = pgSchema as unknown as Record<string, unknown>;

// Registry WITH the entity, so metadata carries the computed `fullName` field.
const { registry, tables } = buildRegistry(schema, { users: PgUser });
const metadata = registry.get('users')!;
const tableInfo = tables.get('users')!;

// Real path: computedSqlMap holds `.as('fullName')` aliased SQL (what production uses).
function computedMap(fields = [...metadata.computedFields.keys()]): Map<string, SQL> {
  return resolveComputedFields(metadata.computedFields, {
    table: users,
    schema,
    requestedFields: fields,
  });
}

function whereCtx(computedSqlMap: Map<string, SQL>): WhereBuilderContext {
  return {
    table: users,
    tableInfo,
    metadata,
    schema,
    allTables: tables,
    computedSqlMap,
    derivedAliasMap: new Map(),
    adapter: pgAdapter,
    registry,
    db: mockDb as never,
  };
}

describe('computed fields: filtering / sorting / aggregation via the real resolved map', () => {
  it('metadata carries the computed field', () => {
    expect(metadata.computedFields.has('fullName')).toBe(true);
  });

  it('WHERE injects the raw expression, not the output alias', () => {
    const cond = buildWhere({ fullName: { contains: 'John' } }, whereCtx(computedMap()));
    const { sql: query, params } = mockDb.select().from(users).where(cond!).toSQL();
    // Postgres rejects output aliases in WHERE — the expression must be inlined.
    expect(query).toContain('first_name');
    expect(query).toContain('last_name');
    expect(query).not.toMatch(/where\s+"fullName"/i);
    expect(params).toContain('%John%');
  });

  it('ORDER BY injects the raw expression, not the output alias', () => {
    const { clauses } = buildOrderBy(
      { field: 'fullName', order: 'asc' },
      {
        table: users,
        metadata,
        computedSqlMap: computedMap(),
        derivedAliasMap: new Map(),
        allTables: tables,
        schema,
        adapter: pgAdapter,
        registry,
        db: mockDb as never,
      },
    );
    const { sql: query } = mockDb
      .select()
      .from(users)
      .orderBy(...clauses)
      .toSQL();
    expect(query).toContain('first_name');
    expect(query).not.toMatch(/order by\s+"fullName"/i);
  });

  it('aggregate groupBy aliases the SQL expression so the row is keyed by the field', () => {
    const agg = buildAggregate({
      options: { groupBy: ['fullName'], _count: true },
      table: users,
      metadata,
      allTables: tables,
      schema,
      registry,
      db: mockDb as never,
      adapter: pgAdapter,
    });
    // raw SQL exprs must be aliased so the result row is keyed by the field name
    const col = agg.selectColumns['fullName'];
    expect(col).toBeInstanceOf(SQL.Aliased);
    expect((col as unknown as SQL.Aliased).fieldAlias).toBe('fullName');
    expect(agg.groupByColumns).toHaveLength(1);
  });

  it('findMany resolves computed fields referenced only in where/orderBy (not in select)', () => {
    const deps: FindManyDeps = {
      db: mockDb as never,
      table: users,
      tableInfo,
      schema,
      allTables: tables,
      metadata,
      adapter: pgAdapter,
      registry,
      getComputedSqlMap: (_context, requestedFields) => computedMap(requestedFields),
      getDerivedResolutions: () => ({ resolutions: new Map(), aliasMap: new Map() }),
      makeWhereCtx: (computedSqlMap) => whereCtx(computedSqlMap),
    };

    const built = buildFindManyQuery(deps, {
      select: { id: true },
      where: { fullName: { contains: 'John' } },
      orderBy: { field: 'fullName', order: 'asc' },
    });
    const { sql: query } = (built.query as unknown as { toSQL(): { sql: string } }).toSQL();
    expect(query).toContain('where');
    expect(query).toContain('order by');
    expect(query).toContain('first_name');
  });
});
