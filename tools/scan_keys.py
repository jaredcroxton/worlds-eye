#!/usr/bin/env python3
"""Stop a key reaching git. Run before every push.

Usage: python3 tools/scan_keys.py

Input contract: the git work tree of this project.
Logic: scan every file git would send (tracked files plus untracked files that are not ignored)
that is ours: everything outside app/, plus app/index.html, app/shell/ and app/public/shell/.
Upstream files under app/ are public code and are not scanned. Also fail if any .env file is tracked.
Output contract: one line per finding (file, line number, kind; the value is never printed),
exit code 0 when clean, 1 when anything was found.
SOP: architecture/05_checks.md.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OURS_IN_APP = ("app/index.html", "app/shell/", "app/public/shell/")
PATTERNS = [
    ("OpenAI style key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{30,}")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}")),
    ("JSON web token", re.compile(r"\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}")),
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("bot token", re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{30,}")),
    ("key assignment", re.compile(r"\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*['\"]?[A-Za-z0-9_\-/+]{20,}")),
]
BINARY = (".png", ".jpg", ".jpeg", ".webp", ".woff2", ".gif", ".ico", ".pdf", ".glb", ".wav")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False).stdout


def main():
    tracked = git("ls-files").splitlines()
    untracked = git("ls-files", "--others", "--exclude-standard").splitlines()
    findings = []

    for name in tracked:
        base = name.rsplit("/", 1)[-1]
        if base == ".env" or (base.startswith(".env.") and base != ".env.example"):
            findings.append((name, 0, "an .env file is tracked by git"))

    for name in sorted(set(tracked + untracked)):
        if name.startswith("app/") and not name.startswith(OURS_IN_APP):
            continue
        if name.lower().endswith(BINARY):
            continue
        path = ROOT / name
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(text.splitlines(), 1):
            for kind, pattern in PATTERNS:
                if pattern.search(line):
                    findings.append((name, number, kind))

    for name, number, kind in findings:
        print(f"FOUND  {name}:{number}  {kind}")
    if findings:
        print(f"\n{len(findings)} finding(s). Remove them before any push.")
        return 1
    print(f"Clean. Scanned our files among {len(tracked)} tracked and {len(untracked)} untracked paths.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
