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
touch ./web-ui/submodules/sce/yarn.lock ./yarn.lock && \
yarn install && \
cd ./web-ui/submodules/sce && \
yarn install && \
cd ../../.. && \
echo "Cleaned up symlinks and lockfiles, and reinstalled dependencies."
