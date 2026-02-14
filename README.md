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

## Architecture

- `gateway` (Caddy) is the only service that publishes a host port (`8080`).
- `console-ui` (Next.js) serves the Console UI under `/`.
- `console-api` (Node/TypeScript) serves config and operations endpoints under `/api`.
- Grafana OSS is served behind `/grafana`.
- Core observability services run internal-only on the Docker network:
  - OpenTelemetry Collector
  - Prometheus
  - Loki
  - Tempo
  - Grafana OSS

Telemetry path:

1. Apps send OTLP HTTP to the collector (`otel-collector:4318`).
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
docker compose -f compose/docker-compose.yml up -d
```

### Open

- Console: `http://localhost:8080`
- Grafana (proxied): `http://localhost:8080/grafana`

## FaultLine Console

The console is intentionally minimal and centered on operations:

- `Overview`: stack health, targets, firing alerts, quick actions
- `Services`: service list with summary/logs/traces drawer
- `Explore`: quick links into Grafana Explore
- `Alerts`: list rules and create generated rules from templates
- `Config`: simple mode + optional raw YAML edits
- `Health`: component checks + Prometheus targets table

See `docs/console.md` for details.

## Apply and Rollback Behavior

`POST /api/config/apply` pipeline:

1. Snapshot managed config files to versioned state (`/var/lib/faultline/versions/<timestamp>`).
2. Apply simple model changes and/or raw YAML overrides.
3. Validate syntax and consistency rules.
4. Write config files atomically.
5. Reload Prometheus via `POST /-/reload`.
6. Restart impacted services through Docker API (`docker.sock`) when needed.
7. Run health checks.
8. If checks fail, automatically rollback to the previous snapshot and re-run reload/restarts.

Rollback endpoint:

- `POST /api/config/rollback` restores the latest successful version (or a specified version id).

## Scripts

- `scripts/console_verify.sh`: checks Console root, Grafana via gateway, and Console API endpoints.
- `scripts/verify.sh`: smoke test through gateway paths.

## Profiles

Compose profiles are preserved:

- `db`: PostgreSQL + Redis + exporters
- `host`: node-exporter

## Security Notes

`console-api` mounts `/var/run/docker.sock` so it can restart containers and orchestrate apply/rollback.

This effectively grants Docker control to the API container.

Use this in local, trusted environments only.
Do not expose this stack directly to untrusted networks without additional hardening, authentication, and network controls.

## Ports

Public host ports:

- `8080` (gateway only)

All other service ports are internal to the `observability` Docker network.

## References

- Console details: `docs/console.md`
- Compose stack: `compose/docker-compose.yml`
- Collector config: `compose/otel/collector.yaml`
- Prometheus config: `compose/prometheus/prometheus.yml`
