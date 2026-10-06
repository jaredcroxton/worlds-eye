#!/usr/bin/env python3
"""Fit gate: nothing scrolls sideways, nothing hangs off the edge, credits stay visible and cover no control.

Usage: .venv/bin/python tools/check_fit.py [--base http://localhost:4177] [--widths 320,500] [--screens home,globe]

Input contract: the dev server is running.
Output contract: one PASS or FAIL line per width and screen, screenshots in .tmp/fit/,
a report at .tmp/check_fit_report.json, exit code 0 only when every check passes.
SOP: architecture/05_checks.md.
"""
import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".tmp" / "fit"
WIDTHS = [320, 334, 375, 500, 768, 1024, 1440, 1920]
# Opens the radio player the way a person does: Radio screen, first station. Left open for the caller to finish.
PLAY_JS = "(async()=>{window.__gx.go('radio', {push:false}); for (let i = 0; i < 40 && !document.querySelector('#gx .gx-screen[data-gx-screen=radio] .gx-srow'); i++) await new Promise(r=>setTimeout(r,250)); document.querySelector('#gx .gx-screen[data-gx-screen=radio] .gx-srow')?.click(); for (let i = 0; i < 120 && document.querySelector('#gx .gx-player').hasAttribute('data-closed'); i++) await new Promise(r=>setTimeout(r,250)); "
# Each entry: name, the screen to open, an optional setup expression, whether the live globe is on show.
STATES = [
    ("landing", "landing", None, True),
    ("home", "home", None, True),
    ("home-scrolled", "home", "(async()=>{const s=document.querySelector('#gx .gx-screen[data-gx-screen=home]'); s.scrollTop=180; await new Promise(r=>setTimeout(r,500));})()", True),
    ("explore", "explore", None, False),
    ("explore-query", "explore", "(async()=>{window.__gx.go('explore',{params:{q:'london'}}); await new Promise(r=>setTimeout(r,2500));})()", False),
    ("globe", "globe", None, True),
    ("globe-layers", "globe", "document.querySelector('#gx [data-gx-act=layers-toggle]').click()", True),
    ("globe-menu", "globe", "(()=>{const s=document.querySelector('#gx .gx-screen[data-gx-screen=globe]'); if(window.__gx.state.layersOpen) s.querySelector('[data-gx-act=layers-toggle]').click(); s.querySelector('[data-gx-act=menu][data-menu=look]').click();})()", True),
    ("cameras", "cameras", None, False),
    ("camera-viewer", "cameras", "(async()=>{await new Promise(r=>setTimeout(r,1500)); const c=document.querySelector('#gx .gx-screen[data-gx-screen=cameras] .gx-card'); if(c) c.click(); await new Promise(r=>setTimeout(r,2500));})()", False),
    ("radio", "radio", None, False),
    ("saved", "saved", None, False),
    ("settings", "settings", None, False),
    ("more", "more", None, False),
    ("console", "globe", "(async()=>{window.__gx.setConsole(true); await new Promise(r=>setTimeout(r,1500));})()", True),
    ("globe-toast", "globe", "window.__gx.toast('Saved. A long test line, so the toast is as wide as it gets.', {ms: 9000})", True),
    ("globe-menu-toast", "globe", "(()=>{document.querySelector('#gx .gx-screen[data-gx-screen=globe] [data-gx-act=menu][data-menu=look]').click(); window.__gx.toast('Spin starts once you pull back from the ground.', {ms: 9000});})()", True),
    ("globe-player", "globe", PLAY_JS + "window.__gx.go('globe', {push:false}); await new Promise(r=>setTimeout(r,1400));})()", True),
    ("globe-player-layers", "globe", PLAY_JS + "window.__gx.go('globe', {push:false}); await new Promise(r=>setTimeout(r,1200)); if (!window.__gx.state.layersOpen) document.querySelector('#gx [data-gx-act=layers-toggle]').click(); await new Promise(r=>setTimeout(r,600));})()", True),
    ("globe-player-menu", "globe", PLAY_JS + "window.__gx.go('globe', {push:false}); await new Promise(r=>setTimeout(r,1200)); if (window.__gx.state.layersOpen) document.querySelector('#gx [data-gx-act=layers-toggle]').click(); document.querySelector('#gx .gx-screen[data-gx-screen=globe] [data-gx-act=menu][data-menu=spin]').click(); await new Promise(r=>setTimeout(r,500));})()", True),
    ("radio-player-toast", "radio", PLAY_JS + "window.__gx.toast('Saved. A long test line, so the toast is as wide as it gets.', {ms: 9000}); await new Promise(r=>setTimeout(r,400));})()", False),
    ("home-player", "home", PLAY_JS + "window.__gx.go('home', {push:false}); await new Promise(r=>setTimeout(r,1400));})()", True),
    ("globe-follow-player", "globe", PLAY_JS + "window.__gx.go('globe', {push:false}); await new Promise(r=>setTimeout(r,800)); await window.__gx.engine.track('ISS', 'satellites'); for (let i = 0; i < 60 && document.querySelector('#gx .gx-details').hasAttribute('data-closed'); i++) await new Promise(r=>setTimeout(r,250)); await new Promise(r=>setTimeout(r,800));})()", True),
]
READY_JS = "() => Boolean(window.__gx && window.__gx.state && window.__gx.state.engineReady)"
# Clears what an earlier state left open, so every state starts the same way.
RESET_JS = """(s) => {
  const gx = window.__gx;
  if (gx.state.mode === 'console') gx.setConsole(false);
  if (gx.state.viewer) document.querySelector('#gx [data-gx-act=viewer-close]')?.click();
  document.querySelector('#gx .gx-player:not([data-closed]) [data-gx-act=player-close]')?.click();
  if (gx.state.layersOpen) document.querySelector('#gx [data-gx-act=layers-toggle]')?.click();
  document.querySelector('#gx .gx-details:not([data-closed]) [data-gx-act=sel-stop]')?.click();
  for (const t of document.querySelectorAll('#gx .gx-toast')) t.remove();
  gx.go(s, {push:false});
  const el = document.querySelector('#gx .gx-screen:not([hidden]):not(.gx-leaving)');
  if (el) el.scrollTop = 0;
}"""

MEASURE_JS = r"""
(globeVisible) => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const off = [];
  const scrollers = [];
  const label = (el) => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : el.tagName.toLowerCase());
  const root = document.querySelector('#gx');
  for (const el of root.querySelectorAll('*')) {
    if (el.closest('[hidden]') || el.closest('.gx-tunnel') || el.closest('[data-closed]') || el.closest('[inert]')) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right > vw + 1 || r.left < -1) off.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) scrollers.push({ el: label(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
  }
  const screen = root.querySelector('.gx-screen:not([hidden])');
  const screenWide = screen ? screen.scrollWidth - screen.clientWidth : 0;
  const pageWide = document.documentElement.scrollWidth - vw;
  let credits = null;
  if (globeVisible) {
    const c = document.querySelector('#cesium-credits');
    if (!c) credits = { ok: false, why: 'missing' };
    else {
      const link = c.querySelector('.cesium-credit-expand-link') || c;
      const r = link.getBoundingClientRect();
      const inside = r.width > 0 && r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1;
      const top = document.elementFromPoint(Math.min(vw - 2, Math.max(1, r.left + r.width / 2)), Math.min(vh - 2, Math.max(1, r.top + r.height / 2)));
      const clear = Boolean(top && (top === link || c.contains(top)));
      credits = { ok: inside && clear, inside, clear, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), over: top ? label(top) : null };
    }
  }
  // What is really on show: the box, cut down by every scrolling or clipping parent.
  const shown = (el) => {
    if (el.closest('[hidden]') || el.closest('[data-closed]') || el.closest('[inert]') || el.closest('.gx-tunnel')) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const r = el.getBoundingClientRect();
    const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let up = el.parentElement; up && up !== document.documentElement; up = up.parentElement) {
      const ps = getComputedStyle(up);
      if (ps.overflowX === 'visible' && ps.overflowY === 'visible') continue;
      const pr = up.getBoundingClientRect();
      box.left = Math.max(box.left, pr.left); box.top = Math.max(box.top, pr.top);
      box.right = Math.min(box.right, pr.right); box.bottom = Math.min(box.bottom, pr.bottom);
    }
    return box.right - box.left < 1 || box.bottom - box.top < 1 ? null : box;
  };
  const overlap = (a, b) => {
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return ox > 1 && oy > 1 ? Math.round(Math.min(ox, oy)) : 0;
  };
  const pill = document.querySelector('#cesium-credits');
  const pillOnShow = Boolean(globeVisible && pill && Number(getComputedStyle(pill).zIndex) > 1);
  // The credit pill sits above our layer, so it must never land on one of our controls.
  const covers = [];
  if (pillOnShow) {
    const cr = pill.getBoundingClientRect();
    for (const el of root.querySelectorAll('button, a[href], input, .gx-dock, .gx-menu, .gx-panel, .gx-player')) {
      const box = shown(el);
      const by = box ? overlap(box, cr) : 0;
      if (by) covers.push({ el: label(el), by });
    }
  }
  // No two pieces of our own chrome may overlap. A dock menu over a panel is the one allowed pair (a popover).
  const pieces = [];
  const piece = (name, el) => { const box = el && shown(el); if (box) pieces.push({ name, box }); };
  if (!document.documentElement.classList.contains('gx-console')) {
    piece('rail', root.querySelector('.gx-rail'));
    for (const el of root.querySelectorAll('.gx-screen:not([hidden]) .gx-gtop > *')) piece('top bar', el);
    piece('dock', root.querySelector('.gx-screen:not([hidden]) .gx-dock'));
    piece('menu', root.querySelector('.gx-screen:not([hidden]) .gx-menu'));
    for (const el of root.querySelectorAll('.gx-screen:not([hidden]) .gx-panel')) piece(el.classList.contains('gx-details') ? 'details' : 'panel', el);
    piece('player', root.querySelector('.gx-player'));
    for (const el of root.querySelectorAll('.gx-toast')) piece('toast', el);
    if (pillOnShow) pieces.push({ name: 'credits', box: pill.getBoundingClientRect() });
  }
  const clashes = [];
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const pair = [pieces[i].name, pieces[j].name].sort().join(' and ');
      if (pair === 'menu and panel' || pair === 'details and menu' || pair === 'top bar and top bar') continue;
      const by = overlap(pieces[i].box, pieces[j].box);
      if (by) clashes.push({ pair, by });
    }
  }
  // Labels that must never end in a cut-off. Card titles and station names may, on purpose.
  const clipped = [];
  for (const el of root.querySelectorAll('.gx-tool > span:last-child, .gx-dockbtn b, .gx-dockbtn small, .gx-rail-item span, .gx-chip, .gx-btn, .gx-kv-value, .gx-h1, .gx-h2')) {
    if (!shown(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1) clipped.push((el.textContent || '').trim().slice(0, 24));
  }
  const details = root.querySelector('.gx-screen:not([hidden]) .gx-details:not([data-closed])');
  const detailsTop = details && shown(details) ? Math.round(details.getBoundingClientRect().top) : null;
  return { vw, vh, off: off.slice(0, 8), offCount: off.length, scrollers, screenWide, pageWide, credits, covers: covers.slice(0, 6), clashes: clashes.slice(0, 6), pieces: pieces.map((p) => p.name), clipped: clipped.slice(0, 6), detailsTop };
}
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:4177")
    parser.add_argument("--widths", default=",".join(str(w) for w in WIDTHS))
    parser.add_argument("--screens", default="")
    args = parser.parse_args()
    widths = [int(w) for w in args.widths.split(",") if w]
    wanted = {s for s in args.screens.split(",") if s}
    states = [s for s in STATES if not wanted or s[0] in wanted]
    OUT.mkdir(parents=True, exist_ok=True)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"])
        for width in widths:
            height = 740 if width <= 500 else 900
            context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
            page = context.new_page()
            console_errors = []
            page.on("pageerror", lambda err: console_errors.append(str(err)[:200]))
            page.goto(args.base + "/?s=home", wait_until="domcontentloaded")
            try:
                page.wait_for_function(READY_JS, timeout=120000)
            except Exception as error:
                print(f"FAIL  {width:5}  engine did not become ready: {str(error)[:120]}")
                results.append({"width": width, "state": "boot", "pass": False, "why": "engine not ready"})
                context.close()
                continue
            page.wait_for_timeout(2500)
            for name, screen, setup, globe_visible in states:
                page.evaluate(RESET_JS, screen)
                page.wait_for_timeout(2200 if screen in ("home", "cameras", "radio", "explore") else 1200)
                if setup:
                    try:
                        page.evaluate(setup)
                    except Exception as error:
                        console_errors.append(f"setup {name}: {str(error)[:160]}")
                    page.wait_for_timeout(700)
                measure = page.evaluate(MEASURE_JS, globe_visible)
                page.screenshot(path=str(OUT / f"{width}-{name}.png"))
                problems = []
                if measure["pageWide"] > 1:
                    problems.append(f"page is {measure['pageWide']}px too wide")
                if measure["screenWide"] > 1:
                    problems.append(f"screen content is {measure['screenWide']}px too wide")
                if measure["scrollers"]:
                    problems.append("sideways scroller: " + ", ".join(s["el"] for s in measure["scrollers"][:3]))
                if measure["offCount"]:
                    problems.append(f"{measure['offCount']} element(s) off the edge, first: " + json.dumps(measure["off"][0]))
                if globe_visible and measure["credits"] and not measure["credits"]["ok"]:
                    problems.append("credits not visible: " + json.dumps(measure["credits"]))
                if measure["covers"]:
                    problems.append("credit pill sits on a control: " + json.dumps(measure["covers"][0]))
                if measure["clipped"]:
                    problems.append("cut-off labels: " + ", ".join(measure["clipped"][:4]))
                if width <= 720 and measure["detailsTop"] is not None and measure["detailsTop"] < measure["vh"] / 2 - 2:
                    problems.append(f"details sheet starts at {measure['detailsTop']}px, above the screen centre ({measure['vh'] // 2}px), so it hides the followed thing")
                if measure["clashes"]:
                    problems.append("chrome pieces overlap: " + "; ".join(f"{c['pair']} by {c['by']}px" for c in measure["clashes"][:3]))
                expect = {"globe-toast": ["toast", "dock"], "globe-menu-toast": ["toast", "menu"], "globe-player": ["player", "dock"], "globe-player-layers": ["panel"], "globe-follow-player": ["details"], "globe-player-menu": ["player", "menu"], "radio-player-toast": ["player", "toast"], "home-player": ["player"]}.get(name, [])
                missing = [part for part in expect if part not in measure["pieces"]]
                if missing:
                    problems.append("state did not set up: no " + ", ".join(missing) + " on show")
                ok = not problems
                print(f"{'PASS' if ok else 'FAIL'}  {width:5}  {name:16} {'' if ok else '; '.join(problems)}")
                results.append({"width": width, "state": name, "pass": ok, "problems": problems, "measure": measure})
            if console_errors:
                print(f"NOTE  {width:5}  page errors: {console_errors[:3]}")
                results.append({"width": width, "state": "page-errors", "pass": False, "problems": console_errors[:5]})
            context.close()
        browser.close()

    report = ROOT / ".tmp" / "check_fit_report.json"
    report.write_text(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "results": results}, indent=2), encoding="utf-8")
    failed = [row for row in results if not row["pass"]]
    print(f"\n{len(results) - len(failed)} of {len(results)} checks passed. Screenshots: {OUT}. Report: {report}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
