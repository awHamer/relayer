---
title: Multi-Dialect Support
description: PostgreSQL, MySQL, and SQLite differences and how Relayer handles them.
---

Relayer detects the SQL dialect from your Drizzle schema (by checking whether your tables are `PgTable`, `MySqlTable`, or `SQLiteTable`) and adjusts SQL generation automatically.

## Dialect comparison

| Feature | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| `ilike` | Native `ILIKE` | `LOWER(col) LIKE LOWER(val)` | `col LIKE val COLLATE NOCASE` |
| `notIlike` | Native `NOT ILIKE` | `LOWER(col) NOT LIKE LOWER(val)` | `col NOT LIKE val COLLATE NOCASE` |
| Array operators | Native (`@>`, `<@`, `&&`) | Not supported | Not supported |
| JSON path | `col->>'key'` with `::cast` | `col->>'$.key'` with `CAST()` | `json_extract(col, '$.key')` with `CAST()` |
| Nested JSON | `col->'a'->>'b'` | `col->>'$.a.b'` | `json_extract(col, '$.a.b')` |
| Numeric JSON cast | `::numeric` | `CAST(... AS DECIMAL)` | `CAST(... AS REAL)` |
| Boolean JSON cast | `::boolean` | `CAST(... AS UNSIGNED)` | `CAST(... AS INTEGER)` |
| `RETURNING` | Yes | No (`insertId` fallback) | Yes |

## Usage with PostgreSQL

```ts
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});
```

PostgreSQL gets the most complete feature set: native `ILIKE`, array operators, JSONB with optimized path queries, and `RETURNING` for mutations.

## Usage with MySQL

```ts
import { mysqlTable, serial, varchar } from 'drizzle-orm/mysql-core';

const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});
```

MySQL uses fallback implementations for `ilike` (LOWER wrapping) and does not support array operators. `RETURNING` is not available -- `create` uses `insertId` to fetch the created row.

## Usage with SQLite

```ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});
```

SQLite uses `COLLATE NOCASE` for case-insensitive matching and `json_extract()` for JSON paths. Array operators are not supported. `RETURNING` is available.

## Array operators

Array operators (`arrayContains`, `arrayContained`, `arrayOverlaps`) are PostgreSQL-only features that use native PG array operations:

```ts
// Only works with PostgreSQL schemas
await r.posts.findMany({
  where: { tags: { arrayContains: ['typescript'] } },
});
```

:::caution
Using array operators with MySQL or SQLite will throw a runtime error. These operators are only available when your schema uses PostgreSQL tables.
:::

## Writing dialect-agnostic code

If you need to support multiple dialects, avoid:
- Array operators (`arrayContains`, `arrayContained`, `arrayOverlaps`)
- Relying on MySQL-specific `insertId` behavior

Everything else (JSON filtering, `ilike`, computed fields, derived fields, relations, aggregations) works consistently across all three dialects.
