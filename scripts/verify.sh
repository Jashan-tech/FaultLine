#!/bin/bash
set -euo pipefail

# Script to verify the compose stack is working correctly through the FaultLine gateway

EXAMPLE_CONTAINER="example-app"

cleanup() {
  docker rm -f "$EXAMPLE_CONTAINER" >/dev/null 2>&1 || true
  docker compose -f compose/docker-compose.yml down >/dev/null 2>&1 || true
}

trap cleanup EXIT

check_with_retry() {
  local name="$1"
  local url="$2"
  local attempts=40
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
# Keep this traffic generator behavior from the existing smoke test,
# but avoid port conflict with gateway (8080).
echo "Starting example app..."
docker rm -f "$EXAMPLE_CONTAINER" >/dev/null 2>&1 || true
if docker run -d --name "$EXAMPLE_CONTAINER" -p 18080:80 nginx:latest >/dev/null 2>&1; then
  echo "Generating traffic to example app..."
  for _ in {1..10}; do
    curl -s http://localhost:18080/ >/dev/null || true
    sleep 1
  done
else
  echo "WARN: Could not start example app container (nginx:latest). Continuing without traffic generation."
fi

RESULT=0

if ! check_with_retry "FaultLine Console" "http://localhost:8080/"; then
  RESULT=1
fi

if ! check_with_retry "Grafana via Gateway" "http://localhost:8080/grafana/login"; then
  RESULT=1
fi

if ! check_with_retry "Console API Status" "http://localhost:8080/api/status"; then
  RESULT=1
fi

if ! check_with_retry "Console API Targets" "http://localhost:8080/api/targets"; then
  RESULT=1
fi

if [[ $RESULT -eq 0 ]]; then
  echo "PASS"
else
  echo "FAIL"
fi

exit "$RESULT"
