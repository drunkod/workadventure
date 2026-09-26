#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$ROOT"
PROJECT="workadventure-local-first"; OUT=""; ENV_FILE="deploy/local-first/.env.example"
while (($#)); do
  case "$1" in
    --project) [[ $# -ge 2 ]] || { echo "missing value for --project" >&2; exit 2; }; PROJECT=$2; shift 2;;
    --output) [[ $# -ge 2 ]] || { echo "missing value for --output" >&2; exit 2; }; OUT=$2; shift 2;;
    --env-file) [[ $# -ge 2 ]] || { echo "missing value for --env-file" >&2; exit 2; }; ENV_FILE=$2; shift 2;;
    *) echo "usage: $0 [--project NAME] [--output DIR] [--env-file FILE]" >&2; exit 2;;
  esac
done
[[ -n "$OUT" ]] || OUT="$ROOT/_ops/local-first-backups/$(date -u +%Y%m%dT%H%M%SZ)"
[[ "$OUT" = /* ]] || OUT="$ROOT/$OUT"
[[ "$ENV_FILE" = /* ]] || ENV_FILE="$ROOT/$ENV_FILE"
[[ -f "$ENV_FILE" ]] || { echo "env file does not exist: $ENV_FILE" >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then SHA256=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then SHA256=(shasum -a 256)
else echo "no SHA-256 tool found (need sha256sum or shasum)" >&2; exit 1; fi
COMPOSE=(docker-compose -p "$PROJECT" --env-file "$ENV_FILE" -f deploy/local-first/compose.yml)
mkdir -p "$(dirname "$OUT")"
mkdir "$OUT" 2>/dev/null || { echo "backup output already exists: $OUT" >&2; exit 1; }
completed=0
cleanup_backup() {
  rc=$?; trap - EXIT INT TERM
  if ((rc != 0 && completed == 0)); then rm -rf "$OUT"; fi
  exit "$rc"
}
trap cleanup_backup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
services=(reverse-proxy play back map-storage maps redis uploader icon)
images=(); image_ids=(); redis_cid=""; map_cid=""
for service in "${services[@]}"; do
  cid=$("${COMPOSE[@]}" ps -q "$service")
  [[ -n "$cid" ]] || { echo "source container is required: $service" >&2; exit 1; }
  images+=("$(docker inspect --format '{{.Config.Image}}' "$cid")")
  image_ids+=("$(docker inspect --format '{{.Image}}' "$cid")")
  [[ "$service" != redis ]] || redis_cid=$cid
  [[ "$service" != map-storage ]] || map_cid=$cid
done
redis_volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$redis_cid")
map_volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/maps"}}{{.Name}}{{end}}{{end}}' "$map_cid")
[[ -n "$redis_volume" && -n "$map_volume" ]] || { echo "named source volumes are required" >&2; exit 1; }
"${COMPOSE[@]}" stop reverse-proxy play back map-storage maps uploader icon
"${COMPOSE[@]}" stop redis
state=$(docker inspect --format '{{.State.Status}} {{.State.ExitCode}}' "$redis_cid")
[[ "$state" == "exited 0" ]] || { echo "Redis did not stop cleanly: $state" >&2; exit 1; }
docker run --pull=never --rm -v "$redis_volume:/data:ro" redis:6 tar -C /data -czf - . > "$OUT/redis-data.tar.gz"
docker run --pull=never --rm -v "$map_volume:/maps:ro" workadventure-local-first-map-storage tar -C /maps -czf - . > "$OUT/map-storage-data.tar.gz"
(cd "$OUT" && "${SHA256[@]}" redis-data.tar.gz map-storage-data.tar.gz > SHA256SUMS)
{
  printf 'source_project=%s\nsource_revision=%s\nredis_volume=%s\nmap_storage_volume=%s\nredis_policy=appendonly yes; appendfsync everysec; maxmemory-policy noeviction\nsource_env_file=%s\nutc_timestamp=%s\nmaintenance_procedure=stop all eight services, verify Redis exited 0, checksum archives, restore into fresh project-scoped volumes\n' "$PROJECT" "$(git rev-parse HEAD)" "$redis_volume" "$map_volume" "$ENV_FILE" "$(date -u +%FT%TZ)"
  i=0
  for service in "${services[@]}"; do
    printf 'image_%s=%s\nimage_id_%s=%s\n' "$service" "${images[$i]}" "$service" "${image_ids[$i]}"
    i=$((i + 1))
  done
  printf 'sha256_checksums_file=SHA256SUMS\n'
  cat "$OUT/SHA256SUMS"
} > "$OUT/manifest.txt"
completed=1
trap - EXIT INT TERM
echo "backup created: $OUT (source remains stopped)"
