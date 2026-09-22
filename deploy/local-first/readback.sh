#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="deploy/local-first/compose.yml"
ENV_FILE="deploy/local-first/.env.example"
COMPOSE=(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
EXPECTED_SERVICES=(reverse-proxy play back map-storage maps redis uploader icon)
REDIS_VOLUME=""
MAP_STORAGE_VOLUME=""

cleanup() {
    local rc=$?
    trap - EXIT INT TERM
    set +e
    echo "[local-first readback] cleanup: stopping containers (volumes retained)"
    "${COMPOSE[@]}" down --remove-orphans >/dev/null
    local down_rc=$?
    if [[ -n "$REDIS_VOLUME" ]] && ! docker volume inspect "$REDIS_VOLUME" >/dev/null 2>&1; then
        echo "[local-first readback] cleanup ERROR: Redis volume was removed: $REDIS_VOLUME" >&2
        rc=1
    fi
    if [[ -n "$MAP_STORAGE_VOLUME" ]] && ! docker volume inspect "$MAP_STORAGE_VOLUME" >/dev/null 2>&1; then
        echo "[local-first readback] cleanup ERROR: map-storage volume was removed: $MAP_STORAGE_VOLUME" >&2
        rc=1
    fi
    [[ $down_rc -eq 0 ]] || rc=$down_rc
    set -e
    exit "$rc"
}
trap cleanup EXIT INT TERM

DEADLINE=$((SECONDS + 120))

wait_http() {
    local label=$1 host=$2 path=$3 expected=$4 body
    while (( SECONDS < DEADLINE )); do
        if body="$(curl --fail --silent --show-error --max-time 5 -H "Host: $host" "http://127.0.0.1$path" 2>/dev/null)"; then
            if [[ "$expected" == "__ANY__" || "$body" == "$expected" ]]; then
                echo "[local-first readback] HTTP OK: $label"
                return 0
            fi
        fi
        sleep 2
    done
    echo "[local-first readback] ERROR: timed out waiting for $label" >&2
    return 1
}

echo "[local-first readback] starting eight-service stack from built images"
"${COMPOSE[@]}" up -d --no-build

redis_cid="$("${COMPOSE[@]}" ps -q redis)"
map_storage_cid="$("${COMPOSE[@]}" ps -q map-storage)"
[[ -n "$redis_cid" && -n "$map_storage_cid" ]] || {
    echo "[local-first readback] ERROR: persistent-service containers missing" >&2
    exit 1
}
REDIS_VOLUME="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$redis_cid")"
MAP_STORAGE_VOLUME="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/maps"}}{{.Name}}{{end}}{{end}}' "$map_storage_cid")"
[[ -n "$REDIS_VOLUME" && -n "$MAP_STORAGE_VOLUME" ]] || {
    echo "[local-first readback] ERROR: named persistent volumes not mounted" >&2
    exit 1
}

wait_http "play /ping" "play.workadventure.localhost" "/ping" "pong"
wait_http "map-storage /ping" "map-storage.workadventure.localhost" "/ping" "pong"
wait_http "uploader /ping" "uploader.workadventure.localhost" "/ping" "pong"
wait_http "maps starter map" "maps.workadventure.localhost" "/starter/map.json" "__ANY__"

redis_reply="$("${COMPOSE[@]}" exec -T redis redis-cli ping | tr -d '\r')"
if [[ "$redis_reply" != "PONG" ]]; then
    echo "[local-first readback] ERROR: Redis ping returned '$redis_reply'" >&2
    exit 1
fi
echo "[local-first readback] Redis OK: PONG"

for service in "${EXPECTED_SERVICES[@]}"; do
    cid="$("${COMPOSE[@]}" ps -q "$service")"
    [[ -n "$cid" ]] || {
        echo "[local-first readback] ERROR: service has no container: $service" >&2
        exit 1
    }
    state="$(docker inspect --format '{{if .State.Running}}running{{else}}stopped{{end}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
    running="${state%% *}"
    health="${state#* }"
    [[ "$running" == "running" ]] || {
        echo "[local-first readback] ERROR: service not running: $service ($state)" >&2
        exit 1
    }
    [[ "$health" == "none" || "$health" == "healthy" ]] || {
        echo "[local-first readback] ERROR: service unhealthy: $service ($health)" >&2
        exit 1
    }
    echo "[local-first readback] service OK: $service ($state)"
done

echo "[local-first readback] PASS: routes, Redis, service state, and health checks are green"
echo "[local-first readback] persistent volumes: $REDIS_VOLUME $MAP_STORAGE_VOLUME"
