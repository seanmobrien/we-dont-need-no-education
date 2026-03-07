#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

find . -type d \( \
  -name "node_modules" -o \
  -name "dist" -o \
  -name ".next" \
\) -prune -print -exec rm -rf {} + && \
find . -type f \( \
  -name "package-lock.json" -o \
  -name "yarn.lock" -o \
  -name "pnpm-lock.yaml" -o \
  -name "bun.lockb" -o \
  -name ".tsbuildinfo" -o \
  -name "tsconfig.tsbuildinfo" -o \
  -name "npm-shrinkwrap.json" \
\) -print -delete && \
touch ./web-ui/submodules/json-viewer/packages/yarn.lock \
  ./web-ui/submodules/sce/yarn.lock \
  ./yarn.lock && \
pushd ./web-ui/submodules/sce && \
echo "Installing Semantic Communication Engine dependencies..." && \
.yarn/releases/yarn-4.12.0.cjs install && \
popd && \
pushd ./web-ui/submodules/json-viewer/packages && \
echo "Installing JSON Viewer dependencies..." && \
.yarn/releases/yarn-4.12.0.cjs install && \
popd &&
echo "Installing root dependencies..." && \
.yarn/releases/yarn-4.12.0.cjs install && \
echo "Cleaned up symlinks and lockfiles, and reinstalled dependencies."
