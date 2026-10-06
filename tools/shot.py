#!/usr/bin/env python3
"""Drive the running app in a headless browser and take screenshots.

Usage:
  .venv/bin/python tools/shot.py --size 1440x900 --url "/" --do ready --do shot:landing
  .venv/bin/python tools/shot.py --url "/?s=home" --do ready --do "click:[data-gx-go=globe]" --do wait:2000 --do shot:globe

Input contract: the dev server is running on --base (default http://localhost:4177).
Steps (--do, in order):
  ready            wait until the shell reports the engine ready (up to 120 s)
  wait:<ms>        pause
  click:<css>      click the first match
  type:<css>|<text>   fill a field
  press:<key>      press a key on the page (for example Enter, Space, v)
  eval:<js>        run an expression in the page and print the JSON result
  shot:<name>      save .tmp/shots/<name>.png
  size:<w>x<h>     resize the viewport
  net:<substring>  print the requests seen so far whose URL contains the substring
Output contract: one line per step on stdout, console errors at the end, exit 0 unless a step failed.
SOP: architecture/05_checks.md.
"""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / ".tmp" / "shots"
READY_JS = "() => Boolean(window.__gx && window.__gx.state && window.__gx.state.engineReady)"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:4177")
    parser.add_argument("--url", default="/")
    parser.add_argument("--size", default="1440x900")
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--do", action="append", default=[])
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--steps", help="file with one step per line; blank lines and lines starting with # are skipped")
    args = parser.parse_args()
    if args.steps:
        for line in Path(args.steps).read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.lstrip().startswith("#"):
                args.do.append(line.strip())

    width, height = (int(part) for part in args.size.lower().split("x"))
    SHOTS.mkdir(parents=True, exist_ok=True)
    errors, requests, failed = [], [], False

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=not args.headed,
            args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl", "--autoplay-policy=no-user-gesture-required"],
        )
        context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=args.scale)
        page = context.new_page()
        page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text[:300]}") if msg.type in ("error", "warning") else None)
        page.on("pageerror", lambda err: errors.append(f"[pageerror] {str(err)[:300]}"))
        page.on("request", lambda req: requests.append(f"{req.method} {req.url}"))
        page.goto(args.base + args.url, wait_until="domcontentloaded")

        for step in args.do:
            kind, _, rest = step.partition(":")
            try:
                if kind == "ready":
                    page.wait_for_function(READY_JS, timeout=120000)
                    print("ready")
                elif kind == "wait":
                    page.wait_for_timeout(int(rest))
                elif kind == "click":
                    page.locator(rest).first.click(timeout=8000)
                    print(f"clicked {rest}")
                elif kind == "type":
                    selector, _, text = rest.partition("|")
                    page.locator(selector).first.fill(text, timeout=8000)
                    print(f"typed into {selector}")
                elif kind == "press":
                    page.keyboard.press(rest)
                    print(f"pressed {rest}")
                elif kind == "eval":
                    value = page.evaluate(rest)
                    print("eval " + json.dumps(value, default=str)[:4000])
                elif kind == "shot":
                    path = SHOTS / f"{rest}.png"
                    page.screenshot(path=str(path))
                    print(f"shot {path}")
                elif kind == "size":
                    w, h = (int(part) for part in rest.lower().split("x"))
                    page.set_viewport_size({"width": w, "height": h})
                    print(f"size {w}x{h}")
                elif kind == "net":
                    hits = [line for line in requests if rest in line]
                    print(f"net {rest}: {len(hits)} request(s)")
                    for line in hits[:20]:
                        print("  " + line[:200])
                else:
                    print(f"unknown step {step}")
                    failed = True
            except Exception as error:  # keep going so the last screenshot still lands
                print(f"FAIL {step}: {str(error)[:300]}")
                failed = True

        browser.close()

    if errors:
        print(f"--- console warnings and errors ({len(errors)}) ---")
        seen = set()
        for line in errors:
            if line in seen:
                continue
            seen.add(line)
            print(line)
            if len(seen) >= 25:
                break
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
