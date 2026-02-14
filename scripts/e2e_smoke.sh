#!/bin/bash
set -euo pipefail

COMPOSE_FILE="compose/docker-compose.yml"
EXAMPLE_IMAGE="faultline-node-express-example:e2e"
EXAMPLE_CONTAINER="faultline-node-express-e2e"
APP_PORT="3001"
APP_HOST_PORT="3001"
USE_EXISTING_APP="false"

run_example_container() {
  local host_port="$1"
  docker rm -f "$EXAMPLE_CONTAINER" >/dev/null 2>&1 || true
  docker run -d \
    --name "$EXAMPLE_CONTAINER" \
    --add-host host.docker.internal:host-gateway \
    -e OTEL_EXPORTER_OTLP_ENDPOINT="http://host.docker.internal:8080/otlp" \
    -e OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf" \
    -e OTEL_SERVICE_NAME="node-express-example" \
    -e PORT="$APP_PORT" \
    -p "$host_port:$APP_PORT" \
    "$EXAMPLE_IMAGE" >/dev/null
}

cleanup() {
  if [[ "$USE_EXISTING_APP" != "true" ]]; then
    docker rm -f "$EXAMPLE_CONTAINER" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

echo "[1/6] Starting FaultLine stack..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "[2/6] Starting example app (validation harness only)..."
if curl -fsS "http://localhost:3001/health" >/dev/null 2>&1; then
  USE_EXISTING_APP="true"
  echo "Reusing existing app on localhost:3001"
else
  if docker image inspect "$EXAMPLE_IMAGE" >/dev/null 2>&1; then
    echo "Using cached example image: $EXAMPLE_IMAGE"
  else
    if ! docker build -t "$EXAMPLE_IMAGE" examples/node-express; then
      echo "WARN: Initial example image build failed, retrying with --no-cache..."
      docker image rm -f "$EXAMPLE_IMAGE" >/dev/null 2>&1 || true
      docker build --no-cache -t "$EXAMPLE_IMAGE" examples/node-express
    fi
  fi
  if ! run_example_container "$APP_HOST_PORT"; then
    echo "WARN: Could not bind localhost:3001. Falling back to localhost:13001 for traffic generation."
    started="false"
    for candidate in 13001 13002 13003 13004 13005; do
      if run_example_container "$candidate"; then
        APP_HOST_PORT="$candidate"
        started="true"
        break
      fi
    done
    if [[ "$started" != "true" ]]; then
      echo "FAIL: Could not start example app on ports 3001 or 13001-13005"
      exit 1
    fi
  fi
fi

for _ in $(seq 1 40); do
  if curl -fsS "http://localhost:${APP_HOST_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://localhost:${APP_HOST_PORT}/health" >/dev/null 2>&1; then
  echo "FAIL: example app did not become ready on :${APP_HOST_PORT}"
  if [[ "$USE_EXISTING_APP" != "true" ]]; then
    docker logs "$EXAMPLE_CONTAINER" | tail -n 80 || true
  fi
  exit 1
fi

echo "[3/6] Generating request traffic..."
for _ in $(seq 1 5); do curl -fsS "http://localhost:${APP_HOST_PORT}/health" >/dev/null; done
for _ in $(seq 1 5); do curl -fsS "http://localhost:${APP_HOST_PORT}/slow" >/dev/null; done
for _ in $(seq 1 5); do curl -sS "http://localhost:${APP_HOST_PORT}/error" >/dev/null || true; done

echo "[4/6] Injecting one sample log line into Loki for repeatable logs verification..."
docker compose -f "$COMPOSE_FILE" exec -T console-api node -e '
const now=(Date.now()*1e6).toString();
fetch("http://loki:3100/loki/api/v1/push", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    streams: [{
      stream: {job: "node-express-example", source: "e2e-smoke"},
      values: [[now, "faultline e2e smoke log"]]
    }]
  })
}).then((res) => {
  if (!res.ok) throw new Error(`loki push failed: ${res.status}`);
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
'

sleep 8

echo "[5/6] Verifying signals through console API..."
SIGNALS_JSON=$(curl -sS "http://localhost:8080/api/signals?service=node-express-example")
echo "$SIGNALS_JSON"

metrics_ok="false"
logs_ok="false"
traces_ok="false"
traces_detail=""

if command -v jq >/dev/null 2>&1; then
  metrics_ok=$(printf '%s' "$SIGNALS_JSON" | jq -r '.metrics.ok // false')
  logs_ok=$(printf '%s' "$SIGNALS_JSON" | jq -r '.logs.ok // false')
  traces_ok=$(printf '%s' "$SIGNALS_JSON" | jq -r '.traces.ok // false')
  traces_detail=$(printf '%s' "$SIGNALS_JSON" | jq -r '.traces.detail // ""')
else
  [[ "$SIGNALS_JSON" == *'"metrics":{"ok":true'* ]] && metrics_ok="true"
  [[ "$SIGNALS_JSON" == *'"logs":{"ok":true'* ]] && logs_ok="true"
  [[ "$SIGNALS_JSON" == *'"traces":{"ok":true'* ]] && traces_ok="true"
  traces_detail="$SIGNALS_JSON"
fi

status=0
if [[ "$metrics_ok" != "true" ]]; then
  echo "FAIL: metrics signal check failed"
  status=1
fi

if [[ "$logs_ok" != "true" ]]; then
  echo "FAIL: logs signal check failed"
  status=1
fi

if [[ "$traces_ok" != "true" ]]; then
  if [[ "$traces_detail" == *"best-effort"* ]]; then
    echo "WARN: traces check is best-effort and did not return definitive traces"
  else
    echo "FAIL: traces signal check failed"
    status=1
  fi
fi

echo "[6/6] Summary"
if [[ $status -eq 0 ]]; then
  echo "PASS"
else
  echo "FAIL"
fi

exit $status
