'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Status = {
  stackHealthy: boolean;
  targetsUp: number;
  alertsFiring: number;
  lastSeen: { traces: string | null; logs: string | null; metrics: string | null };
};

const fallback: Status = {
  stackHealthy: false,
  targetsUp: 0,
  alertsFiring: 0,
  lastSeen: { traces: null, logs: null, metrics: null }
};

export default function OverviewPage(): React.JSX.Element {
  const [status, setStatus] = useState<Status>(fallback);

  useEffect(() => {
    void fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setStatus(data as Status))
      .catch(() => setStatus(fallback));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Stack Health</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{status.stackHealthy ? 'Healthy' : 'Degraded'}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Targets Up</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{status.targetsUp}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts Firing</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{status.alertsFiring}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>Traces last seen: {status.lastSeen.traces ?? 'N/A'}</Badge>
        <Badge>Logs last seen: {status.lastSeen.logs ?? 'N/A'}</Badge>
        <Badge>Metrics last seen: {status.lastSeen.metrics ?? 'N/A'}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/grafana/dashboards">
          <Button>Open Dashboards</Button>
        </Link>
        <Link href="/health">
          <Button variant="outline">Run Health Check</Button>
        </Link>
        <Link href="/config">
          <Button variant="outline">Apply Config</Button>
        </Link>
      </div>
    </div>
  );
}
