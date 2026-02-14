'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type ConfigResponse = {
  simple: {
    enableDbProfile: boolean;
    enableHostProfile: boolean;
    addScrapeTarget: string;
    prometheusRetention: string;
  };
  raw: {
    collectorYaml: string;
    prometheusYaml: string;
  };
};

export default function ConfigPage(): React.JSX.Element {
  const [dbEnabled, setDbEnabled] = useState(false);
  const [hostEnabled, setHostEnabled] = useState(false);
  const [scrapeTarget, setScrapeTarget] = useState('');
  const [retention, setRetention] = useState('200h');
  const [collectorYaml, setCollectorYaml] = useState('');
  const [prometheusYaml, setPrometheusYaml] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [lastActionAt, setLastActionAt] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/config')
      .then((res) => res.json())
      .then((data: ConfigResponse) => {
        setDbEnabled(data.simple.enableDbProfile);
        setHostEnabled(data.simple.enableHostProfile);
        setScrapeTarget(data.simple.addScrapeTarget || '');
        setRetention(data.simple.prometheusRetention || '200h');
        setCollectorYaml(data.raw.collectorYaml || '');
        setPrometheusYaml(data.raw.prometheusYaml || '');
      })
      .catch(() => setMessage('Failed to load config'));
  }, []);

  async function runValidate(): Promise<void> {
    const response = await fetch('/api/config/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simple: {
          enableDbProfile: dbEnabled,
          enableHostProfile: hostEnabled,
          addScrapeTarget: scrapeTarget,
          prometheusRetention: retention
        },
        raw: advancedOpen ? { collectorYaml, prometheusYaml } : undefined
      })
    });

    const data = await response.json();
    setMessage(data.valid ? 'Validation passed' : `Validation failed: ${(data.errors || []).join('; ')}`);
    setLastActionAt(new Date().toISOString());
  }

  async function runApply(): Promise<void> {
    const response = await fetch('/api/config/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simple: {
          enableDbProfile: dbEnabled,
          enableHostProfile: hostEnabled,
          addScrapeTarget: scrapeTarget,
          prometheusRetention: retention
        },
        raw: advancedOpen ? { collectorYaml, prometheusYaml } : undefined
      })
    });
    const data = await response.json();
    setMessage(data.success ? `Applied version ${data.versionId}` : `Apply failed: ${data.error || 'unknown error'}`);
    setLastActionAt(new Date().toISOString());
  }

  async function runRollback(): Promise<void> {
    const response = await fetch('/api/config/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    setMessage(data.success ? `Rolled back to ${data.versionId}` : `Rollback failed: ${data.error || 'unknown error'}`);
    setLastActionAt(new Date().toISOString());
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Config</h2>

      <Card>
        <CardHeader>
          <CardTitle>Simple Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Enable db profile</span>
            <Switch checked={dbEnabled} onCheckedChange={setDbEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <span>Enable host profile</span>
            <Switch checked={hostEnabled} onCheckedChange={setHostEnabled} />
          </div>
          <Input value={scrapeTarget} onChange={(e) => setScrapeTarget(e.target.value)} placeholder="Add scrape target" />
          <Input value={retention} onChange={(e) => setRetention(e.target.value)} placeholder="Prometheus retention" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void runValidate()}>Validate</Button>
            <Button variant="outline" onClick={() => void runApply()}>
              Apply
            </Button>
            <Button variant="outline" onClick={() => void runRollback()}>
              Rollback
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Advanced Mode{' '}
            <button className="ml-2 text-xs text-primary" onClick={() => setAdvancedOpen(!advancedOpen)}>
              {advancedOpen ? 'Collapse' : 'Expand'}
            </button>
          </CardTitle>
        </CardHeader>
        {advancedOpen ? (
          <CardContent className="space-y-3">
            <Textarea value={collectorYaml} onChange={(e) => setCollectorYaml(e.target.value)} placeholder="collector.yaml" />
            <Textarea
              value={prometheusYaml}
              onChange={(e) => setPrometheusYaml(e.target.value)}
              placeholder="prometheus.yml"
            />
          </CardContent>
        ) : null}
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {lastActionAt ? <p className="text-xs text-muted-foreground">Last action: {lastActionAt}</p> : null}
    </div>
  );
}
