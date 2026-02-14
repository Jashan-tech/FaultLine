#!/bin/bash
set -euo pipefail

check_status() {
  local name="$1"
  local url="$2"

  echo "Checking ${name}: ${url}"
  local code
  code=$(curl -s -o /tmp/console_verify.out -w "%{http_code}" "$url")
  if [[ "$code" != "200" ]]; then
    echo "FAIL: ${name} returned HTTP ${code}"
    cat /tmp/console_verify.out
    exit 1
  fi
  echo "PASS: ${name}"
}

check_status "Console Root" "http://localhost:8080/"
check_status "Grafana Login via Gateway" "http://localhost:8080/grafana/login"
check_status "Console API Status" "http://localhost:8080/api/status"
check_status "Console API Targets" "http://localhost:8080/api/targets"
check_status "Console API Services" "http://localhost:8080/api/services"
check_status "Console API Signals" "http://localhost:8080/api/signals"

echo "PASS"
