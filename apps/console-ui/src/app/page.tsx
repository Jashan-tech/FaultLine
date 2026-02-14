'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IframePanel } from '@/components/iframe-panel';
import { cn } from '@/lib/utils';

type Status = {
  stackHealthy: boolean;
  targetsUp: number;
  alertsFiring: number;
  services?: Array<{ name: string; ok: boolean; detail: string }>;
  lastSeen: { traces: string | null; logs: string | null; metrics: string | null };
};

type TargetsResponse = {
  targets: Array<{ job: string; instance: string; health: string; lastError: string }>;
};

type AlertRule = { alert: string; expr: string; for: string };

type AlertsResponse = {
  base?: { groups?: Array<{ rules?: AlertRule[] }> };
  generated?: { groups?: Array<{ rules?: AlertRule[] }> };
};

const fallback: Status = {
  stackHealthy: false,
  targetsUp: 0,
  alertsFiring: 0,
  lastSeen: { traces: null, logs: null, metrics: null }
};

const liveViews = {
  dashboards: {
    label: 'Dashboards',
    src: '/grafana/dashboards?orgId=1'
  },
  logs: {
    label: 'Logs',
    src:
      '/grafana/explore?left=' +
      encodeURIComponent(
        JSON.stringify({ datasource: 'Loki', queries: [{ expr: '{service="node-express-example"}' }], range: { from: 'now-30m', to: 'now' } })
      )
  },
  traces: {
    label: 'Traces',
    src:
      '/grafana/explore?left=' +
      encodeURIComponent(
        JSON.stringify({ datasource: 'Tempo', queries: [{ query: 'service.name=node-express-example' }], range: { from: 'now-30m', to: 'now' } })
      )
  }
} as const;

type LiveViewKey = keyof typeof liveViews;

export default function OverviewPage(): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(fallback);
  const [targets, setTargets] = useState<TargetsResponse>({ targets: [] });
  const [recentAlerts, setRecentAlerts] = useState<AlertRule[]>([]);
  const [liveView, setLiveView] = useState<LiveViewKey>('dashboards');

  useEffect(() => {
    void Promise.all([fetch('/api/status'), fetch('/api/targets'), fetch('/api/alerts')])
      .then(async ([statusRes, targetsRes, alertsRes]) => {
        const statusData = (await statusRes.json()) as Status;
        const targetsData = (await targetsRes.json()) as TargetsResponse;
        const alertsData = (await alertsRes.json()) as AlertsResponse;

        const mergedAlerts = [
          ...(alertsData.base?.groups?.flatMap((group) => group.rules || []) || []),
          ...(alertsData.generated?.groups?.flatMap((group) => group.rules || []) || [])
        ];

        setStatus(statusData);
        setTargets(targetsData);
        setRecentAlerts(mergedAlerts.slice(0, 5));
      })
      .catch(() => {
        setStatus(fallback);
        setTargets({ targets: [] });
        setRecentAlerts([]);
      });
  }, []);

  const downTargets = targets.targets.filter((target) => target.health.toLowerCase() !== 'up');
  const activeView = liveViews[liveView];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Overview</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="h-28">
          <CardHeader>
            <CardTitle>Stack Health</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{status.stackHealthy ? 'Healthy' : 'Degraded'}</CardContent>
        </Card>
        <Card className="h-28">
          <CardHeader>
            <CardTitle>Targets Up</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{status.targetsUp}</CardContent>
        </Card>
        <Card className="h-28">
          <CardHeader>
            <CardTitle>Alerts Firing</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{status.alertsFiring}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="min-h-[38rem]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Live View</CardTitle>
              <div className="inline-flex rounded-md border border-border bg-muted p-1">
                {(Object.keys(liveViews) as LiveViewKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLiveView(key)}
                    className={cn(
                      'rounded px-3 py-1.5 text-sm transition-colors',
                      liveView === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {liveViews[key].label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <IframePanel
              title={activeView.label}
              src={activeView.src}
              description="Embedded Grafana view inside the Console."
              iframeClassName="h-[54vh]"
            />
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card className="min-h-44">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button onClick={() => setLiveView('dashboards')}>Open Dashboards</Button>
              <Button variant="outline" onClick={() => router.push('/health')}>
                Run Health Check
              </Button>
              <Button variant="outline" onClick={() => router.push('/config')}>
                Apply Config
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-44">
            <CardHeader>
              <CardTitle>Recent Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Traces: {status.lastSeen.traces ?? 'N/A'}</Badge>
                <Badge>Logs: {status.lastSeen.logs ?? 'N/A'}</Badge>
                <Badge>Metrics: {status.lastSeen.metrics ?? 'N/A'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Latest checks and apply actions appear here as the stack is used.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{downTargets.length > 0 ? `Targets Down (${downTargets.length})` : 'Recent Alerts'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {downTargets.length > 0
            ? downTargets.slice(0, 4).map((target) => (
                <p key={`${target.job}-${target.instance}`}>
                  {target.job} / {target.instance}
                </p>
              ))
            : recentAlerts.slice(0, 4).map((rule) => <p key={rule.alert}>{rule.alert}</p>)}
          {downTargets.length === 0 && recentAlerts.length === 0 ? <p className="text-muted-foreground">No alerts in the recent rule set.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
