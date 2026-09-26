#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BASE="deploy/local-first/compose.yml"
OVERRIDE="deploy/local-first/release-isolation.yml"
ENV_FILE="deploy/local-first/.env.example"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
RUN_TAG="$(printf '%s' "$RUN_ID" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')"
PROJECT="wa-lf-release-$RUN_TAG"
EVIDENCE="_ops/local-first-release/$RUN_ID"
PREFIX="WA-LF-${RUN_ID}-"
mkdir -p "$EVIDENCE"

if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo "release-smoke: worktree must be clean" >&2
  exit 2
fi
git rev-parse HEAD > "$EVIDENCE/source-revision.txt"
git status --short --branch > "$EVIDENCE/source-status.txt"
COMPOSE=(docker-compose --env-file "$ENV_FILE" -p "$PROJECT" -f "$BASE" -f "$OVERRIDE")
RULES_FILE="$EVIDENCE/iptables-rules.txt"
: > "$RULES_FILE"

cleanup() {
  rc=$?
  if command -v colima >/dev/null 2>&1; then
    while IFS= read -r rule; do
      [ -n "$rule" ] || continue
      colima ssh -- sudo sh -lc "iptables -D DOCKER-USER $rule" >/dev/null 2>&1 || true
    done < "$RULES_FILE"
  fi
  "${COMPOSE[@]}" logs --no-color > "$EVIDENCE/container-logs.txt" 2>&1 || true
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  exit "$rc"
}
trap cleanup EXIT INT TERM

node deploy/local-first/verify.mjs
node deploy/local-first/release-verify.mjs
"${COMPOSE[@]}" config > "$EVIDENCE/compose-resolved.yml"
docker-compose --env-file "$ENV_FILE" -f "$BASE" build
"${COMPOSE[@]}" up -d --no-build

for i in $(seq 1 120); do
  if curl --fail --silent http://play.workadventure.localhost/ping >/dev/null 2>&1; then break; fi
  sleep 1
  [ "$i" -lt 120 ] || { echo "release-smoke: origin not ready" >&2; exit 1; }
done

"${COMPOSE[@]}" ps > "$EVIDENCE/compose-ps.txt"
docker images --no-trunc --format '{{json .}}' | grep 'workadventure-local-first' > "$EVIDENCE/image-ids.jsonl" || true
DEFAULT_NET="${PROJECT}_default"
INGRESS_NET="${PROJECT}_ingress"
docker network inspect "$DEFAULT_NET" "$INGRESS_NET" > "$EVIDENCE/network-inspect.json"
docker inspect $("${COMPOSE[@]}" ps -q) > "$EVIDENCE/container-inspect.json"

if command -v colima >/dev/null 2>&1; then
  for net in "$DEFAULT_NET" "$INGRESS_NET"; do
    subnet="$(docker network inspect "$net" --format '{{(index .IPAM.Config 0).Subnet}}')"
    rule="-s $subnet -m conntrack --ctstate NEW -j LOG --log-prefix \"$PREFIX\" --log-level 6"
    colima ssh -- sudo sh -lc "iptables -I DOCKER-USER 1 $rule"
    printf '%s\n' "$rule" >> "$RULES_FILE"
  done
fi

PLAY_ID="$("${COMPOSE[@]}" ps -q play)"
set +e
CONTROL_OUTPUT="$(docker exec "$PLAY_ID" node -e '
const net = require("node:net");
const expectedBlockedErrors = new Set(["ENETUNREACH", "EHOSTUNREACH", "ETIMEDOUT"]);
const socket = net.createConnection({ host: "1.1.1.1", port: 443 });
let finished = false;
const finish = (code, reason) => {
    if (finished) return;
    finished = true;
    console.log(reason);
    socket.destroy();
    process.exitCode = code;
};
socket.setTimeout(5000, () => finish(0, "blocked:timeout"));
socket.once("connect", () => finish(7, "connected"));
socket.once("error", (error) => {
    const errorCode = typeof error?.code === "string" ? error.code : "UNKNOWN";
    const blocked = expectedBlockedErrors.has(errorCode);
    finish(blocked ? 0 : 8, (blocked ? "blocked:" : "unexpected:") + errorCode);
});
' 2>&1)"
CONTROL_RC=$?
set -e
printf '%s\n' "$CONTROL_OUTPUT" > "$EVIDENCE/container-control-probe.txt"
CONTROL_REASON="$(printf '%s\n' "$CONTROL_OUTPUT" | tail -n 1 | tr -cd 'A-Za-z0-9:_-')"
printf '{"container_public_egress_blocked":%s,"exit_code":%s,"reason":"%s"}\n' \
  "$([ "$CONTROL_RC" -eq 0 ] && echo true || echo false)" "$CONTROL_RC" "$CONTROL_REASON" \
  > "$EVIDENCE/container-control.json"
case "$CONTROL_RC" in
  0) ;;
  7) echo "release-smoke: container egress control unexpectedly connected" >&2; exit 1 ;;
  8) echo "release-smoke: container egress probe failed for an unrelated reason: $CONTROL_REASON" >&2; exit 1 ;;
  *) echo "release-smoke: container egress probe could not execute cleanly: $CONTROL_REASON" >&2; exit 1 ;;
esac
export LOCAL_FIRST_RELEASE_ORIGIN="http://play.workadventure.localhost"
export LOCAL_FIRST_BROWSER_EVIDENCE="$ROOT/$EVIDENCE/browser-evidence.json"
export NO_FLAKY=true
(cd tests && ../node_modules/.bin/playwright test tests/local-first-release.spec.ts --project=chromium) \
  > "$EVIDENCE/playwright-output.txt" 2>&1

if command -v colima >/dev/null 2>&1; then
  colima ssh -- sudo dmesg | grep "$PREFIX" > "$EVIDENCE/colima-egress.log" || true
  awk '{
    src=""; dst=""; proto=""; dpt="";
    for(i=1;i<=NF;i++){
      if($i ~ /^SRC=/) src=substr($i,5);
      if($i ~ /^DST=/) dst=substr($i,5);
      if($i ~ /^PROTO=/) proto=substr($i,7);
      if($i ~ /^DPT=/) dpt=substr($i,5);
    }
    if(src!="" || dst!="") print src "\t" dst "\t" proto "\t" dpt;
  }' "$EVIDENCE/colima-egress.log" > "$EVIDENCE/container-egress.tsv"
fi

python3 - "$EVIDENCE" <<'PY'
import json, pathlib, sys
p=pathlib.Path(sys.argv[1])
browser=json.loads((p/"browser-evidence.json").read_text())
summary={
  "status":"PASS",
  "browser":browser["assertions"],
  "httpExternalAttempts":browser["httpExternalAttempts"],
  "wsExternalAttempts":browser["wsExternalAttempts"],
}
(p/"summary.json").write_text(json.dumps(summary, indent=2)+"\n")
print(json.dumps(summary))
PY
