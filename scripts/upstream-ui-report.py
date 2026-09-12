#!/usr/bin/env python3
"""Report upstream commits that are candidates for the fork's UI-only sync policy."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = ROOT / ".upstream-ui-last-reviewed"
UPSTREAM_REF = "upstream/master"

UI_PREFIXES = (
    "play/src/front/Components/",
    "play/src/front/Chat/Components/",
    "play/src/front/style/",
    "play/src/front/img/",
    "play/src/i18n/",
)

AUX_PREFIXES = ("play/tests/", "tests/", "docs/")

PROTECTED_PREFIXES = (
    "back/", "play/src/pusher/", "messages/", "map-storage/", "uploader/", "synapse/",
    "play/src/front/Connection/", "play/src/front/Chat/Connection/Jazz/",
    "play/src/front/Phaser/", "play/src/front/WebRtc/", "play/src/front/Livekit/",
)
PROTECTED_EXACT = {
    "play/vite.config.mts", "play/public/frontend-only-env.js",
    "package.json", "package-lock.json", "play/package.json", "play/package-lock.json",
    "docker-compose.yaml", "docker-compose.yml",
}


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def is_protected(path: str) -> bool:
    if path in PROTECTED_EXACT:
        return True
    if path.startswith(PROTECTED_PREFIXES):
        return True
    name = Path(path).name
    return name.startswith(".env") or name in {"pnpm-lock.yaml", "yarn.lock"}


def is_ui(path: str) -> bool:
    return path.startswith(UI_PREFIXES)


def is_aux(path: str) -> bool:
    return path.startswith(AUX_PREFIXES)


def changed_files(sha: str) -> list[str]:
    out = git("diff-tree", "--no-commit-id", "--name-only", "-r", sha)
    return [line for line in out.splitlines() if line]
def classify(files: list[str]) -> tuple[str, float]:
    if any(is_protected(path) for path in files):
        return "PROTECTED", 0.0

    runtime = [path for path in files if not is_aux(path)]
    if not runtime:
        return "SKIP", 0.0

    ui_count = sum(is_ui(path) for path in runtime)
    score = ui_count / len(runtime)
    if ui_count and score >= 0.70:
        return "CANDIDATE", score
    if ui_count:
        return "REVIEW", score
    return "SKIP", score


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true", help="fetch upstream master first")
    parser.add_argument("--since", help="override the reviewed SHA/ref")
    parser.add_argument("--show-skipped", action="store_true")
    parser.add_argument("--mark-reviewed", action="store_true", help="write current upstream SHA to marker after reporting")
    args = parser.parse_args()

    if args.fetch:
        subprocess.run(["git", "fetch", "upstream", "master", "--prune"], cwd=ROOT, check=True)

    base = args.since or (MARKER.read_text().strip() if MARKER.exists() else git("merge-base", "HEAD", UPSTREAM_REF))
    head = git("rev-parse", UPSTREAM_REF)
    if base == head:
        print(f"No new upstream commits after {base[:10]}.")
    else:
        commits = git("rev-list", "--reverse", f"{base}..{UPSTREAM_REF}").splitlines()
        print(f"Reviewing {len(commits)} upstream commits: {base[:10]}..{head[:10]}")
        for sha in commits:
            files = changed_files(sha)
            status, score = classify(files)
            if status == "SKIP" and not args.show_skipped:
                continue
            meta = git("show", "-s", "--format=%ad | %s", "--date=short", sha)
            print(f"{status:9} {sha[:10]} ui={score:.0%} {meta}")
            if status in {"CANDIDATE", "REVIEW", "PROTECTED"}:
                for path in files:
                    print(f"  {path}")

    if args.mark_reviewed:
        MARKER.write_text(head + "\n")
        print(f"Marked {head[:10]} as reviewed in {MARKER.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
