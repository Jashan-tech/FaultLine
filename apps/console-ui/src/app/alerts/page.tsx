'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AlertRule = { alert: string; expr: string; for: string };

export default function AlertsPage(): React.JSX.Element {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [service, setService] = useState('node-express-example');
  const [threshold, setThreshold] = useState('0.05');
  const [duration, setDuration] = useState('5m');

  async function refreshRules(): Promise<void> {
    const response = await fetch('/api/alerts');
    const data = (await response.json()) as {
      base?: { groups?: Array<{ rules?: AlertRule[] }> };
      generated?: { groups?: Array<{ rules?: AlertRule[] }> };
    };

    const nextRules = [
      ...(data.base?.groups?.flatMap((group) => group.rules || []) || []),
      ...(data.generated?.groups?.flatMap((group) => group.rules || []) || [])
    ];

    setRules(nextRules);
  }

  useEffect(() => {
    void refreshRules();
  }, []);

  async function createAlert(): Promise<void> {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'high_error_rate',
        service,
        symptom: 'errors',
        threshold: Number(threshold),
        duration
      })
    });

    await refreshRules();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Alerts</h2>

      <Card>
        <CardHeader>
          <CardTitle>Create Alert</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Service" />
          <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Threshold" />
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration" />
          <Button onClick={() => void createAlert()}>Create</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rules.map((rule) => (
            <div key={rule.alert} className="rounded-md border border-border p-3">
              <p className="font-medium">{rule.alert}</p>
              <p className="text-muted-foreground">for: {rule.for}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{rule.expr}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
