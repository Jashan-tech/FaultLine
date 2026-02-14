import { serviceUrls } from './paths.js';

type HealthItem = {
  name: string;
  ok: boolean;
  detail: string;
};

async function check(name: string, url: string): Promise<HealthItem> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return {
      name,
      ok: response.ok,
      detail: response.ok ? 'ok' : `http_${response.status}`
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: (error as Error).message
    };
  }
}

async function queryPrometheusInstant(query: string): Promise<number | null> {
  try {
    const response = await fetch(`${serviceUrls.prometheus}/api/v1/query?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      status: string;
      data?: { result?: Array<{ value: [number, string] }> };
    };

    const value = data.data?.result?.[0]?.value?.[1];
    if (!value) {
      return null;
    }

    return Number(value);
  } catch {
    return null;
  }
}

export async function collectHealthSummary(): Promise<{
  services: HealthItem[];
  stackHealthy: boolean;
  lastSeen: { traces: string | null; logs: string | null; metrics: string | null };
  alertsFiring: number;
  targetsUp: number;
}> {
  const [grafana, prometheus, loki, tempo, collector] = await Promise.all([
    check('grafana', `${serviceUrls.grafana}/api/health`),
    check('prometheus', `${serviceUrls.prometheus}/-/ready`),
    check('loki', `${serviceUrls.loki}/ready`),
    check('tempo', `${serviceUrls.tempo}/status`),
    check('otel-collector', serviceUrls.collectorMetrics)
  ]);

  const [alertsFiring, targetsUpEpoch, lastTraceNano] = await Promise.all([
    queryPrometheusInstant('sum(ALERTS{alertstate="firing"})'),
    queryPrometheusInstant('max(timestamp(up == 1))'),
    (async () => {
      try {
        const response = await fetch(`${serviceUrls.tempo}/api/search?limit=1`);
        if (!response.ok) {
          return null;
        }
        const body = (await response.json()) as { traces?: Array<{ startTimeUnixNano?: string }> };
        return body.traces?.[0]?.startTimeUnixNano || null;
      } catch {
        return null;
      }
    })()
  ]);

  const lastLogEpoch = await (async () => {
    try {
      const response = await fetch(
        `${serviceUrls.loki}/loki/api/v1/query?query=${encodeURIComponent('{job=~".+"}')}&limit=1`
      );
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as {
        data?: { result?: Array<{ values?: Array<[string, string]> }> };
      };
      const first = body.data?.result?.[0]?.values?.[0]?.[0];
      if (!first) {
        return null;
      }
      return Number(first) / 1e9;
    } catch {
      return null;
    }
  })();

  const services = [grafana, prometheus, loki, tempo, collector];
  const stackHealthy = services.every((item) => item.ok);

  return {
    services,
    stackHealthy,
    lastSeen: {
      metrics: targetsUpEpoch ? new Date(targetsUpEpoch * 1000).toISOString() : null,
      traces: lastTraceNano ? new Date(Number(lastTraceNano) / 1e6).toISOString() : null,
      logs: lastLogEpoch ? new Date(lastLogEpoch * 1000).toISOString() : null
    },
    alertsFiring: Number.isFinite(alertsFiring || NaN) ? Number(alertsFiring) : 0,
    targetsUp: targetsUpEpoch ? 1 : 0
  };
}
