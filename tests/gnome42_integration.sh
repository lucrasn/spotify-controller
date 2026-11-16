#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REPO_ROOT

TMP_DIR="$(mktemp -d)"
MPRIS_PID=""
HTTP_PID=""

cleanup() {
    if [ -n "${MPRIS_PID}" ] && kill -0 "${MPRIS_PID}" 2>/dev/null; then
        kill "${MPRIS_PID}" 2>/dev/null || true
    fi
    if [ -n "${HTTP_PID}" ] && kill -0 "${HTTP_PID}" 2>/dev/null; then
        kill "${HTTP_PID}" 2>/dev/null || true
    fi
    rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

export XDG_CONFIG_HOME="${TMP_DIR}/config"
export XDG_CACHE_HOME="${TMP_DIR}/cache"
export TEST_TMP_DIR="${TMP_DIR}"
mkdir -p "${XDG_CONFIG_HOME}" "${XDG_CACHE_HOME}"

glib-compile-schemas --strict "${REPO_ROOT}/schemas"

# Use xvfb-run when no graphical display is active (e.g. GitHub Actions)
XVFB_CMD=()
if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
    if ! command -v xvfb-run >/dev/null 2>&1; then
        echo "FAIL: no DISPLAY/WAYLAND_DISPLAY set and xvfb-run not found" >&2
        exit 1
    fi
    XVFB_CMD=(xvfb-run -a)
fi

echo "==> [1/5] Running prefs.js Adw 1.1 / GTK 4.6 integration test"
PREFS_OUT="$(GTK_USE_PORTAL=0 ${XVFB_CMD[@]+"${XVFB_CMD[@]}"} gjs "${REPO_ROOT}/tests/test_prefs.js" 2>&1)"
echo "${PREFS_OUT}"
if echo "${PREFS_OUT}" | grep -qE 'Gjs-CRITICAL|Failed to set text'; then
    echo "FAIL: critical or markup warning detected in test_prefs.js" >&2
    exit 1
fi

echo "==> [2/5] Running GNOME Shell 42.9 module & typelib verification"
LD_LIBRARY_PATH="/usr/lib/gnome-shell:/usr/lib/x86_64-linux-gnu/mutter-10${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
GI_TYPELIB_PATH="/usr/lib/gnome-shell:/usr/lib/x86_64-linux-gnu/mutter-10${GI_TYPELIB_PATH:+:$GI_TYPELIB_PATH}" \
    gjs "${REPO_ROOT}/tests/test_shell_modules.js"

echo "==> [3/5] Running PlaylistManager & QueueManager persistence test"
gjs "${REPO_ROOT}/tests/test_playlist_queue.js"

echo "==> [4/5] Running live D-Bus MPRIS integration test"
export MPRIS_STATE_FILE="${TMP_DIR}/mpris_state.json"
dbus-run-session -- bash -c '
    set -euo pipefail
    python3 "${REPO_ROOT}/tests/mock_mpris_server.py" "${MPRIS_STATE_FILE}" >"${TEST_TMP_DIR}/mpris.log" 2>&1 &
    SERVER_PID=$!
    trap "kill ${SERVER_PID} 2>/dev/null || true" EXIT

    for _ in $(seq 1 50); do
        if grep -q "^MPRIS_READY$" "${TEST_TMP_DIR}/mpris.log" 2>/dev/null; then
            break
        fi
        sleep 0.1
    done
    grep -q "^MPRIS_READY$" "${TEST_TMP_DIR}/mpris.log" || { cat "${TEST_TMP_DIR}/mpris.log"; exit 1; }

    gjs "${REPO_ROOT}/tests/test_mpris_integration.js"
'

echo "==> [5/5] Running live local HTTP (Soup 2.4 + Pixbuf) & LRC parser test"
python3 "${REPO_ROOT}/tests/mock_http_server.py" >"${TMP_DIR}/http.log" 2>&1 &
HTTP_PID=$!
for _ in $(seq 1 50); do
    if grep -q "^HTTP_READY:" "${TMP_DIR}/http.log" 2>/dev/null; then
        break
    fi
    sleep 0.1
done
PORT="$(sed -n 's/^HTTP_READY:\([0-9]*\)$/\1/p' "${TMP_DIR}/http.log" | head -n 1)"
if [ -z "${PORT}" ]; then
    cat "${TMP_DIR}/http.log" >&2
    echo "FAIL: mock HTTP server did not start" >&2
    exit 1
fi
export TEST_HTTP_BASE="http://127.0.0.1:${PORT}"
gjs "${REPO_ROOT}/tests/test_http_and_lyrics.js"

echo "ALL GNOME 42 INTEGRATION TESTS PASSED"
