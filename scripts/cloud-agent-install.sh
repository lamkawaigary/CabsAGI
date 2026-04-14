#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="/workspace"
MIN_NODE_MAJOR=20
MIN_NODE_MINOR=19

has_required_node_version() {
  if ! command -v node >/dev/null 2>&1; then
    return 1
  fi

  local node_version major minor
  node_version="$(node -p "process.versions.node")"
  major="${node_version%%.*}"
  minor="$(echo "${node_version}" | cut -d. -f2)"

  if (( major > MIN_NODE_MAJOR )); then
    return 0
  fi

  if (( major == MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR )); then
    return 0
  fi

  return 1
}

install_node_22() {
  echo "[cloud-agent-install] Installing Node.js 22.x ..."
  curl -fsSL "https://deb.nodesource.com/setup_22.x" | sudo -E bash -
  sudo apt-get install -y nodejs
}

cd "${WORKSPACE_DIR}"

if ! has_required_node_version; then
  install_node_22
fi

echo "[cloud-agent-install] Node: $(node -v)"
echo "[cloud-agent-install] npm:  $(npm -v)"

if [[ -f "package-lock.json" ]]; then
  echo "[cloud-agent-install] Installing npm dependencies via npm ci ..."
  npm ci --no-audit --no-fund
elif [[ -f "package.json" ]]; then
  echo "[cloud-agent-install] Installing npm dependencies via npm install ..."
  npm install --no-audit --no-fund
else
  echo "[cloud-agent-install] No package.json found, skipping npm install."
fi
