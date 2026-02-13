# Host Metrics Collection

This guide explains how to enable host metrics collection using node-exporter.

## Prerequisites

- Docker Compose v2.20.0 or later
- Docker Engine with support for compose profiles
- Linux host with /proc, /sys, and / filesystems accessible

## Enabling Host Metrics

To enable host metrics collection, start the compose stack with the `host` profile:

```bash
docker compose --profile host up -d
```

This will start:

- node-exporter service that collects host metrics

## Configuration

The node-exporter service is configured to:

- Mount /proc, /sys, and / filesystems in read-only mode
- Exclude certain mount points like /sys, /proc, /dev, etc.
- Listen on port 9100

## Prometheus Scraping

The Prometheus configuration is automatically updated to scrape metrics from:

- node-exporter on port 9100

This scrape is only active when the `host` profile is enabled.

## Grafana Dashboard

A new Infrastructure dashboard is provisioned showing:

- CPU usage percentage
- Memory usage percentage
- Disk usage percentage
- Network traffic
- Load average
- Disk I/O

The dashboard is accessible through the Grafana UI under the name "Infrastructure".
