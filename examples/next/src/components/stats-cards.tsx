import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { r } from '@/lib/relayer';

interface StatusCount {
  status: string;
  _count: number;
}

export async function StatsCards() {
  const [total, rawByStatus] = await Promise.all([
    r.tasks.count(),
    r.tasks.aggregate({ groupBy: ['status'], _count: true }),
  ]);

  const byStatus = (Array.isArray(rawByStatus) ? rawByStatus : []) as unknown as StatusCount[];
  const getCount = (status: string) => byStatus.find((s) => s.status === status)?._count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <StatCard label="Total" value={Number(total)} />
      <StatCard label="Todo" value={getCount('todo')} />
      <StatCard label="In Progress" value={getCount('in-progress')} />
      <StatCard label="Done" value={getCount('done')} />
      <StatCard label="Cancelled" value={getCount('cancelled')} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
