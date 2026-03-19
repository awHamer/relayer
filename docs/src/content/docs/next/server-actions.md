---
title: Server Actions
description: Use Relayer directly in Server Actions and Server Components.
---

## Overview

You don't need any wrapper for Server Actions — use `r.entity` methods directly. Relayer works in any server-side context: Server Actions, Server Components, API routes, cron jobs.

## Server Action example

```ts
// app/users/actions.ts
'use server';

import { r } from '@/lib/relayer';

export async function createUser(formData: FormData) {
  return r.users.create({
    data: {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    },
  });
}

export async function deleteUser(id: number) {
  return r.users.delete({ where: { id } });
}

export async function getActiveUsers() {
  return r.users.findMany({
    select: { id: true, name: true, email: true },
    where: { active: true },
    orderBy: { field: 'name', order: 'asc' },
  });
}
```

## In Client Components

```tsx
// app/users/form.tsx
'use client';

import { createUser } from './actions';

export function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" />
      <input name="email" />
      <button type="submit">Create</button>
    </form>
  );
}
```

## With context

```ts
'use server';

import { getUser } from '@/lib/auth';
import { r } from '@/lib/relayer';

export async function getMyTasks() {
  const user = await getUser();
  return r.tasks.findMany({
    where: { assigneeId: user.id },
    select: { id: true, title: true, status: true },
    context: { currentUserId: user.id },
  });
}
```

## Batch operations

```ts
'use server';

import { r } from '@/lib/relayer';

export async function bulkUpdateStatus(taskIds: number[], status: string) {
  return r.tasks.updateMany({
    where: { id: { in: taskIds } },
    data: { status },
  });
}

export async function bulkDelete(taskIds: number[]) {
  return r.tasks.deleteMany({
    where: { id: { in: taskIds } },
  });
}
```

## Transactions

```ts
'use server';

import { r } from '@/lib/relayer';

export async function transferTask(taskId: number, newAssigneeId: number) {
  return r.$transaction(async (tx) => {
    const task = await tx.tasks.update({
      where: { id: taskId },
      data: { assigneeId: newAssigneeId },
    });
    await tx.auditLogs.create({
      data: { action: 'task.transferred', targetId: taskId },
    });
    return task;
  });
}
```

## When to use Server Actions vs Route Handlers

| Use case                                     | Approach                                   |
| -------------------------------------------- | ------------------------------------------ |
| Form submissions                             | Server Actions                             |
| Client-side data fetching (SWR, React Query) | Route Handlers (`/api/...`)                |
| SSR initial data                             | `r.entity.findMany()` directly             |
| Background jobs, cron                        | `r.entity` directly                        |
| Public API for external consumers            | Route Handlers with `createRelayerRoute()` |
