# Quickstart Docker Compose

This guide shows how to get Faultline running with Docker Compose.

## Prerequisites

- Docker Engine 20.10.0 or later
- Docker Compose v2.20.0 or later

## Starting the Stack

Clone the repository and navigate to the compose directory:

git clone <repository-url>
cd FaultLine/compose

Start the observability stack:

docker compose up -d

This starts:
- OpenTelemetry Collector (port 4318)
- Prometheus (port 9090)
- Loki (port 3100)
- Tempo (port 3200)
- Grafana (port 3000)

## Accessing Services

- Grafana: http://localhost:3000 (login: admin/admin)
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100
- Tempo: http://localhost:3200

## Sending Sample Data

Run the example Node.js application to send sample telemetry:

cd ../examples/node-express
npm install
npm start

Then make requests to the example app:
- Health check: http://localhost:3001/health
- Slow endpoint: http://localhost:3001/slow
- Error endpoint: http://localhost:3001/error

## Deploy Markers

To add deploy markers to Grafana, use the deploy marker script:

chmod +x ../scripts/deploy-marker.sh
../scripts/deploy-marker.sh \
  --service my-service \
  --env development \
  --version 1.0.0 \
  --message "Initial deployment"

## Optional Components

Additional components can be started using Docker Compose profiles:

### Host Metrics
To monitor host system metrics:

docker compose --profile host up -d

### Database Metrics
To monitor PostgreSQL and Redis:

docker compose --profile db up -d

## Stopping the Stack

To stop all services:

docker compose down

To stop services and remove volumes:

docker compose down -v

TODO: Document quickstart with Docker Compose
