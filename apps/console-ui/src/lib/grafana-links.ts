import { withKiosk } from '@/lib/grafana-url';

function encodeLeftPayload(payload: unknown): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function buildDashboardsUrl(service?: string): string {
  const base = '/grafana/dashboards?orgId=1';
  if (!service) {
    return withKiosk(base);
  }
  return withKiosk(`${base}&var-service=${encodeURIComponent(service)}`);
}

export function buildLogsExploreUrl(service?: string): string {
  const expr = service ? `({job="${service}"} or {service="${service}"} or {job!=""})` : '{job!=""}';

  return (
    '/grafana/explore?left=' +
    encodeLeftPayload({
      datasource: 'Loki',
      queries: [{ expr }],
      range: { from: 'now-30m', to: 'now' }
    })
  );
}

export function buildTracesExploreUrl(service?: string): string {
  const query = service ? `service.name=${service}` : '{ span.http.method != "" }';

  return (
    '/grafana/explore?left=' +
    encodeLeftPayload({
      datasource: 'Tempo',
      queries: [{ query }],
      range: { from: 'now-30m', to: 'now' }
    })
  );
}

export function buildMetricsExploreUrl(service?: string): string {
  const expr = service
    ? `sum(rate(http_requests_total{service="${service}"}[5m])) or sum(rate(http_requests_total{job="${service}"}[5m]))`
    : 'sum(rate(http_requests_total[5m]))';

  return (
    '/grafana/explore?left=' +
    encodeLeftPayload({
      datasource: 'Prometheus',
      queries: [{ expr }],
      range: { from: 'now-30m', to: 'now' }
    })
  );
}
