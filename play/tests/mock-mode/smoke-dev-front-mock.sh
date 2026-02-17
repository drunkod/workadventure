#!/usr/bin/env bash

set -euo pipefail

PORT="${FRONTEND_MOCK_PORT:-8080}"
BASE_URL="${FRONTEND_MOCK_BASE_URL:-http://127.0.0.1:${PORT}}"
ROOM_URL="${BASE_URL}/_/global/mock-maps/starter/map.json?alone=true"
LOG_FILE="${FRONTEND_MOCK_LOG_FILE:-/tmp/workadventure-dev-front-mock.log}"
WAIT_SECONDS="${FRONTEND_MOCK_WAIT_SECONDS:-90}"

SERVER_PID=""

cleanup() {
    if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
        kill "${SERVER_PID}" 2>/dev/null || true
        wait "${SERVER_PID}" 2>/dev/null || true
    fi
}

fail_with_logs() {
    echo "Smoke test failed. Last dev-front-mock logs:" >&2
    if [[ -f "${LOG_FILE}" ]]; then
        tail -n 120 "${LOG_FILE}" >&2 || true
    else
        echo "No log file found at ${LOG_FILE}" >&2
    fi
}

trap cleanup EXIT
trap fail_with_logs ERR

wait_for_ready() {
    local url="$1"
    local seconds="$2"

    for _ in $(seq 1 "${seconds}"); do
        if curl -fsS "${url}" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done

    fail_with_logs
    echo "Timed out waiting for ${url}" >&2
    return 1
}

echo "Starting dev-front-mock on ${BASE_URL} ..."
npm run dev-front-mock >"${LOG_FILE}" 2>&1 &
SERVER_PID="$!"

wait_for_ready "${BASE_URL}/ping" "${WAIT_SECONDS}"
echo "Server is ready."
ROOM_URL_ENCODED="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "${ROOM_URL}")"

MAP_JSON="$(curl -fsS "${BASE_URL}/map")"
printf "%s" "${MAP_JSON}" | node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
if (typeof payload.mapUrl !== "string" || !payload.mapUrl.startsWith("/mock-maps/")) {
  throw new Error("Invalid /map response: mapUrl must point to /mock-maps/*");
}
if (typeof payload.authenticationMandatory !== "boolean") {
  throw new Error("Invalid /map response: authenticationMandatory must be a boolean");
}
'

ANON_JSON="$(curl -fsS -X POST "${BASE_URL}/anonymLogin" -H "content-type: application/json" -d "{}")"
printf "%s" "${ANON_JSON}" | node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
if (typeof payload.userUuid !== "string" || payload.userUuid.length === 0) {
  throw new Error("Invalid /anonymLogin response: missing userUuid");
}
if (typeof payload.authToken !== "string" || payload.authToken.split(".").length !== 3) {
  throw new Error("Invalid /anonymLogin response: authToken must be JWT-shaped");
}
'

ME_JSON="$(curl -fsS "${BASE_URL}/me?token=smoke-token")"
printf "%s" "${ME_JSON}" | node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
if (payload.status !== "ok") {
  throw new Error("Invalid /me response: status must be ok");
}
if (typeof payload.authToken !== "string" || payload.authToken.split(".").length !== 3) {
  throw new Error("Invalid /me response: authToken must be JWT-shaped");
}
if (typeof payload.isCharacterTexturesValid !== "boolean") {
  throw new Error("Invalid /me response: missing isCharacterTexturesValid");
}
'

WOKA_JSON="$(curl -fsS "${BASE_URL}/woka/list")"
printf "%s" "${WOKA_JSON}" | node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
if (!payload || typeof payload !== "object" || !payload.woka) {
  throw new Error("Invalid /woka/list response: missing woka key");
}
'

COMPANION_JSON="$(curl -fsS "${BASE_URL}/companion/list?roomUrl=${ROOM_URL_ENCODED}")"
printf "%s" "${COMPANION_JSON}" | node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
if (!Array.isArray(payload)) {
  throw new Error("Invalid /companion/list response: expected array");
}
if (payload.length > 0 && !Array.isArray(payload[0].textures)) {
  throw new Error("Invalid /companion/list response: expected textures array");
}
'

PING_BODY="$(curl -fsS "${BASE_URL}/ping")"
if [[ "${PING_BODY}" != "pong" ]]; then
    echo "Invalid /ping response: ${PING_BODY}" >&2
    exit 1
fi

REGISTER_JSON="$(curl -fsS -X POST "${BASE_URL}/register" -H "content-type: application/json" -d '{"organizationMemberToken":"smoke-token"}')"
printf "%s" "${REGISTER_JSON}" | node -e '
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
if (typeof payload.roomUrl !== "string" || typeof payload.mapUrlStart !== "string") {
  throw new Error("Invalid /register response shape");
}
if (typeof payload.authToken !== "string" || payload.authToken.split(".").length !== 3) {
  throw new Error("Invalid /register response: authToken must be JWT-shaped");
}
'

SAVE_NAME_STATUS="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/save-name" -H "content-type: application/json" -d '{"name":"Smoke","roomUrl":"room"}')"
SAVE_TEXTURES_STATUS="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/save-textures" -H "content-type: application/json" -d '{"textures":["color_22"],"roomUrl":"room"}')"
SAVE_COMPANION_STATUS="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/save-companion-texture" -H "content-type: application/json" -d '{"texture":"dog1","roomUrl":"room"}')"

if [[ "${SAVE_NAME_STATUS}" != "204" || "${SAVE_TEXTURES_STATUS}" != "204" || "${SAVE_COMPANION_STATUS}" != "204" ]]; then
    echo "Save endpoint status mismatch: /save-name=${SAVE_NAME_STATUS}, /save-textures=${SAVE_TEXTURES_STATUS}, /save-companion-texture=${SAVE_COMPANION_STATUS}" >&2
    exit 1
fi

curl -fsS "${BASE_URL}/mock-maps/starter/map.json" >/dev/null
SCRIPT_HEADERS="$(curl -fsSI "${BASE_URL}/mock-maps/starter/script.js")"
if ! printf "%s" "${SCRIPT_HEADERS}" | grep -iq "content-type: text/javascript"; then
    echo "Invalid content-type for /mock-maps/starter/script.js" >&2
    echo "${SCRIPT_HEADERS}" >&2
    exit 1
fi

BOOT_HTML="$(curl -fsS "${ROOM_URL}")"
if ! printf "%s" "${BOOT_HTML}" | grep -q 'id="app"'; then
    echo "Boot page does not contain app root for alone=true room URL" >&2
    exit 1
fi
if ! printf "%s" "${BOOT_HTML}" | grep -q '/src/svelte.ts'; then
    echo "Boot page does not contain frontend entry script for alone=true room URL" >&2
    exit 1
fi

echo "dev-front-mock smoke checks passed."
