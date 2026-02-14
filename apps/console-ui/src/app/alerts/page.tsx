'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  pickDefaultService,
  useSelectedService,
  useServiceOptions
} from '@/lib/selected-service';

type AlertTemplate = 'service_down' | 'high_error_rate' | 'high_latency_p95' | 'high_cpu' | 'high_memory';
type AlertRule = { alert: string; expr: string; for: string };

type TemplateConfig = {
  label: string;
  defaultThreshold: number;
  unit: string;
  defaultDuration: string;
  requiresHttpMetrics: boolean;
  description: string;
  example: string;
};

const templates: Record<AlertTemplate, TemplateConfig> = {
  service_down: {
    label: 'Service Down',
    defaultThreshold: 0,
    unit: 'state',
    defaultDuration: '2m',
    requiresHttpMetrics: false,
    description: 'Alerts when the selected service no longer reports healthy targets.',
    example: 'Use 2m for production services to avoid false positives during restarts.'
  },
  high_error_rate: {
    label: 'High Error Rate',
    defaultThreshold: 0.05,
    unit: 'ratio',
    defaultDuration: '5m',
    requiresHttpMetrics: true,
    description: 'Alerts when HTTP 4xx/5xx ratio exceeds threshold.',
    example: 'Start with 0.05 for 5% error budget burn over 5 minutes.'
  },
  high_latency_p95: {
    label: 'High Latency (p95)',
    defaultThreshold: 1,
    unit: 'seconds',
    defaultDuration: '5m',
    requiresHttpMetrics: true,
    description: 'Alerts when p95 latency rises above threshold.',
    example: 'Start with 1 second for APIs and adjust based on SLO targets.'
  },
  high_cpu: {
    label: 'High CPU (host profile)',
    defaultThreshold: 80,
    unit: '%',
    defaultDuration: '5m',
    requiresHttpMetrics: false,
    description: 'Alerts on high host CPU usage from node-exporter metrics.',
    example: 'Use 80% for 5m to catch sustained load spikes.'
  },
  high_memory: {
    label: 'High Memory (host profile)',
    defaultThreshold: 85,
    unit: '%',
    defaultDuration: '5m',
    requiresHttpMetrics: false,
    description: 'Alerts on high host memory usage from node-exporter metrics.',
    example: 'Use 85% for 5m to catch memory pressure before OOM.'
  }
};

function buildPreview(template: AlertTemplate, service: string, threshold: number, duration: string): string {
  switch (template) {
    case 'service_down':
      return `sum(up{job="${service}"} or up{service="${service}"}) == 0\nfor: ${duration}`;
    case 'high_error_rate':
      return `sum(rate(http_requests_total{job="${service}",status_code=~"5..|4.."}[5m]) or rate(http_requests_total{service="${service}",status_code=~"5..|4.."}[5m]))\n/\nsum(rate(http_requests_total{job="${service}"}[5m]) or rate(http_requests_total{service="${service}"}[5m])) > ${threshold}\nfor: ${duration}`;
    case 'high_latency_p95':
      return `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="${service}"}[5m]) or rate(http_request_duration_seconds_bucket{service="${service}"}[5m])) by (le)) > ${threshold}\nfor: ${duration}`;
    case 'high_cpu':
      return `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > ${threshold}\nfor: ${duration}`;
    case 'high_memory':
      return `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > ${threshold}\nfor: ${duration}`;
    default:
      return '';
  }
}

export default function AlertsPage(): React.JSX.Element {
  const { services } = useServiceOptions();
  const [selectedService, setSelectedService] = useSelectedService();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [template, setTemplate] = useState<AlertTemplate>('service_down');
  const [threshold, setThreshold] = useState(String(templates.service_down.defaultThreshold));
  const [duration, setDuration] = useState(templates.service_down.defaultDuration);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedService && services.length > 0) {
      setSelectedService(pickDefaultService(services));
    }
  }, [selectedService, services, setSelectedService]);

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
    setCreating(true);
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          service: selectedService,
          threshold: Number(threshold),
          duration
        })
      });

      await refreshRules();
    } finally {
      setCreating(false);
    }
  }

  const selectedTemplate = templates[template];
  const preview = useMemo(
    () => buildPreview(template, selectedService || 'node-express-example', Number(threshold || 0), duration || '5m'),
    [duration, selectedService, template, threshold]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Alerts</h2>

      <Card>
        <CardHeader>
          <CardTitle>Create Alert</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Template</span>
            <select
              value={template}
              onChange={(event) => {
                const nextTemplate = event.target.value as AlertTemplate;
                setTemplate(nextTemplate);
                setThreshold(String(templates[nextTemplate].defaultThreshold));
                setDuration(templates[nextTemplate].defaultDuration);
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {Object.entries(templates).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Service</span>
            <select
              value={selectedService}
              onChange={(event) => setSelectedService(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {(services.length > 0 ? services : ['node-express-example']).map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Threshold ({selectedTemplate.unit})</span>
            <Input value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder="Threshold" />
          </label>

          <label className="space-y-1 text-sm">
            <span>Duration</span>
            <Input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="e.g. 5m" />
          </label>

          <div className="md:col-span-2">
            <Button onClick={() => void createAlert()} disabled={creating || !selectedService}>
              {creating ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Examples and Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{selectedTemplate.description}</p>
          <p className="text-muted-foreground">Example: {selectedTemplate.example}</p>
          {selectedTemplate.requiresHttpMetrics ? (
            <p className="rounded-md border border-border bg-muted p-2 text-xs">
              Requires HTTP instrumentation metrics (`http_requests_total` and latency histogram metrics).
            </p>
          ) : null}
          <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">{preview}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rules.map((rule) => (
            <div key={`${rule.alert}-${rule.expr}`} className="rounded-md border border-border p-3">
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
