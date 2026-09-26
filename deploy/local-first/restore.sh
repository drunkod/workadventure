#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$ROOT"
BACKUP=""; PROJECT=""; ENV_FILE=""
while (($#)); do
  case "$1" in
    --backup) [[ $# -ge 2 ]] || { echo "missing value for --backup" >&2; exit 2; }; BACKUP=$2; shift 2;;
    --project) [[ $# -ge 2 ]] || { echo "missing value for --project" >&2; exit 2; }; PROJECT=$2; shift 2;;
    --env-file) [[ $# -ge 2 ]] || { echo "missing value for --env-file" >&2; exit 2; }; ENV_FILE=$2; shift 2;;
    *) echo "usage: $0 --backup DIR --project NAME [--env-file FILE]" >&2; exit 2;;
  esac
done
[[ -n "$BACKUP" && -n "$PROJECT" ]] || { echo "backup and destination project are required" >&2; exit 1; }
[[ "$PROJECT" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || { echo "invalid destination project name: $PROJECT" >&2; exit 1; }
[[ "$BACKUP" = /* ]] || BACKUP="$ROOT/$BACKUP"
[[ -f "$BACKUP/manifest.txt" && -f "$BACKUP/SHA256SUMS" && -f "$BACKUP/redis-data.tar.gz" && -f "$BACKUP/map-storage-data.tar.gz" ]] || { echo "incomplete backup" >&2; exit 1; }
source_project=$(awk -F= '$1 == "source_project" {print substr($0, index($0, "=") + 1)}' "$BACKUP/manifest.txt")
source_env_file=$(awk -F= '$1 == "source_env_file" {print substr($0, index($0, "=") + 1)}' "$BACKUP/manifest.txt")
[[ -n "$source_project" && "$PROJECT" != "$source_project" ]] || { echo "destination must differ from manifest source project" >&2; exit 1; }
checksum_files=$(awk 'NF >= 2 { name=$2; sub(/^\*/, "", name); print name }' "$BACKUP/SHA256SUMS" | LC_ALL=C sort)
expected_checksums=$'map-storage-data.tar.gz\nredis-data.tar.gz'
[[ "$checksum_files" == "$expected_checksums" ]] || { echo "SHA256SUMS must contain exactly redis-data.tar.gz and map-storage-data.tar.gz" >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then SHA256=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then SHA256=(shasum -a 256)
else echo "no SHA-256 tool found (need sha256sum or shasum)" >&2; exit 1; fi
(cd "$BACKUP" && "${SHA256[@]}" -c SHA256SUMS)
[[ -n "$ENV_FILE" ]] || ENV_FILE="${source_env_file:-deploy/local-first/.env.example}"
[[ "$ENV_FILE" = /* ]] || ENV_FILE="$ROOT/$ENV_FILE"
[[ -f "$ENV_FILE" ]] || { echo "env file does not exist: $ENV_FILE; pass --env-file to override the recorded source path" >&2; exit 1; }
BASE_COMPOSE=(docker-compose -p "$PROJECT" --env-file "$ENV_FILE" -f deploy/local-first/compose.yml)
TOKEN="local-first-restore-$(date -u +%Y%m%d-%H%M%S)-$$-$RANDOM"
lock_root="${TMPDIR:-/tmp}/workadventure-local-first-restore-locks"; mkdir -p "$lock_root"; lock_dir="$lock_root/$PROJECT.lock"
override=$(mktemp "${TMPDIR:-/tmp}/workadventure-local-first-restore.XXXXXX")
cat > "$override" <<YAML
services:
  reverse-proxy: { labels: { local-first.restore-token: "$TOKEN" } }
  play: { labels: { local-first.restore-token: "$TOKEN" } }
  back: { labels: { local-first.restore-token: "$TOKEN" } }
  map-storage: { labels: { local-first.restore-token: "$TOKEN" } }
  maps: { labels: { local-first.restore-token: "$TOKEN" } }
  redis: { labels: { local-first.restore-token: "$TOKEN" } }
  uploader: { labels: { local-first.restore-token: "$TOKEN" } }
  icon: { labels: { local-first.restore-token: "$TOKEN" } }
volumes:
  redis-data: { labels: { local-first.restore-token: "$TOKEN" } }
  map-storage-data: { labels: { local-first.restore-token: "$TOKEN" } }
networks:
  default: { labels: { local-first.restore-token: "$TOKEN" } }
YAML
mkdir "$lock_dir" 2>/dev/null || { rm -f "$override"; echo "destination restore is already claimed: $PROJECT" >&2; exit 1; }
printf 'pid=%s\nproject=%s\ntoken=%s\noverride=%s\n' "$$" "$PROJECT" "$TOKEN" "$override" > "$lock_dir/owner"
COMPOSE=(docker-compose -p "$PROJECT" --env-file "$ENV_FILE" -f deploy/local-first/compose.yml -f "$override")
created=0
cleanup_owned() {
  local failed=0 ids
  ids=$(docker ps -aq --filter "label=local-first.restore-token=$TOKEN" 2>/dev/null) || failed=1
  [[ -z "$ids" ]] || docker rm -f $ids >/dev/null 2>&1 || failed=1
  ids=$(docker volume ls -q --filter "label=local-first.restore-token=$TOKEN" 2>/dev/null) || failed=1
  [[ -z "$ids" ]] || docker volume rm $ids >/dev/null 2>&1 || failed=1
  ids=$(docker network ls -q --filter "label=local-first.restore-token=$TOKEN" 2>/dev/null) || failed=1
  [[ -z "$ids" ]] || docker network rm $ids >/dev/null 2>&1 || failed=1
  return "$failed"
}
cleanup() {
  rc=$?; trap - EXIT INT TERM
  cleanup_failed=0
  if ((rc && created)); then cleanup_owned || cleanup_failed=1; fi
  if ((cleanup_failed)); then
    echo "partial restore cleanup failed; restore claim retained for inspection: $lock_dir" >&2
    exit 1
  fi
  rm -f "$override" "$lock_dir/owner"
  rmdir "$lock_dir" || { echo "failed to release restore claim: $lock_dir" >&2; exit 1; }
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
[[ -z $("${BASE_COMPOSE[@]}" ps -aq 2>/dev/null) ]] || { echo "destination has containers" >&2; exit 1; }
for v in "${PROJECT}_redis-data" "${PROJECT}_map-storage-data"; do
  if docker volume inspect "$v" >/dev/null 2>&1; then echo "destination volume exists: $v" >&2; exit 1; fi
done
created=1
"${COMPOSE[@]}" create --no-build --pull never >/dev/null
services=(reverse-proxy play back map-storage maps redis uploader icon)
for service in "${services[@]}"; do
  cid=$("${COMPOSE[@]}" ps -a -q "$service")
  [[ -n "$cid" ]] || { echo "restore create missed service: $service" >&2; exit 1; }
  label=$(docker inspect --format '{{ index .Config.Labels "local-first.restore-token" }}' "$cid")
  [[ "$label" == "$TOKEN" ]] || { echo "destination container is not owned by this restore: $service" >&2; exit 1; }
done
project_ids=$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT" | LC_ALL=C sort)
owned_ids=$(docker ps -aq --filter "label=local-first.restore-token=$TOKEN" | LC_ALL=C sort)
[[ "$project_ids" == "$owned_ids" ]] || { echo "destination project contains containers not owned by this restore" >&2; exit 1; }
for v in "${PROJECT}_redis-data" "${PROJECT}_map-storage-data"; do
  label=$(docker volume inspect --format '{{ index .Labels "local-first.restore-token" }}' "$v" 2>/dev/null || true)
  [[ "$label" == "$TOKEN" ]] || { echo "destination volume is not owned by this restore: $v" >&2; exit 1; }
done
network_name="${PROJECT}_default"
label=$(docker network inspect --format '{{ index .Labels "local-first.restore-token" }}' "$network_name" 2>/dev/null || true)
[[ "$label" == "$TOKEN" ]] || { echo "destination network is not owned by this restore: $network_name" >&2; exit 1; }
redis_cid=$("${COMPOSE[@]}" ps -a -q redis)
map_cid=$("${COMPOSE[@]}" ps -a -q map-storage)
redis_volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$redis_cid")
map_volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/maps"}}{{.Name}}{{end}}{{end}}' "$map_cid")
docker run --pull=never --rm -v "$redis_volume:/data" -v "$BACKUP:/backup:ro" redis:6 tar -C /data -xzf /backup/redis-data.tar.gz
docker run --pull=never --rm -v "$map_volume:/maps" -v "$BACKUP:/backup:ro" workadventure-local-first-map-storage tar -C /maps -xzf /backup/map-storage-data.tar.gz
trap - EXIT INT TERM
rm -f "$override" "$lock_dir/owner"
rmdir "$lock_dir"
echo "restore created stopped project: $PROJECT"
