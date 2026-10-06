# 01 Engine adapter

## Goal

One object, `engine`, inside `app/shell/gev-shell.js`, is the only code that touches upstream APIs. When upstream changes, only this object needs repair.

## Inputs

- `application` from `import('../src/main.js')`.
- `application.getComponents()` gives `{scene, controls, data, tools}`. From them: `viewer = scene.viewer`, `styleManager = controls.styleManager`, `dataManager = data.dataManager`, `run = tools.voiceCommands.runner`, `sceneDirector = tools.sceneDirector`, `mapStackController = scene.mapStackController`. Fallback handle: `window.__godsEyeView`.
- `applyView` from `../src/app/embed.js`, `createView` from `../src/view/index.js`.

## Contract

| Our call | Engine call | Notes |
|---|---|---|
| `engine.ready` | Promise resolved at status `ready` and after `styleManager.initialRestorePromise` | rejects on `failed` |
| `engine.run(name, args)` | `voiceCommands.runner(name, args)` | never throws, returns `{ok:false, error}` on failure |
| `engine.layers.list()` | `dataManager.getAll()` | rows as in `claude.md` |
| `engine.layers.set(id, on)` | `dataManager.setEnabled(id, on, {origin:'user'})` | |
| `engine.layers.onChange(cb)` | `dataManager.subscribe(cb)` | returns unsubscribe |
| `engine.openView(view)` | `applyView(createView({...view, style: null}), {viewer, dataManager, run})`, then our own `setLook(view.style)` | turns off every layer not in the view; resume render first. The style is stripped because `applyView` would set it through the preset action |
| `engine.flyPoint(lat, lon, rangeM)` | `fly_to_location {latitude, longitude, rangeM}` | Always pass a range. Without one the engine stands 250 m away |
| `engine.flyPlace(query)` | `styleManager.placeSearch.geocode(query)`, then `flyPoint` with a range worked out from the place's bounding box | Never `fly_to_location {query}`: that path calls `/api/google/text-search`, a paid route once a Google key exists (seen 2026-10-05) |
| `engine.flyLandmark(cityId, index)` | `flyToPOI` from `src/locations.js` | hand-tuned poses for 45 landmarks |
| `engine.geocode(q)` | `styleManager.placeSearch.geocode(q)` | Enter only, never per keystroke |
| `engine.globe()` | `zoom_to_globe` | |
| `engine.setLook(style)` | `styleManager.setStyle(style, {applyPreset:false, revealParameters:false})`, then HUD off again | Not the `set_visual_style` action: its presets switch the HUD on and fire one `/api/openai/hud-summary` call per change (seen in the spike, 2026-10-05) |
| `engine.map.list()`, `engine.map.set(id)` | `mapStackController.getStacks()`, `set_map_stack` | |
| `engine.spin.set(rate)` | our `scene.preUpdate` rotator; `move_camera` orbit below 3,000 km | rate is `off, slow, normal, fast` |
| `engine.camera.open(id)` | `stop_tracking`, `control_cctv enable`, `control_cctv select {cameraQuery:id}` | |
| `engine.radio.play(id)` | enable `radio`, then the layer module's `selectStation(id, {autoplay:true, focus:true, origin:'user'})` | |
| `engine.radio.state()`, `onChange` | radio module `getUIState()`, `subscribe` | |
| `engine.track(query, layerId)` | enable the layer, `track_entity`, retry up to 20 times at 1 s | |
| `engine.selection.read()` | tracked info from the flights, military, vessels, satellites modules | speed units normalised to knots and km/h |
| `engine.selection.onChange(cb)` | `gev:entity-selected`, `gev:awareness-subject-selected`, their cleared twins on `window`, `gev:radio-selected` on `document` | |
| `engine.render.set(policy)` | `viewer.useDefaultRenderLoop`, `viewer.targetFrameRate`, `flushVisible`, `requestRender` | policy is `full, half, paused` |
| `engine.capture()` | `viewer.canvas.toDataURL('image/jpeg', 0.7)` after a forced render | used for saved-view thumbnails |
| `engine.console(on, panelId?)` | class swap on `<html>`, `set_panel_open` | |
| `engine.keys.open()` | click `#key-setup-chip` | dev server only |
| `engine.share()` | `styleManager.shareLinkManager.copyLink()` | |

## Rules

- Simple mode keeps the HUD logically off. After every `gev:style-change`, call `styleManager.setHudVisible('off')`.
- Before any fly or view call, set render policy to at least `half`. A paused loop does not move the camera.
- Never poll `get_entity_context`. It awaits reverse geocoding.
- Leave Flights off unless the person turns it on. Anonymous OpenSky allows about 100 global polls a day.
- Do not touch `#cesiumContainer` styles.

## Self-test

On `ready` in dev, the shell checks that every method, action name and stock element id it relies on exists, and prints one `console.warn` line per missing item with the prefix `[gx self-test]`. Run it after every engine update.

## Known failure modes

- An exception thrown inside a Cesium scene event (`preUpdate` and friends) stops rendering for good and shows Cesium's error box. Seen 2026-10-05: the spin handler read `window.Cesium`, which does not exist in this build. Fix: no Cesium global anywhere in the shell (plain `{x, y, z}` axis, radians by hand), and every scene-event handler of ours is wrapped in try and catch.
- `window.Cesium` is undefined. If a Cesium class is ever needed, load it with `await import('cesium')` inside the adapter.
- The Browser pane can be hidden while the page boots. The engine then throttles and reaches `ready` late (10 s or more). That is upstream's hidden-tab behaviour, not a fault.

- `track_entity` fails until the layer has data: retry loop.
- Cesium anchors `.cesium-widget-credits` to the bottom of a zero-height box. Moving `#cesium-credits` to a top corner pushed the text off screen (caught by `check_fit.py`, 2026-10-05). Fix: `html.gx #cesium-credits .cesium-widget-credits { position: static }`.
- The key guard swallowed Escape for the engine's own key dialog. Fix: events inside `#key-setup` pass through, and Escape, Tab and Enter pass while that dialog is open.
- `control_cctv select` refuses while something is tracked: `stop_tracking` first.
- `photoreal` with no key toasts an error: only offer map stacks where `isStackAvailable(id)` is true.
- Presets CRT, NVG, FLIR switch the HUD on: the re-assert rule above.
