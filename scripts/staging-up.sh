#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ building and starting staging stack on :3000"
docker compose up -d --build

echo "→ waiting for health check"
for _ in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✓ app healthy"
    exit 0
  fi
  sleep 2
done

echo "✗ timed out waiting for http://localhost:3000/api/health" >&2
docker compose logs --tail=40 app
exit 1
