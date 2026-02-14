#!/bin/bash
set -euo pipefail

# Script to verify the compose stack is working correctly

EXAMPLE_CONTAINER="example-app"

cleanup() {
  docker rm -f "$EXAMPLE_CONTAINER" >/dev/null 2>&1 || true
  docker compose -f compose/docker-compose.yml down >/dev/null 2>&1 || true
}

trap cleanup EXIT

check_with_retry() {
  local name="$1"
  local url="$2"
  local attempts=30
  local delay=2

  echo "Checking ${name}..."
  for _ in $(seq 1 "$attempts"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "PASS: ${name} is accessible"
      return 0
    fi
    sleep "$delay"
  done

  echo "FAIL: ${name} is not accessible"
  return 1
}

echo "Starting compose stack..."
docker compose -f compose/docker-compose.yml up -d

echo "Waiting for services to be ready..."
sleep 30

# Start example app in background
echo "Starting example app..."
docker rm -f "$EXAMPLE_CONTAINER" >/dev/null 2>&1 || true
if docker run -d --name "$EXAMPLE_CONTAINER" -p 8080:80 nginx:latest >/dev/null 2>&1; then
  # Generate traffic to example app
  echo "Generating traffic to example app..."
  for i in {1..10}; do
    curl -s http://localhost:8080/ >/dev/null || true
    sleep 1
  done
else
  echo "WARN: Could not start example app container (nginx:latest). Continuing without traffic generation."
fi

RESULT=0

# Check services
if ! check_with_retry "Grafana" "http://localhost:3000/healthz"; then
  RESULT=1
fi

if ! check_with_retry "Prometheus" "http://localhost:9090/-/ready"; then
  RESULT=1
fi

if ! check_with_retry "Loki" "http://localhost:3100/ready"; then
  RESULT=1
fi

if ! check_with_retry "Tempo" "http://localhost:3200/status"; then
  RESULT=1
fi

if [[ $RESULT -eq 0 ]]; then
  echo "PASS"
else
  echo "FAIL"
fi

exit "$RESULT"
