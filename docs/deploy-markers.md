# Deploy Markers

Deploy markers are annotations that can be added to Grafana dashboards to mark deployment events. This helps correlate application changes with performance metrics and alerts.

## Prerequisites

- Grafana instance accessible via HTTP
- Valid Grafana credentials (username/password)

## Environment Variables

The deploy marker script uses the following environment variables:

- `GRAFANA_URL`: URL of the Grafana instance (default: http://localhost:3000)
- `GRAFANA_USER`: Grafana username (default: admin)
- `GRAFANA_PASS`: Grafana password (default: admin)

## Usage

Run the deploy marker script with the required parameters:

./scripts/deploy-marker.sh --service my-service --env production --version 1.2.3 --message "Release hotfix"
