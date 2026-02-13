# Kubernetes Deployment

This document outlines how to deploy Faultline in a Kubernetes cluster using Helm.

## Prerequisites

- Kubernetes cluster (v1.20+)
- Helm 3.x
- kubectl configured to connect to your cluster

## Installation

1. Add the required repositories and update:
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

2. Install the Faultline chart:
cd helm
helm install faultline .

This will deploy:
- OpenTelemetry Collector (exposing port 4318 for OTLP HTTP)
- Prometheus
- Loki
- Tempo
- Grafana

## Port Forwarding

To access the services locally, use port forwarding:
kubectl port-forward -n faultline svc/grafana 3000:3000
kubectl port-forward -n faultline svc/prometheus 9090:9090
kubectl port-forward -n faultline svc/loki 3100:3100
kubectl port-forward -n faultline svc/tempo 3200:3200
kubectl port-forward -n faultline svc/otel-collector 4318:4318

Access the services at:
- Grafana: http://localhost:3000 (login: admin/admin)
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100
- Tempo: http://localhost:3200
- OTel Collector: http://localhost:4318 (for OTLP HTTP)

## Configuration

The Helm chart is configured via the values.yaml file. You can override values during installation:
helm install faultline . --set grafana.adminPassword=mypassword

## Uninstallation

To remove the deployment:
helm uninstall faultline
