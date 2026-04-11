import { client, db } from './db';
import * as schema from './schema';

export async function seed() {
  console.log('Seeding nestjs-graphql example database...');

  await client.unsafe(`
    DROP TABLE IF EXISTS post_categories, categories, comments, posts, users CASCADE;

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

    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE post_categories (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      is_primary BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await db.insert(schema.users).values([
    {
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'alice@example.com',
      metadata: { role: 'admin', level: 10 },
    },
    {
      firstName: 'Bob',
      lastName: 'Builder',
      email: 'bob@example.com',
      metadata: { role: 'user', level: 3 },
    },
    {
      firstName: 'Carol',
      lastName: 'Coder',
      email: 'carol@example.com',
      metadata: { role: 'user', level: 5 },
    },
  ]);

  await db.insert(schema.posts).values([
    { title: 'Hello GraphQL', content: 'First public post', published: true, authorId: 1 },
    { title: 'Typed Context', content: 'Public from Bob', published: true, authorId: 2 },
    { title: 'Bob draft', content: 'Bob private draft', published: false, authorId: 2 },
    { title: 'Carol draft', content: 'Carol private draft', published: false, authorId: 3 },
  ]);

  await db.insert(schema.comments).values([
    { content: 'Great intro!', postId: 1, authorId: 2 },
    { content: 'Thanks!', postId: 1, authorId: 1 },
    { content: 'Nice post Bob', postId: 2, authorId: 3 },
  ]);

  await db
    .insert(schema.categories)
    .values([
      { name: 'GraphQL' },
      { name: 'TypeScript' },
      { name: 'NestJS' },
      { name: 'Tutorials' },
    ]);

  await db.insert(schema.postCategories).values([
    { postId: 1, categoryId: 1, isPrimary: true },
    { postId: 1, categoryId: 4, isPrimary: false },
    { postId: 2, categoryId: 2, isPrimary: true },
  ]);

  console.log('Seeded successfully.');
}

const isMain = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isMain) {
  seed()
    .then(() => client.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
