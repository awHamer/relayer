import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { statusConfig } from './icons';
import type { Task } from './types';

interface TaskRowProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskRow({ task, onEdit, onDelete }: TaskRowProps) {
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const StatusIcon = status?.icon;

  return (
    <TableRow>
      <TableCell className="text-muted-foreground font-mono text-xs">{task.taskCode}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {task.label}
          </Badge>
          <span className="font-medium">{task.title}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {StatusIcon && <StatusIcon className="text-muted-foreground h-4 w-4" />}
          <span className="text-sm">{status?.label ?? task.status}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm">{task.assignee?.name ?? '—'}</span>
          {task.assigneeTaskCount != null && (
            <span className="text-muted-foreground text-xs">{task.assigneeTaskCount} tasks</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-accent inline-flex h-8 w-8 items-center justify-center rounded-md p-0">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
