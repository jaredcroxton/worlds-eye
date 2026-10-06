# 02 Schema

The law is the "Data Schema" section of `claude.md`. This file explains use. Change the constitution first, then this file, then code.

## view

Upstream's shape. Build with `createView` so bad input fails early.

```json
{"camera": {"lat": -27.47, "lon": 153.03, "altitude_m": 12000, "heading_deg": 0, "pitch_deg": -45},
 "layers": ["transit"], "style": "normal", "map": "esri-imagery", "follow": null, "annotations": []}
```

- `layers` is the exact set left on after the view applies.
- `map` may be omitted in catalog entries. The shell fills in the best available stack.

## card

One shape for every tile in every grid and every search result.

```json
{"id": "cam-tfl-00001", "kind": "camera", "title": "A40 Westway", "subtitle": "London", "badge": "LIVE",
 "image": "/api/cctv/frame/tfl-00001", "live": true,
 "action": {"type": "camera", "payload": {"id": "tfl-00001"}}}
```

- `kind` drives the look of the tile. `action.type` drives what a tap does.
- Action types and what a tap does:
  - `view`: go to Globe, apply the view (layers set exactly, look, camera).
  - `camera`: open the camera viewer sheet; "Open on globe" then flies there.
  - `station`: play it, show the mini player, stay on the screen.
  - `track`: go to Globe, switch the layer on, follow the thing.
  - `layer`: go to Globe, switch the listed layers on (plus an optional view). `needsKey` names a key id; when that key is missing the tap explains it and opens Settings.
  - `panel`: go to Globe in console mode with that stock panel open.
  - `screen`: open one of our screens (added 5 Oct 2026).
  - `place`: go to Globe and fly to the place by its query (added 5 Oct 2026).
  - `landmark`: go to Globe and fly to a hand-tuned landmark pose from the engine's list (added 5 Oct 2026).
  - `quake`, `launch`: go to Globe, switch on `earthquakes` or `rocket-launches`, fly to the point (added 5 Oct 2026).
- `icon` is optional and names an icon in the shell's set.
- `image` is a URL or `null`. `null` means the tile draws its own art.
- Cards built from live data are never stored.

## catalog.json

`app/public/shell/catalog.json`:

```json
{"version": 1, "featured": [], "tools": []}
```

- `featured` are `view` cards for the Home grid. `tools` are the round quick tools (`layer` or `panel` actions).
- Checked by `tools/check_app.py`: valid JSON, every card has the required fields, every layer id exists in the engine registry, no banned words.

## saved_view and prefs

- localStorage `gx:saved:v1` is an array of `saved_view`. Delete sets `deleted_at`. Lists hide rows with `deleted_at`. Thumbnails are small JPEG data URLs, capped at 24 live rows.
- localStorage `gx:prefs:v1` is one `prefs` object.
- Reads are defensive: bad JSON falls back to defaults and is not overwritten until the next save.

## Engine shapes

Read only. Listed in `claude.md`. If an engine update changes one, the self-test or a grid shows it first. Record the change in `findings.md` and here.
