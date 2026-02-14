'use client';

import { useMemo, useState } from 'react';
import { IframePanel } from '@/components/iframe-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildLogsExploreUrl,
  buildMetricsExploreUrl,
  buildTracesExploreUrl
} from '@/lib/grafana-links';
import { useSelectedService } from '@/lib/selected-service';
import { cn } from '@/lib/utils';

type ViewKey = 'logs' | 'traces' | 'metrics';

export default function ExplorePage(): React.JSX.Element {
  const [selectedService] = useSelectedService();
  const [view, setView] = useState<ViewKey>('logs');

  const activeService = selectedService || 'node-express-example';

  const views = useMemo(
    () => ({
      logs: {
        label: 'Logs',
        src: buildLogsExploreUrl(activeService)
      },
      traces: {
        label: 'Traces',
        src: buildTracesExploreUrl(activeService)
      },
      metrics: {
        label: 'Metrics',
        src: buildMetricsExploreUrl(activeService)
      }
    }),
    [activeService]
  );

  const active = views[view];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Explore</h2>

      <Card>
        <CardHeader>
          <CardTitle>Signal Type</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
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
          <span className="text-xs text-muted-foreground">Service: {activeService}</span>
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
