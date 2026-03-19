import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock,
  XCircle,
} from 'lucide-react';

export const statusConfig = {
  todo: { icon: Circle, label: 'Todo' },
  'in-progress': { icon: Clock, label: 'In Progress' },
  done: { icon: CheckCircle2, label: 'Done' },
  cancelled: { icon: XCircle, label: 'Cancelled' },
  backlog: { icon: CircleDashed, label: 'Backlog' },
} as const;

export const priorityConfig = {
  low: { icon: ArrowDown, label: 'Low' },
  medium: { icon: ArrowRight, label: 'Medium' },
  high: { icon: ArrowUp, label: 'High' },
} as const;
