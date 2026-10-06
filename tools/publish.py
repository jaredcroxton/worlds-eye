#!/usr/bin/env python3
"""Publish a clean public copy to GitHub: everything tracked at HEAD, minus the private project notes.

Usage:
  python3 tools/publish.py                      dry run: build and check the public tree, send nothing
  python3 tools/publish.py --push -m "message"  build, check, commit on the local public branch, push it

Input contract: a clean working tree on the main branch. With --push, a git remote named "public".
Output contract: one line per step, a report at .tmp/publish_report.json, exit code 0 only when every step passed.
Nothing is sent unless every check passed. The main branch is never pushed.
SOP: architecture/08_publish.md.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ["claude.md", "CLAUDE.md", "task_plan.md", "findings.md", "progress.md"]
REMOTE = "public"
BRANCH = "public"
MAX_BYTES = 50 * 1024 * 1024
TEXT_ENDINGS = (".md", ".py", ".js", ".json", ".txt", ".example", ".gitignore", ".html", ".css")
HOOK_MARK = "# worlds-eye pre-push guard v1"
HOOK = f"""#!/bin/sh
{HOOK_MARK}
# Refuses to push any commit whose tree holds the private project notes. Installed by tools/publish.py.
zero=0000000000000000000000000000000000000000
while read local_ref local_sha remote_ref remote_sha; do
  [ "$local_sha" = "$zero" ] && continue
  found=$(git ls-tree -r --name-only "$local_sha" -- {' '.join(PRIVATE)} 2>/dev/null)
  if [ -n "$found" ]; then
    echo "Refused: $local_ref holds private notes ($(echo $found | tr '\\n' ' ')). Publish with tools/publish.py instead." >&2
    exit 1
  fi
done
exit 0
"""
# What may never appear in our own published files. The README copyright line is the one allowed use of the owner's name.
# The two words are built from halves so that this file passes its own scan.
OWNER_FIRST = "Jar" + "ed"
LOCAL_FOLDER = "APP" + " Ideas"
PRIVACY_RULES = [
    ("a home folder path", re.compile(r"/Users/[A-Za-z]")),
    ("an email address", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}")),
    ("a local folder name", re.compile(re.escape(LOCAL_FOLDER))),
    ("the owner's first name", re.compile(r"\b" + OWNER_FIRST + r"\b")),
]
ALLOWED_LINES = [re.compile(r"copyright 2026 " + OWNER_FIRST + r" Croxton", re.I)]

results = []


def record(name, ok, detail=""):
    results.append({"check": name, "pass": bool(ok), "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    return bool(ok)


def git(*args, env=None, check=True, text=True):
    run = subprocess.run(["git", *args], cwd=ROOT, env=env, capture_output=True, text=text)
    if check and run.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {run.stderr.strip() if text else run.stderr[:200]}")
    return run.stdout.strip() if text else run.stdout


def ours(path):
    return not path.startswith("app/") or path.startswith("app/shell/") or path.startswith("app/public/shell/")


def install_hook():
    hook = ROOT / ".git" / "hooks" / "pre-push"
    if hook.exists():
        current = hook.read_text(encoding="utf-8", errors="replace")
        if HOOK_MARK not in current:
            return record("pre-push guard installed", False, "another pre-push hook is already there; merge it by hand")
        if current == HOOK:
            return record("pre-push guard installed", True, "already in place")
    hook.parent.mkdir(parents=True, exist_ok=True)
    hook.write_text(HOOK, encoding="utf-8")
    hook.chmod(0o755)
    return record("pre-push guard installed", True, "written")


def finish(code):
    report = ROOT / ".tmp" / "publish_report.json"
    report.parent.mkdir(exist_ok=True)
    report.write_text(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "results": results}, indent=2), encoding="utf-8")
    failed = [row for row in results if not row["pass"]]
    print(f"\n{len(results) - len(failed)} of {len(results)} steps passed. Report: {report}")
    return code


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--push", action="store_true", help="send the snapshot to the public remote")
    parser.add_argument("-m", "--message", default="", help="the public commit message")
    args = parser.parse_args()

    # 1. A snapshot must equal a commit.
    dirty = git("status", "--porcelain")
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if not record("working tree is clean", not dirty, "" if not dirty else f"{len(dirty.splitlines())} uncommitted path(s)"):
        return finish(1)
    if not record("on the main branch", branch == "main", branch):
        return finish(1)

    # 2. Our own gates.
    for name, command in (("key scan is clean", [sys.executable, "tools/scan_keys.py"]), ("static gate passes", [sys.executable, "tools/check_app.py"])):
        run = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        last = (run.stdout.strip().splitlines() or [""])[-1]
        if not record(name, run.returncode == 0, last[:120]):
            return finish(1)

    # 3. The public tree: HEAD in a temporary index, minus the private notes.
    index = ROOT / ".git" / "index.publish"
    if index.exists():
        index.unlink()
    env = dict(os.environ, GIT_INDEX_FILE=str(index))
    try:
        git("read-tree", "HEAD", env=env)
        tracked = set(git("ls-files", env=env).splitlines())
        dropped = [path for path in PRIVATE if path in tracked]
        for path in dropped:
            git("update-index", "--force-remove", "--", path, env=env)
        tree = git("write-tree", env=env)
    finally:
        if index.exists():
            index.unlink()
    listing = git("ls-tree", "-r", "-l", tree).splitlines()
    files = []
    for line in listing:
        meta, path = line.split("\t", 1)
        size = meta.split()[3]
        files.append((path, int(size) if size.isdigit() else 0))
    paths = {path for path, _ in files}
    record("private notes left out", not any(path in paths for path in PRIVATE), f"dropped {', '.join(dropped) or 'none'}; {len(files)} files stay")
    record("no env file in the tree", not any(re.search(r"(^|/)\.env$", path) for path in paths))
    record("README is in the tree", "README.md" in paths)
    record("engine licence files are in the tree", {"app/LICENSE", "app/THIRD_PARTY_NOTICES.md", "app/DATA_SOURCES.md"} <= paths)
    record("font licence is in the tree", "app/public/shell/fonts/OFL.txt" in paths)
    record("no captured card pictures in the tree", not any(path.startswith("app/public/shell/cards/") for path in paths))

    # 4. Privacy scan of our own files.
    hits = []
    for path, _ in files:
        if not ours(path) or not path.endswith(TEXT_ENDINGS):
            continue
        body = git("show", f"{tree}:{path}", text=False).decode("utf-8", errors="replace")
        for number, line in enumerate(body.splitlines(), 1):
            if any(rule.search(line) for rule in ALLOWED_LINES):
                continue
            for what, rule in PRIVACY_RULES:
                if rule.search(line):
                    hits.append(f"{path}:{number} has {what}")
    record("privacy scan of our files", not hits, "; ".join(hits[:4]))

    # 5. Size.
    big = [f"{path} ({size // (1024 * 1024)} MB)" for path, size in files if size > MAX_BYTES]
    record("no file over 50 MB", not big, ", ".join(big[:3]))

    record_hook = install_hook()
    if any(not row["pass"] for row in results) or not record_hook:
        print("\nNothing was committed or sent.")
        return finish(1)

    if not args.push:
        total = sum(size for _, size in files)
        print(f"\nDry run. The public tree is {tree[:12]}: {len(files)} files, {total // (1024 * 1024)} MB. Nothing was committed or sent.")
        return finish(0)

    # 6. Commit the snapshot on the local public branch.
    remote = subprocess.run(["git", "remote", "get-url", REMOTE], cwd=ROOT, capture_output=True, text=True)
    if not record(f'remote "{REMOTE}" exists', remote.returncode == 0, remote.stdout.strip()):
        return finish(1)
    parent = subprocess.run(["git", "rev-parse", "-q", "--verify", f"refs/heads/{BRANCH}"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    same = bool(parent) and git("rev-parse", f"{parent}^{{tree}}") == tree
    if same:
        commit = parent
        record("snapshot committed", True, "no change since the last publish")
    else:
        message = args.message.strip() or f"Publish {time.strftime('%Y-%m-%d')}"
        commit_args = ["commit-tree", tree, "-m", message]
        if parent:
            commit_args += ["-p", parent]
        commit = git(*commit_args)
        git("update-ref", f"refs/heads/{BRANCH}", commit)
        record("snapshot committed", True, f"{commit[:12]} on local branch {BRANCH}")

    # 7. Push only that branch, to main on the public remote.
    push = subprocess.run(["git", "push", REMOTE, f"refs/heads/{BRANCH}:refs/heads/main"], cwd=ROOT, capture_output=True, text=True)
    tail = (push.stderr.strip().splitlines() or [""])[-1]
    record("pushed to the public remote", push.returncode == 0, tail[:160])
    if push.returncode != 0:
        print(push.stderr.strip()[-1500:])
        return finish(1)
    return finish(0)


if __name__ == "__main__":
    sys.exit(main())
