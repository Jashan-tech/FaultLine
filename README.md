FaultLine

FaultLine is an observability platform that provides comprehensive monitoring, alerting, and debugging capabilities for distributed systems. Built with modern telemetry standards, it integrates seamlessly with popular
open-source tools like Prometheus, Grafana, Loki, and Tempo.

Quick Start with Docker Compose

Get started quickly with our Docker Compose setup:

 1. Clone the repository:

 1    git clone https://github.com/Jashan-tech/FaultLine.git
 2    cd FaultLine

 2. Start the full stack:

 1    docker compose -f compose/docker-compose.yml up -d

 3. Access the services:
    - Grafana: http://localhost:3000 (admin/admin)
    - Prometheus: http://localhost:9090
    - Loki: http://localhost:3100
    - Tempo: http://localhost:3200

Database and Host Profiles

FaultLine supports different deployment profiles:

 - Database Profile: Includes PostgreSQL and Redis for persistent storage
 - Host Profile: Optimized for host-based deployments with additional system metrics

To use these profiles, add them when starting the compose stack:

 1 docker compose -f compose/docker-compose.yml --profile db --profile host up -d

Running Examples

Node Express Example

To run the Node.js Express example:

 1. Navigate to the examples directory:

 1    cd examples/node-express

 2. Install dependencies:

 1    npm install

 3. Start the application:

 1    npm start

The example application will be available at http://localhost:3001. This example demonstrates how to instrument a Node.js application with OpenTelemetry for tracing and metrics collection.

Verification Script

Run the verification script to ensure all services are working correctly:

 1 bash scripts/verify.sh

This script will:
 - Start the compose stack
 - Launch an example application
 - Generate traffic to test the pipeline
 - Verify that Grafana, Prometheus, Loki, and Tempo are accessible
 - Print clear PASS/FAIL messages for each service
 - Clean up resources after verification

Troubleshooting

Common Port Conflicts

If you encounter port conflicts when starting the services:

 1. Check for existing processes:

 1    sudo lsof -i :3000,9090,3100,3200

 2. Stop conflicting services:

 1    # Kill processes using the ports
 2    sudo kill -9 $(sudo lsof -t -i:3000)
 3    sudo kill -9 $(sudo lsof -t -i:9090)
 4    sudo kill -9 $(sudo lsof -t -i:3100)
 5    sudo kill -9 $(sudo lsof -t -i:3200)

 3. Change ports in the compose file if needed:
   Edit compose/docker-compose.yml to use different ports.

 4. Check Docker resources:
   Ensure Docker has sufficient memory allocated (recommended: 4GB+).

For more detailed information on running and testing, see our Run and Test Documentation (docs/run-and-test.md).
