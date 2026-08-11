#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ lint"
npm run lint

echo "→ build"
npm run build

echo "→ e2e (demo mode, fresh server)"
CI=true npm run test:e2e

echo "✓ pre-deploy checks passed"
