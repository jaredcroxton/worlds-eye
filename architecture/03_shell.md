# 03 Shell

## Goal

Describe the one frontend file, `app/shell/gev-shell.js`, so it can be changed without re-reading all of it.

## Hook

`app/index.html` gets one line after the stylesheet link:

```html
<script type="module" src="/shell/gev-shell.js"></script>
```

It is listed before the engine's own tag, so it executes first. Nothing else in upstream changes.

## File sections, in order

1. `CONFIG`: version, storage keys, hide list, render policy per screen, spin rates.
2. `CSS`: one template string, injected as `<style id="gx-style">`.
3. `ICONS`: inline SVG strings.
4. `PREBOOT`: runs at import. Boot hash, classes on `<html>`, root `<div id="gx">`, landing markup, key guard.
5. `STORE`: prefs and saved views (localStorage, defensive reads, soft delete).
6. `ENGINE`: the adapter (`architecture/01_engine_adapter.md`).
7. `DATA`: catalog.json, cameras, stations, quakes, launches, landmarks, search.
8. `UI`: small helpers (`h` for elements, `card`, `chip`, `sheet`, `toast`).
9. `SCREENS`: landing, home, explore, globe, cameras, radio, saved, settings, more.
10. `ROUTER`: `go(screen, params)`, `?s=` query, back button.
11. `BOOT`: connect to the engine, self-test, hot-swap dispose.

Top-level `import` statements are forbidden except type-free helpers. Engine modules load with dynamic `import()` so the landing never waits on the engine graph.

## Boot order

1. Preboot (synchronous): if `location.hash` has no finite `lat` and `lon`, write the whole-globe boot hash with `hv=0`, `sc=0` and an explicit `map` (last good from `gx:map`, else `photoreal` when a key is baked in, else `esri-imagery`). Add `gx gx-simple` and `data-gx-screen` on `<html>`. Inject style and root. Install the key guard.
2. Connect: `const {application} = await import('../src/main.js')`. `application.subscribe` drives the landing status line and the failure state.
3. Ready: bind `engine`, HUD off, self-test, start spin after `styleManager.initialRestorePromise`, load catalog.
4. Fail open: on any boot error, remove `gx*` classes and the root, log the error. The stock app is then fully usable.
5. Hot swap: `import.meta.hot.accept()` and a `dispose` that removes the root, the style, every listener and timer. The engine keeps running.

## Modes

- Simple (`html.gx-simple`): stock chrome hidden with `display:none !important`. Hide list: `#title-bar, #style-indicator, #top-center-actions, #global-loading-status, #traffic-sync-chip, #cctv-sync-chip, #command-dock, #left-panel-stack, #right-context-rail, #intel-hud, #clean-view-exit, #key-setup-chip, #first-run-launcher, #loading-screen, #view-switcher, [data-panel-surface], [data-panel-popup]`. Not hidden: `#cesiumContainer, #world-overlay-root, #cesium-credits, #toast, #key-setup`. One exception, from the second design review (6 Oct 2026): on Landing and Home, `#world-overlay-root` (the engine's in-scene labels and tags) gets `visibility: hidden`, because a playing station or a followed thing put its labels across the headline, the search bar and the tool names. It is a direct child of the page body, outside `#cesiumContainer`, so the container rule still holds. It shows again on the Globe screen.
- Console (`html.gx-console`): hide list off, our UI shrinks to one "Simple view" pill, token overrides re-theme the stock panels, and every stock `backdrop-filter` is switched off (solid fills over the live globe). Entered from More, from deep links (`set_panel_open`), and automatically while cockpit mode is active. The engine has no proper phone layout yet (upstream issue 642), so at 720 px and below the console still opens but a note says it is built for wide windows, and More tags those rows.

## Screens and routing

- Screens: `landing, home, explore, globe, cameras, radio, saved, settings, more`.
- State lives in `data-gx-screen` on `<html>` and sessionStorage `gx:screen`. `go()` also pushes `?s=<screen>`. On `popstate` read `location.search` (the engine nulls `history.state`).
- The hash is never touched after preboot.
- Each screen is its own `position: fixed; inset: 0; overflow-y: auto; overflow-x: clip` scroller. Inactive screens get `inert` and `hidden`.

## Render policy

| Screen | Policy |
|---|---|
| globe | full (60 fps) |
| landing, home hero visible | half (30 fps) |
| home scrolled past the hero, explore, cameras, radio, saved, settings, more | paused |

Any engine call that moves the camera first raises the policy to at least half.

## Key guard

One capture listener on `window` for `keydown` and `keyup`, registered in preboot.

- Console mode: pass everything.
- Screen is not `globe`, or the event target is inside `#gx`: stop propagation to the engine. Native typing and scrolling still happen. Our own shortcuts run here (`/` focuses search, `Escape` closes a sheet).
- On `globe` with the canvas focused: block `v f h c d o` and backquote. Block Space unless voice is switched on in Settings. Pass `Escape` and `1` to `7`.

## Sheet flag

On the Globe screen a MutationObserver watches the two panels' `data-closed` attribute and sets `data-gx-sheet` on `<html>` while either is open. Teardown clears it. On a narrow window CSS reads it: the radio player steps aside and the bottom stack drops its lift while a sheet is open, so the sheet stays low and the followed thing at screen centre stays in view.

## Player flag

`renderPlayer` sets `data-gx-player` on `<html>` while the radio player is open and clears it when the player closes. Teardown clears it too. CSS reads it for the bottom stack (SOP 04). Nothing else may set it.

## Credits

`html.gx #cesium-credits` gets `z-index: 130`, a solid pill background and a reserved slot: right of the rail on desktop, above the tab bar when narrow. On Home the shell sets its `top` inline on scroll so it rides the bottom edge of the hero; when the hero has left the viewport the attribute `data-gx-herooff` drops it behind the solid page. Solid screens (explore and the rest) cover the globe and the credits together, which is allowed because no map is visible there. Credits are never hidden with `display`, `visibility` or `opacity`. At 380 px and under the logo drops to 15 px high and the pill padding tightens, so the credits stay on one line down to 320 px. Known failure: a two-line pill is 44 px tall and covers the foot of the dock (found 6 Oct 2026 at 320 and 334 px). The fit gate now fails when the pill touches the dock or an open panel.

## The engine's key dialog

Settings opens the engine's own `#key-setup` dialog (it writes `app/.env` safely and never returns key values). In our colours: a block of `html.gx #key-setup` overrides re-skins it (solid panel, violet accents, no blur, no scanline, the emoji tier dots replaced by PAID or FREE text). A MutationObserver tidies its text (long dashes become commas) each time the engine re-renders it. Keys typed there never pass through our code.

## Closed things are not focusable

Panels, menus, the viewer and the player carry `data-closed` when shut. Closed means `visibility: hidden` after the fade, so Tab never lands on an invisible control. The dock menu follows the dock in the DOM, takes focus when opened from the keyboard, moves with the arrow keys and returns focus to its button.

## Known failure modes

- Editing `index.html` restarts Cesium. Edit only the shell file during work.
- A solid overlay with `backdrop-filter` over the live canvas is slow. Do not blur over the globe.
- Setting any stacking property on `#cesiumContainer` traps the attribution popover.
