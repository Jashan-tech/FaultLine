# Faultline

Self-hosted observability for Docker Compose startups

## Quickstart

Get running in 5 minutes with Docker Compose:

```bash
# Install and start
git clone https://github.com/faultline/faultline.git
cd faultline/compose
docker compose up -d

# Access services
# Grafana: http://localhost:3000 (admin/admin)
# OTLP Endpoint: http://localhost:4318
```

## Features

- OTLP HTTP 4318 (http/protobuf)
- Docker Compose-first with optional ECS/K8s
- Grafana dashboards with automatic provisioning
- Prometheus metrics, Loki logs, Tempo traces
- Deploy markers and alert rules

## Documentation

- Quickstart Docker Compose (`docs/quickstart-docker-compose.md`) - Primary setup guide
- Conventions (`docs/conventions.md`) - Env vars, labels, naming
- Deploy Markers (`docs/deploy-markers.md`) - Annotate deployments
- ECS Guide (`docs/ecs.md`) - AWS ECS deployment
- Kubernetes Guide (`docs/k8s.md`) - K8s with Helm

## Architecture

`Client Apps -> OTLP HTTP 4318 -> OpenTelemetry Collector -> Prometheus/Loki/Tempo -> Grafana`

## Support

- Issues: GitHub Issues (https://github.com/faultline/faultline/issues)
- Contributing: Fork and PR
- License: MIT
