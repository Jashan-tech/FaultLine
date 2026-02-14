'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSelectedService } from '@/lib/selected-service';

type SignalResult = {
  ok: boolean;
  serviceCandidates: string[];
  selectedService?: string;
  metrics: { ok: boolean; detail: string };
  logs: { ok: boolean; detail: string };
  traces: { ok: boolean; detail: string };
  hints: string[];
};

const steps = ['Start stack', 'Instrument app', 'Verify signals'];

function statusIcon(ok: boolean): string {
  return ok ? '✅' : '❌';
}

export default function GettingStartedPage(): React.JSX.Element {
  const [selectedService] = useSelectedService();
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SignalResult | null>(null);

  const service = selectedService || 'node-express-example';

  const envBlock = useMemo(
    () =>
      [
        'OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:8080/otlp',
        `OTEL_SERVICE_NAME=${service}`,
        'OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf'
      ].join('\n'),
    [service]
  );

  async function runVerification(): Promise<void> {
    setRunning(true);
    try {
      const response = await fetch(`/api/signals?service=${encodeURIComponent(service)}`);
      const payload = (await response.json()) as SignalResult;
      setResult(payload);
      setCurrentStep(2);
    } catch {
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Getting Started</h2>

      <div className="grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step} className={index === currentStep ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle>
                {index + 1}. {step}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Start the stack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>From the repository root:</p>
          <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">
{`docker compose -f compose/docker-compose.yml up -d --build`}
          </pre>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Next: Instrument your app
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Instrument your app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Use these environment variables (copy and paste):</p>
          <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">{envBlock}</pre>
          <p className="text-muted-foreground">The included `examples/node-express` app already works as a validation harness.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Next: Verify signals
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Verify metrics, logs, and traces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Button onClick={() => void runVerification()} disabled={running}>
            {running ? 'Running verification...' : 'Run verification'}
          </Button>

          {result ? (
            <div className="space-y-2">
              <p>{statusIcon(result.metrics.ok)} Metrics: {result.metrics.detail}</p>
              <p>{statusIcon(result.logs.ok)} Logs: {result.logs.detail}</p>
              <p>{statusIcon(result.traces.ok)} Traces: {result.traces.detail}</p>

              {(!result.metrics.ok || !result.logs.ok || !result.traces.ok) && result.hints.length > 0 ? (
                <div className="rounded-md border border-border bg-muted p-3">
                  <p className="mb-1 font-medium">Hints</p>
                  {result.hints.slice(0, 2).map((hint) => (
                    <p key={hint} className="text-xs text-muted-foreground">
                      - {hint}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
