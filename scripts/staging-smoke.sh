#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${STAGING_URL:-http://localhost:3000}"
ADMIN_SECRET="${ADMIN_SECRET:-staging-admin-secret-minimum-32-chars!}"

echo "→ health ${BASE_URL}/api/health"
health=$(curl -sf "${BASE_URL}/api/health")
echo "$health" | grep -q '"ok":true'
echo "$health" | grep -q '"version"'

echo "→ dashboard (demo redirect)"
curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/" | grep -qE '200|307|308'

echo "→ admin API auth gate"
code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/admin/agents")
test "$code" = "401"

echo "→ admin save + public copy catalog"
curl -sf -X PUT "${BASE_URL}/api/admin/copy-providers" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"providers":[{"id":"staging-smoke-provider","name":"Staging Smoke","country":"KE","bio":"Compose smoke test","style":"momentum","symbols":["R_10"],"demoWinRate":50,"demoSignals30d":1,"verified":false,"riskLabel":"low","active":true}]}' \
  > /dev/null

providers=$(curl -sf "${BASE_URL}/api/copy/providers")
echo "$providers" | grep -q staging-smoke-provider

echo "✓ staging smoke passed (${BASE_URL})"
