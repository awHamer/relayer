import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createRelayerDrizzle } from '@relayerjs/drizzle';

const log = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n`, JSON.stringify(data, null, 2));

// Standalone table — no relations defined
const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
});

const schema = { tags };

async function main() {
  const client = postgres('postgres://relayer:relayer@localhost:5433/relayer_dev');
  const db = drizzle(client, { schema, logger: true });

  await client.unsafe(`
    DROP TABLE IF EXISTS tags CASCADE;
    CREATE TABLE tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL
    );
  `);

  await db.insert(tags).values([
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'JavaScript', slug: 'javascript' },
    { name: 'Rust', slug: 'rust' },
  ]);

  const r = createRelayerDrizzle({ db, schema });

  log('findMany all', await r.tags.findMany());

  log(
    'where: name contains "Script"',
    await r.tags.findMany({
      select: { id: true, name: true },
      where: { name: { contains: 'Script' } },
    }),
  );

  log(
    'where: id gt 1',
    await r.tags.findMany({
      select: { id: true, name: true },
      where: { id: { gt: 1 } },
    }),
  );

  log(
    'where: direct value',
    await r.tags.findMany({
      select: { id: true, name: true },
      where: { slug: 'rust' },
    }),
  );

  log(
    'where: combined',
    await r.tags.findMany({
      select: { id: true, name: true },
      where: { id: { gte: 1 }, name: { startsWith: 'Java' } },
    }),
  );

  log(
    'where: OR',
    await r.tags.findMany({
      select: { id: true, name: true },
      where: { OR: [{ slug: 'typescript' }, { slug: 'rust' }] },
    }),
  );

  log('count', await r.tags.count());

  log('count with where', await r.tags.count({ where: { name: { contains: 'Script' } } }));

  await client.unsafe('DROP TABLE IF EXISTS tags CASCADE');
  await client.end();
  console.log('\nNo-relations tests complete!');
}

main().catch(console.error);
