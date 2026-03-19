import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

const sqlite = new Database('crm.db');
const db = drizzle(sqlite, { schema });

sqlite.exec(`
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member'
  );

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    label TEXT NOT NULL DEFAULT 'feature',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.insert(schema.users)
  .values([
    { name: 'Alice Johnson', email: 'alice@company.com', role: 'admin' },
    { name: 'Bob Smith', email: 'bob@company.com', role: 'member' },
    { name: 'Carol White', email: 'carol@company.com', role: 'member' },
    { name: 'Dave Brown', email: 'dave@company.com', role: 'viewer' },
  ])
  .run();

const statuses = ['todo', 'in-progress', 'done', 'cancelled'] as const;
const labels = ['bug', 'feature', 'documentation', 'enhancement'] as const;
const priorities = ['low', 'medium', 'high'] as const;

const verbs = [
  'Fix',
  'Implement',
  'Add',
  'Update',
  'Refactor',
  'Remove',
  'Create',
  'Design',
  'Optimize',
  'Test',
  'Review',
  'Deploy',
  'Configure',
  'Document',
  'Migrate',
];
const subjects = [
  'user authentication',
  'payment flow',
  'dashboard layout',
  'API endpoints',
  'database schema',
  'search feature',
  'email notifications',
  'file upload',
  'error handling',
  'CI/CD pipeline',
  'mobile responsive',
  'dark mode',
  'performance metrics',
  'caching layer',
  'rate limiting',
  'webhook system',
  'audit logging',
  'role permissions',
  'data export',
  'onboarding flow',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const tasks = Array.from({ length: 50 }, (_, i) => {
  const verb = verbs[i % verbs.length]!;
  const subject = subjects[i % subjects.length]!;
  return {
    title: `${verb} ${subject}`,
    description: `${verb} ${subject} for the platform`,
    status: pick(statuses),
    label: pick(labels),
    priority: pick(priorities),
    assigneeId: Math.floor(Math.random() * 4) + 1,
    createdBy: 1,
    createdAt: new Date(
      2024,
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ).toISOString(),
  };
});

db.insert(schema.tasks).values(tasks).run();

console.log('Seeded 4 users and 50 tasks');
sqlite.close();
