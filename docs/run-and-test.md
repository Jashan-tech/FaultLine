Run and Test Documentation

This document provides detailed instructions for running and testing the FaultLine platform.

Prerequisites

Before running FaultLine, ensure you have:

 - Docker Engine (version 20.10 or later)
 - Docker Compose (version 2.0 or later)
 - Git
 - Node.js (for examples)

Running with Docker Compose

Basic Setup

Start the core services with Docker Compose:

 1 docker compose -f compose/docker-compose.yml up -d

This will start all core services including:
 - Grafana (port 3000)
 - Prometheus (port 9090)
 - Loki (port 3100)
 - Tempo (port 3200)
 - OpenTelemetry Collector

Using Profiles

FaultLine supports different deployment profiles for various use cases:

Database Profile

The database profile includes PostgreSQL and Redis for persistent storage:

 1 docker compose -f compose/docker-compose.yml --profile db up -d

This profile adds:
 - PostgreSQL database for long-term storage
 - Redis for caching and session management

Host Profile

The host profile is optimized for host-based deployments with additional system metrics:

 1 docker compose -f compose/docker-compose.yml --profile host up -d

This profile adds:
 - Node Exporter for system metrics
 - Additional host monitoring configurations

Combined Profiles

You can use multiple profiles simultaneously:

 1 docker compose -f compose/docker-compose.yml --profile db --profile host up -d

Stopping Services

To stop all services:

 1 docker compose -f compose/docker-compose.yml down

To stop services and remove volumes (data will be lost):

 1 docker compose -f compose/docker-compose.yml down -v

Running Examples

Node Express Example

The Node Express example demonstrates how to instrument a Node.js application with OpenTelemetry.

 1. Navigate to the example directory:

 1    cd examples/node-express

 2. Install dependencies:

 1    npm install

 3. Start the application:

 1    npm start

The application will be available at http://localhost:3001. This example includes:

 - Automatic instrumentation for HTTP requests
 - Custom metrics for business logic
 - Distributed tracing across service boundaries
 - Proper error handling and logging

The example sends telemetry data to the OpenTelemetry collector running in the compose stack, where it gets processed and stored in the respective backends (Prometheus for metrics, Loki for logs, Tempo for traces).

Verification Script

The scripts/verify.sh script provides an automated way to test that all services are working correctly.

Running the Verification Script

 1 bash scripts/verify.sh

What the Script Verifies

The verification script performs the following checks:

 1. Compose Stack Startup: Ensures all services in the compose file start correctly
 2. Service Availability: Checks that each service is accessible via HTTP
 3. Example Application: Starts a temporary example application to generate traffic
 4. Traffic Generation: Sends requests to the example app to generate telemetry
 5. Service Health Checks: Verifies each service responds to health check endpoints:
    - Grafana: http://localhost:3000/healthz
    - Prometheus: http://localhost:9090/-/ready
    - Loki: http://localhost:3100/ready
    - Tempo: http://localhost:3200/status

Script Output

The script will output clear PASS/FAIL messages for each service check:

 1 PASS: Grafana is accessible
 2 PASS: Prometheus is accessible
 3 PASS: Loki is accessible
 4 PASS: Tempo is accessible

After verification, the script cleans up by stopping the example application and shutting down the compose stack.

Testing Procedures

Manual Testing

 1. Access Grafana: Visit http://localhost:3000 and log in with admin/admin
 2. Check Prometheus: Visit http://localhost:9090 and verify targets are healthy
 3. Query Loki: Visit http://localhost:3100 and run log queries
 4. View Traces: Visit http://localhost:3200 to view traces

Automated Testing

Run the verification script regularly to ensure services remain operational:

 1 bash scripts/verify.sh

Troubleshooting

Common Issues

Port Conflicts

If services fail to start due to port conflicts:

 1. Identify conflicting processes:

 1    sudo lsof -i :3000,9090,3100,3200

 2. Stop conflicting services:

 1    # Example for port 3000
 2    sudo kill -9 $(sudo lsof -t -i:3000)

 3. Alternative: Change ports in compose file:
   Edit compose/docker-compose.yml to use different ports.

Insufficient Resources

If containers fail to start or behave unexpectedly:

 1. Check Docker resources:
    - Ensure Docker Desktop has at least 4GB RAM allocated
    - Increase CPU cores if processing high volumes of telemetry

 2. Monitor resource usage:

 1    docker stats

Service Dependencies

If services fail to connect to each other:

 1. Check network connectivity:

 1    docker compose -f compose/docker-compose.yml ps

 2. Review logs:

 1    docker compose -f compose/docker-compose.yml logs <service-name>

Data Persistence

When using the database profile, note that:

 - Data persists in named volumes when using docker compose down
 - Data is removed when using docker compose down -v
 - Backups should be performed regularly in production environments

Debugging Tips

 1. Check all container logs:

 1    docker compose -f compose/docker-compose.yml logs

 2. Check specific service logs:

 1    docker compose -f compose/docker-compose.yml logs grafana

 3. Validate compose file syntax:

 1    docker compose -f compose/docker-compose.yml config

 4. Restart individual services:

 1    docker compose -f compose/docker-compose.yml restart grafana
