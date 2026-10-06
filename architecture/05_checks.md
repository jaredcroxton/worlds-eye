# 05 Checks and tools

One script, one job. All run from the project root with `python3 tools/<name>.py` unless noted. Reports go to `.tmp/`.

## tools/handshake.py (Link)

- Goal: prove each keyless data route answers before UI work depends on it.
- Input: the dev server at `http://localhost:4177` (override with `--base`).
- Logic: one GET per route with a 30 s timeout: `/api/cctv/sources`, `/api/radio/stations`, `/api/celestrak/stations`, `/api/launches`, `/api/military`, `/api/geocode?q=Brisbane`, `/api/setup/status`. Flights are checked with one small request only when `--flights` is passed, because anonymous OpenSky credits are scarce.
- Output: one PASS or FAIL line per route with a count or a reason, `.tmp/handshake_report.json`, exit 0 only if every required route passes.
- Edge cases: a route that answers 503 with a "key required" body is reported as NEEDS KEY, not FAIL.

## tools/check_app.py (static gate)

- Goal: catch rule breaks in our own files without a browser.
- Input: `app/shell/gev-shell.js`, `app/index.html`, `app/public/shell/catalog.json`.
- Checks: the one-line hook is present and upstream's main tag and nine markers remain; no em or en dashes; no emoji; no banned words in UI strings; the banned name is absent; no `overflow-x: auto|scroll`; no bare `1fr` grid track; every CSS selector starts with `#gx`, `.gx-`, `html.gx`, `:root.gx` or `@`; no rule targets `#cesiumContainer`; `#cesium-credits` is never hidden; no `transition: all`; no `scale(0)`; no external hosts in our file beyond none; catalog cards have every required field and known layer ids.
- Output: PASS or FAIL lines, `.tmp/check_app_report.json`, exit code.

- Known failure (6 Oct 2026): the bare-track rule read `minmax(0, 1.1fr)` as a bare `1fr`, because `1.1fr` ends in `1fr`. Fix: a digit or a dot in front of `1fr` means it is part of a bigger number.

## tools/check_fit.py (browser gate)

- Goal: prove nothing scrolls sideways and credits stay visible.
- Needs: `.venv` with Playwright (`python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/playwright install chromium`). Run with `.venv/bin/python tools/check_fit.py`.
- Logic: for each width in 320, 334, 375, 500, 768, 1024, 1440, 1920 and each screen (`?s=`), wait for the shell, then fail if the document or any element inside `#gx` is wider than the viewport, if any element has a horizontal scroll range, if on a globe-visible screen `#cesium-credits` is hidden or covered at its centre point, or if the credit pill sits on top of one of our controls (dock, menu, panel, player, any button, link or field). The last check was added 6 Oct 2026 after a two-line pill covered the dock captions at 320 and 334 px while every older check still passed. Rectangles are clipped to their scrolling parents first, so a row scrolled out of a panel does not count. A second check added the same day takes every piece of our chrome on show (rail or tab bar, top bar items, dock, menu, panels, player, toasts, credit pill) and fails when any two overlap; the only pair allowed is a dock menu over a panel. States added for it: a toast on the Globe, a toast with a menu open, the radio player on the Globe, the player with the Layers panel open, and a toast on the Radio screen while the player is open. After the second design review: a state that follows the ISS while the player is open (on a narrow window the details sheet must start below the screen centre), and a clipped-label check (tool names, dock captions, rail labels, chips, buttons, the details values and headings may never end in a cut-off).
- Output: a table, screenshots in `.tmp/fit/`, `.tmp/check_fit_report.json`, exit code.

## tools/capture_cards.py

- Goal: make featured-card thumbnails from the live globe.
- Logic: open `/?s=globe` once, then for each `view` card in `catalog.json` call the shell's own `engine.openView(view)`, wait until the layers and tiles settle (60 s at most), and save an 800 by 1000 JPEG to `app/public/shell/cards/<id>.jpg`. Our chrome and the credit line are hidden by a style the tool injects for the picture only; nothing in the shipped file hides credits.
- Rule: thumbnails stay on this computer (git-ignored). The tool refuses to run while the `photoreal` map is active: no stored Google imagery. A fresh clone has no thumbnails until this tool is run; cards fall back to drawn art.

## tools/shot.py

- Goal: drive the page headless for a quick look or a scripted walk-through, because the desktop Browser pane can be hidden and the engine pauses in a hidden tab.
- Steps (`--do` or a `--steps` file): `ready`, `wait:<ms>`, `click:<css>`, `type:<css>|<text>`, `press:<key>`, `eval:<js>`, `shot:<name>`, `size:<w>x<h>`, `net:<substring>`.
- Output: `.tmp/shots/<name>.png`, step lines, console errors.

## tools/walkthrough.py (behaviour gate)

- Goal: prove every control does what it says, with no paid call and a clean console.
- Needs: the `.venv` with Playwright. Run with `.venv/bin/python tools/walkthrough.py`. Takes about 4 minutes.
- Logic: landing to home; each rail item; each quick tool (a layer tool must switch its layers on, the ships tool must open Settings when its key is missing); each of the 26 layers on and off (a layer that needs a missing key must stay off, three layers open their own panel); the 7 looks with the HUD still off; spin; a station playing with the mini player; a camera still in the viewer, then on the globe; a view saved and reopened (the test row is soft deleted afterwards); console mode and back.
- Fails on: any step, any browser console error that is not on the short known list, any request to `/api/openai/`, `/api/realtime/token` or `/api/google/` other than the engine's own `tiles-token` probe.
- Output: PASS or FAIL lines, `.tmp/walkthrough_report.json`, exit code.

- Known failure (6 Oct 2026): the looks step pressed the Look button before every pick. The menu stays open after a pick, so every second press closed it, and the step only passed by clicking an item during the 200 ms close fade. It broke when the menu started opening from its own button. Fix: the step opens the menu only when it is shut. Rule for new steps: never click into something that is closing; check the state first.

## tools/scan_keys.py

- Goal: stop a key reaching git.
- Logic: scan tracked and staged files for key-shaped strings and for `.env` files. Exit 1 on any hit. Run before every push.

## Upstream's own checks

- `npm test` and `npm run check:boundaries` inside `app/` with Node 24. The baseline from Protocol 0 is in `.tmp/baseline_test.log` and `progress.md`. After our change the counts must match.

## Browser pane walk-through

Listed in the approved plan. Results go into `progress.md` with the date.
