#!/usr/bin/env python3
"""Make featured-card thumbnails from the live globe.

Usage: .venv/bin/python tools/capture_cards.py [--base http://localhost:4177] [--only id1,id2]

Input contract: the dev server is running; app/public/shell/catalog.json lists the featured views.
Output contract: one JPEG per view card at app/public/shell/cards/<id>.jpg (800 by 1000),
one line per card on stdout, exit code 0 when every card was captured.
Rules: thumbnails stay on this computer (the folder is git-ignored). Never capture with the Google
map: stored Google imagery is not allowed. The tool refuses when the active map is "photoreal".
SOP: architecture/05_checks.md.
"""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "app" / "public" / "shell" / "catalog.json"
OUT = ROOT / "app" / "public" / "shell" / "cards"
READY_JS = "() => Boolean(window.__gx && window.__gx.state && window.__gx.state.engineReady)"
# Hide our chrome and the credit line for the picture only. This style is injected by the tool, never shipped.
HIDE_CSS = "#gx, #cesium-credits, #toast { visibility: hidden !important; }"
SETTLED_JS = """
(ids) => {
  const e = window.__gx.engine;
  const rows = e.layers().filter((row) => ids.includes(row.id));
  const loading = rows.some((row) => String(row.lifecycleState) === 'enabling' || (row.stats && row.stats.loading));
  const tiles = e.viewer.scene.globe.tilesLoaded !== false;
  return rows.every((row) => row.enabled) && !loading && tiles && e.viewer.scene.tweens.length === 0;
}
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:4177")
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    only = {item for item in args.only.split(",") if item}
    cards = [card for card in json.loads(CATALOG.read_text(encoding="utf-8")).get("featured", []) if card.get("action", {}).get("type") == "view"]
    if only:
        cards = [card for card in cards if card["id"] in only]
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"])
        context = browser.new_context(viewport={"width": 800, "height": 1000}, device_scale_factor=1)
        page = context.new_page()
        page.goto(args.base + "/?s=globe", wait_until="domcontentloaded")
        page.wait_for_function(READY_JS, timeout=120000)
        page.wait_for_timeout(3000)
        active_map = page.evaluate("window.__gx.engine.msc.getActiveId()")
        if active_map == "photoreal":
            print("REFUSED  the Google map is active. Switch to Satellite first: no stored Google imagery.")
            browser.close()
            return 1
        page.add_style_tag(content=HIDE_CSS)
        for card in cards:
            view = card["action"]["payload"]
            try:
                page.evaluate("(view) => window.__gx.engine.openView(view)", view)
                try:
                    page.wait_for_function(SETTLED_JS, arg=view.get("layers", []), timeout=60000)
                except Exception:
                    print(f"NOTE     {card['id']}: still loading after 60 s, capturing what is there")
                page.wait_for_timeout(5000)
                path = OUT / f"{card['id']}.jpg"
                page.screenshot(path=str(path), type="jpeg", quality=84)
                print(f"CAPTURED {card['id']:20} {path.stat().st_size // 1024} KB")
            except Exception as error:
                print(f"FAIL     {card['id']}: {str(error)[:200]}")
                failed.append(card["id"])
        browser.close()

    print(f"\n{len(cards) - len(failed)} of {len(cards)} cards captured into {OUT}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
