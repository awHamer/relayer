'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { TaskDialog } from './task-dialog';
import { TaskRow } from './task-row';
import { TasksToolbar } from './toolbar';
import type { Task } from './types';

interface ApiListResponse {
  data: Task[];
  meta: { total: number; limit: number; offset: number };
}

export function TaskList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<{ value: string; count: number }[]>([]);
  const [assigneeCounts, setAssigneeCounts] = useState<{ value: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = 15;

  const fetchTasks = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');
    const sort = searchParams.get('sort');

    const where: Record<string, unknown> = {};
    if (status) where.status = status.split(',');
    if (assignee) where.assignee = { name: assignee.split(',') };

    // Request computed, derived, and relation fields
    params.set(
      'select',
      JSON.stringify({
        id: true,
        title: true,
        status: true,
        label: true,
        taskCode: true, // computed field
        assigneeTaskCount: true, // derived field (subquery JOIN)
        assignee: { name: true }, // relation loading
      }),
    );

    if (Object.keys(where).length > 0) params.set('where', JSON.stringify(where));
    if (sort) {
      const field = sort.replace(/^-/, '');
      const order = sort.startsWith('-') ? 'desc' : 'asc';
      params.set('orderBy', JSON.stringify({ field, order }));
    }
    params.set('limit', String(limit));
    params.set('offset', String((page - 1) * limit));

    const res = await fetch(`/api/tasks?${params.toString()}`);
    const json = (await res.json()) as ApiListResponse;
    setTasks(json.data);
    setTotal(json.meta.total);
    setLoading(false);
  }, [searchParams, page]);

  const fetchCounts = useCallback(async () => {
    const [statusRes, assigneeRes] = await Promise.all([
      fetch('/api/tasks/aggregate?groupBy=["status"]&_count=true'),
      fetch('/api/tasks/aggregate?groupBy=["assignee.name"]&_count=true'),
    ]);
    const statusData = (await statusRes.json()) as { data: Record<string, unknown>[] };
    const assigneeData = (await assigneeRes.json()) as { data: Record<string, unknown>[] };

    setStatusCounts(
      (Array.isArray(statusData.data) ? statusData.data : []).map((s) => ({
        value: String(s.status),
        count: Number(s._count),
      })),
    );
    setAssigneeCounts(
      (Array.isArray(assigneeData.data) ? assigneeData.data : []).map((a) => ({
        value: String(a.assignee_name),
        count: Number(a._count),
      })),
    );
  }, []);

  useEffect(() => {
    void fetchTasks();
    void fetchCounts();
  }, [fetchTasks, fetchCounts]);

  const totalPages = Math.ceil(total / limit);

  function navigate(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`?${params.toString()}`);
  }

  async function handleCreate(data: Record<string, string>) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setDialogOpen(false);
    void fetchTasks();
    void fetchCounts();
  }

  async function handleUpdate(id: number, data: Record<string, string>) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditingTask(null);
    void fetchTasks();
    void fetchCounts();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    void fetchTasks();
    void fetchCounts();
  }

  const currentSort = searchParams.get('sort') ?? undefined;

  function sortUrl(field: string) {
    const isActive = currentSort === field || currentSort === `-${field}`;
    const isDesc = currentSort === `-${field}`;
    navigate({ sort: isActive && !isDesc ? `-${field}` : field, page: '1' });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <TasksToolbar statusCounts={statusCounts} assigneeCounts={assigneeCounts} />
        <Button
          size="sm"
          onClick={() => {
            setEditingTask(null);
            setDialogOpen(true);
          }}
        >
          Add Task
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-25">Task</TableHead>
              <TableHead>
                <button onClick={() => sortUrl('title')} className="flex items-center gap-1">
                  Title {currentSort === 'title' ? '↑' : currentSort === '-title' ? '↓' : ''}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => sortUrl('status')} className="flex items-center gap-1">
                  Status {currentSort === 'status' ? '↑' : currentSort === '-status' ? '↓' : ''}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => sortUrl('assignee.name')}
                  className="flex items-center gap-1"
                >
                  Assignee{' '}
                  {currentSort === 'assignee.name'
                    ? '↑'
                    : currentSort === '-assignee.name'
                      ? '↓'
                      : ''}
                </button>
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={() => {
                    setEditingTask(task);
                    setDialogOpen(true);
                  }}
                  onDelete={() => void handleDelete(task.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          {total} task{total !== 1 ? 's' : ''}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => navigate({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        task={editingTask}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
