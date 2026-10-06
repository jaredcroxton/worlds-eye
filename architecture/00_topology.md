# 00 Topology

## Goal

Say what runs where, so nothing is started twice or on the wrong port.

## Pieces

- `app/` is the upstream engine (git subtree, pinned commit recorded in `progress.md`). It is a Vite project. `npm run dev` serves the page and every `/api/*` data route from one Node process.
- `app/shell/gev-shell.js` is our whole frontend. One file. Loaded by one script tag in `app/index.html`, listed before the engine's own tag.
- `app/public/shell/` holds our static data and assets: `catalog.json`, the display font, `cards/` (thumbnails, local only).
- `tools/` holds our Python checks. They talk to the running dev server over HTTP or read files. They never import engine code.
- `architecture/` holds these SOPs. `.tmp/` holds logs and reports and can be deleted.

## Processes and ports

- One process: the Vite dev server on `http://localhost:4177`, started with `npm run dev` inside `app/` (port from `app/.env`).
- Node 24 (24.14 or newer). An older default Node on the same computer must not be the one that runs it.
- Start it with `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_SERVER_API_KEY` unset in the shell, so paid keys count only when they sit in `app/.env`.

## Data flow

1. Browser loads `/`. Our shell runs first, writes the boot hash, shows the landing.
2. The engine boots, reads the hash, builds the Cesium viewer and its hidden chrome.
3. The shell binds to the engine through `application.getComponents()` and drives it through the adapter.
4. Grids read the engine's own routes (`/api/cctv/sources`, `/api/radio/stations`, `/api/launches`) and the upstream tool catalog.
5. Saved views and preferences live in localStorage on this computer.

## Known failure modes

- Port taken: the dev server exits. Check with `lsof -nP -iTCP:4177 -sTCP:LISTEN`. Never use `app/scripts/dev-fresh.sh`, it kills whatever holds the port.
- Wrong Node: `npm run doctor` errors below 24.14. Put Node 24 first on the path.
- A preview tab left open keeps its old build. Reload before judging anything.
