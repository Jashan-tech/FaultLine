#!/usr/bin/env bash
set -euo pipefail

# Faultline repository snapshot generator
# Output:
#   /tmp/faultline_snapshot/tree.txt
#   /tmp/faultline_snapshot/repo_dump.txt

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="/tmp/faultline_snapshot"

cd "$ROOT_DIR"
mkdir -p "$OUT_DIR"

echo "Generating Faultline repository snapshot..."
echo "Repo root: $ROOT_DIR"
echo

# Ensure tree exists (optional but helpful)
if ! command -v tree >/dev/null 2>&1; then
  echo "INFO: 'tree' not found. Installing tree (requires sudo)..."
  sudo apt update
  sudo apt install -y tree
fi

EXCLUDES='node_modules|.git|dist|build|coverage|.next|.turbo|.cache|.venv|__pycache__'

# 1️⃣ Generate directory tree
tree -a -I "$EXCLUDES" > "$OUT_DIR/tree.txt" || true

# Helper: print file safely
print_file() {
  local path="$1"
  local max_lines="${2:-500}"

  echo "### $path"
  if [ -f "$path" ]; then
    sed -n "1,${max_lines}p" "$path"
  else
    echo "(missing)"
  fi
  echo
}

# Helper: print all files matching glob
print_glob() {
  local glob="$1"
  local max_lines="${2:-500}"

  shopt -s nullglob
  local files=( $glob )
  shopt -u nullglob

  if [ "${#files[@]}" -eq 0 ]; then
    echo "### $glob"
    echo "(none)"
    echo
    return
  fi

  for f in "${files[@]}"; do
    echo "--- FILE: $f"
    sed -n "1,${max_lines}p" "$f"
    echo
  done
}

# 2️⃣ Dump structured snapshot
{
  echo "############################################"
  echo "FAULTLINE REPOSITORY SNAPSHOT"
  echo "############################################"
  echo
  echo "### DIRECTORY TREE"
  cat "$OUT_DIR/tree.txt"
  echo

  print_file "README.md" 400
  print_file "AGENTS.md" 400

  echo "############################################"
  echo "COMPOSE STACK"
  echo "############################################"
  print_file "compose/docker-compose.yml" 800
  print_file "compose/.env.example" 200
  print_file "compose/otel/collector.yaml" 800
  print_file "compose/prometheus/prometheus.yml" 800
  print_file "compose/loki/config.yml" 600
  print_file "compose/tempo/config.yml" 600

  echo "### Grafana provisioning datasources"
  print_glob "compose/grafana/provisioning/datasources/*" 500

  echo "### Grafana provisioning dashboards"
  print_glob "compose/grafana/provisioning/dashboards/*" 500

  echo "### Grafana dashboards directory"
  ls -la compose/grafana/dashboards 2>/dev/null || true
  echo

  echo "############################################"
  echo "EXAMPLE APP"
  echo "############################################"
  print_file "examples/node-express/package.json" 400
  print_file "examples/node-express/README.md" 400
  print_file "examples/node-express/src/index.js" 800
  print_file "examples/node-express/src/otel.js" 800

  echo "############################################"
  echo "SCRIPTS"
  echo "############################################"
  ls -la scripts 2>/dev/null || true
  echo
  print_file "scripts/verify.sh" 600

  echo "############################################"
  echo "OPTIONAL AREAS"
  echo "############################################"

  echo "### ECS"
  ls -la ecs 2>/dev/null || true
  echo
  print_file "ecs/taskdef-example.json" 500

  echo "### HELM"
  ls -la helm 2>/dev/null || true
  echo

  echo "### DOCS"
  ls -la docs 2>/dev/null || true
  echo
  print_file "docs/quickstart-docker-compose.md" 600
  print_file "docs/run-and-test.md" 600
  print_file "docs/db-metrics.md" 400
  print_file "docs/ecs.md" 400
  print_file "docs/k8s.md" 400
  print_file "docs/deploy-markers.md" 400

} > "$OUT_DIR/repo_dump.txt"

echo
echo "DONE."
echo "Snapshot files created:"
echo "  $OUT_DIR/tree.txt"
echo "  $OUT_DIR/repo_dump.txt"
echo
echo "To print snapshot for Qwen:"
echo "  cat $OUT_DIR/repo_dump.txt"
