# Examples

Runnable examples for Relayer.

## Setup

Start the database containers:

```bash
docker compose up -d
```

This starts PostgreSQL (port 5433) and MySQL (port 3307).

## Available examples

### [drizzle/](./drizzle)

Demonstrates all Relayer features with Drizzle ORM across three dialects:

```bash
cd drizzle
pnpm install
pnpm seed                   # create tables + seed data (PostgreSQL)
pnpm start                  # run PostgreSQL example
npx tsx src/test-mysql.ts   # run MySQL example
npx tsx src/test-sqlite.ts  # run SQLite example
```

Covers: computed fields, derived fields, JSON filtering, array operators, relation filters, aggregations, mutations, and more.
