#!/bin/bash

# clean-link.sh performs a destructive, blank-state dependency reset for this
# repository and for nested projects that are intentionally buildable both as
# part of the monorepo and on their own.
#
# Intended use cases:
# - Rebuild the dependency graph from scratch after lockfile or linker drift.
# - Recreate install state for the root workspace and nested standalone projects.
# - Verify that each managed install state can survive a clean install,
#   refresh-lockfile pass, and immutable validation pass.
#
# High-level architecture:
# - Install states are registered once in global associative arrays keyed by a
#   stable id.
# - The script executes in ordered stages: destructive cleanup, install,
#   refresh-lockfile, and validate.
# - Validation is intentionally deferred until every refresh has completed so
#   each workspace is checked against the final lockfile state rather than an
#   intermediate one.
# - Validation is non-blocking per workspace: every state is checked and
#   reported even if an earlier state fails.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

declare -A INSTALL_STATE_NAME
declare -A INSTALL_STATE_PATH
declare -A INSTALL_STATE_VALIDATION_RESULT

INSTALL_STATE_IDS=(
  "repo-root"
  "web-ui"
  "semantic-encoding"
)

INSTALL_REFRESH_IDS=(
  "repo-root"
  "web-ui"
  "semantic-encoding"
)

register_install_state() {
  local state_id="$1"
  local state_name="$2"
  local state_path="$3"

  INSTALL_STATE_NAME["${state_id}"]="${state_name}"
  INSTALL_STATE_PATH["${state_id}"]="${state_path}"
}

register_install_state "repo-root" "Repository Root" "${REPO_ROOT}"
register_install_state "web-ui" "Web UI" "${REPO_ROOT}/web-ui"
register_install_state "semantic-encoding" "Semantic Encoding" "${REPO_ROOT}/web-ui/submodules/sce"

log_stage() {
  local stage_name="$1"
  local workspace_name="$2"
  local message="$3"

  echo "[${stage_name}] ${workspace_name}: ${message}"
}

resolve_install_state() {
  local state_id="$1"
  local workspace_name="${INSTALL_STATE_NAME["${state_id}"]:-}"
  local workspace_path="${INSTALL_STATE_PATH["${state_id}"]:-}"

  if [[ -z "${workspace_name}" || -z "${workspace_path}" ]]; then
    echo "ERROR: Unknown install state id '${state_id}'" >&2
    exit 1
  fi
}

verify_install_artifacts() {
  local workspace_name="$1"
  local workspace_path="$2"
  local lockfile_path="$3"
  local node_modules_state="${workspace_path}/node_modules/.yarn-state.yml"
  local install_state="${workspace_path}/.yarn/install-state.gz"

  if [[ ! -s "${lockfile_path}" ]]; then
    log_stage "validate" "${workspace_name}" "FAIL yarn.lock missing or empty (${lockfile_path})"
    return 1
  fi

  if [[ ! -f "${workspace_path}/package.json" ]]; then
    log_stage "validate" "${workspace_name}" "FAIL package.json missing (${workspace_path}/package.json)"
    return 1
  fi

  if [[ ! -f "${workspace_path}/.yarn/releases/yarn-4.12.0.cjs" ]]; then
    log_stage "validate" "${workspace_name}" "FAIL Yarn binary missing (${workspace_path}/.yarn/releases/yarn-4.12.0.cjs)"
    return 1
  fi

  if [[ ! -f "${node_modules_state}" ]]; then
    log_stage "validate" "${workspace_name}" "FAIL missing node_modules/.yarn-state.yml"
    return 1
  fi

  if [[ ! -f "${install_state}" ]]; then
    log_stage "validate" "${workspace_name}" "FAIL missing .yarn/install-state.gz"
    return 1
  fi

  return 0
}

ensure_install_state() {
  local state_id="$1"
  resolve_install_state "${state_id}"

  local workspace_name="${INSTALL_STATE_NAME["${state_id}"]}"
  local workspace_path="${INSTALL_STATE_PATH["${state_id}"]}"
  local yarn_binary="./.yarn/releases/yarn-4.12.0.cjs"

  pushd "${workspace_path}" >/dev/null
  log_stage "install" "${workspace_name}" "running yarn install"
  "${yarn_binary}" install

  local node_modules_state="./node_modules/.yarn-state.yml"
  local install_state="./.yarn/install-state.gz"

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

refresh_install_state() {
  local state_id="$1"
  resolve_install_state "${state_id}"

  local workspace_name="${INSTALL_STATE_NAME["${state_id}"]}"
  local workspace_path="${INSTALL_STATE_PATH["${state_id}"]}"
  local yarn_binary="./.yarn/releases/yarn-4.12.0.cjs"

  pushd "${workspace_path}" >/dev/null
  log_stage "refresh" "${workspace_name}" "running yarn install --refresh-lockfile"
  "${yarn_binary}" install --refresh-lockfile
  popd >/dev/null
}

validate_install_state() {
  local state_id="$1"
  resolve_install_state "${state_id}"

  local workspace_name="${INSTALL_STATE_NAME["${state_id}"]}"
  local workspace_path="${INSTALL_STATE_PATH["${state_id}"]}"
  local lockfile_path="${workspace_path}/yarn.lock"
  local yarn_binary="./.yarn/releases/yarn-4.12.0.cjs"

  log_stage "validate" "${workspace_name}" "starting"

  if ! verify_install_artifacts "${workspace_name}" "${workspace_path}" "${lockfile_path}"; then
    INSTALL_STATE_VALIDATION_RESULT["${state_id}"]="false"
    return 1
  fi

  pushd "${workspace_path}" >/dev/null
  if "${yarn_binary}" install --immutable; then
    popd >/dev/null
  else
    local exit_code=$?
    popd >/dev/null
    log_stage "validate" "${workspace_name}" "FAIL yarn install --immutable exited ${exit_code}"
    INSTALL_STATE_VALIDATION_RESULT["${state_id}"]="false"
    return 1
  fi

  if ! verify_install_artifacts "${workspace_name}" "${workspace_path}" "${lockfile_path}"; then
    INSTALL_STATE_VALIDATION_RESULT["${state_id}"]="false"
    return 1
  fi

  local lockfile_size
  lockfile_size=$(wc -c < "${lockfile_path}")
  log_stage "validate" "${workspace_name}" "PASS immutable install succeeded; yarn.lock bytes=${lockfile_size}"
  INSTALL_STATE_VALIDATION_RESULT["${state_id}"]="true"
  return 0
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
  -name "install-state.gz" -o \
  -name "tsconfig.tsbuildinfo" -o \
  -name "npm-shrinkwrap.json" \
\) -print -delete

# Recreate empty yarn.lock files at workspace boundaries to ensure the install state is consistent with the expected file structure for each workspace
touch \
  ./web-ui/submodules/sce/yarn.lock \
  ./web-ui/yarn.lock \
  ./yarn.lock

# Install dependencies and verify install state files for each workspace
for state_id in "${INSTALL_STATE_IDS[@]}"; do
  ensure_install_state "${state_id}"
done

# refresh lockfiles to ensure they are up to date with the current state of dependencies
for state_id in "${INSTALL_REFRESH_IDS[@]}"; do
  refresh_install_state "${state_id}"
done

validation_failures=0

for state_id in "${INSTALL_REFRESH_IDS[@]}"; do
  if ! validate_install_state "${state_id}"; then
    validation_failures=$((validation_failures + 1))
  fi
done

echo "Validation summary:"
for state_id in "${INSTALL_REFRESH_IDS[@]}"; do
  echo "  ${INSTALL_STATE_NAME["${state_id}"]}: ${INSTALL_STATE_VALIDATION_RESULT["${state_id}"]:-false}"
done

if (( validation_failures > 0 )); then
  echo "Completed cleanup/install/refresh, but ${validation_failures} validation check(s) failed." >&2
  exit 1
fi


# pushd "${REPO_ROOT}/web-ui/submodules/sce" >/dev/null
# "./.yarn/releases/yarn-4.12.0.cjs" workspace @semanticencoding/core run build:publish
# "./.yarn/releases/yarn-4.12.0.cjs" workspace semanticencoding run build:publish
# popd >/dev/null

# ensure_install_state \
#   "JSON Viewer" \
#   "${REPO_ROOT}/web-ui/submodules/json-viewer/packages" 

# pushd "${REPO_ROOT}/web-ui/submodules/json-viewer/packages" >/dev/null
# "./.yarn/releases/yarn-4.12.0.cjs" workspace @compliance-theater/json-viewer run build:publish
# popd >/dev/null

# pushd "web-ui" >/dev/null
# "./.yarn/releases/yarn-4.12.0.cjs" install
# popd >/dev/null

echo "Cleaned up symlinks/lockfiles, reinstalled dependencies, refreshed lockfiles, and validated install state files."
