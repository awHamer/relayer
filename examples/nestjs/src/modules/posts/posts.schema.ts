import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});
