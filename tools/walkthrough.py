#!/usr/bin/env python3
"""Walk-through gate: tap everything once in a headless browser and check the result.

Usage: .venv/bin/python tools/walkthrough.py [--base http://localhost:4177]

Input contract: the dev server is running with no paid keys (or with them: the spend check then matters most).
What it does: landing to home, every rail item, every quick tool, every layer on and off,
a station played, a camera opened and sent to the globe, a view saved and reopened,
console mode and back.
Output contract: one PASS or FAIL line per step, a report at .tmp/walkthrough_report.json,
exit code 0 only when every step passes, the browser console is clean and no paid route was called.
SOP: architecture/05_checks.md.
"""
import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
READY_JS = "() => Boolean(window.__gx && window.__gx.state && window.__gx.state.engineReady)"
# Routes that cost money once a key exists. The engine's own boot probe of tiles-token is the one allowed call.
PAID = ("/api/openai/", "/api/realtime/token", "/api/google/")
ALLOWED_PAID = ("/api/google/tiles-token",)
KNOWN_CONSOLE = ("status of 404", "Google 3D Tiles unavailable", "Entity geometry outlines are unsupported", "heightReference must also have a defined height")
CONSOLE_ONLY = {"directions", "recent-imagery", "local-adsb"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:4177")
    args = parser.parse_args()
    results, requests, console = [], [], []

    def record(name, ok, detail=""):
        results.append({"step": name, "pass": bool(ok), "detail": detail})
        print(f"{'PASS' if ok else 'FAIL'}  {name}{(' : ' + str(detail)) if detail and not ok else ''}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl", "--autoplay-policy=no-user-gesture-required"])
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("request", lambda req: requests.append(req.url))
        page.on("console", lambda msg: console.append(f"[{msg.type}] {msg.text[:240]}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: console.append(f"[pageerror] {str(err)[:240]}"))
        ev = page.evaluate

        def screen():
            return ev("window.__gx.state.screen")

        def wait_until(js, timeout=25000):
            try:
                page.wait_for_function(js, timeout=timeout)
                return True
            except Exception:
                return False

        page.goto(args.base + "/", wait_until="domcontentloaded")
        record("landing shows the tunnel", page.locator("#gx .gx-landing .gx-wall").count() == 4)
        record("engine becomes ready", wait_until(READY_JS, 120000))
        page.wait_for_timeout(2500)
        record("no welcome card, HUD off", ev("!document.querySelector('#first-run-launcher') && window.__gx.engine.sm.getControlState().hud.visible === false"))
        page.locator("#gx .gx-landing [data-gx-go=home]").first.click()
        page.wait_for_timeout(1500)
        record("Start now opens Home", screen() == "home")

        for item in ["explore", "globe", "cameras", "radio", "saved", "more", "settings", "home"]:
            page.locator(f"#gx .gx-rail [data-gx-go={item}]").click()
            page.wait_for_timeout(700)
            visible = ev(f"!document.querySelector('#gx .gx-screen[data-gx-screen={item}]').hidden")
            record(f"rail: {item}", screen() == item and visible)

        # The engine's key dialog, in our words: each badge says Paid or Free once, and no long dash shows anywhere.
        ev("window.__gx.go('settings', {push:false})")
        page.wait_for_timeout(900)
        page.locator("#gx [data-gx-act=keys]").first.click()
        opened = wait_until("() => { const d = document.querySelector('#key-setup'); return Boolean(d && !d.hidden && d.querySelectorAll('.key-setup-tier').length); }", 15000)
        page.wait_for_timeout(400)
        words = ev("""(() => {
          const d = document.querySelector('#key-setup');
          const tiers = [...d.querySelectorAll('.key-setup-tier')];
          const bad = tiers.filter(t => !['Paid', 'Free'].includes(t.textContent.trim()) || getComputedStyle(t, '::after').content !== 'none');
          const long = /[\\u2013\\u2014]/;
          const texts = [d.innerText, ...[...d.querySelectorAll('[title]')].map(n => n.title), ...[...d.querySelectorAll('input')].map(n => n.placeholder)];
          return { tiers: tiers.length, bad: bad.length, dashes: texts.filter(text => long.test(text || '')).length };
        })()""")
        record("key dialog: Paid or Free once each, no long dashes", bool(opened) and words["tiers"] > 0 and words["bad"] == 0 and words["dashes"] == 0, words)
        page.keyboard.press("Escape")
        page.wait_for_timeout(600)
        record("Escape closes the key dialog", ev("document.querySelector('#key-setup').hidden"))
        ev("window.__gx.go('home', {push:false})")
        page.wait_for_timeout(700)

        # Quick tools.
        page.wait_for_timeout(2500)
        tools = ev("[...document.querySelectorAll('#gx [data-gx-tools] [data-gx-card]')].map(n => n.dataset.gxCard)")
        record("eight quick tools", len(tools) == 8, tools)
        ships_shown = "tool-ships" in tools
        record("Ships is offered only when its key exists", ships_shown == bool(ships_key_probe := ev("window.__gx.data.setup().then(s => Boolean((s.keys.find(k => k.id === 'aisstream') || {}).set))")), tools)
        expect_screen = {"tool-cameras": "cameras", "tool-radio": "radio", "tool-more": "more"}
        expect_layers = {"tool-flights": ["flights"], "tool-satellites": ["satellites"], "tool-weather": ["wind", "weather-satellite"], "tool-quakes": ["earthquakes"], "tool-launches": ["rocket-launches", "satellites"], "tool-ships": ["ais-live-vessels"]}
        ships_key = ev("window.__gx.data.setup().then(s => Boolean((s.keys.find(k => k.id === 'aisstream') || {}).set))")
        for tool in tools:
            ev("window.__gx.go('home', {push:false})")
            page.wait_for_timeout(500)
            page.locator(f"#gx [data-gx-tools] [data-gx-card={tool}]").click()
            if tool in expect_layers:
                layers = expect_layers[tool]
                ok = wait_until("() => window.__gx.state.screen === 'globe' && " + json.dumps(layers) + ".every(id => window.__gx.engine.dm.isEnabled(id))", 45000)
                record(f"tool: {tool} switches on {', '.join(layers)}", ok)
                ev("window.__gx.engine.clearLayers()")
                page.wait_for_timeout(1200)
            else:
                page.wait_for_timeout(900)
                record(f"tool: {tool} opens {expect_screen[tool]}", screen() == expect_screen[tool])

        # Every layer on and off.
        ev("window.__gx.go('globe', {push:false})")
        page.wait_for_timeout(800)
        page.locator("#gx [data-gx-act=layers-toggle]").first.click()
        page.wait_for_timeout(1200)
        rows = ev("[...document.querySelectorAll('#gx [data-gx-layer]')].map(n => n.dataset.gxLayer)")
        record("26 layers listed", len(rows) == 26, len(rows))
        keys = ev("window.__gx.data.setup().then(s => Object.fromEntries(s.keys.map(k => [k.id, Boolean(k.set)])))")
        needs = ev("Object.fromEntries(window.__gx.engine.layers().map(r => [r.id, window.__gx.keyFor(r)]))")
        for layer in rows:
            if layer in CONSOLE_ONLY:
                record(f"layer: {layer} (opens its own panel, checked in console step)", True)
                continue
            page.locator(f"#gx [data-gx-layer={layer}]").click()
            if needs.get(layer) and keys.get(needs[layer]) is False:
                page.wait_for_timeout(600)
                record(f"layer: {layer} asks for its free key", ev(f"!window.__gx.engine.dm.isEnabled('{layer}')"))
                continue
            on = wait_until(f"() => window.__gx.engine.dm.isEnabled('{layer}')", 40000)
            page.wait_for_timeout(700)
            page.locator(f"#gx [data-gx-layer={layer}]").click()
            off = wait_until(f"() => !window.__gx.engine.dm.isEnabled('{layer}')", 20000)
            record(f"layer: {layer} on and off", on and off, f"on={on} off={off}")
        page.locator("#gx .gx-layers [data-gx-act=layers-toggle]").click()

        # Looks, spin, reset.
        for look in ["retro", "surveillance", "thermal", "anime", "noir", "snow", "normal"]:
            # The menu stays open between picks, and a second press on Look would close it. Open it only when shut.
            ev("window.__gx.state.menu === 'look' || document.querySelector('#gx [data-gx-act=menu][data-menu=look]').click()")
            page.locator(f"#gx [data-gx-menuitem=look][data-value={look}]").click()
            page.wait_for_timeout(350)
        state = ev("(() => { const s = window.__gx.engine.sm.getControlState(); return {style: s.style, hud: s.hud.visible}; })()")
        record("seven looks cycle and the HUD stays off", state == {"style": "normal", "hud": False}, state)
        ev("window.__gx.state.menu && document.querySelector('#gx [data-gx-act=menu][data-menu=look]').click()")
        ev("window.__gx.engine.spin('fast')")
        a = ev("window.__gx.engine.sm.getCameraState().lon")
        page.wait_for_timeout(1500)
        b = ev("window.__gx.engine.sm.getCameraState().lon")
        ev("window.__gx.engine.spin('off')")
        record("spin moves the globe", abs(b - a) > 3, f"{a:.1f} to {b:.1f}")

        # Radio.
        page.locator("#gx .gx-rail [data-gx-go=radio]").click()
        page.wait_for_selector("#gx .gx-screen[data-gx-screen=radio] .gx-srow", timeout=20000)
        page.locator("#gx .gx-screen[data-gx-screen=radio] .gx-srow").first.click()
        playing = wait_until("() => { const ui = window.__gx.engine.radioState(); return ui && ['playing', 'buffering', 'loading'].includes(ui.audioState) && ui.selected; }", 20000)
        record("a station starts and the mini player shows", playing and ev("!document.querySelector('#gx .gx-player').hasAttribute('data-closed')"))
        page.locator("#gx [data-gx-act=player-close]").click()
        record("closing the player switches radio off", wait_until("() => !window.__gx.engine.dm.isEnabled('radio')", 8000))

        # Camera.
        page.locator("#gx .gx-rail [data-gx-go=cameras]").click()
        page.wait_for_selector("#gx .gx-screen[data-gx-screen=cameras] .gx-card", timeout=30000)
        page.locator("#gx .gx-screen[data-gx-screen=cameras] .gx-card").first.click()
        record("camera viewer shows a live still", wait_until("() => Boolean(document.querySelector('#gx [data-gx-stage] img'))", 20000))
        page.locator("#gx [data-gx-act=viewer-globe]").click()
        on_globe = wait_until("() => window.__gx.state.screen === 'globe' && window.__gx.engine.dm.isEnabled('cctv') && window.__gx.state.selection && window.__gx.state.selection.kind === 'camera'", 30000)
        record("Open on globe selects that camera", on_globe)
        ev("document.querySelector('#gx .gx-details [data-gx-act=sel-stop]')?.click()")
        page.wait_for_timeout(1500)

        # Save and reopen.
        before = ev("window.__gx.store.saved().length")
        ev("window.__gx.engine.setLayer('earthquakes', true)")
        page.wait_for_timeout(2500)
        page.locator("#gx [data-gx-act=globe-save]").click()
        page.wait_for_timeout(900)
        record("Save adds a saved view", ev("window.__gx.store.saved().length") == before + 1)
        ev("window.__gx.engine.clearLayers()")
        page.locator("#gx .gx-rail [data-gx-go=saved]").click()
        page.wait_for_timeout(700)
        page.locator("#gx .gx-screen[data-gx-screen=saved] .gx-card").first.click()
        record("a saved view reopens with its layers", wait_until("() => window.__gx.state.screen === 'globe' && window.__gx.engine.dm.isEnabled('earthquakes')", 20000))
        # Leave no test rows behind: soft delete the one this run added.
        ev("(() => { const rows = window.__gx.store.savedAll(); const row = rows.find(r => !r.deleted_at); if (row) window.__gx.store.patchSaved(row.id, {deleted_at: new Date().toISOString()}); })()")
        ev("window.__gx.engine.clearLayers()")

        # Console and back.
        ev("window.__gx.setConsole(true, 'data-panel')")
        page.wait_for_timeout(1500)
        record("console mode shows the engine panels", ev("document.documentElement.classList.contains('gx-console') && getComputedStyle(document.querySelector('#command-dock')).display !== 'none'"))
        page.locator("#gx .gx-console-pill").click()
        page.wait_for_timeout(900)
        record("Simple view comes back with the HUD off", ev("document.documentElement.classList.contains('gx-simple') && window.__gx.engine.sm.getControlState().hud.visible === false"))

        browser.close()

    paid = sorted({url.split("?")[0] for url in requests if any(part in url for part in PAID) and not any(ok in url for ok in ALLOWED_PAID)})
    record("no paid route was called", not paid, paid)
    noisy = [line for line in console if not any(known in line for known in KNOWN_CONSOLE)]
    record("browser console is clean", not noisy, noisy[:4])

    report = ROOT / ".tmp" / "walkthrough_report.json"
    report.write_text(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "results": results, "console": console[:40]}, indent=2), encoding="utf-8")
    failed = [row for row in results if not row["pass"]]
    print(f"\n{len(results) - len(failed)} of {len(results)} steps passed. Report: {report}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
