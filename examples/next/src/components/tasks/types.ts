export interface Task {
  id: number;
  title: string;
  status: string;
  label: string;
  priority: string;
  createdAt: string;
  taskCode: string;
  assigneeTaskCount: number | null;
  assignee?: { name: string } | null;
}

export interface AggregateCount {
  _count: number;
  [key: string]: unknown;
}

export const STATUSES = ['todo', 'in-progress', 'done', 'cancelled'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export const LABELS = ['bug', 'feature', 'documentation', 'enhancement'] as const;
