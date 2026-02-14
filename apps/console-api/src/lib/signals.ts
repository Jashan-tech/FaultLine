import { serviceUrls } from './paths.js';

type PrometheusTarget = {
  labels?: Record<string, string>;
  discoveredLabels?: Record<string, string>;
  health?: string;
};

type PrometheusTargetsResponse = {
  data?: {
    activeTargets?: PrometheusTarget[];
  };
};

type MetricSignal = { ok: boolean; detail: string; evidence?: Record<string, unknown> };
type LogSignal = { ok: boolean; detail: string; evidence?: Record<string, unknown> };
type TraceSignal = { ok: boolean; detail: string; evidence?: Record<string, unknown> };

export type SignalsResult = {
  ok: boolean;
  serviceCandidates: string[];
  selectedService?: string;
  metrics: MetricSignal;
  logs: LogSignal;
  traces: TraceSignal;
  hints: string[];
};

async function fetchTargets(): Promise<PrometheusTarget[]> {
  const response = await fetch(`${serviceUrls.prometheus}/api/v1/targets`);
  if (!response.ok) {
    throw new Error(`prometheus targets request failed: ${response.status}`);
  }

  const payload = (await response.json()) as PrometheusTargetsResponse;
  return payload.data?.activeTargets || [];
}

export function deriveServiceCandidates(targets: PrometheusTarget[]): string[] {
  const names = new Set<string>();

  for (const target of targets) {
    const labels = target.labels || {};
    const discovered = target.discoveredLabels || {};

    const job = labels.job;
    const service = labels.service;
    const discoveredJob = discovered.job;

    if (job) {
      names.add(job);
    }
    if (service) {
      names.add(service);
    }
    if (discoveredJob) {
      names.add(discoveredJob);
    }
  }

  if (names.has('example-node')) {
    names.add('node-express-example');
  }

  return [...names].filter(Boolean).sort();
}

async function queryPrometheusSeries(query: string): Promise<Array<Record<string, unknown>>> {
  const url = `${serviceUrls.prometheus}/api/v1/query?query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`prometheus query failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { result?: Array<Record<string, unknown>> };
  };

  return payload.data?.result || [];
}

async function checkMetrics(selectedService?: string): Promise<MetricSignal> {
  try {
    const [upSeries, anySeries] = await Promise.all([
      queryPrometheusSeries('up'),
      queryPrometheusSeries('{__name__!=""}')
    ]);

    const serviceSeries = selectedService
      ? await queryPrometheusSeries(`up{job="${selectedService}"} or up{service="${selectedService}"}`)
      : [];

    const ok = upSeries.length > 0 && anySeries.length > 0;
    const detail = ok
      ? `Prometheus reachable (${upSeries.length} up series, ${anySeries.length} total series sample)`
      : 'Prometheus reachable but no active series found';

    return {
      ok,
      detail,
      evidence: {
        upSeries: upSeries.length,
        anySeries: anySeries.length,
        selectedServiceSeries: serviceSeries.length
      }
    };
  } catch (error) {
    return {
      ok: false,
      detail: `Prometheus check failed: ${(error as Error).message}`
    };
  }
}

function nowNs(): bigint {
  return BigInt(Date.now()) * 1000000n;
}

async function queryLoki(query: string): Promise<Array<Record<string, unknown>>> {
  const end = nowNs();
  const start = end - 10n * 60n * 1000000000n;
  const url =
    `${serviceUrls.loki}/loki/api/v1/query_range?query=${encodeURIComponent(query)}` +
    `&start=${start.toString()}&end=${end.toString()}&limit=50`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`loki query failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { result?: Array<Record<string, unknown>> };
  };

  return payload.data?.result || [];
}

async function checkLogs(selectedService?: string): Promise<LogSignal> {
  try {
    const broad = await queryLoki('{job=~".+"}');

    let selected: Array<Record<string, unknown>> = [];
    if (selectedService) {
      selected = await queryLoki(`{job="${selectedService}"}`);
      if (selected.length === 0) {
        selected = await queryLoki(`{service="${selectedService}"}`);
      }
    }

    const active = selectedService ? (selected.length > 0 ? selected : broad) : broad;
    const ok = active.length > 0;

    return {
      ok,
      detail: ok
        ? `Loki returned ${active.length} stream(s) in the last 10m`
        : 'Loki reachable but no streams found in the last 10m',
      evidence: {
        broadStreams: broad.length,
        selectedStreams: selected.length
      }
    };
  } catch (error) {
    return {
      ok: false,
      detail: `Loki check failed: ${(error as Error).message}`
    };
  }
}

async function tempoSearch(url: URL): Promise<{ ok: boolean; traces: unknown[]; status: number }> {
  const response = await fetch(url);
  const status = response.status;
  if (!response.ok) {
    return { ok: false, traces: [], status };
  }

  const payload = (await response.json()) as { traces?: unknown[] };
  return {
    ok: true,
    traces: payload.traces || [],
    status
  };
}

function readPrometheusValue(series: Array<Record<string, unknown>>): number {
  const raw = (series[0] as { value?: [number, string] } | undefined)?.value?.[1];
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

async function checkTraces(selectedService?: string): Promise<TraceSignal> {
  try {
    const base = new URL('/api/search', serviceUrls.tempo);
    base.searchParams.set('limit', '5');

    if (selectedService) {
      const byServiceName = new URL(base.toString());
      byServiceName.searchParams.set('tags', `service.name=${selectedService}`);
      let result = await tempoSearch(byServiceName);

      if (result.ok && result.traces.length > 0) {
        return {
          ok: true,
          detail: `Tempo search found ${result.traces.length} trace(s) for ${selectedService}`,
          evidence: { traces: result.traces.length, query: byServiceName.toString() }
        };
      }

      const byResourceServiceName = new URL(base.toString());
      byResourceServiceName.searchParams.set('tags', `resource.service.name=${selectedService}`);
      result = await tempoSearch(byResourceServiceName);
      if (result.ok && result.traces.length > 0) {
        return {
          ok: true,
          detail: `Tempo search found ${result.traces.length} trace(s) for ${selectedService}`,
          evidence: { traces: result.traces.length, query: byResourceServiceName.toString() }
        };
      }
    }

    const broad = await tempoSearch(base);
    if (broad.ok && broad.traces.length > 0) {
      return {
        ok: true,
        detail: `Tempo search found ${broad.traces.length} recent trace(s)`,
        evidence: { traces: broad.traces.length }
      };
    }

    const [acceptedSeries, sentSeries] = await Promise.all([
      queryPrometheusSeries('sum(otelcol_receiver_accepted_spans)'),
      queryPrometheusSeries('sum(otelcol_exporter_sent_spans)')
    ]);
    const acceptedSpans = readPrometheusValue(acceptedSeries);
    const sentSpans = readPrometheusValue(sentSeries);

    if (acceptedSpans > 0 || sentSpans > 0) {
      return {
        ok: true,
        detail: `Collector span counters show traffic (accepted=${acceptedSpans}, sent=${sentSpans})`,
        evidence: { acceptedSpans, sentSpans, tempoSearchOk: broad.ok, tempoStatus: broad.status }
      };
    }

    if (!broad.ok) {
      return {
        ok: false,
        detail: `Tempo search unavailable (best-effort): http_${broad.status}`
      };
    }

    return {
      ok: false,
      detail: 'Tempo reachable but no traces returned by search endpoint (best-effort)'
    };
  } catch (error) {
    return {
      ok: false,
      detail: `Tempo trace check failed (best-effort): ${(error as Error).message}`
    };
  }
}

function buildHints(metrics: MetricSignal, logs: LogSignal, traces: TraceSignal): string[] {
  const hints: string[] = [];

  if (!metrics.ok) {
    hints.push('Set OTEL exporter vars: OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:8080/otlp and OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf.');
    hints.push('Confirm Prometheus scrapes otel-collector exporter at otel-collector:8889 (job otel-collector-exporter).');
  }

  if (!logs.ok) {
    hints.push('Confirm collector logs pipeline exports to Loki and your app emits OTLP logs.');
    hints.push('For demos, push one sample log line to Loki and re-run verification.');
  }

  if (!traces.ok) {
    hints.push('Confirm traces are exported to the collector and collector exports traces to Tempo at http://tempo:4318.');
    hints.push('If Tempo search is unavailable, use Grafana Explore -> Tempo to validate recent traces manually.');
  }

  return hints;
}

export async function listServices(): Promise<string[]> {
  const targets = await fetchTargets();
  return deriveServiceCandidates(targets);
}

export async function collectSignals(requestedService?: string): Promise<SignalsResult> {
  const serviceCandidates = await listServices();
  const preferred = requestedService?.trim();
  const selectedService =
    (preferred && serviceCandidates.includes(preferred) ? preferred : undefined) ||
    (serviceCandidates.includes('node-express-example') ? 'node-express-example' : serviceCandidates[0]);

  const [metrics, logs, traces] = await Promise.all([
    checkMetrics(selectedService),
    checkLogs(selectedService),
    checkTraces(selectedService)
  ]);

  return {
    ok: metrics.ok && logs.ok && traces.ok,
    serviceCandidates,
    selectedService,
    metrics,
    logs,
    traces,
    hints: buildHints(metrics, logs, traces)
  };
}
