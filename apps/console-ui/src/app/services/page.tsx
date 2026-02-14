'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

type ServiceRow = {
  name: string;
  status: 'up' | 'down';
  type: 'core' | 'profile';
};

const data: ServiceRow[] = [
  { name: 'otel-collector', status: 'up', type: 'core' },
  { name: 'prometheus', status: 'up', type: 'core' },
  { name: 'loki', status: 'up', type: 'core' },
  { name: 'tempo', status: 'up', type: 'core' },
  { name: 'grafana', status: 'up', type: 'core' }
];

export default function ServicesPage(): React.JSX.Element {
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const [tab, setTab] = useState<'summary' | 'logs' | 'traces'>('summary');

  const logsLink = useMemo(
    () => `/grafana/explore?left=${encodeURIComponent(JSON.stringify({ datasource: 'Loki', queries: [{ expr: `{service="${selected?.name || ''}"}` }] }))}`,
    [selected?.name]
  );

  const tracesLink = useMemo(
    () => `/grafana/explore?left=${encodeURIComponent(JSON.stringify({ datasource: 'Tempo', queries: [{ query: `service.name=${selected?.name || ''}` }] }))}`,
    [selected?.name]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Services</h2>
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Type</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((row) => (
                <TR key={row.name} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelected(row)}>
                  <TD>{row.name}</TD>
                  <TD>{row.status}</TD>
                  <TD>{row.type}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-border bg-background p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{selected.name}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <div className="mb-4 flex gap-2">
            <Button variant={tab === 'summary' ? 'default' : 'outline'} size="sm" onClick={() => setTab('summary')}>
              Summary
            </Button>
            <Button variant={tab === 'logs' ? 'default' : 'outline'} size="sm" onClick={() => setTab('logs')}>
              Logs
            </Button>
            <Button variant={tab === 'traces' ? 'default' : 'outline'} size="sm" onClick={() => setTab('traces')}>
              Traces
            </Button>
          </div>

          {tab === 'summary' && <p className="text-sm text-muted-foreground">Status: {selected.status}. Type: {selected.type}.</p>}
          {tab === 'logs' && (
            <Link href={logsLink} className="text-sm text-primary underline">
              Open logs in Grafana Explore
            </Link>
          )}
          {tab === 'traces' && (
            <Link href={tracesLink} className="text-sm text-primary underline">
              Open traces in Grafana Explore
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
