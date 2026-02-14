'use client';

import { useState } from 'react';
import { IframePanel } from '@/components/iframe-panel';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const views = {
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
  },
  metrics: {
    label: 'Metrics',
    src:
      '/grafana/explore?left=' +
      encodeURIComponent(
        JSON.stringify({ datasource: 'Prometheus', queries: [{ expr: 'sum(rate(http_requests_total[5m]))' }], range: { from: 'now-30m', to: 'now' } })
      )
  }
} as const;

type ViewKey = keyof typeof views;

export default function ExplorePage(): React.JSX.Element {
  const [view, setView] = useState<ViewKey>('logs');
  const active = views[view];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Explore</h2>

      <Card>
        <CardHeader>
          <CardTitle>Signal Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-flex rounded-md border border-border bg-muted p-1">
            {(Object.keys(views) as ViewKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  'rounded px-4 py-2 text-sm transition-colors',
                  key === view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {views[key].label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <IframePanel
        title={`${active.label} Explorer`}
        src={active.src}
        description="Interactive Grafana explorer embedded in the Console."
        iframeClassName="h-[68vh]"
      />
    </div>
  );
}
