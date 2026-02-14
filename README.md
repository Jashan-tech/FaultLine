# FaultLine

FaultLine is a self-hosted observability stack with a built-in control plane UI.

## What Changed

FaultLine now runs with a single public entrypoint:

- Start command: `docker compose -f compose/docker-compose.yml up -d`
- Console URL: `http://localhost:8080`
- Grafana URL (proxied): `http://localhost:8080/grafana`
- Console API (proxied): `http://localhost:8080/api`

The FaultLine Console is the control plane (config, health, alert generation, apply/rollback).
Grafana is the view plane (dashboards, explore, traces, logs, metrics).
Grafana pages are embedded in the console where appropriate so operations and analysis stay in one UI.

## Architecture

- `gateway` (Caddy) is the only service that publishes a host port (`8080`).
- `console-ui` (Next.js) serves the Console UI under `/`.
- `console-api` (Node/TypeScript) serves config and operations endpoints under `/api`.
- Grafana OSS is served behind `/grafana`.
- OTLP HTTP ingress is available through the gateway at `/otlp`.
- Core observability services run internal-only on the Docker network:
  - OpenTelemetry Collector
  - Prometheus
  - Loki
  - Tempo
  - Grafana OSS

Telemetry path:

1. Apps send OTLP HTTP to the collector (`http://localhost:8080/otlp` externally, `otel-collector:4318` internally).
2. Collector exports traces to Tempo OTLP HTTP (`http://tempo:4318`).
3. Collector exports OTLP metrics through its Prometheus exporter (`otel-collector:8889/metrics`).
4. Prometheus scrapes:
   - `otel-collector:8888` (collector self-metrics)
   - `otel-collector:8889` (application metrics from OTLP metrics pipeline)

## Quickstart

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.20+

### Run

```bash
docker compose -f compose/docker-compose.yml up -d --build
```

### Open

- Console: `http://localhost:8080`
- Getting Started wizard: `http://localhost:8080/getting-started`
- Grafana (proxied): `http://localhost:8080/grafana`

## Getting Started

Use the Console wizard at `http://localhost:8080/getting-started` for beginner onboarding.

The wizard walks through:

1. Starting the stack
2. Copy-paste OTEL env vars
3. Running signal verification (`metrics`, `logs`, `traces`) via `/api/signals`

## Example App (Validation Harness)

`examples/node-express` exists for validation and demos only.

It is used by smoke tests to prove telemetry flow and should not be treated as a product feature.

## FaultLine Console

The console is intentionally minimal and centered on operations:

- `Overview`: stack health, targets, firing alerts, quick actions
- `Getting Started`: beginner-friendly onboarding + signal verification
- `Services`: service list with summary/logs/traces drawer
- `Explore`: embedded Grafana Explore views
- `Alerts`: template-based rule creation with preview
- `Config`: simple mode + optional raw YAML edits
- `Health`: component checks + Prometheus targets table

Embedded dashboard links use Grafana kiosk mode (`?kiosk`) where supported to reduce iframe chrome.

See `docs/console.md` for details.

## Alert Templates

The Alerts page supports these templates:

- Service Down
- High Error Rate
- High Latency (p95)
- High CPU (host profile)
- High Memory (host profile)

Templates that require HTTP instrumentation metrics:

- High Error Rate
- High Latency (p95)

## Apply and Rollback Behavior

`POST /api/config/apply` pipeline:

1. Snapshot managed config files to versioned state (`/var/lib/faultline/versions/<timestamp>`).
   Managed snapshots include:
   `compose/docker-compose.yml`, `compose/otel/collector.yaml`, `compose/prometheus/prometheus.yml`,
   `compose/prometheus/rules/faultline-alerts.yml`, `compose/prometheus/rules/faultline-generated-alerts.yml`,
   `compose/tempo/config.yml`, `compose/loki/config.yml`.
2. Apply simple model changes and/or raw YAML overrides.
3. Validate syntax and consistency rules.
4. Write config files atomically.
5. Reload Prometheus via `POST /-/reload`.
6. Restart impacted services through Docker API (`docker.sock`) when needed.
7. Run health checks.
8. If checks fail, automatically rollback to the previous snapshot and re-run reload/restarts.

Rollback endpoint:

- `POST /api/config/rollback` restores the latest successful version (or a specified version id).

## Testing

### Console checks

```bash
bash scripts/console_verify.sh
```

### End-to-end smoke test

```bash
bash scripts/e2e_smoke.sh
```

This test uses `examples/node-express` as a harness, generates traffic, and verifies telemetry signal flow through `/api/signals`.
The harness runs in a temporary Docker container during the test.
Trace verification is best-effort when Tempo search returns no results; the script will print a warning in that case.

### Gateway smoke test

```bash
bash scripts/verify.sh
```

## Profiles

Compose profiles are preserved:

- `db`: PostgreSQL + Redis + exporters
- `host`: node-exporter

## Security Notes

`console-api` mounts `/var/run/docker.sock` so it can restart containers and orchestrate apply/rollback.

This effectively grants Docker control to the API container.
Grafana embedding is enabled (`GF_SECURITY_ALLOW_EMBEDDING=true`) for this local appliance-style setup.

Use this in local, trusted environments only.
Do not expose this stack directly to untrusted networks without additional hardening, authentication, and network controls.

The console theme is intentionally styled close to Grafana (compact, panel-oriented, neutral surfaces) for seamless embedding.

## Ports

Public host ports:

- `8080` (gateway only)

All other service ports are internal to the `observability` Docker network.

## References

- Console details: `docs/console.md`
- Compose stack: `compose/docker-compose.yml`
- Collector config: `compose/otel/collector.yaml`
- Prometheus config: `compose/prometheus/prometheus.yml`
