#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="/workspace"

cd "${WORKSPACE_DIR}"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "[cloud-agent-startup] Node.js or npm is missing. Run: bash scripts/cloud-agent-install.sh"
  exit 1
fi

if [[ -f "package.json" && ! -d "node_modules" ]]; then
  echo "[cloud-agent-startup] node_modules missing, installing dependencies ..."
  if [[ -f "package-lock.json" ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi

echo "[cloud-agent-startup] Environment ready."
echo "[cloud-agent-startup] Node: $(node -v)"
echo "[cloud-agent-startup] npm:  $(npm -v)"
