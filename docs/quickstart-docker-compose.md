# Quickstart Docker Compose

Get Faultline running in under 5 minutes with Docker Compose.

## Prerequisites

- Docker Engine 20.10.0+
- Docker Compose v2.20.0+

## Install & Run

```bash
# Clone the repository
git clone https://github.com/faultline/faultline.git
cd faultline/compose

# Start the full stack
docker compose up -d
```

## Access Services

```text
# Grafana (metrics & logs): http://localhost:3000 (admin/admin)
# Prometheus (metrics): http://localhost:9090
# Loki (logs): http://localhost:3100
# Tempo (traces): http://localhost:3200
# OTel Collector (ingestion): http://localhost:4318
```

## Send Sample Data

## Deploy Markers

```bash
# Add deployment annotations to Grafana
chmod +x ../scripts/deploy-marker.sh
../scripts/deploy-marker.sh \
  --service my-service \
  --env development \
  --version 1.0.0 \
  --message "Initial deployment"
```

## Optional Components

```bash
# Add host metrics monitoring
docker compose --profile host up -d

# Add database metrics (PostgreSQL + Redis)
docker compose --profile db up -d
```

## Stop Services

```bash
# Stop all services
docker compose down
```

## Verification Script

To verify that your Docker Compose stack is working correctly, you can use the `scripts/verify.sh` script. This script will:

1. Start the compose stack
2. Start an example application
3. Generate traffic to the example app
4. Check that all services are accessible
5. Stop the example app and shut down the compose stack

Run the script with:

```bash
bash scripts/verify.sh
```

The script will output clear PASS/FAIL messages for each service check.
