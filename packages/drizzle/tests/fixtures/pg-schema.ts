import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  metadata: jsonb('metadata').$type<{
    role: string;
    level: number;
    settings: { theme: string; notifications: boolean };
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false).notNull(),
  tags: text('tags').array().default([]).notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  bio: text('bio'),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const postCategories = pgTable('post_categories', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  isPrimary: boolean('is_primary').default(false).notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  posts: many(posts),
  comments: many(comments),
  orders: many(orders),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  postCategories: many(postCategories),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, {
    fields: [postCategories.postId],
    references: [posts.id],
  }),
  category: one(categories, {
    fields: [postCategories.categoryId],
    references: [categories.id],
  }),
}));
