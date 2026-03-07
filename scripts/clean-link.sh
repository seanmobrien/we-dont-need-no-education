#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

ROOT_YARN="${REPO_ROOT}/.yarn/releases/yarn-4.12.0.cjs"
WEB_UI_YARN="${REPO_ROOT}/web-ui/.yarn/releases/yarn-4.12.0.cjs"

ensure_install_state() {
  local workspace_name="$1"
  local workspace_path="$2"
  local yarn_binary="$3"

  pushd "${workspace_path}" >/dev/null
  echo "Installing ${workspace_name} dependencies..."
  "${yarn_binary}" install

  local node_modules_state="node_modules/.yarn-state.yml"
  local install_state=".yarn/install-state.gz"

  if [[ ! -f "${node_modules_state}" ]]; then
    echo "ERROR: Missing ${node_modules_state} in ${workspace_path}" >&2
    if [[ -f "${install_state}" ]]; then
      echo "Found ${install_state}, but node-modules linker requires ${node_modules_state}." >&2
    fi
    popd >/dev/null
    exit 1
  fi

  popd >/dev/null
}

find . -type d \( \
  -name "node_modules" -o \
  -name "dist" -o \
  -name "build" -o \
  -name ".next" \
\) -prune -print -exec rm -rf {} +

find . -type f \( \
  -name "package-lock.json" -o \
  -name "yarn.lock" -o \
  -name "pnpm-lock.yaml" -o \
  -name "bun.lockb" -o \
  -name ".tsbuildinfo" -o \
  -name "tsconfig.tsbuildinfo" -o \
  -name "npm-shrinkwrap.json" \
\) -print -delete

touch ./web-ui/submodules/json-viewer/packages/yarn.lock \
  ./web-ui/submodules/sce/yarn.lock \
  ./web-ui/yarn.lock \
  ./yarn.lock

ensure_install_state \
  "Semantic Communication Engine" \
  "${REPO_ROOT}/web-ui/submodules/sce" \
  "${REPO_ROOT}/web-ui/submodules/sce/.yarn/releases/yarn-4.12.0.cjs"

ensure_install_state \
  "JSON Viewer" \
  "${REPO_ROOT}/web-ui/submodules/json-viewer/packages" \
  "${REPO_ROOT}/web-ui/submodules/json-viewer/packages/.yarn/releases/yarn-4.12.0.cjs"

ensure_install_state \
  "root workspace" \
  "${REPO_ROOT}" \
  "${ROOT_YARN}"

ensure_install_state \
  "Web UI" \
  "${REPO_ROOT}/web-ui" \
  "${WEB_UI_YARN}"

echo "Cleaned up symlinks/lockfiles, reinstalled dependencies, and verified Yarn install state files."
