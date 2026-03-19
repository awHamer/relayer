import { StatsCards } from '@/components/stats-cards';
import { TaskList } from '@/components/tasks/task-list';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground text-sm">Here's a list of your tasks.</p>
      </div>

      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading stats...</div>}>
        <StatsCards />
      </Suspense>

      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading tasks...</div>}>
        <TaskList />
      </Suspense>
    </div>
  );
}
