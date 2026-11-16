#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATIC_OUT="$(python3 "${REPO_ROOT}/tests/check_static.py")"
echo "${STATIC_OUT}"

TARGET="$(echo "${STATIC_OUT}" | sed -n 's/^TARGET=\(.*\)$/\1/p' | tail -n 1)"
if [ "${TARGET}" = "gnome-42" ]; then
    "${REPO_ROOT}/tests/gnome42_integration.sh"
else
    echo "INFO: target=${TARGET}; skipping GNOME 42 runtime integration suite"
fi
