# DB Metrics Collection

This guide explains how to enable database metrics collection for PostgreSQL and Redis.

## Prerequisites

- Docker Compose v2.20.0 or later
- Docker Engine with support for compose profiles

## Enabling DB Metrics

To enable database metrics collection, start the compose stack with the `db` profile:

```bash
docker compose --profile db up -d
```

This will start:

- PostgreSQL database
- PostgreSQL exporter
- Redis server
- Redis exporter

## Configuration

The database services are configured with default credentials:

- PostgreSQL: user/password@localhost:5432/example
- Redis: localhost:6379

To customize these settings, create a `.env` file in the compose directory with your values.

## Prometheus Scraping

The Prometheus configuration is automatically updated to scrape metrics from:

- PostgreSQL exporter on port 9187
- Redis exporter on port 9121

These scrapes are only active when the `db` profile is enabled.

## Grafana Dashboards

Two new dashboards are provisioned:

- PostgreSQL dashboard showing connections, queries, cache hit ratio, and database size
- Redis dashboard showing clients, commands, memory usage, and hit rate

Both dashboards are accessible through the Grafana UI under the respective names.
