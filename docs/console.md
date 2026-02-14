# FaultLine Console

FaultLine Console is the control plane for local stack operations.

## Routing Model

The gateway routes:

- `/` -> `console-ui`
- `/api/*` -> `console-api`
- `/grafana/*` -> `grafana:3000`

Grafana is configured for subpath serving with:

- `GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s:%(http_port)s/grafana/`
- `GF_SERVER_SERVE_FROM_SUB_PATH=true`

## UI Pages

- `Overview`
  - Stack health, targets up, alerts firing, last-seen hints
  - Quick actions for dashboards, health check, and apply flow
- `Services`
  - Service table
  - Right-side drawer with `Summary`, `Logs`, `Traces`
- `Explore`
  - Quick links into Grafana Explore for logs/traces/metrics
- `Alerts`
  - Current rule list
  - Template-based rule generation
- `Config`
  - Simple mode inputs:
    - Enable db profile (status hint)
    - Enable host profile (status hint)
    - Add scrape target
    - Prometheus retention
  - Buttons: `Validate`, `Apply`, `Rollback`
  - Advanced mode: raw YAML editors for collector and Prometheus
- `Health`
  - Component health checklist
  - Prometheus targets table
  - Degraded-state suggestions

## Apply Pipeline

`POST /api/config/apply`:

1. Snapshot managed files to `/var/lib/faultline/versions/<version-id>`.
   Managed snapshot set: `compose/docker-compose.yml`, `compose/otel/collector.yaml`, `compose/prometheus/prometheus.yml`,
   `compose/prometheus/rules/faultline-alerts.yml`, `compose/prometheus/rules/faultline-generated-alerts.yml`,
   `compose/tempo/config.yml`, `compose/loki/config.yml`.
2. Build candidate config from simple model and/or raw YAML.
3. Validate YAML and consistency rules.
4. Atomically write files.
5. Reload Prometheus (`POST http://prometheus:9090/-/reload`).
6. Restart impacted containers using Docker API (`docker.sock`).
7. Run health checks.
8. Auto-rollback on failure.

## Rollback

`POST /api/config/rollback`:

- Restores latest successful snapshot (or requested version id).
- Re-applies configs, reloads Prometheus, restarts managed services, and re-checks health.

## Alerts API

- `GET /api/alerts`
  - Returns parsed rules from:
    - `compose/prometheus/rules/faultline-alerts.yml`
    - `compose/prometheus/rules/faultline-generated-alerts.yml`
- `POST /api/alerts`
  - Creates template-based rules:
    - high error rate
    - high latency p95
    - service down
  - Writes generated rules file and reloads Prometheus.

## Security

`console-api` uses `/var/run/docker.sock` to restart containers.

Treat this as privileged access and run only in trusted local environments unless additional security controls are added.
