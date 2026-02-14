'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

type StatusResponse = {
  services: Array<{ name: string; ok: boolean; detail: string }>;
  stackHealthy: boolean;
};

type TargetsResponse = {
  targets: Array<{ job: string; instance: string; health: string; lastError: string }>;
};

export default function HealthPage(): React.JSX.Element {
  const [status, setStatus] = useState<StatusResponse>({ services: [], stackHealthy: false });
  const [targets, setTargets] = useState<TargetsResponse>({ targets: [] });

  useEffect(() => {
    void fetch('/api/status')
      .then((res) => res.json())
      .then((data: StatusResponse) => setStatus(data))
      .catch(() => undefined);

    void fetch('/api/targets')
      .then((res) => res.json())
      .then((data: TargetsResponse) => setTargets(data))
      .catch(() => undefined);
  }, []);

  const degraded = !status.stackHealthy || targets.targets.some((target) => target.health.toLowerCase() !== 'up');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Health</h2>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {status.services.map((service) => (
            <p key={service.name}>
              {service.ok ? '✔' : '✖'} {service.name} ({service.detail})
            </p>
          ))}
          {degraded ? <p className="text-amber-600">Suggestion: run Config → Validate, then Apply or Rollback.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prometheus Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Job</TH>
                <TH>Instance</TH>
                <TH>Health</TH>
                <TH>Last Error</TH>
              </TR>
            </THead>
            <TBody>
              {targets.targets.map((target) => (
                <TR key={`${target.job}-${target.instance}`}>
                  <TD>{target.job}</TD>
                  <TD>{target.instance}</TD>
                  <TD>{target.health}</TD>
                  <TD>{target.lastError || '-'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
