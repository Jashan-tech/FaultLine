#!/bin/bash

# Script to post deploy markers as Grafana annotations
# Usage: deploy-marker.sh --service <service_name> --env <environment> --version <version> --message <message>

# Exit on error
set -e

# Default values
GRAFANA_URL=${GRAFANA_URL:-"http://localhost:3000"}
GRAFANA_USER=${GRAFANA_USER:-"admin"}
GRAFANA_PASS=${GRAFANA_PASS:-"admin"}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --service)
      SERVICE="$2"
      shift 2
      ;;
    --env)
      ENV="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --message)
      MESSAGE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --service <service_name> --env <environment> --version <version> --message <message>"
      exit 1
      ;;
  esac
done

# Check required parameters
if [[ -z "$SERVICE" || -z "$ENV" || -z "$VERSION" || -z "$MESSAGE" ]]; then
  echo "Missing required parameters"
  echo "Usage: $0 --service <service_name> --env <environment> --version <version> --message <message>"
  exit 1
fi

# Prepare annotation payload
TIMESTAMP=$(date +%s)000  # Convert to milliseconds
PAYLOAD=$(cat <<JSON
{
  "time": $TIMESTAMP,
  "timeEnd": $TIMESTAMP,
  "tags": ["deployment", "$SERVICE", "$ENV"],
  "text": "Deployment: $SERVICE v$VERSION ($ENV) - $MESSAGE"
}
JSON
)

# Post annotation to Grafana
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -u "$GRAFANA_USER:$GRAFANA_PASS" \
  -d "$PAYLOAD" \
  "$GRAFANA_URL/api/annotations")

# Check response
if [[ $? -eq 0 ]]; then
  echo "Deploy marker posted successfully: $RESPONSE"
else
  echo "Failed to post deploy marker"
  exit 1
fi
