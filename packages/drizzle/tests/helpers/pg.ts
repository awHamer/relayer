import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../fixtures/pg-schema';
import { CATEGORIES, COMMENTS, ORDERS, POST_CATEGORIES, POSTS, PROFILES, USERS } from '../fixtures/seed';

const PG_URL = process.env.PG_URL ?? 'postgres://relayer:relayer@localhost:5433/relayer_test';

const DDL = `
  SET client_min_messages = WARNING;
  DROP TABLE IF EXISTS post_categories, categories, comments, orders, profiles, posts, users CASCADE;

  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    published BOOLEAN DEFAULT FALSE NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    author_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    total NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    bio TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE
  );

  CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE post_categories (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    is_primary BOOLEAN DEFAULT FALSE NOT NULL
  );
`;

export async function setupPg() {
  const client = postgres(PG_URL);
  const db = drizzle(client, { schema, logger: false });

  await client.unsafe(DDL);
  await db.insert(schema.users).values(USERS);
  await db.insert(schema.posts).values(POSTS);
  await db.insert(schema.comments).values(COMMENTS);
  await db.insert(schema.orders).values(ORDERS);
  await db.insert(schema.profiles).values(PROFILES);
  await db.insert(schema.categories).values(CATEGORIES);
  await db.insert(schema.postCategories).values(POST_CATEGORIES);

  async function cleanup() {
    await client.unsafe(
      'SET client_min_messages = WARNING; DROP TABLE IF EXISTS post_categories, categories, comments, orders, profiles, posts, users CASCADE',
    );
    await client.end();
  }

  async function reseed() {
    await client.unsafe(
      'TRUNCATE users, posts, comments, orders, profiles, categories, post_categories RESTART IDENTITY CASCADE',
    );
    await db.insert(schema.users).values(USERS);
    await db.insert(schema.posts).values(POSTS);
    await db.insert(schema.comments).values(COMMENTS);
    await db.insert(schema.orders).values(ORDERS);
    await db.insert(schema.profiles).values(PROFILES);
    await db.insert(schema.categories).values(CATEGORIES);
    await db.insert(schema.postCategories).values(POST_CATEGORIES);
  }

  return { db, client, schema, cleanup, reseed };
}
