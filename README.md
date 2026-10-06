# World's Eye

A simple, premium interface for a live 3D planet. Search a place, tap a card, and watch the real thing on the globe: planes, satellites, public road cameras, radio stations, weather, earthquakes and rocket launches.

It runs on your own computer. Nothing here is hosted for you.

## Credit

World's Eye is an interface laid over the open-source engine [gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) by Bilawal Sidhu (MIT licence). The engine draws the globe and fetches every feed. World's Eye adds the screens around it: the landing, home, search, cameras, radio, saved views and the globe controls.

World's Eye is a separate project. It is not affiliated with, or endorsed by, the engine's author.

## Run it

You need [Node.js](https://nodejs.org) 24 (24.14 or newer) and git.

```bash
git clone https://github.com/jaredcroxton/worlds-eye.git
cd worlds-eye
cp .env.example app/.env
cd app
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run dev
```

Then open http://localhost:4177

Notes:

- On Windows PowerShell, use `copy .env.example app\.env` and `$env:PUPPETEER_SKIP_DOWNLOAD=1; npm ci`.
- `PUPPETEER_SKIP_DOWNLOAD=1` skips a large browser download that only the engine's own test scripts use.
- Without the `app/.env` file it still runs, on port 4173.
- The first load takes a little while. The globe waits until its tab is on show.

## What works with no keys

Satellite globe, flights, military flights, satellites, public cameras, radio, weather (wind, radar, clouds, lightning, cyclones), earthquakes, launches, fire perimeters, transit, bike share, place search, seven looks, and the engine's full console (More, then any tool).

Optional free keys add more (sign-up only, no card): Cesium ion for 3D cities, AISStream for ships, NASA FIRMS for active fires, TomTom for live traffic, OpenSky for more flight updates. Add them in Settings, "Add or change a key". Keys are saved to `app/.env` on your computer and nowhere else.

Paid keys (OpenAI for voice, Google Maps) stay off unless you add them yourself. Read `architecture/07_keys.md` first: once a paid key exists, some engine features can bill without asking.

## Home card pictures

The featured cards on Home show drawn placeholders in a fresh clone. To make real pictures from your own globe (optional, needs Python 3):

```bash
python3 -m venv .venv
.venv/bin/pip install playwright
.venv/bin/playwright install chromium
.venv/bin/python tools/capture_cards.py
```

Run that from the repository root while `npm run dev` is running.

## How it is built

- `app/` is the engine, unchanged except for one script tag in `app/index.html`.
- `app/shell/gev-shell.js` is the whole World's Eye interface: one file with its styles, markup and logic.
- `app/public/shell/` holds the featured card list and the display font.
- `architecture/` holds the working notes for each part. They mention private project notes that are not in this repository.
- `tools/` holds the checks: `check_app.py` (rules on our files), `check_fit.py` (nothing scrolls sideways, nothing overlaps, at eight widths), `walkthrough.py` (every control, with no paid call) and `scan_keys.py`.

## Ground rules

- Public feeds only. There is no feature to find or track a named person, and no face recognition.
- Provider credits stay on screen whenever the globe is on screen.
- Nothing scrolls sideways at any width from 320 to 1920 px.

## Licences

- Engine code: MIT, copyright Bilawal Sidhu and contributors. See `app/LICENSE` and `app/THIRD_PARTY_NOTICES.md`.
- Data and map sources keep their own terms, and several allow personal, non-commercial use only. See `app/DATA_SOURCES.md` before you use this for anything else.
- Display font: Unbounded, SIL Open Font License 1.1. See `app/public/shell/fonts/OFL.txt`.
- The World's Eye interface, tools and notes: copyright 2026 Jared Croxton. You may clone and run them for personal, non-commercial use.
