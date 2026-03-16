import { client, db } from './db';
import * as schema from './schema';

export async function seed() {
  console.log('Seeding...');

  await client.unsafe(`
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
  `);

  await db.insert(schema.users).values([
    {
      firstName: 'Ihor',
      lastName: 'Ivanov',
      email: 'ihor@example.com',
      metadata: { role: 'admin', level: 10, settings: { theme: 'dark', notifications: true } },
    },
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      metadata: { role: 'user', level: 3, settings: { theme: 'light', notifications: false } },
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      metadata: { role: 'admin', level: 7, settings: { theme: 'dark', notifications: true } },
    },
    {
      firstName: 'NullRole',
      lastName: 'User',
      email: 'nullrole@example.com',
      metadata: {
        role: null as unknown as string,
        level: 5,
        settings: { theme: 'light', notifications: false },
      },
    },
  ]);

  await db.insert(schema.posts).values([
    {
      title: 'Hello World',
      content: 'First post',
      tags: ['intro', 'general'],
      published: true,
      authorId: 1,
    },
    {
      title: 'TypeScript Tips',
      content: 'TS is great',
      tags: ['typescript', 'tips'],
      published: true,
      authorId: 1,
    },
    { title: 'Draft Post', content: 'WIP', tags: ['draft'], published: false, authorId: 2 },
    {
      title: 'Hello Relayer',
      content: 'Testing relayer',
      tags: ['typescript', 'relayer', 'intro'],
      published: true,
      authorId: 3,
    },
  ]);

  await db.insert(schema.comments).values([
    { content: 'Great post!', postId: 1, authorId: 2 },
    { content: 'Thanks!', postId: 1, authorId: 1 },
    { content: 'Nice tips', postId: 2, authorId: 3 },
  ]);

  await db.insert(schema.orders).values([
    { total: '500.00', status: 'completed', userId: 1 },
    { total: '1500.00', status: 'completed', userId: 1 },
    { total: '200.00', status: 'pending', userId: 2 },
    { total: '3000.00', status: 'completed', userId: 3 },
  ]);

  await db.insert(schema.profiles).values([
    { bio: 'Full-stack developer', userId: 1 },
    { bio: 'Backend engineer', userId: 2 },
  ]);

  await db.insert(schema.categories).values([
    { name: 'TypeScript' },
    { name: 'General' },
    { name: 'DevOps' },
  ]);

  await db.insert(schema.postCategories).values([
    { postId: 1, categoryId: 2, isPrimary: true },
    { postId: 2, categoryId: 1, isPrimary: true },
    { postId: 2, categoryId: 2, isPrimary: false },
    { postId: 4, categoryId: 1, isPrimary: true },
  ]);

  console.log('Seeded successfully!');
}

// Run standalone
const isMain = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isMain) {
  seed()
    .then(() => client.end())
    .catch(console.error);
}
