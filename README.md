# FaultLine

Open-source observability stack for local and containerized workloads using OpenTelemetry, Prometheus, Loki, Tempo, and Grafana.

## Overview

- Runs a full observability stack with Docker Compose from the `compose/` directory configuration.
- Receives OTLP traffic over HTTP (`4318`) through OpenTelemetry Collector.
- Stores and visualizes telemetry with Prometheus (metrics), Loki (logs), Tempo (traces), and Grafana dashboards.
- Includes optional profiles for host metrics (`node-exporter`) and database metrics (`postgres`/`redis` exporters).
- Provides operational helpers such as a smoke-test script (`scripts/verify.sh`) and deploy marker annotations (`scripts/deploy-marker.sh`).

## Key Features

- Preconfigured Docker Compose stack:
  - OpenTelemetry Collector (`otel/opentelemetry-collector-contrib:0.108.0`)
  - Prometheus (`prom/prometheus:v2.54.1`)
  - Loki (`grafana/loki:3.1.0`)
  - Tempo (`grafana/tempo:2.6.0`)
  - Grafana (`grafana/grafana-enterprise:11.2.0`)
- Grafana provisioning for datasources and dashboards at startup.
- Included dashboards:
  - `Service Overview`
  - `Problems`
  - `PostgreSQL`
  - `Redis`
  - `Infrastructure`
- Prometheus alert rules in `compose/prometheus/rules/faultline-alerts.yml`:
  - `HighErrorRate`, `HighLatency`, `ServiceDown`, `HighCPUUsage`, `HighMemoryUsage`
- Optional Docker Compose profiles:
  - `db`: PostgreSQL + PostgreSQL exporter + Redis + Redis exporter
  - `host`: Node Exporter
- Deployment templates:
  - ECS task definition template at `ecs/taskdef-example.json`
  - Helm chart at `helm/`

## Demo / Screenshots

No screenshots are currently committed to this repository.

If you want visuals for documentation, suggested captures are:

- Grafana home with provisioned datasources
- `Service Overview` dashboard with incoming telemetry
- Prometheus `/targets` page

## Quickstart

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.20+
- Node.js (only needed for running the example app)

### Start the stack

```bash
git clone https://github.com/Jashan-tech/FaultLine.git
cd FaultLine

docker compose -f compose/docker-compose.yml up -d
```

### Access services

- Grafana: <http://localhost:3000> (`admin` / `admin`)
- Prometheus: <http://localhost:9090>
- Loki: <http://localhost:3100>
- Tempo: <http://localhost:3200>
- OTLP HTTP ingest: <http://localhost:4318>

### Run the smoke test

```bash
chmod +x scripts/verify.sh
./scripts/verify.sh
```

Expected terminal outcome: `PASS`

## Installation

### Local development setup

1. Clone the repository.
2. Start the Compose stack.
3. Optionally run the example app.

```bash
git clone https://github.com/Jashan-tech/FaultLine.git
cd FaultLine
docker compose -f compose/docker-compose.yml up -d
```

### Optional Docker Compose profiles

```bash
# Database metrics
docker compose -f compose/docker-compose.yml --profile db up -d

# Host metrics
docker compose -f compose/docker-compose.yml --profile host up -d

# Combined
docker compose -f compose/docker-compose.yml --profile db --profile host up -d
```

### Optional Kubernetes (Helm)

```bash
helm lint ./helm
helm template faultline ./helm
```

### Optional ECS template

- Start from `ecs/taskdef-example.json` and replace placeholder IAM, ECR, and EFS values.

## Usage

### Common operations

```bash
# Start stack
docker compose -f compose/docker-compose.yml up -d

# Check status
docker compose -f compose/docker-compose.yml ps

# View logs
docker compose -f compose/docker-compose.yml logs -f

# Stop stack
docker compose -f compose/docker-compose.yml down
```

### Run the Node Express example

```bash
cd examples/node-express
npm ci
npm start
```

Then exercise the endpoints:

- <http://localhost:3001/health>
- <http://localhost:3001/slow>
- <http://localhost:3001/error>

### Post a deploy marker to Grafana

```bash
chmod +x scripts/deploy-marker.sh
./scripts/deploy-marker.sh \
  --service my-service \
  --env production \
  --version 1.2.3 \
  --message "Release"
```

### Generate a repository snapshot (helper script)

```bash
bash scripts/repo_snapshot.sh
```

Outputs are written to `/tmp/faultline_snapshot`.

## Configuration

### Environment variables

| Variable | Default | Required | Used by | Purpose |
|---|---|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Recommended for instrumented apps | Your application | OTLP collector endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | Recommended for instrumented apps | Your application | OTLP transport protocol |
| `OTEL_SERVICE_NAME` | none | Recommended | Your application | Logical service name in telemetry |
| `OTEL_RESOURCE_ATTRIBUTES` | none | Optional | Your application | Additional resource labels |
| `OTEL_EXPORTER_OTLP_HEADERS` | none | Optional | Your application | OTLP auth/custom headers |
| `PORT` | `8080` | Optional | `examples/node-express` | Example app listen port |
| `GRAFANA_URL` | `http://localhost:3000` | Optional | `scripts/deploy-marker.sh` | Grafana API base URL |
| `GRAFANA_USER` | `admin` | Optional | `scripts/deploy-marker.sh` | Grafana username |
| `GRAFANA_PASS` | `admin` | Optional | `scripts/deploy-marker.sh` | Grafana password |

### Compose-defined defaults

These are currently hardcoded in `compose/docker-compose.yml`:

- PostgreSQL: `POSTGRES_DB=example`, `POSTGRES_USER=user`, `POSTGRES_PASSWORD=password`
- PostgreSQL exporter DSN: `postgresql://user:password@postgres:5432/example?sslmode=disable`
- Redis exporter target: `redis:6379`

### Default ports

| Service | Port |
|---|---|
| Grafana | `3000` |
| Prometheus | `9090` |
| Loki | `3100` |
| Tempo HTTP | `3200` |
| OTEL Collector OTLP HTTP | `4318` |
| Tempo OTLP gRPC | `4317` |
| Node Exporter (host profile) | `9100` |
| PostgreSQL (db profile) | `5432` |
| Redis (db profile) | `6379` |
| PostgreSQL exporter (db profile) | `9187` |
| Redis exporter (db profile) | `9121` |

## Architecture / How It Works

```text
Instrumented apps
  -> OTLP HTTP (4318)
  -> OpenTelemetry Collector
     -> Tempo (traces)
     -> Loki (logs)
     -> Prometheus-format metrics endpoint

Prometheus
  -> Scrapes configured targets
  -> Evaluates alert rules

Grafana
  -> Uses provisioned datasources (Prometheus, Loki, Tempo)
  -> Loads provisioned dashboards from compose/grafana/dashboards/provisioned
```

Primary config files:

- `compose/otel/collector.yaml`
- `compose/prometheus/prometheus.yml`
- `compose/loki/config.yml`
- `compose/tempo/config.yml`
- `compose/grafana/provisioning/datasources/ds.yml`
- `compose/grafana/provisioning/dashboards/dashboards.yml`

## Testing and Validation

### Automated smoke test

```bash
chmod +x scripts/verify.sh
./scripts/verify.sh
```

What it checks:

- Stack startup via Docker Compose
- Grafana health endpoint (`/healthz`)
- Prometheus readiness (`/-/ready`)
- Loki readiness (`/ready`)
- Tempo status (`/status`)

### Manual checks

```bash
docker compose -f compose/docker-compose.yml ps
curl -sS http://localhost:9090/api/v1/targets | head
curl -sS http://localhost:9090/api/v1/rules | head
```

## Project Structure

```text
compose/                  Docker Compose stack + service configs
  grafana/                Datasource/dashboard provisioning and dashboards
  loki/                   Loki config
  otel/                   OpenTelemetry Collector config
  prometheus/             Prometheus config + alert rules
  tempo/                  Tempo config
docs/                     Operational guides (compose, db/host metrics, ECS, Helm)
ecs/                      ECS task definition template
examples/node-express/    Example instrumented Node.js app
helm/                     Helm chart and templates
scripts/                  Utility scripts (verify, deploy marker, repo snapshot)
```

## Contributing

A dedicated `CONTRIBUTING.md` is not present yet.

Current repository workflow expectations are documented in `AGENTS.md`. At minimum, contributions should:

- Keep changes scoped and reviewable.
- Validate behavior locally (for stack changes, run `./scripts/verify.sh`).
- Include clear commit messages and PR descriptions.

## Security

A dedicated `SECURITY.md` policy is not currently present in this repository.

## License

Licensed under the MIT License. See `LICENSE`.

## Assumptions / Notes

- `scripts/verify.sh` intentionally tears down the Compose stack in its cleanup phase (`docker compose ... down`).
- `compose/prometheus/prometheus.yml` includes scrape jobs for `node-exporter`, `postgres-exporter`, and `redis-exporter` even when related profiles are not started; those targets can appear `DOWN` unless profile services are running.
- Collector config exposes a Prometheus exporter on `0.0.0.0:8889`, while Prometheus currently scrapes `otel-collector:8888` (collector self-metrics). If you expect OTLP application metrics through the collector exporter, add/adjust the scrape target accordingly.
- `examples/node-express/src/otel.js` currently hardcodes trace export to `http://localhost:4318/v1/traces`.

### Known failing state: `npm ci` with DNS resolution errors

In network-restricted environments, dependency install for `examples/node-express` can fail with repeated `EAI_AGAIN` fetch errors, followed by npm's generic:

```text
npm error Exit handler never called!
```

Repro command:

```bash
cd examples/node-express
npm ci
```

Workarounds:

- Ensure DNS/network access to `https://registry.npmjs.org`.
- Configure npm proxy/registry if your environment requires it.
- Retry after restoring outbound access.

Local debug artifacts are written to:

- `examples/node-express/.npm-cache/_logs/`

TODO pointers:

- `examples/node-express/.npmrc:1`
- `examples/node-express/.npmrc:2`
- `examples/node-express/package-lock.json:1`
