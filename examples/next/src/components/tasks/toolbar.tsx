'use client';

import { FilterPopover } from './filter-popover';
import { statusConfig } from './icons';

interface ToolbarProps {
  statusCounts: { value: string; count: number }[];
  assigneeCounts: { value: string; count: number }[];
}

export function TasksToolbar({ statusCounts, assigneeCounts }: ToolbarProps) {
  const statusOptions = statusCounts.map((s) => {
    const cfg = statusConfig[s.value as keyof typeof statusConfig];
    return { value: s.value, label: cfg?.label ?? s.value, icon: cfg?.icon, count: s.count };
  });

  const assigneeOptions = assigneeCounts.map((a) => ({
    value: a.value,
    label: a.value,
    count: a.count,
  }));

  return (
    <div className="flex items-center gap-2">
      <FilterPopover title="Status" paramName="status" options={statusOptions} />
      <FilterPopover title="Assignee" paramName="assignee" options={assigneeOptions} />
    </div>
  );
}
