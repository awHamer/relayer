export const USERS = [
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
];

export const POSTS = [
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
];

export const COMMENTS = [
  { content: 'Great post!', postId: 1, authorId: 2 },
  { content: 'Thanks!', postId: 1, authorId: 1 },
  { content: 'Nice tips', postId: 2, authorId: 3 },
];

export const ORDERS = [
  { total: '500.00', status: 'completed', userId: 1 },
  { total: '1500.00', status: 'completed', userId: 1 },
  { total: '200.00', status: 'pending', userId: 2 },
  { total: '3000.00', status: 'completed', userId: 3 },
];

export const PROFILES = [
  { bio: 'Full-stack developer', userId: 1 },
  { bio: 'Backend engineer', userId: 2 },
];

export const CATEGORIES = [
  { name: 'TypeScript' },
  { name: 'General' },
  { name: 'DevOps' },
];

export const POST_CATEGORIES = [
  { postId: 1, categoryId: 2, isPrimary: true },   // Hello World -> General (primary)
  { postId: 2, categoryId: 1, isPrimary: true },   // TS Tips -> TypeScript (primary)
  { postId: 2, categoryId: 2, isPrimary: false },  // TS Tips -> General
  { postId: 4, categoryId: 1, isPrimary: true },   // Hello Relayer -> TypeScript (primary)
];
