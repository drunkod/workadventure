#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$ROOT"
timeout_seconds="${DURABILITY_SMOKE_TIMEOUT_SECONDS:-300}"
run_id="$(date -u +%Y%m%d-%H%M%S)-$$"
source_project="local-first-durability-source-$run_id"; restore_project="local-first-durability-restore-$run_id"
evidence="$ROOT/_ops/local-first-durability/$source_project"; mkdir -p "$evidence"
deadline=$((SECONDS + timeout_seconds))
(( deadline > SECONDS )) || { echo "invalid timeout" >&2; exit 2; }
env=(--env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml)
assert_fresh_project() {
  local project=$1
  [[ -z $(docker-compose -p "$project" "${env[@]}" ps -aq 2>/dev/null) ]] || { echo "temporary project already has containers: $project" >&2; return 1; }
  for v in "${project}_redis-data" "${project}_map-storage-data"; do
    if docker volume inspect "$v" >/dev/null 2>&1; then echo "temporary project volume already exists: $v" >&2; return 1; fi
  done
}
assert_fresh_project "$source_project"
assert_fresh_project "$restore_project"
node -e 'setTimeout(() => process.kill(Number(process.argv[1]), "SIGTERM"), Number(process.argv[2]) * 1000)' "$$" "$timeout_seconds" >/dev/null 2>&1 & watchdog_pid=$!
cleanup() {
  rc=$?
  set +e
  trap - EXIT INT TERM
  cleanup_failed=0
  if kill -0 "$watchdog_pid" 2>/dev/null; then kill "$watchdog_pid" 2>/dev/null; fi
  wait "$watchdog_pid" 2>/dev/null
  docker-compose -p "$source_project" "${env[@]}" down -v --remove-orphans >/dev/null 2>&1 || cleanup_failed=1
  docker-compose -p "$restore_project" "${env[@]}" down -v --remove-orphans >/dev/null 2>&1 || cleanup_failed=1
  for project in "$source_project" "$restore_project"; do
    leftovers=$(docker-compose -p "$project" "${env[@]}" ps -aq 2>/dev/null || true)
    [[ -z "$leftovers" ]] || { echo "cleanup left containers for $project" >&2; cleanup_failed=1; }
    for v in "${project}_redis-data" "${project}_map-storage-data"; do
      if docker volume inspect "$v" >/dev/null 2>&1; then echo "cleanup left volume: $v" >&2; cleanup_failed=1; fi
    done
  done
  (( cleanup_failed == 0 )) || { echo "durability smoke cleanup failed" >&2; rc=1; }
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker-compose -p "$source_project" "${env[@]}" up -d --no-build --pull=never
source_volume_dir="$evidence/source"; mkdir -p "$source_volume_dir"
map_cid=$(docker-compose -p "$source_project" "${env[@]}" ps -q map-storage)
map_volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/maps"}}{{.Name}}{{end}}{{end}}' "$map_cid")
docker run --pull=never --rm -v "$map_volume:/maps" workadventure-local-first-map-storage sh -c 'mkdir -p /maps/durability && printf "%s" "durability-marker" > /maps/durability/map.tmj'
wait_http() {
  local host=$1 path=$2
  while (( SECONDS < deadline )); do
    curl --fail --silent --max-time 3 -H "Host: $host" "http://127.0.0.1$path" >/dev/null && return 0
    sleep 2
  done
  return 1
}
wait_back_ready() {
  local project=$1 redis_reply
  while (( SECONDS < deadline )); do
    redis_reply=$(docker-compose -p "$project" "${env[@]}" exec -T redis redis-cli ping 2>/dev/null | tr -d '\r' || true)
    if [[ "$redis_reply" == "PONG" ]] && docker-compose -p "$project" "${env[@]}" exec -T back curl --fail --silent --max-time 3 http://127.0.0.1:8080/ping >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}
wait_http map-storage.workadventure.localhost /ping || { echo "map-storage route timed out" >&2; exit 1; }
wait_http uploader.workadventure.localhost /ping || { echo "uploader route timed out" >&2; exit 1; }
wait_back_ready "$source_project" || { echo "source back/Redis readiness timed out" >&2; exit 1; }
variable_probe() {
  local project=$1 expected=$2
  docker-compose -p "$project" "${env[@]}" exec -T back /usr/src/node_modules/.bin/tsx -e "import { getVariablesRepository } from './src/Services/Repository/VariablesRepository.ts'; (async () => { const r = await getVariablesRepository(); const v = await r.loadVariables('durability-smoke-room'); if (v['durability-key'] !== '$expected') process.exit(1); process.exit(0); })().catch(() => process.exit(1));" >/dev/null
}
docker-compose -p "$source_project" "${env[@]}" exec -T back /usr/src/node_modules/.bin/tsx -e "import { getVariablesRepository } from './src/Services/Repository/VariablesRepository.ts'; (async () => { const r = await getVariablesRepository(); await r.saveVariable('durability-smoke-room', 'durability-key', 'durability-variable'); process.exit(0); })().catch(() => process.exit(1));" >/dev/null
variable_probe "$source_project" durability-variable
upload_file="$evidence/durability-upload.txt"; printf '%s' durability-upload-marker > "$upload_file"
upload_json=$(curl --fail --silent --show-error --max-time 5 -H 'Host: uploader.workadventure.localhost' -F "file=@$upload_file;filename=durability.txt;type=text/plain" http://127.0.0.1/upload-file)
upload_id=$(node -e 'const x=JSON.parse(process.argv[1]); if (!x[0]?.id) process.exit(1); process.stdout.write(x[0].id)' "$upload_json")
[[ -n "$upload_id" ]] || { echo "uploader did not return an object id" >&2; exit 1; }
curl --fail --silent --show-error --max-time 5 -H 'Host: uploader.workadventure.localhost' "http://127.0.0.1/upload-file/$upload_id" | grep -qx durability-upload-marker
while (( SECONDS < deadline )); do curl --fail --silent --max-time 3 -H 'Host: map-storage.workadventure.localhost' http://127.0.0.1/durability/map.tmj | grep -qx durability-marker && break; sleep 2; done
(( SECONDS < deadline )) || { echo "map application readback timed out" >&2; exit 1; }
backup="$evidence/backup"
bash deploy/local-first/backup.sh --project "$source_project" --output "$backup" --env-file deploy/local-first/.env.example
bash deploy/local-first/restore.sh --backup "$backup" --project "$restore_project" --env-file deploy/local-first/.env.example
docker-compose -p "$restore_project" "${env[@]}" up -d --no-build --pull=never
wait_back_ready "$restore_project" || { echo "restored back/Redis readiness timed out" >&2; exit 1; }
variable_probe "$restore_project" durability-variable
wait_http map-storage.workadventure.localhost /ping || { echo "restored map-storage route timed out" >&2; exit 1; }
wait_http uploader.workadventure.localhost /ping || { echo "restored uploader route timed out" >&2; exit 1; }
while (( SECONDS < deadline )); do curl --fail --silent --max-time 3 -H 'Host: map-storage.workadventure.localhost' http://127.0.0.1/durability/map.tmj | grep -qx durability-marker && break; sleep 2; done
(( SECONDS < deadline )) || { echo "restored map application readback timed out" >&2; exit 1; }
curl --fail --silent --show-error --max-time 5 -H 'Host: uploader.workadventure.localhost' "http://127.0.0.1/upload-file/$upload_id" | grep -qx durability-upload-marker
printf 'source_project=%s\nrestore_project=%s\nmap=PASS\nvariable=PASS\nuploader=PASS\n' "$source_project" "$restore_project" > "$evidence/result.txt"
echo "PASS: clean backup, checksum-first fresh restore, and restored map, variable, and uploader readbacks"
