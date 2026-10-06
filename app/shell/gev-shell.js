// World's Eye shell. Our whole frontend in one file: styles, markup, logic.
// Rules: claude.md and architecture/03_shell.md. Only the ENGINE section touches upstream.
// No top-level static imports. Engine modules load with dynamic import() so the landing never waits.

/* ============================== CONFIG ============================== */

const GX_VERSION = '0.3.0';
// The name on screen. The engine underneath keeps its own name and credit (gods-eye-view).
const GX_NAME = "World's Eye";
const DEV = Boolean(import.meta.hot);
const KEY = { prefs: 'gx:prefs:v1', saved: 'gx:saved:v1', map: 'gx:map', screen: 'gx:screen' };
const SCREENS = ['landing', 'home', 'explore', 'globe', 'cameras', 'radio', 'saved', 'settings', 'more'];
// Screens where the live globe is on show. Everything else is a solid page.
const GLOBE_SCREENS = new Set(['landing', 'home', 'globe']);
const RENDER_POLICY = { landing: 'half', home: 'half', globe: 'full' };
const SPIN_RATES = { off: 0, slow: 1.2, normal: 3, fast: 10 }; // degrees a second
const SPIN_LABEL = { off: 'Off', slow: 'Slow', normal: 'Steady', fast: 'Fast' }; // 'Steady', so the dock never shows two buttons called Normal
const MAP_IDS = ['photoreal', 'bing-aerial', 'bing-labels', 'esri-imagery', 'osm'];
const MAP_LABEL = { photoreal: '3D cities', 'bing-aerial': 'Aerial', 'bing-labels': 'Aerial with labels', 'esri-imagery': 'Satellite', osm: 'Streets' };
const LOOKS = [
  { id: 'normal', label: 'Normal' },
  { id: 'retro', label: 'CRT' },
  { id: 'surveillance', label: 'Night vision' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'anime', label: 'Anime' },
  { id: 'noir', label: 'Noir' },
  { id: 'snow', label: 'Snow' },
];
const LOOK_KEYS = { 1: 'normal', 2: 'retro', 3: 'surveillance', 4: 'thermal', 5: 'anime', 6: 'noir', 7: 'snow' };
// Our six groups for the engine's layers. Ids the engine adds later land in the last group.
const LAYER_GROUPS = [
  { title: 'In the air', ids: ['flights', 'military', 'satellites', 'rocket-launches', 'local-adsb'] },
  { title: 'On the ground', ids: ['cctv', 'traffic', 'transit', 'bikeshare', 'radio', 'directions'] },
  { title: 'At sea', ids: ['ais-live-vessels', 'telegeography-submarine-cables'] },
  { title: 'Earth', ids: ['earthquakes', 'local-firms', 'fire-perimeters', 'recent-imagery'] },
  { title: 'Weather', ids: ['wind', 'weather-radar', 'weather-satellite', 'weather-lightning', 'weather-cyclones'] },
  { title: 'Places', ids: ['alpr-cameras', 'military-installations', 'local-datacenters', 'local-dams'] },
];
// Plain names, the same on every screen. The engine's own names stay in console mode.
const LAYER_LABEL = {
  flights: 'Flights', military: 'Military flights', satellites: 'Satellites', 'rocket-launches': 'Launches', 'local-adsb': 'Your own receiver',
  cctv: 'Cameras', traffic: 'Street traffic', transit: 'Transit', bikeshare: 'Bike share', radio: 'Radio', directions: 'Directions',
  'ais-live-vessels': 'Ships', 'telegeography-submarine-cables': 'Undersea cables', earthquakes: 'Earthquakes', 'local-firms': 'Active fires',
  'fire-perimeters': 'Fire perimeters', 'recent-imagery': 'Recent imagery', wind: 'Wind', 'weather-radar': 'Rain radar',
  'weather-satellite': 'Clouds', 'weather-lightning': 'Lightning', 'weather-cyclones': 'Cyclones', 'alpr-cameras': 'Plate reader cameras',
  'military-installations': 'Military sites', 'local-datacenters': 'Data centres', 'local-dams': 'Dams',
};
const layerName = (row) => LAYER_LABEL[row?.id] || row?.name || 'Layer';
// Free keys some layers need. The engine marks only some of them itself (requiresKeyId), so the rest are named here.
const LAYER_KEY = { 'ais-live-vessels': 'aisstream', 'local-firms': 'firms' };
const keyFor = (row) => row?.requiresKeyId || LAYER_KEY[row?.id] || '';
// Layers that only make sense with the engine's own panel open.
const CONSOLE_LAYERS = { directions: 'data-panel', 'recent-imagery': 'data-panel', 'local-adsb': 'radio-panel' };
const LAYER_ICON = {
  flights: 'plane', military: 'plane', satellites: 'satellite', 'rocket-launches': 'rocket', 'local-adsb': 'radio',
  cctv: 'camera', traffic: 'car', transit: 'bus', bikeshare: 'bike', radio: 'radio', directions: 'arrow',
  'ais-live-vessels': 'ship', 'telegeography-submarine-cables': 'share', earthquakes: 'quake', 'local-firms': 'quake',
  'fire-perimeters': 'quake', 'recent-imagery': 'globe', wind: 'cloud', 'weather-radar': 'cloud', 'weather-satellite': 'cloud',
  'weather-lightning': 'cloud', 'weather-cyclones': 'cloud', 'alpr-cameras': 'camera', 'military-installations': 'pin',
  'local-datacenters': 'pin', 'local-dams': 'pin',
};
const PACK_REGION = {
  nsw: 'New South Wales', tfl: 'London', caltrans: 'California', txdot: 'Texas', austin: 'Austin', ontario: 'Ontario',
  fintraffic: 'Finland', drivebc: 'British Columbia', tallinn: 'Tallinn', tarktee: 'Estonia', warendorf: 'Warendorf',
  calgary: 'Calgary', deldot: 'Delaware',
};
const RADIO_CATS = [
  { id: 'all', label: 'All' },
  { id: 'news', label: 'News', words: ['news'] },
  { id: 'talk', label: 'Talk', words: ['talk', 'discussion', 'politics', 'sport'] },
  { id: 'music', label: 'Music' },
  { id: 'weather', label: 'Weather', words: ['weather'] },
  { id: 'safety', label: 'Public safety', words: ['emergency', 'scanner', 'police', 'fire', 'public safety'] },
  { id: 'air-sea', label: 'Air and sea', words: ['aviation', 'atc', 'marine', 'airport'] },
  { id: 'traffic', label: 'Traffic', words: ['traffic', 'transit'] },
];
// Stock chrome hidden in simple mode. See architecture/03_shell.md.
const HIDE_IDS = [
  '#style-indicator', '#top-center-actions', '#global-loading-status', '#traffic-sync-chip', '#cctv-sync-chip',
  '#command-dock', '#left-panel-stack', '#right-context-rail', '#intel-hud', '#clean-view-exit', '#key-setup-chip',
  '#first-run-launcher', '#loading-screen', '#view-switcher', '#pp-toggles', '#param-slider-panel', '#orbit-indicator',
  '[data-panel-surface]', '[data-panel-popup]',
];
// What the adapter relies on. The self-test warns when upstream renames one.
const NEED_IDS = ['#cesiumContainer', '#command-dock', '#left-panel-stack', '#right-context-rail', '#intel-hud', '#key-setup-chip', '#loading-screen'];
const BOOT_VIEW = { lat: 20, lon: 10, alt: 20000000 };
const PAGE = 24;

/* ============================== CSS ============================== */

const CSS = `
@font-face {
  font-family: 'Unbounded';
  src: url('/shell/fonts/unbounded-latin.woff2') format('woff2');
  font-weight: 200 900;
  font-display: swap;
}
:root.gx {
  --gx-bg: #07070B;
  --gx-surface: rgba(255,255,255,0.045);
  --gx-surface-2: rgba(255,255,255,0.085);
  --gx-solid: #101016;
  --gx-solid-2: #181820;
  --gx-line: rgba(255,255,255,0.09);
  --gx-line-2: rgba(255,255,255,0.17);
  --gx-text: #F4F5F7;
  --gx-text-2: rgba(244,245,247,0.64);
  --gx-text-3: rgba(244,245,247,0.52);
  --gx-accent: #6B5BFF;
  --gx-accent-2: #9A8FFF;
  --gx-live: #4ADE80;
  --gx-warn: #F5B544;
  --gx-r-card: 14px;
  --gx-r-panel: 18px;
  --gx-r-rail: 22px;
  --gx-rail-w: 76px;
  --gx-tab-h: 64px;
  /* The bottom stack: pill, dock, then menus and toasts. The lift makes room for the radio player. */
  --gx-lift: 0px;
  --gx-lift-pill: 0px;
  --gx-dock-b: calc(56px + var(--gx-lift));
  --gx-dock-h: 74px;
  --gx-above-dock: calc(var(--gx-dock-b) + var(--gx-dock-h) + 8px);
  --gx-gutter: 24px;
  --gx-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --gx-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --gx-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
  --gx-display: 'Unbounded', 'Arial Black', 'Helvetica Neue', system-ui, sans-serif;
  --gx-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --gx-mono: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
}
html.gx-simple :is(__HIDE__) { display: none !important; }
html.gx #title-bar { display: none !important; }
html.gx #cesium-credits {
  background: #07070B !important; padding: 4px 10px 4px 6px !important; border-radius: 10px !important;
  text-shadow: none !important; color: rgba(244,245,247,0.72) !important;
}
html.gx-simple #cesium-credits {
  z-index: 130 !important;
  left: calc(var(--gx-rail-w) + 28px) !important;
  bottom: 12px !important;
  right: auto !important;
  top: auto !important;
}
html.gx #cesium-credits .cesium-widget-credits { position: static !important; }
html.gx[data-gx-screen="landing"] #cesium-credits { left: 16px !important; }
html.gx[data-gx-screen="home"] #cesium-credits { left: calc(var(--gx-rail-w) + 12px + var(--gx-gutter)) !important; top: calc(72vh - 44px) !important; bottom: auto !important; }
html.gx-simple[data-gx-screen="globe"] #cesium-credits { bottom: calc(12px + var(--gx-lift-pill)) !important; }
/* The engine's in-scene labels belong to the Globe screen. Over the hero they cross the headline and the search. */
html.gx-simple:is([data-gx-screen="home"], [data-gx-screen="landing"]) #world-overlay-root { visibility: hidden !important; }
html.gx[data-gx-solid] #cesium-credits, html.gx[data-gx-modal] #cesium-credits, html.gx[data-gx-herooff] #cesium-credits { z-index: 1 !important; }

#gx {
  position: fixed; inset: 0; z-index: 120; pointer-events: none;
  font-family: var(--gx-sans); font-size: 15px; line-height: 1.45; color: var(--gx-text);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
#gx *, #gx *::before, #gx *::after { box-sizing: border-box; }
#gx :focus-visible { outline: 2px solid var(--gx-accent-2) !important; outline-offset: 2px !important; }
#gx [hidden] { display: none !important; }
#gx .gx-btn, #gx .gx-rail-item, #gx .gx-chip, #gx .gx-tool, #gx .gx-card, #gx .gx-row, #gx .gx-iconbtn, #gx .gx-menu-item, #gx .gx-linkbtn {
  font: inherit; color: inherit; background: none; border: 0; margin: 0; padding: 0; cursor: pointer; text-align: left;
  -webkit-tap-highlight-color: transparent; user-select: none;
}
#gx .gx-input { font: inherit; color: inherit; background: none; border: 0; outline: 0; margin: 0; padding: 0; min-width: 0; }
#gx .gx-input::placeholder { color: var(--gx-text-3); }
#gx .gx-input { text-overflow: ellipsis; }
#gx .gx-ico { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
#gx .gx-ico-fill { fill: currentColor; stroke: none; }
#gx .gx-mono { font-family: var(--gx-mono); font-feature-settings: 'zero' 0; }
#gx .gx-muted { color: var(--gx-text-2); }
#gx .gx-dim { color: var(--gx-text-3); }

/* Buttons */
#gx .gx-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 46px; padding: 0 22px; border-radius: 999px; font-weight: 600; font-size: 15px;
  pointer-events: auto; white-space: nowrap; text-align: center;
  transition: transform 140ms var(--gx-ease-out), background-color 160ms ease, border-color 160ms ease;
}
#gx .gx-btn:active { transform: scale(0.97); }
#gx .gx-btn[disabled] { opacity: 0.45; cursor: default; }
#gx .gx-btn-primary { background: #fff; color: #0B0B10; }
#gx .gx-btn-accent { background: var(--gx-accent); color: #fff; }
#gx .gx-btn-ghost { background: var(--gx-solid); color: var(--gx-text); border: 1px solid var(--gx-line-2); }
#gx .gx-btn-sm { height: 36px; padding: 0 16px; font-size: 13px; }
#gx .gx-iconbtn {
  display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; color: var(--gx-text-2);
  pointer-events: auto; transition: background-color 160ms ease, color 160ms ease, transform 140ms var(--gx-ease-out);
}
#gx .gx-iconbtn:active { transform: scale(0.94); }
#gx .gx-linkbtn { color: var(--gx-accent-2); font-weight: 500; font-size: 13px; pointer-events: auto; }
@media (hover: hover) and (pointer: fine) {
  #gx .gx-btn-primary:hover { background: #E9E9F2; }
  #gx .gx-btn-accent:hover { background: #5F4FF5; }
  #gx .gx-btn-ghost:hover { border-color: rgba(255,255,255,0.34); background: var(--gx-solid-2); }
  #gx .gx-iconbtn:hover { background: var(--gx-surface-2); color: #fff; }
  #gx .gx-linkbtn:hover { color: #fff; }
}

/* Landing: four perspective walls of type, the live globe through the far opening */
#gx .gx-landing {
  position: absolute; inset: 0; pointer-events: auto; overflow: hidden; z-index: 8;
  --gx-tp: calc(min(100vw, 100vh) * 0.62);
  --gx-td: calc(var(--gx-tp) * 1.4);
  transition: opacity 520ms ease;
}
#gx .gx-landing.gx-leaving { opacity: 0; pointer-events: none; }
#gx .gx-tunnel {
  position: absolute; inset: 0; perspective: var(--gx-tp); perspective-origin: 50% 50%;
  transition: transform 900ms var(--gx-ease-in-out);
}
#gx .gx-landing.gx-leaving .gx-tunnel { transform: scale(2.8); }
#gx .gx-wall { position: absolute; background: #000; overflow: hidden; backface-visibility: hidden; }
#gx .gx-wall-top { left: -1px; right: -1px; top: 0; height: var(--gx-td); transform-origin: 50% 0; transform: rotateX(-90deg); }
#gx .gx-wall-bottom { left: -1px; right: -1px; bottom: 0; height: var(--gx-td); transform-origin: 50% 100%; transform: rotateX(90deg); }
#gx .gx-wall-left { top: -1px; bottom: -1px; left: 0; width: var(--gx-td); transform-origin: 0 50%; transform: rotateY(90deg); }
#gx .gx-wall-right { top: -1px; bottom: -1px; right: 0; width: var(--gx-td); transform-origin: 100% 50%; transform: rotateY(-90deg); }
#gx .gx-wall::after { content: ''; position: absolute; inset: 0; pointer-events: none; }
#gx .gx-wall-top::after { background: linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.82) 100%); }
#gx .gx-wall-bottom::after { background: linear-gradient(to top, transparent 55%, rgba(0,0,0,0.82) 100%); }
#gx .gx-wall-left::after { background: linear-gradient(to right, transparent 55%, rgba(0,0,0,0.82) 100%); }
#gx .gx-wall-right::after { background: linear-gradient(to left, transparent 55%, rgba(0,0,0,0.82) 100%); }
#gx .gx-strip-v { position: absolute; left: 0; right: 0; top: 0; --gx-row: calc(var(--gx-td) / 2.1); }
#gx .gx-strip-v .gx-trow { display: block; width: 100%; height: var(--gx-row); }
#gx .gx-wall-top .gx-strip-v { animation: gx-flow-up 14s linear infinite; }
#gx .gx-wall-bottom .gx-strip-v { top: auto; bottom: 0; animation: gx-flow-down 14s linear infinite; }
#gx .gx-strip-h { position: absolute; top: 0; left: 0; display: flex; height: 100%; --gx-cell: calc(var(--gx-td) * 1.15); }
#gx .gx-strip-h .gx-tcell { flex: none; width: var(--gx-cell); height: 100%; display: flex; flex-direction: column; }
#gx .gx-strip-h .gx-trow { display: block; width: 100%; flex: 1 1 0; min-height: 0; }
#gx .gx-strip-h .gx-trow-sm { flex: 0.62 1 0; }
#gx .gx-wall-left .gx-strip-h { animation: gx-flow-left 9s linear infinite; }
#gx .gx-wall-right .gx-strip-h { left: auto; right: 0; animation: gx-flow-right 9s linear infinite; }
#gx .gx-trow text { font-family: var(--gx-display); font-weight: 900; fill: var(--gx-accent); }
#gx .gx-trow-dim text { fill: #4A3FD0; }
@keyframes gx-flow-up { from { transform: translateY(0); } to { transform: translateY(calc(-2 * var(--gx-row))); } }
@keyframes gx-flow-down { from { transform: translateY(0); } to { transform: translateY(calc(2 * var(--gx-row))); } }
@keyframes gx-flow-left { from { transform: translateX(0); } to { transform: translateX(calc(-1 * var(--gx-cell))); } }
@keyframes gx-flow-right { from { transform: translateX(0); } to { transform: translateX(var(--gx-cell)); } }
#gx .gx-landing-veil {
  position: absolute; inset: 0; background: #000; transition: opacity 1200ms ease; pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse 30% 30% at 50% 50%, #000 0%, #000 60%, transparent 100%);
  mask-image: radial-gradient(ellipse 30% 30% at 50% 50%, #000 0%, #000 60%, transparent 100%);
}
#gx .gx-landing.gx-ready .gx-landing-veil { opacity: 0; }
#gx .gx-landing-top {
  position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 18px 22px;
}
#gx .gx-wordmark { display: inline-flex; align-items: center; gap: 10px; font-family: var(--gx-display); font-weight: 800; font-size: 15px; letter-spacing: 0.02em; color: #fff; text-transform: uppercase; }
#gx .gx-wordmark .gx-ico { width: 24px; height: 24px; stroke-width: 1.8; }
#gx .gx-landing-center {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(88vw, 760px); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px;
  padding: 40px 12px;
  background: radial-gradient(closest-side, rgba(0,0,0,0.62), rgba(0,0,0,0.34) 64%, transparent);
}
#gx .gx-landing-h {
  margin: 0; font-family: var(--gx-display); font-weight: 900; text-transform: uppercase; color: #fff;
  font-size: clamp(22px, 4.4vw, 48px); line-height: 1.02; letter-spacing: -0.01em; text-wrap: balance;
  text-shadow: 0 2px 24px rgba(0,0,0,0.55);
}
#gx .gx-landing-sub { margin: 0; color: rgba(244,245,247,0.86); font-size: 15px; max-width: 40ch; text-wrap: balance; text-shadow: 0 1px 12px rgba(0,0,0,0.8); }
#gx .gx-landing-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
#gx .gx-landing-center > * { animation: gx-in 520ms var(--gx-ease-out) both; }
#gx .gx-landing-center > :nth-child(2) { animation-delay: 80ms; }
#gx .gx-landing-center > :nth-child(3) { animation-delay: 160ms; }
#gx .gx-landing-center > :nth-child(4) { animation-delay: 240ms; }
#gx .gx-boot-line {
  display: inline-flex; align-items: center; gap: 8px; font-family: var(--gx-mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--gx-text-2); min-height: 24px; padding: 4px 10px; border-radius: 999px; background: rgba(7,7,11,0.82);
}
#gx .gx-boot-line::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gx-text-3); }
#gx .gx-boot-line[data-state="ready"] { color: var(--gx-live); }
#gx .gx-boot-line[data-state="ready"]::before { background: var(--gx-live); box-shadow: 0 0 10px var(--gx-live); }
#gx .gx-boot-line[data-state="failed"] { color: #FF8A8A; }

/* Rail */
#gx .gx-rail {
  position: absolute; left: 12px; top: 12px; bottom: 12px; width: var(--gx-rail-w); pointer-events: auto; z-index: 6;
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 0 10px;
  background: var(--gx-solid); border: 1px solid var(--gx-line); border-radius: var(--gx-r-rail);
}
#gx .gx-rail-logo { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 8px; color: #fff; }
#gx .gx-rail-logo .gx-ico { width: 28px; height: 28px; stroke-width: 1.7; }
#gx .gx-rail-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  width: 62px; height: 56px; border-radius: 14px; color: var(--gx-text-2); font-size: 11px; font-weight: 500; text-align: center;
  transition: background-color 160ms ease, color 160ms ease, transform 140ms var(--gx-ease-out);
}
#gx .gx-rail-item:active { transform: scale(0.96); }
#gx .gx-rail-item[aria-current="page"] { background: var(--gx-surface-2); color: #fff; }
@media (hover: hover) and (pointer: fine) { #gx .gx-rail-item:hover { color: #fff; background: var(--gx-surface); } }
#gx .gx-rail-gap { flex: 1 1 auto; }
#gx[data-screen="landing"] .gx-rail, #gx[data-screen="landing"] .gx-screens, #gx[data-screen="landing"] .gx-player { display: none; }

/* Screens */
#gx .gx-screens { position: absolute; inset: 0; z-index: 2; }
#gx .gx-screen {
  --gx-pad-l: calc(var(--gx-rail-w) + 12px + var(--gx-gutter)); --gx-pad-r: var(--gx-gutter);
  position: absolute; inset: 0; overflow-y: auto; overflow-x: clip; pointer-events: auto;
  padding: 0 var(--gx-pad-r) 120px var(--gx-pad-l);
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent;
}
#gx .gx-screen-solid { background: var(--gx-bg); }
#gx .gx-screen.gx-enter > .gx-wrap { animation: gx-fade 220ms ease both; }
#gx .gx-screen.gx-leaving { opacity: 0; pointer-events: none; transition: opacity 180ms ease; }
#gx .gx-screen[data-gx-screen="globe"].gx-enter .gx-dock { animation: gx-dock-in 360ms var(--gx-ease-out) backwards; }
#gx .gx-screen[data-gx-screen="globe"].gx-enter .gx-gtop { animation: gx-top-in 360ms var(--gx-ease-out) backwards; }
#gx .gx-screen[data-gx-screen="home"].gx-enter > :is(.gx-hero, .gx-body) { animation: gx-fade 240ms ease backwards; }
@keyframes gx-dock-in { from { opacity: 0; transform: translateX(-50%) translateY(18px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes gx-top-in { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes gx-fade { from { opacity: 0; } to { opacity: 1; } }
#gx .gx-screen[data-gx-screen="globe"] { pointer-events: none; overflow: hidden; padding: 0; }
#gx .gx-wrap { max-width: 1400px; margin: 0 auto; }
#gx .gx-pagehead { padding: 56px 0 22px; display: flex; flex-direction: column; gap: 10px; }
#gx .gx-h1 { margin: 0; font-family: var(--gx-display); font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; line-height: 1; font-size: clamp(28px, 5vw, 56px); text-wrap: balance; }
#gx .gx-h2 { margin: 0; font-family: var(--gx-display); font-weight: 700; font-size: 15px; letter-spacing: 0.01em; text-transform: uppercase; }
#gx .gx-lede { margin: 0; color: var(--gx-text-2); max-width: 62ch; }
#gx .gx-sechead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 40px 0 14px; }

/* Home hero */
#gx .gx-hero {
  position: relative; min-height: 72vh; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  gap: 22px; padding: clamp(64px, 11vh, 120px) calc(var(--gx-pad-l) - var(--gx-pad-r)) 116px 0; text-align: center;
}
#gx .gx-hero::after {
  content: ''; position: absolute; left: calc(-1 * var(--gx-pad-l)); right: calc(-1 * var(--gx-pad-r)); bottom: 0; height: 120px; pointer-events: none;
  background: linear-gradient(to bottom, transparent, var(--gx-bg));
}
#gx .gx-hero::before {
  content: ''; position: absolute; left: calc(-1 * var(--gx-pad-l)); right: calc(-1 * var(--gx-pad-r)); top: 0; height: 100%; pointer-events: none;
  background: radial-gradient(ellipse 62% 50% at 50% 34%, rgba(7,7,11,0.78), rgba(7,7,11,0.34) 58%, transparent 100%);
}
#gx .gx-hero > * { position: relative; }
#gx .gx-hero-h {
  margin: 0; font-family: var(--gx-display); font-weight: 900; text-transform: uppercase; color: #fff;
  font-size: clamp(30px, 6.2vw, 92px); line-height: 0.98; letter-spacing: -0.02em; text-wrap: balance; text-shadow: 0 4px 40px rgba(0,0,0,0.6);
}
#gx .gx-search {
  display: flex; align-items: center; gap: 10px; width: min(100%, 720px); height: 60px; padding: 0 8px 0 18px; pointer-events: auto;
  background: var(--gx-solid); border: 1px solid var(--gx-line-2); border-radius: 18px;
  transition: border-color 160ms ease, box-shadow 200ms ease;
}
#gx .gx-search:focus-within { border-color: var(--gx-accent-2); box-shadow: 0 0 0 4px rgba(107,91,255,0.22); }
#gx .gx-search .gx-ico { color: var(--gx-text-3); }
#gx .gx-search .gx-btn .gx-ico { color: #fff; }
#gx .gx-search .gx-input:focus-visible, #gx .gx-filter .gx-input:focus-visible { outline: none !important; }
#gx .gx-filter:focus-within { border-color: var(--gx-accent-2); }
#gx .gx-search .gx-input { flex: 1 1 auto; height: 100%; font-size: 16px; }
#gx .gx-search-sm { height: 46px; border-radius: 14px; width: min(100%, 440px); padding-left: 14px; }
#gx .gx-search-sm .gx-input { font-size: 15px; }
#gx .gx-tools { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; width: min(100%, 720px); }
#gx .gx-tool { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 0; padding: 4px 0; pointer-events: auto; color: #fff; font-size: 12px; font-weight: 600; text-align: center; }
#gx .gx-tool > span:last-child { max-width: 100%; padding: 2px 8px; border-radius: 999px; background: rgba(7,7,11,0.78); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-tool-dot {
  display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; color: #fff;
  background: var(--gx-solid); border: 1px solid var(--gx-line-2);
  transition: transform 160ms var(--gx-ease-out), background-color 160ms ease, border-color 160ms ease;
}
#gx .gx-tool:active .gx-tool-dot { transform: scale(0.94); }
@media (hover: hover) and (pointer: fine) {
  #gx .gx-tool:hover .gx-tool-dot { background: var(--gx-solid-2); border-color: rgba(255,255,255,0.34); transform: translateY(-2px); }
}
#gx .gx-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; font-family: var(--gx-mono); font-size: 12px; color: var(--gx-text-2); letter-spacing: 0.02em; padding: 9px 16px; border-radius: 18px; background: rgba(7,7,11,0.78); border: 1px solid var(--gx-line); min-height: 38px; }
#gx .gx-stats:empty { visibility: hidden; }
#gx .gx-stats b { color: #fff; font-weight: 600; }
#gx .gx-stats i { font-style: normal; }
#gx .gx-stats span { display: inline-flex; align-items: center; gap: 7px; }
#gx .gx-stats span::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gx-live); }
#gx .gx-body {
  position: relative; margin: 0 calc(-1 * var(--gx-pad-r)) -120px calc(-1 * var(--gx-pad-l)); padding: 0 var(--gx-pad-r) 120px var(--gx-pad-l);
  background: var(--gx-bg);
}
#gx .gx-body > .gx-wrap { padding-top: 8px; }
#gx .gx-foot { margin-top: 64px; padding-top: 22px; border-top: 1px solid var(--gx-line); color: var(--gx-text-3); font-size: 12px; display: flex; flex-wrap: wrap; gap: 6px 18px; }

/* Chips */
#gx .gx-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
#gx .gx-chip {
  display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
  color: var(--gx-text-2); background: var(--gx-surface); border: 1px solid var(--gx-line); pointer-events: auto; white-space: nowrap;
  transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease, transform 140ms var(--gx-ease-out);
}
#gx .gx-chip:active { transform: scale(0.96); }
#gx .gx-chip[aria-pressed="true"] { background: var(--gx-accent); border-color: var(--gx-accent); color: #fff; }
#gx .gx-chip .gx-n { font-family: var(--gx-mono); font-size: 11px; color: var(--gx-text-3); }
#gx .gx-chip[aria-pressed="true"] .gx-n { color: #fff; }
@media (hover: hover) and (pointer: fine) { #gx .gx-chip:not([aria-pressed="true"]):hover { color: #fff; border-color: var(--gx-line-2); } }

/* Grids and cards */
#gx .gx-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
#gx .gx-card {
  position: relative; display: block; min-width: 0; aspect-ratio: 4 / 3; border-radius: var(--gx-r-card); overflow: hidden; pointer-events: auto;
  background: var(--gx-solid); border: 1px solid var(--gx-line); isolation: isolate;
  transition: transform 180ms var(--gx-ease-out), border-color 160ms ease;
}
#gx .gx-grid-tall .gx-card { aspect-ratio: 4 / 5; }
#gx .gx-card:active { transform: scale(0.985); }
#gx .gx-card-media { position: absolute; inset: 0; z-index: -1; }
#gx .gx-card-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 300ms ease, transform 500ms var(--gx-ease-out); }
#gx .gx-card-media img.gx-on { opacity: 1; }
#gx .gx-art {
  position: absolute; inset: 0; display: grid; place-items: center; color: #fff; overflow: hidden;
  background: radial-gradient(110% 95% at var(--gx-ax, 18%) var(--gx-ay, 8%), rgba(107,91,255,0.5), transparent 62%), radial-gradient(70% 60% at calc(100% - var(--gx-ax, 18%)) 110%, rgba(154,143,255,0.2), transparent 70%), linear-gradient(160deg, #15152A, #0A0A12);
}
#gx .gx-art .gx-ico { width: 30%; height: 30%; opacity: 0.22; stroke-width: 1; }
#gx .gx-art-glyph { font-family: var(--gx-display); font-weight: 900; font-size: clamp(38px, 5.4vw, 80px); letter-spacing: -0.04em; line-height: 1; color: rgba(255,255,255,0.16); white-space: nowrap; text-transform: uppercase; }
#gx .gx-card[data-kind="camera"]:not([data-nopic]) .gx-art { animation: gx-pulse 1.6s ease-in-out infinite; }
/* Caption cards: picture or art on top, words underneath, so our text never prints over a provider's own caption. */
#gx .gx-capcard { aspect-ratio: auto; display: flex; flex-direction: column; }
#gx .gx-capcard::after { display: none; }
#gx .gx-capcard .gx-card-media { position: relative; inset: auto; z-index: 0; display: block; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; flex: none; }
#gx .gx-capcard .gx-card-text { position: static; padding: 10px 12px 12px; gap: 3px; }
#gx .gx-capcard .gx-card-title { font-size: 14px; }
#gx .gx-card[data-nopic] .gx-card-badge { color: var(--gx-text-2); }
#gx .gx-card::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, rgba(4,4,8,0.92) 0%, rgba(4,4,8,0.5) 34%, transparent 62%); pointer-events: none; }
#gx .gx-card-badge {
  position: absolute; left: 10px; top: 10px; display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border-radius: 999px;
  background: rgba(6,6,10,0.78); font-family: var(--gx-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em; color: #fff;
}
#gx .gx-card-badge[data-live]::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gx-live); }
#gx .gx-card[data-kind="camera"]:not(:has(img.gx-on)) .gx-card-badge[data-live]::before { background: var(--gx-text-3); }
#gx .gx-card-text { position: absolute; left: 12px; right: 12px; bottom: 11px; display: flex; flex-direction: column; gap: 2px; }
#gx .gx-card-title { font-weight: 600; font-size: 15px; line-height: 1.25; color: #fff; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
#gx .gx-card-sub { font-size: 12px; color: var(--gx-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-card-play { position: absolute; right: 10px; top: 10px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #fff; color: #0B0B10; }
#gx .gx-card-play .gx-ico { width: 16px; height: 16px; }
#gx .gx-card[data-playing] { border-color: var(--gx-accent-2); }
#gx .gx-card[data-playing] .gx-card-play { background: var(--gx-accent); color: #fff; }
@media (hover: hover) and (pointer: fine) {
  #gx .gx-card:hover { border-color: var(--gx-line-2); transform: translateY(-3px); }
  #gx .gx-card:hover .gx-card-media img { transform: scale(1.04); }
}
#gx .gx-skel { aspect-ratio: 4 / 3; border-radius: var(--gx-r-card); background: var(--gx-surface); border: 1px solid var(--gx-line); animation: gx-pulse 1.6s ease-in-out infinite; }
#gx .gx-grid-tall .gx-skel { aspect-ratio: 4 / 5; }
@keyframes gx-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
#gx .gx-empty { padding: 36px 20px; border: 1px dashed var(--gx-line-2); border-radius: var(--gx-r-panel); color: var(--gx-text-2); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
#gx .gx-morerow { display: flex; justify-content: center; margin-top: 22px; }
#gx .gx-ghost { aspect-ratio: 4 / 5; border-radius: var(--gx-r-card); border: 1px dashed var(--gx-line-2); }
#gx .gx-emptywrap { position: relative; }
#gx .gx-empty-over { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(520px, calc(100% - 28px)); background: var(--gx-solid); border-style: solid; }
#gx .gx-in { animation: gx-in 360ms var(--gx-ease-out) both; }
@keyframes gx-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Globe chrome */
#gx .gx-gtop { position: absolute; left: calc(var(--gx-rail-w) + 28px); right: 20px; top: 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; pointer-events: none; }
#gx .gx-pillbtn {
  display: inline-flex; align-items: center; gap: 8px; height: 46px; padding: 0 16px; border-radius: 14px; font: inherit; font-weight: 600; font-size: 14px;
  color: var(--gx-text); background: var(--gx-solid); border: 1px solid var(--gx-line-2); cursor: pointer; pointer-events: auto; white-space: nowrap;
  transition: transform 140ms var(--gx-ease-out), background-color 160ms ease, border-color 160ms ease;
}
#gx .gx-pillbtn:active { transform: scale(0.97); }
#gx .gx-pillbtn[aria-expanded="true"] { border-color: var(--gx-accent-2); }
#gx .gx-count { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; display: inline-grid; place-items: center; background: var(--gx-accent); color: #fff; font-family: var(--gx-mono); font-size: 11px; font-weight: 600; }
#gx .gx-status { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px; border-radius: 999px; background: var(--gx-solid); border: 1px solid var(--gx-line); font-size: 12px; color: var(--gx-text-2); pointer-events: none; }
#gx .gx-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gx-warn); animation: gx-pulse 1s ease-in-out infinite; }
#gx .gx-panel {
  position: absolute; pointer-events: auto; display: flex; flex-direction: column; min-height: 0;
  background: var(--gx-solid); border: 1px solid var(--gx-line-2); border-radius: var(--gx-r-panel); overflow: hidden;
  transition: opacity 180ms ease, transform 220ms var(--gx-ease-out);
}
#gx .gx-panel[data-closed] { opacity: 0; transform: translateY(8px); pointer-events: none; visibility: hidden; transition: opacity 180ms ease, transform 220ms var(--gx-ease-out), visibility 0s linear 220ms; }
#gx .gx-layers { left: calc(var(--gx-rail-w) + 28px); top: 72px; width: 330px; max-height: calc(100vh - 72px - var(--gx-above-dock)); }
#gx .gx-details { right: 20px; top: 72px; width: 300px; max-height: calc(100vh - 72px - var(--gx-above-dock)); }
#gx .gx-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 10px 10px 16px; border-bottom: 1px solid var(--gx-line); }
#gx .gx-panel-title { font-weight: 600; font-size: 15px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#gx .gx-panel-body { overflow-y: auto; overflow-x: clip; padding: 8px 8px 12px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent; }
#gx .gx-filter { display: flex; align-items: center; gap: 8px; height: 38px; margin: 2px 2px 8px; padding: 0 12px; border-radius: 10px; background: var(--gx-surface); border: 1px solid var(--gx-line); }
#gx .gx-filter .gx-input { flex: 1 1 auto; font-size: 14px; height: 100%; }
#gx .gx-filter .gx-ico { width: 16px; height: 16px; color: var(--gx-text-3); }
#gx .gx-group { padding: 10px 8px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gx-text-3); }
#gx .gx-row {
  display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 6px 8px; border-radius: 10px; pointer-events: auto;
  transition: background-color 140ms ease;
}
#gx .gx-row .gx-ico { width: 18px; height: 18px; color: var(--gx-text-3); }
#gx .gx-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
#gx .gx-row-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-row-meta { font-size: 11px; color: var(--gx-text-3); font-family: var(--gx-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-row-meta[data-tone="warn"] { color: var(--gx-warn); }
#gx .gx-row-meta[data-tone="live"] { color: var(--gx-live); }
#gx .gx-switch { flex: none; position: relative; width: 36px; height: 22px; border-radius: 999px; background: rgba(255,255,255,0.14); transition: background-color 180ms ease; }
#gx .gx-switch::after { content: ''; position: absolute; left: 2px; top: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 180ms var(--gx-ease-out); }
#gx .gx-row[aria-checked="true"] .gx-switch { background: var(--gx-accent); }
#gx .gx-row[aria-checked="true"] .gx-switch::after { transform: translateX(14px); }
#gx .gx-row[aria-checked="true"] .gx-ico { color: var(--gx-accent-2); }
@media (hover: hover) and (pointer: fine) { #gx .gx-row:hover { background: var(--gx-surface); } }
#gx .gx-kv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 6px 8px 4px; }
#gx .gx-kv-item { padding: 10px 12px; border-radius: 12px; background: var(--gx-surface); min-width: 0; }
#gx .gx-kv-item[data-wide] { grid-column: 1 / -1; }
#gx .gx-kv-item:last-child:nth-child(even) { grid-column: 1 / -1; }
#gx .gx-kv-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gx-text-3); }
#gx .gx-kv-value { font-family: var(--gx-mono); font-size: 18px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-kv-item[data-wide] .gx-kv-value { font-size: 30px; letter-spacing: -0.02em; }
#gx .gx-kv-sub { font-family: var(--gx-mono); font-size: 11px; color: var(--gx-text-2); }
#gx .gx-details-sub { padding: 0 16px 6px; font-size: 12px; color: var(--gx-text-2); }
#gx .gx-details-img { margin: 6px 8px; border-radius: 12px; overflow: hidden; background: #000; aspect-ratio: 16 / 9; }
#gx .gx-details-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
#gx .gx-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 8px 4px; }
#gx .gx-actions .gx-btn { flex: 1 1 auto; }
#gx .gx-dock {
  position: absolute; left: 50%; bottom: var(--gx-dock-b); transform: translateX(-50%); display: flex; align-items: center; gap: 4px; padding: 6px;
  background: var(--gx-solid); border: 1px solid var(--gx-line-2); border-radius: 18px; pointer-events: auto; max-width: calc(100vw - 24px);
}
#gx .gx-dockbtn {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 64px; height: 52px; padding: 0 10px; border-radius: 12px;
  font: inherit; font-size: 11px; font-weight: 500; color: var(--gx-text-2); background: none; border: 0; cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, transform 140ms var(--gx-ease-out);
}
#gx .gx-dockbtn { height: 60px; }
#gx .gx-dockbtn b { font-weight: 600; color: #fff; font-size: 12px; white-space: nowrap; line-height: 1.1; }
#gx .gx-dockbtn small { font-size: 10px; color: var(--gx-text-3); white-space: nowrap; line-height: 1.1; max-width: 76px; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-dockbtn:active { transform: scale(0.96); }
#gx .gx-dockbtn[aria-expanded="true"] { background: var(--gx-surface-2); color: #fff; }
@media (hover: hover) and (pointer: fine) { #gx .gx-dockbtn:hover { background: var(--gx-surface); color: #fff; } }
#gx .gx-menu {
  position: absolute; left: 50%; bottom: var(--gx-above-dock); transform: translateX(-50%); transform-origin: 50% 100%; width: min(320px, calc(100vw - 24px)); padding: 6px; pointer-events: auto;
  max-height: calc(100vh - var(--gx-above-dock) - 12px); overflow-y: auto; scrollbar-width: thin;
  background: var(--gx-solid-2); border: 1px solid var(--gx-line-2); border-radius: 16px; display: flex; flex-direction: column; gap: 2px;
  transition: opacity 160ms ease, transform 200ms var(--gx-ease-out);
}
#gx .gx-menu[data-closed] { opacity: 0; transform: translateX(-50%) scale(0.96); pointer-events: none; visibility: hidden; transition: opacity 160ms ease, transform 200ms var(--gx-ease-out), visibility 0s linear 200ms; }
#gx .gx-menu > * { flex: 0 0 auto; }
#gx .gx-menu-title { padding: 8px 12px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gx-text-3); }
#gx .gx-menu-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 42px; padding: 0 12px; border-radius: 10px; font-size: 14px; font-weight: 500; pointer-events: auto; }
#gx .gx-menu-item[aria-checked="true"] { background: var(--gx-accent); color: #fff; }
#gx .gx-menu-item[disabled] { opacity: 0.4; cursor: default; }
#gx .gx-menu-item small { font-family: var(--gx-mono); font-size: 11px; color: var(--gx-text-3); }
#gx .gx-menu-item[aria-checked="true"] small { color: #fff; }
@media (hover: hover) and (pointer: fine) { #gx .gx-menu-item:not([aria-checked="true"]):not([disabled]):hover { background: var(--gx-surface-2); } }

/* Modal viewer */
#gx .gx-modal { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; padding: 16px; pointer-events: auto; background: rgba(4,4,8,0.88); transition: opacity 180ms ease; }
#gx .gx-modal[data-closed] { opacity: 0; pointer-events: none; visibility: hidden; transition: opacity 180ms ease, visibility 0s linear 180ms; }
#gx .gx-viewer {
  display: grid; grid-template-columns: minmax(0, 1fr) 300px; width: min(1180px, 100%); max-height: calc(100vh - 32px);
  background: var(--gx-solid); border: 1px solid var(--gx-line-2); border-radius: var(--gx-r-panel); overflow: hidden;
  transition: transform 220ms var(--gx-ease-out);
}
#gx .gx-modal[data-closed] .gx-viewer { transform: scale(0.98); }
#gx .gx-viewer-stage { position: relative; background: #000; min-height: 0; aspect-ratio: 16 / 10; display: grid; place-items: center; }
#gx .gx-viewer-stage img { width: 100%; height: 100%; object-fit: contain; display: block; }
#gx .gx-viewer-note { padding: 24px; text-align: center; color: var(--gx-text-2); font-size: 14px; }
#gx .gx-viewer-side { display: flex; flex-direction: column; gap: 14px; padding: 16px; min-width: 0; overflow-y: auto; }
#gx .gx-viewer-title { font-weight: 600; font-size: 17px; line-height: 1.3; }
#gx .gx-viewer-rows { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--gx-text-2); }
#gx .gx-viewer-rows b { color: var(--gx-text); font-weight: 500; }
#gx .gx-viewer-btns { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
#gx .gx-viewer-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }

/* Mini player */
#gx .gx-player {
  position: absolute; right: 20px; bottom: 20px; z-index: 7; display: flex; align-items: center; gap: 12px; width: min(380px, calc(100vw - 40px)); padding: 10px 10px 10px 14px;
  background: var(--gx-solid-2); border: 1px solid var(--gx-line-2); border-radius: 16px; pointer-events: auto;
  transition: opacity 200ms ease, transform 240ms var(--gx-ease-out);
}
#gx .gx-player[data-closed] { opacity: 0; transform: translateY(12px); pointer-events: none; visibility: hidden; transition: opacity 200ms ease, transform 240ms var(--gx-ease-out), visibility 0s linear 240ms; }
#gx .gx-player-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
#gx .gx-player-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-player-sub { font-size: 12px; color: var(--gx-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-eq { display: inline-flex; align-items: flex-end; gap: 2px; width: 16px; height: 16px; flex: none; }
#gx .gx-eq i { flex: 1 1 0; background: var(--gx-live); border-radius: 1px; height: 30%; transform-origin: 50% 100%; }
#gx .gx-player[data-state="playing"] .gx-eq i { animation: gx-eq 900ms ease-in-out infinite; }
#gx .gx-player[data-state="playing"] .gx-eq i:nth-child(2) { animation-delay: -300ms; }
#gx .gx-player[data-state="playing"] .gx-eq i:nth-child(3) { animation-delay: -600ms; }
@keyframes gx-eq { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(3.2); } }
#gx .gx-playbtn { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: #fff; color: #0B0B10; border: 0; cursor: pointer; flex: none; transition: transform 140ms var(--gx-ease-out); }
#gx .gx-playbtn:active { transform: scale(0.94); }

/* Station rows: a dense list reads better than a wall of empty cards. */
#gx .gx-rows { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
#gx .gx-srow {
  font: inherit; color: inherit; margin: 0; cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent; user-select: none;
  display: flex; align-items: center; gap: 12px; min-width: 0; min-height: 60px; padding: 8px 14px 8px 8px; border-radius: var(--gx-r-card);
  background: var(--gx-surface); border: 1px solid var(--gx-line); pointer-events: auto;
  transition: background-color 150ms ease, border-color 150ms ease, transform 140ms var(--gx-ease-out);
}
#gx .gx-srow:active { transform: scale(0.99); }
#gx .gx-srow-play { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--gx-surface-2); color: #fff; flex: none; transition: background-color 150ms ease; }
#gx .gx-srow-play .gx-ico { width: 16px; height: 16px; }
#gx .gx-srow-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
#gx .gx-srow-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-srow-sub { font-size: 12px; color: var(--gx-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#gx .gx-srow-meta { font-family: var(--gx-mono); font-size: 11px; color: var(--gx-text-3); flex: none; }
#gx .gx-srow-go { flex: none; display: grid; place-items: center; color: var(--gx-text-3); }
#gx .gx-srow-go .gx-ico { width: 16px; height: 16px; }
#gx .gx-srow[data-playing] { border-color: var(--gx-accent-2); }
#gx .gx-srow[data-playing] .gx-srow-play { background: var(--gx-accent); }
@media (hover: hover) and (pointer: fine) { #gx .gx-srow:hover { background: var(--gx-surface-2); border-color: var(--gx-line-2); } }

/* Lists: settings, more, saved */
#gx .gx-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
#gx .gx-item { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: var(--gx-r-card); background: var(--gx-surface); border: 1px solid var(--gx-line); min-width: 0; }
#gx .gx-item-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--gx-surface-2); flex: none; color: #fff; }
#gx .gx-item-btn { font: inherit; color: inherit; margin: 0; cursor: pointer; text-align: left; align-items: center; pointer-events: auto; -webkit-tap-highlight-color: transparent; transition: background-color 150ms ease, border-color 150ms ease, transform 140ms var(--gx-ease-out); }
#gx .gx-item-btn > .gx-ico { color: var(--gx-text-3); width: 18px; height: 18px; }
#gx .gx-item-btn:active { transform: scale(0.99); }
@media (hover: hover) and (pointer: fine) { #gx .gx-item-btn:hover { background: var(--gx-surface-2); border-color: var(--gx-line-2); } #gx .gx-item-btn:hover > .gx-ico { color: #fff; } }
#gx [data-gx-narrowonly] { display: none; }
#gx .gx-item-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
#gx .gx-item-title { font-weight: 600; font-size: 15px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
#gx .gx-item-sub { font-size: 13px; color: var(--gx-text-2); }
#gx .gx-item-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
#gx .gx-tag { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border-radius: 999px; font-family: var(--gx-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: var(--gx-surface-2); color: var(--gx-text-2); }
#gx .gx-tag[data-tone="live"] { color: var(--gx-live); }
#gx .gx-tag[data-tone="warn"] { color: var(--gx-warn); }
#gx .gx-seg { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; border-radius: 12px; background: var(--gx-surface); border: 1px solid var(--gx-line); }
#gx .gx-seg .gx-chip { border: 0; background: none; height: 30px; }
#gx .gx-seg .gx-chip[aria-pressed="true"] { background: var(--gx-accent); }
#gx .gx-savedcard { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
#gx .gx-savedcard .gx-rename { height: 34px; padding: 0 10px; border-radius: 10px; background: var(--gx-surface); border: 1px solid var(--gx-line); font-size: 13px; width: 100%; }
#gx .gx-savedrow { display: flex; gap: 8px; align-items: center; justify-content: space-between; }

/* Console pill and toasts */
#gx .gx-console-pill { position: absolute; left: calc(50% + 124px); top: 32px; pointer-events: auto; display: none; z-index: 9; }
html.gx-console #gx .gx-console-pill { display: inline-flex; }
html.gx-console #gx .gx-rail, html.gx-console #gx .gx-screens, html.gx-console #gx .gx-landing, html.gx-console #gx .gx-player { display: none; }
#gx .gx-toasts { position: absolute; left: 50%; bottom: var(--gx-above-dock); transform: translateX(-50%); z-index: 30; display: flex; flex-direction: column; gap: 8px; align-items: center; width: min(92vw, 440px); }
html.gx[data-gx-solid] #gx .gx-toasts, html.gx[data-gx-screen="home"] #gx .gx-toasts { bottom: calc(28px + var(--gx-lift)); }
html.gx[data-gx-screen="landing"] #gx .gx-toasts { bottom: 28px; }
#gx:has(.gx-menu:not([data-closed])) .gx-toasts { bottom: auto; top: 76px; }
html.gx[data-gx-calm] #gx :is(.gx-strip-v, .gx-strip-h, .gx-skel, .gx-in, .gx-toast, .gx-eq i, .gx-landing-center > *) { animation: none !important; }
html.gx[data-gx-calm] #gx .gx-screen.gx-enter :is(.gx-wrap, .gx-dock, .gx-gtop, .gx-hero, .gx-body) { animation: none !important; }
#gx .gx-toast {
  pointer-events: auto; display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 12px; background: var(--gx-solid-2); border: 1px solid var(--gx-line-2);
  font-size: 13px; color: var(--gx-text); transition: opacity 220ms ease, transform 220ms var(--gx-ease-out); animation: gx-in 240ms var(--gx-ease-out) both;
}
#gx .gx-toast.gx-out { opacity: 0; transform: translateY(8px); }

/* The engine's key dialog, in our colours. It opens from Settings. */
html.gx #key-setup {
  background: #101016 !important; border: 1px solid rgba(255,255,255,0.17) !important; border-radius: 18px !important;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
}
html.gx #key-setup .key-setup-scanline { display: none !important; }
html.gx #key-setup .key-setup-kicker { color: #9A8FFF !important; }
html.gx #key-setup h2 { font-family: var(--gx-sans) !important; font-weight: 600 !important; letter-spacing: -0.01em !important; color: #fff !important; }
html.gx #key-setup :is(#key-setup-description, .key-setup-unlocks, .key-setup-note) { font-family: var(--gx-sans) !important; color: rgba(244,245,247,0.64) !important; }
html.gx #key-setup .key-setup-row { background: rgba(255,255,255,0.045) !important; border: 1px solid rgba(255,255,255,0.09) !important; border-radius: 12px !important; }
html.gx #key-setup .key-setup-row[data-set="true"] { border-color: rgba(154,143,255,0.55) !important; }
html.gx #key-setup .key-setup-row[data-set="true"] .key-setup-led { background: #9A8FFF !important; box-shadow: none !important; }
html.gx #key-setup .key-setup-row-head strong { color: #fff !important; }
html.gx #key-setup .key-setup-tier { font: 600 10px var(--gx-mono) !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: rgba(244,245,247,0.64) !important; }
html.gx #key-setup .key-setup-tier[data-gx-tier="paid"] { color: #F5B544 !important; }
html.gx #key-setup .key-setup-exposed { color: rgba(244,245,247,0.64) !important; border-color: rgba(255,255,255,0.17) !important; background: none !important; }
html.gx #key-setup :is(.key-setup-get, .key-setup-remove) { color: #9A8FFF !important; }
html.gx #key-setup .key-setup-fields input { background: #0B0B10 !important; border: 1px solid rgba(255,255,255,0.17) !important; border-radius: 10px !important; color: #fff !important; }
html.gx #key-setup .key-setup-fields input:focus { border-color: #9A8FFF !important; box-shadow: 0 0 0 3px rgba(107,91,255,0.25) !important; outline: none !important; }
html.gx #key-setup .key-setup-apply { background: #6B5BFF !important; color: #fff !important; border: 0 !important; border-radius: 999px !important; box-shadow: none !important; font-family: var(--gx-sans) !important; font-weight: 600 !important; letter-spacing: 0 !important; text-transform: none !important; }
html.gx #key-setup .key-setup-close { color: rgba(244,245,247,0.64) !important; border-color: transparent !important; background: none !important; }
html.gx #key-setup .key-setup-hint { color: rgba(244,245,247,0.52) !important; }
html.gx #key-setup .key-setup-rows { scrollbar-color: rgba(255,255,255,0.18) transparent; }

/* Console re-theme: the engine's own panels, in our colours */
:root.gx.gx-console:not([data-ui-theme="cyber"]) {
  --accent: #9A8FFF; --accent-dim: rgba(107,91,255,0.18); --accent-glow: rgba(107,91,255,0.45);
  --bg-dark: #07070B; --glass-bg: rgba(16,16,22,0.94); --glass-border: rgba(255,255,255,0.10); --glass-border-hover: rgba(255,255,255,0.20);
  --text-primary: #F4F5F7; --menu-bg: #181820; --panel-radius: 18px; --btn-radius: 12px;
}
/* Solid fills over the live globe: every stock blur is switched off in console mode. */
html.gx.gx-console body > :not(#gx), html.gx.gx-console body > :not(#gx) * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
html.gx.gx-console :is(#location-bar, #control-panel, #gev-voice-control, #key-setup-chip, #clear-selected-layers, #share-btn, #tilt-map-view, #north-up-view, #reset-globe-view, .data-panel-inner, .scene-panel-inner, .cctv-panel-inner, .global-context-panel-inner, #pp-toggles) { background-color: #101016 !important; }
html.gx.gx-console :is(#gev-voice-control, #gev-voice-tier, #key-setup-chip, #traffic-sync-chip, #cctv-sync-chip, #global-loading-status) { border-color: rgba(154,143,255,0.38) !important; }

/* Breakpoints */
@media (min-width: 1181px) {
  #gx .gx-list-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #gx .gx-tool-dot { width: 64px; height: 64px; }
  #gx .gx-tool-dot .gx-ico { width: 24px; height: 24px; }
}
@media (max-width: 1240px) {
  html.gx[data-gx-player] { --gx-lift: 70px; }
  #gx .gx-player { bottom: 12px; }
}
@media (max-width: 880px) {
  html.gx[data-gx-player] { --gx-lift-pill: 70px; }
}
@media (max-width: 1180px) {
  #gx .gx-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #gx .gx-viewer { grid-template-columns: minmax(0, 1fr) 260px; }
}
@media (max-width: 900px) {
  #gx .gx-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #gx .gx-list, #gx .gx-rows { grid-template-columns: minmax(0, 1fr); }
  #gx .gx-viewer { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
  #gx .gx-viewer-stage { aspect-ratio: 16 / 11; }
}
@media (max-width: 860px) {
  #gx .gx-tools { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px 8px; width: min(100%, 460px); }
}
@media (max-width: 720px) {
  :root.gx { --gx-gutter: 14px; --gx-dock-b: calc(var(--gx-tab-h) + 56px + var(--gx-lift)); --gx-dock-h: 66px; }
  html.gx #cesium-credits { white-space: normal !important; max-width: calc(100vw - 24px) !important; line-height: 1.6; }
  html.gx-simple #cesium-credits { left: 12px !important; bottom: calc(var(--gx-tab-h) + 20px) !important; }
  html.gx[data-gx-screen="landing"] #cesium-credits { bottom: 12px !important; }
  html.gx #cesium-credits img { height: 20px !important; width: auto !important; }
  html.gx[data-gx-screen="home"] #cesium-credits { left: var(--gx-gutter) !important; top: calc(80vh - 44px) !important; bottom: auto !important; }
  html.gx-simple[data-gx-screen="globe"] #cesium-credits { bottom: calc(var(--gx-tab-h) + 20px + var(--gx-lift-pill)) !important; }
  #gx .gx-rail {
    left: 8px; right: 8px; top: auto; bottom: 8px; width: auto; height: var(--gx-tab-h);
    flex-direction: row; justify-content: space-around; padding: 0 4px; gap: 0;
  }
  #gx .gx-rail-logo, #gx .gx-rail-gap, #gx .gx-rail-item[data-gx-wide] { display: none; }
  #gx [data-gx-narrowonly] { display: block; }
  #gx .gx-grid-tall .gx-card-sub { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  #gx:has(.gx-player:not([data-closed])) .gx-screen-solid { padding-bottom: calc(var(--gx-tab-h) + 132px); }
  #gx .gx-layers, #gx .gx-details, #gx .gx-menu { transition: opacity 200ms ease, transform 320ms var(--gx-ease-sheet); }
  #gx .gx-layers[data-closed], #gx .gx-details[data-closed] { transform: translateY(24px); transition: opacity 180ms ease, transform 220ms var(--gx-ease-sheet), visibility 0s linear 220ms; }
  #gx .gx-console-pill { left: 10px; top: 10px; }
  html.gx.gx-console #key-setup-chip { display: none !important; }
  html.gx.gx-console #cesium-credits { left: 8px !important; bottom: auto !important; top: 56px !important; z-index: 130 !important; }
  #gx .gx-landing { --gx-td: calc(var(--gx-tp) * 0.9); }
  #gx .gx-landing-center { gap: 12px; padding: 0 8px; height: min(72vh, 540px); justify-content: flex-start; background: none; }
  #gx .gx-landing-h { padding: 8px 12px; border-radius: 12px; background: #000; }
  #gx .gx-landing-sub { display: none; }
  #gx .gx-landing-cta { margin-top: auto; }
  #gx .gx-boot-line { order: 5; }
  #gx .gx-rail-item { flex: 1 1 0; min-width: 0; width: auto; height: 52px; }
  #gx .gx-screen { --gx-pad-l: var(--gx-gutter); padding: 0 var(--gx-pad-r) calc(var(--gx-tab-h) + 48px) var(--gx-pad-l); }
  #gx .gx-body { margin-bottom: calc(-1 * (var(--gx-tab-h) + 48px)); padding-bottom: calc(var(--gx-tab-h) + 48px); }
  #gx .gx-pagehead { padding-top: 34px; }
  #gx .gx-hero { min-height: 80vh; gap: 18px; padding: 44px 0 108px; }
  #gx .gx-tools { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 4px; }
  #gx .gx-stats { display: grid; grid-template-columns: repeat(2, minmax(0, max-content)); justify-content: center; gap: 4px 18px; font-size: 11px; }
  #gx .gx-stats i { display: none; }
  #gx .gx-tool-dot { width: 52px; height: 52px; }
  #gx .gx-search { height: 54px; }
  #gx .gx-grid { gap: 10px; }
  #gx .gx-card-title { font-size: 13px; }
  #gx .gx-gtop { left: 10px; right: 10px; top: 10px; }
  #gx .gx-gtop .gx-search-sm { flex: 1 1 140px; width: auto; }
  #gx .gx-layers, #gx .gx-details { left: 8px; right: 8px; top: auto; bottom: calc(var(--gx-tab-h) + 62px); width: auto; max-height: 42vh; }
  html.gx[data-gx-screen="globe"][data-gx-sheet] { --gx-lift: 0px; --gx-lift-pill: 0px; }
  html.gx[data-gx-screen="globe"][data-gx-sheet] #gx .gx-player { display: none; }
  #gx .gx-screen[data-gx-screen="globe"]:has(.gx-panel:not([data-closed])) .gx-dock { display: none; }
  #gx .gx-details .gx-details-sub, #gx .gx-details .gx-details-img { display: none; }
  #gx .gx-details .gx-kv { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1.1fr); }
  #gx .gx-details .gx-kv-item[data-wide] { grid-column: auto; }
  #gx .gx-details .gx-kv-item[data-wide] .gx-kv-value, #gx .gx-details .gx-kv-value { font-size: 14px; letter-spacing: 0; }
  #gx .gx-details .gx-kv-item:nth-child(n+4) { display: none; }
  #gx .gx-details .gx-kv-item { padding: 8px; }
  #gx .gx-dock { gap: 0; padding: 4px; }
  #gx .gx-dockbtn { min-width: 0; padding: 0 7px; height: 56px; }
  #gx .gx-dockbtn small { max-width: 52px; }
  html.gx[data-gx-solid] #gx .gx-toasts, html.gx[data-gx-screen="home"] #gx .gx-toasts { bottom: calc(var(--gx-tab-h) + 22px + var(--gx-lift)); }
  html.gx[data-gx-screen="landing"] #gx .gx-toasts { bottom: 28px; }
  #gx:has(.gx-menu:not([data-closed])) .gx-toasts { top: 128px; }
  #gx .gx-player { right: 8px; left: 8px; bottom: calc(var(--gx-tab-h) + 16px); width: auto; }
}
@media (max-width: 380px) {
  html.gx #cesium-credits { padding: 3px 8px 3px 5px !important; }
  html.gx #cesium-credits img { height: 15px !important; }
  html.gx #cesium-credits .cesium-widget-credits { padding-right: 0 !important; }
  #gx .gx-dockbtn { padding: 0 5px; font-size: 10px; }
  #gx .gx-dockbtn b { font-size: 11px; }
  #gx .gx-tool { font-size: 11px; }
}
@media (pointer: coarse) {
  #gx .gx-menu-item[data-gx-menuitem="look"] small { display: none; }
  #gx .gx-btn-sm, #gx .gx-iconbtn { min-height: 44px; min-width: 44px; }
  #gx .gx-playbtn { width: 44px; height: 44px; }
  #gx .gx-chip { height: 40px; }
  #gx .gx-seg .gx-chip { height: 38px; }
  #gx .gx-linkbtn { min-height: 44px; display: inline-flex; align-items: center; }
}
@media (min-width: 721px) and (max-height: 620px) {
  #gx .gx-rail { padding: 8px 0; gap: 2px; }
  #gx .gx-rail-logo { display: none; }
  #gx .gx-rail-item { height: 40px; flex: none; }
  #gx .gx-rail-item span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
}
@media (prefers-reduced-motion: reduce) {
  #gx .gx-strip-v, #gx .gx-strip-h, #gx .gx-skel, #gx .gx-in, #gx .gx-toast, #gx .gx-eq i, #gx .gx-screen.gx-enter :is(.gx-wrap, .gx-dock, .gx-gtop, .gx-hero, .gx-body), #gx .gx-landing-center > * { animation: none !important; }
  #gx .gx-tunnel { transition: none; }
}
`.replace('__HIDE__', HIDE_IDS.join(', '));

/* ============================== ICONS ============================== */

const ICON = {
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
  explore: '<circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.6 2.6 14.4 0 17"/><path d="M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
  camera: '<rect x="3.5" y="7.5" width="12" height="9" rx="2"/><path d="m15.5 10.5 5-2.5v8l-5-2.5"/>',
  radio: '<rect x="4" y="9" width="16" height="10" rx="2"/><path d="m7 9 9-5"/><circle cx="9" cy="14" r="2"/><path d="M14 13h3M14 15.5h3"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
  saved: '<path d="M7 4h10v16l-5-3.5L7 20z"/>',
  more: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plane: '<path d="M12 3c.8 0 1.4 1 1.4 2.4v4.2l7 4v1.9l-7-2.1v4.2l2.2 1.6V21L12 20l-3.6 1v-1.8l2.2-1.6v-4.2l-7 2.1v-1.9l7-4V5.4C10.6 4 11.2 3 12 3z"/>',
  ship: '<path d="M4 15.5 12 13l8 2.5-1.8 4.5H5.8z"/><path d="M7 14.5V9h10v5.5"/><path d="M10 9V6h4v3"/>',
  satellite: '<rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)"/><path d="m6.2 9.3-2.8-2.8 3.1-3.1 2.8 2.8zM17.8 14.7l2.8 2.8-3.1 3.1-2.8-2.8z"/><path d="M16 4.5A3.5 3.5 0 0 1 19.5 8"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 9.1 4.5 4.5 0 0 1 17 18z"/>',
  quake: '<path d="M3 12h4l2-6 3.5 12 2.5-8 1.5 2H21"/>',
  rocket: '<path d="M12 3c3 2.5 4.5 6 4.5 9.5L14 16h-4l-2.5-3.5C7.5 9 9 5.5 12 3z"/><circle cx="12" cy="10" r="1.6"/><path d="M10 16v3l2-1.5 2 1.5v-3"/>',
  pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  car: '<rect x="4" y="10" width="16" height="6.5" rx="1.5"/><path d="m6 10 1.6-3.6A1.5 1.5 0 0 1 9 5.5h6a1.5 1.5 0 0 1 1.4.9L18 10"/><path d="M6.5 16.5v2M17.5 16.5v2"/><circle cx="8" cy="13.2" r="0.9"/><circle cx="16" cy="13.2" r="0.9"/>',
  bus: '<rect x="5.5" y="3.5" width="13" height="14" rx="2.5"/><path d="M5.5 11h13M9 6.5h6M8 17.5v2.5M16 17.5v2.5"/><circle cx="8.8" cy="14.3" r="0.9"/><circle cx="15.2" cy="14.3" r="0.9"/>',
  bike: '<circle cx="6" cy="15.5" r="3.5"/><circle cx="18" cy="15.5" r="3.5"/><path d="M6 15.5 10 9h6l2 6.5M10 9l2 6.5H6M16 9l-1-2.5h2.5M10 9V7.5M8.8 7.5h2.4"/>',
  play: '<path class="gx-ico-fill" d="M8 5.5v13l11-6.5z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  share: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  reset: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
  spin: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.5V9h-4.5"/>',
  look: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path class="gx-ico-fill" d="M12 3.5a8.5 8.5 0 0 1 0 17z"/>',
  map: '<path d="m3.5 6.5 5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  key: '<circle cx="8" cy="15" r="3.5"/><path d="m10.5 12.5 8-8M15.5 7.5 18 10"/>',
  console: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m7.5 10 2.5 2-2.5 2M12.5 14h4"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.5V9h-4.5"/>',
  mic: '<rect x="9" y="3.5" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5"/>',
  draw: '<path d="m5 19 1-4L16.5 4.5l3 3L9 18z"/><path d="m14.5 6.5 3 3"/>',
  film: '<rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M8 4.5v15M16 4.5v15M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4"/>',
};
const icon = (name, cls = '') => `<svg class="gx-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ICON.pin}</svg>`;

/* ============================== HELPERS ============================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (n) => Number(n).toLocaleString('en-AU');
const nowIso = () => {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const pad = (v) => String(Math.floor(Math.abs(v))).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${off >= 0 ? '+' : '-'}${pad(off / 60)}:${pad(off % 60)}`;
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || store.prefs().reduced_motion;
const narrow = () => window.matchMedia('(max-width: 720px)').matches;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanups = [];
const on = (target, type, handler, options) => {
  target.addEventListener(type, handler, options);
  cleanups.push(() => target.removeEventListener(type, handler, options));
};
const every = (ms, fn) => {
  const id = setInterval(fn, ms);
  cleanups.push(() => clearInterval(id));
  return id;
};
const state = {
  screen: 'landing', mode: 'simple', consoleAuto: false, engineReady: false, voiceAllowed: false,
  cards: new Map(), params: {}, viewer: null, menu: null, layersOpen: false, layerFilter: '',
  selection: null, homeChip: 'all', exploreChip: 'all', exploreQuery: '', cameraRegion: 'all', cameraShown: PAGE,
  radioCat: 'all', radioShown: PAGE, radioFilter: '', player: null,
};

/* ============================== STORE ============================== */

const DEFAULT_PREFS = { spin_rate: 'normal', look: 'normal', map: '', landing_seen: false, reduced_motion: false };
const store = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[gx] could not save', key, error);
      return false;
    }
  },
  prefs() {
    return { ...DEFAULT_PREFS, ...this.read(KEY.prefs, {}) };
  },
  setPrefs(patch) {
    const next = { ...this.prefs(), ...patch };
    this.write(KEY.prefs, next);
    return next;
  },
  // Saved views. Soft delete only: a removed row keeps its data and gets deleted_at.
  savedAll() {
    const rows = this.read(KEY.saved, []);
    return Array.isArray(rows) ? rows : [];
  },
  saved() {
    return this.savedAll().filter((row) => !row.deleted_at);
  },
  addSaved(view, title, thumb) {
    const rows = this.savedAll();
    const stamp = nowIso();
    const row = { id: `sv-${Date.now().toString(36)}`, title, view, thumb, created_at: stamp, updated_at: stamp, deleted_at: null };
    rows.unshift(row);
    // Keep storage small: thumbnails only on the 24 newest live rows.
    let live = 0;
    for (const item of rows) {
      if (item.deleted_at) item.thumb = '';
      else if (++live > 24) item.thumb = '';
    }
    return this.write(KEY.saved, rows) ? row : null;
  },
  patchSaved(id, patch) {
    const rows = this.savedAll();
    const row = rows.find((item) => item.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: nowIso() });
    this.write(KEY.saved, rows);
    return row;
  },
};

/* ============================== PREBOOT ============================== */

function hasShareHash() {
  const params = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
  return Number.isFinite(parseFloat(params.get('lat'))) && Number.isFinite(parseFloat(params.get('lon')));
}

function bootMap() {
  let last = '';
  try {
    last = localStorage.getItem(KEY.map) || '';
  } catch {
    last = '';
  }
  if (MAP_IDS.includes(last)) return last;
  const hasKey = Boolean(import.meta.env.GOOGLE_MAPS_API_KEY || import.meta.env.CESIUM_ION_TOKEN);
  return hasKey ? 'photoreal' : 'esri-imagery';
}

function initialScreen() {
  const wanted = new URLSearchParams(location.search).get('s');
  return SCREENS.includes(wanted) ? wanted : 'landing';
}

let stockTitle = '';
function preboot() {
  state.screen = initialScreen();
  // The engine reads the hash once, at load. Keep a real shared link only on the Globe screen.
  if (!(state.screen === 'globe' && hasShareHash()) && !window.__gxBooted) {
    const { lat, lon, alt } = BOOT_VIEW;
    const hash = `#v=2&lat=${lat}&lon=${lon}&alt=${alt}&heading=0&pitch=-90&roll=0&style=normal&map=${bootMap()}&hv=0&sc=0&cr=0&dm=OFF&bloom=0&sharpen=1&si=49&l=`;
    history.replaceState(null, '', location.pathname + location.search + hash);
  }
  window.__gxBooted = true;
  if (document.title !== GX_NAME) stockTitle = document.title;
  document.title = GX_NAME;
  const root = document.documentElement;
  root.classList.add('gx', 'gx-simple');
  root.classList.remove('gx-console');

  const style = document.createElement('style');
  style.id = 'gx-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  cleanups.push(() => style.remove());

  const gx = document.createElement('div');
  gx.id = 'gx';
  gx.innerHTML = shellMarkup();
  document.body.appendChild(gx);
  cleanups.push(() => gx.remove());

  const tabIcon = document.querySelector('link[rel="icon"]');
  if (tabIcon) {
    const previous = tabIcon.getAttribute('href');
    tabIcon.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9A8FFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON.eye}</svg>`)}`);
    cleanups.push(() => tabIcon.setAttribute('href', previous));
  }

  installKeyGuard();
  on(gx, 'click', onClick);
  on(gx, 'submit', onSubmit);
  on(gx, 'input', onInput);
  on(gx, 'change', onInput);
  on(window, 'popstate', () => go(initialScreen(), { push: false }));
  installTunnelParallax(gx);
  go(state.screen, { push: false });
}

/* ============================== MARKUP ============================== */

const trow = (text, cls = '') =>
  `<svg class="gx-trow ${cls}" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><text x="8" y="90" font-size="118" textLength="984" lengthAdjust="spacingAndGlyphs">${esc(text)}</text></svg>`;

function tunnelMarkup() {
  // Six rows, shifted by two per loop, so the alternating shades repeat without a jump.
  const rowsV = (text) => `<div class="gx-strip-v">${[0, 1, 2, 3, 4, 5].map((i) => trow(text, i % 2 ? 'gx-trow-dim' : '')).join('')}</div>`;
  const cellsH = (a, b) =>
    `<div class="gx-strip-h">${[0, 1, 2].map(() => `<div class="gx-tcell">${trow(a, 'gx-trow-sm gx-trow-dim')}${trow(b)}</div>`).join('')}</div>`;
  return `
    <div class="gx-tunnel" aria-hidden="true">
      <div class="gx-wall gx-wall-top">${rowsV(GX_NAME.toUpperCase())}</div>
      <div class="gx-wall gx-wall-bottom">${rowsV('YOURS TO WATCH')}</div>
      <div class="gx-wall gx-wall-left">${cellsH('EVERY FLIGHT', 'EVERY SHIP')}</div>
      <div class="gx-wall gx-wall-right">${cellsH('EVERY ORBIT', 'EVERY SIGNAL')}</div>
    </div>`;
}

const RAIL = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'explore', label: 'Explore', icon: 'explore' },
  { id: 'globe', label: 'Globe', icon: 'globe' },
  { id: 'cameras', label: 'Cameras', icon: 'camera' },
  { id: 'radio', label: 'Radio', icon: 'radio', wide: true },
  { id: 'saved', label: 'Saved', icon: 'saved', wide: true },
  { gap: true },
  { id: 'more', label: 'More', icon: 'more' },
  { id: 'settings', label: 'Settings', icon: 'settings', wide: true },
];

function shellMarkup() {
  const rail = RAIL.map((item) =>
    item.gap
      ? '<span class="gx-rail-gap"></span>'
      : `<button class="gx-rail-item" type="button" data-gx-go="${item.id}"${item.wide ? ' data-gx-wide' : ''}>${icon(item.icon)}<span>${item.label}</span></button>`,
  ).join('');
  return `
    <section class="gx-landing" data-gx-screen="landing" aria-label="Welcome">
      ${tunnelMarkup()}
      <div class="gx-landing-veil"></div>
      <header class="gx-landing-top">
        <span class="gx-wordmark">${icon('eye')}${esc(GX_NAME)}</span>
        <button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-go="home">Enter</button>
      </header>
      <div class="gx-landing-center">
        <h1 class="gx-landing-h">The live planet in your browser</h1>
        <p class="gx-landing-sub">Planes, ships, satellites, cameras and radio. Real feeds, one globe.</p>
        <div class="gx-landing-cta">
          <button class="gx-btn gx-btn-primary" type="button" data-gx-go="home">Start now</button>
          <button class="gx-btn gx-btn-ghost" type="button" data-gx-go="explore">See what is live</button>
        </div>
        <div class="gx-boot-line" data-gx-boot>Waking the globe</div>
      </div>
    </section>
    <nav class="gx-rail" aria-label="Main">
      <span class="gx-rail-logo">${icon('eye')}</span>
      ${rail}
    </nav>
    <main class="gx-screens">
      ${SCREENS.filter((id) => id !== 'landing').map((id) => `<section class="gx-screen${GLOBE_SCREENS.has(id) ? '' : ' gx-screen-solid'}" data-gx-screen="${id}" hidden></section>`).join('')}
    </main>
    <div class="gx-player" data-closed aria-live="polite"></div>
    <div class="gx-modal" data-closed role="dialog" aria-modal="true" aria-label="Camera"></div>
    <button class="gx-btn gx-btn-ghost gx-btn-sm gx-console-pill" type="button" data-gx-act="console-off">${icon('back')}Simple view</button>
    <div class="gx-toasts" aria-live="polite"></div>`;
}

function installTunnelParallax(gx) {
  const tunnel = $('.gx-tunnel', gx);
  if (!tunnel || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let tx = 50, ty = 50, cx = 50, cy = 50, raf = 0;
  const step = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    tunnel.style.perspectiveOrigin = `${cx.toFixed(2)}% ${cy.toFixed(2)}%`;
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(step) : 0;
  };
  on(window, 'pointermove', (event) => {
    if (state.screen !== 'landing' || reducedMotion()) return;
    tx = 50 + (event.clientX / window.innerWidth - 0.5) * 9;
    ty = 50 + (event.clientY / window.innerHeight - 0.5) * 9;
    if (!raf) raf = requestAnimationFrame(step);
  });
  cleanups.push(() => cancelAnimationFrame(raf));
}

/* ============================== UI BITS ============================== */

function toast(message, { ms = 2800, action = null, onAction = null } = {}) {
  const host = $('#gx .gx-toasts');
  if (!host) return;
  const node = document.createElement('div');
  node.className = 'gx-toast';
  const text = document.createElement('span');
  text.textContent = message;
  node.appendChild(text);
  if (action && onAction) {
    const button = document.createElement('button');
    button.className = 'gx-linkbtn';
    button.type = 'button';
    button.textContent = action;
    button.addEventListener('click', () => {
      onAction();
      node.remove();
    });
    node.appendChild(button);
  }
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add('gx-out');
    setTimeout(() => node.remove(), 260);
  }, ms);
}

function setBoot(text, stateName = 'starting') {
  const line = $('#gx [data-gx-boot]');
  if (!line) return;
  line.textContent = text;
  line.dataset.state = stateName;
}

function registerCard(card) {
  state.cards.set(card.id, card);
  return card;
}

// A small stable number from a string, for art that differs from card to card but never between visits.
function hashOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
// The big faint mark on drawn art comes from the card's own data: a magnitude, or initials.
function glyphOf(card) {
  if (card.kind === 'quake') return String(card.title).replace(/[^0-9.]/g, '').slice(0, 3);
  if (card.kind === 'satellite') return 'ISS';
  if (card.kind === 'station' || card.kind === 'place' || card.kind === 'launch') {
    const words = String(card.title).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || words[0]?.[1] || '')).toUpperCase();
  }
  return '';
}
// Picture cards (views) carry their words over the picture. Everything else is a caption card.
// animate false is for lists redrawn while someone types: keyboard-driven changes do not animate.
function cardHTML(card, index = 0, { animate = true } = {}) {
  registerCard(card);
  const picture = card.kind === 'view';
  const playing = card.kind === 'station' && state.player?.id === card.action?.payload?.id;
  const media = card.kind === 'camera'
    ? `<img alt="" data-gx-frame="${esc(card.action.payload.id)}">`
    : card.image
      ? `<img alt="" loading="lazy" data-gx-img src="${esc(card.image)}">`
      : '';
  const seed = hashOf(card.id);
  const glyph = glyphOf(card);
  const art = `<span class="gx-art" style="--gx-ax:${12 + (seed % 76)}%;--gx-ay:${(seed >> 8) % 44}%">${glyph ? `<span class="gx-art-glyph">${esc(glyph)}</span>` : icon(card.icon || KIND_ICON[card.kind] || 'pin')}</span>`;
  const badge = card.badge ? `<span class="gx-card-badge"${card.live ? ' data-live' : ''}>${esc(card.badge)}</span>` : '';
  const play = card.kind === 'station' ? `<span class="gx-card-play">${icon(playing ? 'pause' : 'play')}</span>` : '';
  const motion = animate === false ? '' : ` gx-in" style="animation-delay:${Math.min(index, 8) * 40}ms`;
  return `<button class="gx-card${picture ? '' : ' gx-capcard'}${motion}" type="button" data-kind="${esc(card.kind)}" data-gx-card="${esc(card.id)}"${playing ? ' data-playing' : ''}>
    <span class="gx-card-media">${art}${media}${picture ? '' : badge + play}</span>
    ${picture ? badge + play : ''}
    <span class="gx-card-text"><span class="gx-card-title">${esc(card.title)}</span>${card.subtitle ? `<span class="gx-card-sub">${esc(card.subtitle)}</span>` : ''}</span>
  </button>`;
}
const KIND_ICON = { view: 'globe', place: 'pin', camera: 'camera', station: 'radio', satellite: 'satellite', quake: 'quake', launch: 'rocket', tool: 'layers' };
const skeletons = (n) => Array.from({ length: n }, () => '<div class="gx-skel"></div>').join('');
const chipsHTML = (group, items, active) =>
  `<div class="gx-chips" role="group">${items.map((item) => `<button class="gx-chip" type="button" data-gx-chip="${group}" data-value="${esc(item.id)}" aria-pressed="${item.id === active}">${esc(item.label)}${item.n != null ? `<span class="gx-n">${num(item.n)}</span>` : ''}</button>`).join('')}</div>`;

// Images: plain card art fades in when it loads, and stays hidden when it is missing.
function wireImages(root) {
  for (const img of $$('img[data-gx-img]', root)) {
    if (img.dataset.gxWired) continue;
    img.dataset.gxWired = '1';
    const show = () => img.classList.add('gx-on');
    if (img.complete && img.naturalWidth) show();
    img.addEventListener('load', show, { once: true });
    img.addEventListener('error', () => img.remove(), { once: true });
  }
  for (const img of $$('img[data-gx-frame]', root)) {
    if (img.dataset.gxWired) continue;
    img.dataset.gxWired = '1';
    frames.watch(img);
  }
}

// Camera stills. Loaded only for cards on screen, four at a time, never refreshed in a grid.
// A still the server marks as a fallback (Street View can bill, synthetic is a placeholder) is not shown or asked for again.
const frames = {
  observer: null, queue: [], active: 0, urls: new Map(), bad: new Set(),
  watch(img) {
    if (!this.observer) {
      this.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.observer.unobserve(entry.target);
          this.queue.push(entry.target);
          this.pump();
        }
      }, { rootMargin: '200px' });
      cleanups.push(() => {
        this.observer?.disconnect();
        this.observer = null;
        for (const url of this.urls.values()) URL.revokeObjectURL(url);
        this.urls.clear();
        this.queue.length = 0;
      });
    }
    this.observer.observe(img);
  },
  pump() {
    while (this.active < 4 && this.queue.length) {
      const img = this.queue.shift();
      if (!img.isConnected) continue;
      this.active += 1;
      this.load(img.dataset.gxFrame).then((url) => {
        if (url && img.isConnected) {
          img.src = url;
          img.classList.add('gx-on');
        } else {
          const card = img.closest('.gx-card');
          if (card) {
            card.setAttribute('data-nopic', '');
            const badge = $('.gx-card-badge', card);
            if (badge) {
              badge.removeAttribute('data-live');
              badge.textContent = badge.textContent === 'VIDEO' ? 'VIDEO' : 'NO STILL';
            }
          }
          img.remove();
        }
      }).finally(() => {
        this.active -= 1;
        this.pump();
      });
    }
  },
  async load(id, { fresh = false } = {}) {
    if (this.bad.has(id)) return null;
    if (!fresh && this.urls.has(id)) return this.urls.get(id);
    try {
      const response = await fetch(`/api/cctv/frame/${encodeURIComponent(id)}?ts=${Math.floor(Date.now() / 15000)}`);
      const source = response.headers.get('X-CCTV-Source');
      if (!response.ok || (source && source !== 'upstream-image')) {
        this.bad.add(id);
        return null;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        this.bad.add(id);
        return null;
      }
      const url = URL.createObjectURL(blob);
      const old = this.urls.get(id);
      this.urls.set(id, url);
      if (old) setTimeout(() => URL.revokeObjectURL(old), 4000);
      return url;
    } catch {
      return null;
    }
  },
};

/* ============================== DATA ============================== */
// Read-only fetches of the engine's own routes and one public feed. Each loads once.

const data = {
  _cache: new Map(),
  once(key, loader) {
    if (!this._cache.has(key)) {
      this._cache.set(key, loader().catch((error) => {
        this._cache.delete(key);
        throw error;
      }));
    }
    return this._cache.get(key);
  },
  async json(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return response.json();
  },
  catalog() {
    return this.once('catalog', () => this.json('/shell/catalog.json'));
  },
  cameras() {
    return this.once('cameras', async () => {
      const body = await this.json('/api/cctv/sources');
      return (body.sources || []).map((row) => ({
        id: row.id, pack: row.pack, name: tidyName(row.name, 'Camera'),
        region: PACK_REGION[row.pack] || row.city || 'Elsewhere', provider: row.provider || row.credit || '',
        lat: row.lat, lon: row.lon, heading: row.headingDeg, video: row.feedType && row.feedType !== 'image',
      }));
    });
  },
  stations() {
    return this.once('stations', async () => {
      const body = await this.json('/api/radio/stations');
      const rows = (body.stations || []).map((row) => ({
        id: row.id, name: tidyName(row.name, 'Station'), country: row.country || '', code: row.countryCode || '',
        tags: Array.isArray(row.tags) ? row.tags : String(row.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        bitrate: row.bitrate, codec: row.codec, lat: row.lat, lon: row.lon,
      }));
      // One row per station: same name in the same country keeps its best stream, in its first place in the list.
      const best = new Map();
      for (const row of rows) {
        const key = `${row.name.toLowerCase()}|${row.code}`;
        const had = best.get(key);
        if (!had || (Number(row.bitrate) || 0) > (Number(had.bitrate) || 0)) best.set(key, row);
      }
      return [...best.values()];
    });
  },
  quakes() {
    return this.once('quakes', async () => {
      const body = await this.json('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
      return (body.features || []).map((f) => ({
        id: f.id, mag: f.properties?.mag, place: f.properties?.place || 'Unknown place', time: f.properties?.time,
        lon: f.geometry?.coordinates?.[0], lat: f.geometry?.coordinates?.[1],
      })).filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lon)).sort((a, b) => (b.time || 0) - (a.time || 0));
    });
  },
  launches() {
    return this.once('launches', async () => {
      const body = await this.json('/api/launches');
      return (body.results || []).map((row) => ({
        id: row.id, name: row.name || 'Launch', net: row.net, status: row.status?.abbrev || '',
        site: row.pad?.location?.name || row.pad?.name || '', lat: Number(row.pad?.latitude), lon: Number(row.pad?.longitude),
      })).filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lon));
    });
  },
  setup() {
    return this.once('setup', () => this.json('/api/setup/status'));
  },
  landmarks() {
    return this.once('landmarks', async () => {
      const mod = await import('../src/locations.js');
      const out = [];
      for (const [cityId, city] of Object.entries(mod.CITY_POIS || {})) {
        (city.pois || []).forEach((poi, index) => out.push({ cityId, index, city: city.name, name: poi.name }));
      }
      return out;
    });
  },
};

const KEEP_UPPER = new Set(['IH', 'US', 'SH', 'FM', 'AM', 'NW', 'NE', 'SW', 'SE', 'TX', 'CA', 'UK', 'USA', 'BBC', 'NPR', 'DJ', 'TV', 'NYC', 'DC', 'LA', 'NY', 'II', 'III', 'KDFC', 'DLF']);
const SMALL_WORDS = new Set(['at', 'and', 'of', 'the', 'to', 'in', 'on', 'a', 'an', 'de', 'la', 'el']);
// Feed names arrive raw. Drop codec notes and leading codes, and turn ALL CAPS into title case.
function tidyName(raw, fallback) {
  let text = String(raw || '').trim();
  text = text.split(/\s*\|\s*/).filter((part) => part && !/^(mp3|aac\+?|ogg|opus|flac|hls)?\s*\d{2,3}\s*k(bps|b\/s)?$/i.test(part)).join(' · ');
  text = text.replace(/^\([A-Z]{0,2}\d{2,5}\)\s*/, '').replace(/\s+:\s+/g, ': ').replace(/\.$/, '').replace(/\s{2,}/g, ' ').trim();
  const letters = text.replace(/[^\p{L}]/gu, '');
  const upper = letters.replace(/[^\p{Lu}]/gu, '').length;
  if (letters.length > 5 && upper / letters.length > 0.7) {
    text = text.split(' ').map((word, index) => {
      const bare = word.replace(/[^\p{L}\p{N}]/gu, '');
      if (KEEP_UPPER.has(bare.toUpperCase())) return word.toUpperCase();
      const lower = word.toLowerCase();
      if (/^\d/.test(bare)) return lower; // 5TH becomes 5th, 50S becomes 50s
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/\p{L}/u, (ch) => ch.toUpperCase());
    }).join(' ');
  }
  return text || fallback;
}
const cameraCard = (c) => ({
  id: `cam-${c.id}`, kind: 'camera', title: c.name, subtitle: [c.region, c.provider].filter(Boolean).join(' · '),
  badge: c.video ? 'VIDEO' : 'LIVE', live: true, image: null, icon: 'camera', action: { type: 'camera', payload: { id: c.id } },
});
const stationCard = (s) => ({
  id: `st-${s.id}`, kind: 'station', title: s.name, subtitle: [s.country, s.tags.slice(0, 2).join(', '), 'via Radio Browser'].filter(Boolean).join(' · '),
  badge: 'RADIO', live: true, image: null, icon: 'radio', action: { type: 'station', payload: { id: s.id } },
});
const quakeCard = (q) => ({
  id: `qk-${q.id}`, kind: 'quake', title: `Magnitude ${Number(q.mag).toFixed(1)}`, subtitle: `${q.place} · ${ago(q.time)}`,
  badge: 'QUAKE', live: true, image: null, icon: 'quake', action: { type: 'quake', payload: { lat: q.lat, lon: q.lon } },
});
const launchCard = (l) => ({
  id: `ln-${l.id}`, kind: 'launch', title: tidyName(l.name, 'Launch'), subtitle: [l.site, l.status, whenText(l.net)].filter(Boolean).join(' · '),
  badge: 'LAUNCH', live: false, image: null, icon: 'rocket', action: { type: 'launch', payload: { lat: l.lat, lon: l.lon } },
});
const landmarkCard = (m) => ({
  id: `lm-${m.cityId}-${m.index}`, kind: 'place', title: m.name, subtitle: m.city, badge: '', live: false, image: null, icon: 'pin',
  action: { type: 'landmark', payload: { cityId: m.cityId, index: m.index } },
});
const ISS_CARD = {
  id: 'sat-iss', kind: 'satellite', title: 'International Space Station', subtitle: 'About 7.7 km a second, 400 km up', badge: 'LIVE', live: true,
  image: null, icon: 'satellite', action: { type: 'track', payload: { query: 'ISS', layerId: 'satellites' } },
};

function ago(ms) {
  if (!ms) return '';
  const minutes = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}
function whenText(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const diff = t - Date.now();
  if (diff < 0) return ago(t);
  const hours = Math.round(diff / 3600000);
  return hours < 48 ? `in ${Math.max(1, hours)} h` : `in ${Math.round(hours / 24)} d`;
}
function stationCat(s) {
  const text = s.tags.join(' ').toLowerCase();
  for (const cat of RADIO_CATS) if (cat.words && cat.words.some((w) => text.includes(w))) return cat.id;
  return 'music';
}
// Round-robin across groups, so a list mixes regions instead of showing one region first.
// Complete and in a fixed order: every row appears exactly once when count allows.
function spread(rows, keyOf, count) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const lists = [...groups.values()];
  const out = [];
  for (let depth = 0; out.length < count && lists.some((list) => list.length > depth); depth += 1) {
    for (const list of lists) {
      if (list.length > depth && out.length < count) out.push(list[depth]);
    }
  }
  return out;
}

/* ============================== ENGINE ============================== */
// The only code that touches upstream. Contract: architecture/01_engine_adapter.md.

const engine = {
  app: null, viewer: null, sm: null, dm: null, msc: null, sd: null, vc: null, presentation: null, clouds: null,
  applyViewFn: null, createViewFn: null, flyToPoiFn: null,
  policy: 'half', spinRate: 0, spinName: 'off', _offs: [],
  _resolveReady: null,
  whenReady: null,

  async connect() {
    let application = null;
    try {
      ({ application } = await import('../src/main.js'));
    } catch (error) {
      console.warn('[gx] could not import the engine entry, falling back to the debug handle', error);
    }
    if (application) {
      await new Promise((resolve, reject) => {
        let off = null;
        let settled = false;
        const settle = (fn, value) => {
          if (settled) return;
          settled = true;
          queueMicrotask(() => off && off());
          fn(value);
        };
        off = application.subscribe(({ status, phase }) => {
          if (status === 'ready') settle(resolve);
          else if (status === 'failed' || status === 'destroyed') settle(reject, new Error(`engine ${status}`));
          else setBoot(phase ? `Waking the globe: ${phase}` : 'Waking the globe');
        });
      });
      const parts = application.getComponents();
      this.app = application;
      this.viewer = parts.scene.viewer;
      this.msc = parts.scene.mapStackController;
      this.sm = parts.controls.styleManager;
      this.clouds = parts.controls.cockpitCloudEffects;
      this.dm = parts.data.dataManager;
      this.presentation = parts.data.presentation;
      this.sd = parts.tools.sceneDirector;
      this.vc = parts.tools.voiceCommands;
    } else {
      const handle = await waitFor(() => window.__godsEyeView?.voiceCommands && window.__godsEyeView, 60000);
      this.viewer = handle.viewer;
      this.msc = handle.mapStackController;
      this.sm = handle.styleManager;
      this.clouds = handle.cockpitCloudEffects;
      this.dm = handle.dataManager;
      this.sd = handle.sceneDirector;
      this.vc = handle.voiceCommands;
    }
    const [embed, view, locations] = await Promise.all([import('../src/app/embed.js'), import('../src/view/index.js'), import('../src/locations.js')]);
    this.applyViewFn = embed.applyView;
    this.createViewFn = view.createView;
    this.flyToPoiFn = locations.flyToPOI;
    try {
      await this.sm.initialRestorePromise;
    } catch {
      /* a failed restore still leaves a usable globe */
    }
    this.bind();
    return this;
  },

  bind() {
    const listen = (target, type, handler) => {
      target.addEventListener(type, handler);
      this._offs.push(() => target.removeEventListener(type, handler));
    };
    // Simple mode keeps the HUD logically off. CRT, NVG and FLIR presets switch it back on.
    listen(window, 'gev:style-change', () => this.assertSimple());
    listen(window, 'gev:cockpit-mode-changed', (event) => {
      if (event.detail?.active) setConsole(true, null, { auto: true });
      else if (state.mode === 'console' && state.consoleAuto) setConsole(false);
    });
    listen(document, 'visibilitychange', () => {
      if (!document.hidden) this.applyRender();
    });
    const canvas = this.viewer.canvas;
    const hold = () => {
      if (state.screen === 'globe' && this.spinRate) {
        this.spin('off', { remember: false });
        refreshDock();
      }
    };
    listen(canvas, 'pointerdown', hold);
    listen(canvas, 'wheel', hold);
    try {
      const off = this.dm.subscribe(() => scheduleLayerRefresh());
      if (typeof off === 'function') this._offs.push(off);
    } catch (error) {
      console.warn('[gx] could not subscribe to layer changes', error);
    }
    this.installSpin();
    this.watchKeyDialog();
    this.assertSimple();
  },

  mod(id) {
    return this.dm?.layers?.get(id)?.module || null;
  },

  assertSimple() {
    if (state.mode !== 'simple') return;
    try {
      this.sm.setHudVisible('off');
    } catch (error) {
      console.warn('[gx] could not switch the HUD off', error);
    }
    this.showSun(false);
  },
  // The sun billboard glowed beside our tools. Lighting does not depend on it.
  showSun(on) {
    try {
      if (this.viewer?.scene?.sun) this.viewer.scene.sun.show = on;
    } catch {
      /* no sun in this scene */
    }
  },

  async run(name, args = {}) {
    try {
      const result = await this.vc.runner(name, args);
      return result ?? { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  },

  /* Render policy: full, half, paused. Mirrors the engine's own tab-hidden switch. */
  render(policy) {
    this.policy = policy;
    this.applyRender();
  },
  applyRender() {
    if (!this.viewer || document.hidden) return;
    const paused = this.policy === 'paused';
    const wasPaused = this.viewer.useDefaultRenderLoop === false;
    this.viewer.useDefaultRenderLoop = !paused;
    this.viewer.targetFrameRate = this.policy === 'half' ? 30 : 60;
    this.clouds?.setSuspended?.(paused);
    if (!paused && wasPaused) {
      try {
        this.presentation?.flushVisible?.();
      } catch {
        /* nothing to flush */
      }
      window.__godsEyeView?.requestRender?.('gx-resume');
    }
  },
  wake() {
    if (this.policy === 'paused') this.render('half');
  },

  /* Spin: our own rotation about the Earth's axis. */
  installSpin() {
    const scene = this.viewer.scene;
    const axis = { x: 0, y: 0, z: 1 }; // the Earth's axis; a plain object, so no Cesium import is needed
    let last = performance.now();
    // An exception inside a Cesium scene event stops rendering for good, so this handler never throws.
    const remove = scene.preUpdate.addEventListener(() => {
      try {
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!this.spinRate || this.viewer.trackedEntity || scene.tweens.length) return;
        if (this.viewer.camera.positionCartographic.height < 3000000) return;
        // Positive angle walks the camera west, so the surface drifts east like the real Earth.
        this.viewer.camera.rotate(axis, ((this.spinRate * Math.PI) / 180) * dt);
      } catch (error) {
        this.spinRate = 0;
        console.warn('[gx] spin stopped after an error', error);
      }
    });
    this._offs.push(() => remove());
  },
  spin(rate, { remember = true } = {}) {
    const name = rate in SPIN_RATES ? rate : 'off';
    this.spinRate = reducedMotion() ? 0 : SPIN_RATES[name];
    this.spinName = this.spinRate ? name : 'off';
    if (remember && name !== 'off') store.setPrefs({ spin_rate: name });
    document.documentElement.dataset.gxSpin = this.spinName;
  },

  layers() {
    return this.dm.getAll();
  },
  setLayer(id, enabled) {
    this.wake();
    return this.dm.setEnabled(id, enabled, { origin: 'user' });
  },
  async clearLayers() {
    for (const row of this.layers()) if (row.enabled) await this.dm.setEnabled(row.id, false, { origin: 'user' }).catch(() => {});
  },
  // applyView would set the look through the preset action (HUD on, one OpenAI call). We set the look ourselves.
  async openView(view) {
    this.wake();
    this.spin('off', { remember: false });
    const { style, ...rest } = view;
    const full = this.createViewFn({ ...rest, style: null, map: this.bestMap(view.map) });
    const steps = await this.applyViewFn(full, { viewer: this.viewer, dataManager: this.dm, run: (n, a) => this.vc.runner(n, a) });
    if (style) setLook(style);
    return steps;
  },
  currentView() {
    const camera = this.sm.getCameraState();
    const control = this.sm.getControlState();
    return {
      camera: {
        lat: Number(camera.lat.toFixed(5)), lon: Number(camera.lon.toFixed(5)), altitude_m: Math.round(clamp(camera.alt, 50, 20000000)),
        heading_deg: Math.round(((camera.heading % 360) + 360) % 360), pitch_deg: Math.round(clamp(camera.pitch, -90, 0)),
      },
      layers: this.layers().filter((row) => row.enabled && row.showInTogglePanel !== false).map((row) => row.id),
      style: control.style || 'normal',
      map: this.msc.getActiveId?.() || null,
      follow: null,
      annotations: [],
    };
  },
  bestMap(wanted) {
    const ok = (id) => {
      try {
        return this.msc.isStackAvailable(id);
      } catch {
        return false;
      }
    };
    if (wanted && ok(wanted)) return wanted;
    const active = this.msc.getActiveId?.();
    if (active && ok(active)) return active;
    return ok('photoreal') ? 'photoreal' : 'esri-imagery';
  },
  maps() {
    const active = this.msc.getActiveId?.();
    return MAP_IDS.map((id) => {
      let available = false;
      try {
        available = Boolean(this.msc.isStackAvailable(id));
      } catch {
        available = false;
      }
      return { id, label: MAP_LABEL[id] || id, available, active: id === active };
    });
  },
  async setMap(id) {
    const result = await this.run('set_map_stack', { stack: id });
    if (result.ok !== false) {
      try {
        localStorage.setItem(KEY.map, id);
      } catch {
        /* storage blocked */
      }
    }
    return result;
  },
  // Always by coordinates and range. The action's query path calls /api/google/text-search, a paid route once a key exists.
  flyPoint(lat, lon, rangeM = 30000) {
    this.wake();
    this.spin('off', { remember: false });
    return this.run('fly_to_location', { latitude: lat, longitude: lon, rangeM: Math.round(clamp(rangeM, 300, 19000000)) });
  },
  // Look a place up with the keyless chain (bundled names, Photon, Nominatim), then fly to it.
  async flyPlace(query) {
    let found = null;
    try {
      found = await this.geocode(query);
    } catch {
      found = null;
    }
    const place = found?.place;
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return { ok: false, error: 'not found' };
    const result = await this.flyPoint(place.lat, place.lng, rangeForPlace(place));
    return { ...result, label: place.label || place.name || query };
  },
  flyCamera(pose, seconds = 2.4) {
    this.wake();
    return this.sm.applyCameraState(pose, seconds);
  },
  async flyLandmark(cityId, index) {
    this.wake();
    this.spin('off', { remember: false });
    try {
      await this.flyToPoiFn(this.viewer, cityId, index, {});
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  },
  geocode(query) {
    return this.sm.placeSearch.geocode(query);
  },
  globe() {
    this.wake();
    return this.run('zoom_to_globe', {});
  },
  // The set_visual_style action applies presets that switch the HUD on (one OpenAI call each time).
  // setStyle with applyPreset false changes the shader only.
  setLook(style) {
    try {
      this.sm.setStyle(style, { applyPreset: false, revealParameters: false });
      this.assertSimple();
      return { ok: true, style };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  },
  async openCamera(id) {
    this.wake();
    this.spin('off', { remember: false });
    await this.run('stop_tracking', {});
    await this.run('control_cctv', { action: 'enable' });
    return this.run('control_cctv', { action: 'select', cameraQuery: id });
  },
  async playStation(id, { focus = false } = {}) {
    await this.dm.setEnabled('radio', true, { origin: 'user' });
    const radio = this.mod('radio');
    if (!radio?.selectStation) return { ok: false, error: 'Radio is not available' };
    try {
      const picked = await radio.selectStation(id, { autoplay: true, focus, origin: 'user' });
      return { ok: picked !== false };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  },
  radioState() {
    try {
      return this.mod('radio')?.getUIState?.() || null;
    } catch {
      return null;
    }
  },
  async stopRadio() {
    try {
      this.mod('radio')?.stopPlayback?.();
    } catch {
      /* already stopped */
    }
    await this.dm.setEnabled('radio', false, { origin: 'user' }).catch(() => {});
  },
  async track(query, layerId) {
    this.wake();
    this.spin('off', { remember: false });
    await this.dm.setEnabled(layerId, true, { origin: 'user' });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await this.run('track_entity', { query, layerId });
      if (result.ok !== false) return result;
      await sleep(1000);
    }
    return { ok: false, error: 'Could not find it yet' };
  },
  // What is selected right now, with speed in plain units. Never throws.
  readSelection() {
    const safe = (fn) => {
      try {
        return fn();
      } catch {
        return null;
      }
    };
    for (const layerId of ['flights', 'military']) {
      if (!this.dm.isEnabled(layerId)) continue;
      const info = safe(() => this.mod(layerId)?.getTrackedInfo?.());
      if (info) {
        const knots = info.velocityMps != null ? info.velocityMps * 1.94384 : null;
        return {
          kind: 'aircraft', layerId, id: info.icao24, title: info.callsign || info.registration || info.icao24,
          sub: layerId === 'military' ? 'Military aircraft' : 'Aircraft',
          speed: knots != null ? `${Math.round(knots)} kt` : 'No data', speedSub: knots != null ? `${num(Math.round(knots * 1.852))} km/h` : '',
          facts: [
            ['Altitude', info.altitudeM != null ? `${num(Math.round(info.altitudeM * 3.28084))} ft` : 'No data', info.altitudeM != null ? `${num(Math.round(info.altitudeM))} m` : ''],
            ['Heading', info.track != null ? `${Math.round(info.track)}°` : 'No data', ''],
          ],
        };
      }
    }
    if (this.dm.isEnabled('ais-live-vessels')) {
      const info = safe(() => this.mod('ais-live-vessels')?.getSelectedInfo?.());
      if (info) {
        return {
          kind: 'vessel', layerId: 'ais-live-vessels', id: info.mmsi, title: info.name || `Vessel ${info.mmsi}`, sub: info.type || 'Vessel',
          speed: info.speedKt != null ? `${Number(info.speedKt).toFixed(1)} kt` : 'No data', speedSub: info.speedKt != null ? `${(info.speedKt * 1.852).toFixed(1)} km/h` : '',
          facts: [['Course', info.course != null ? `${Math.round(info.course)}°` : 'No data', ''], ['MMSI', String(info.mmsi || ''), '']],
        };
      }
    }
    if (this.dm.isEnabled('satellites')) {
      const info = safe(() => this.mod('satellites')?.getTrackedInfo?.());
      if (info) {
        // Circular-orbit speed from altitude. Close enough for a readout, so it is labelled approximate.
        const kms = Math.sqrt(3.986004418e14 / (6371000 + info.altitudeM)) / 1000;
        return {
          kind: 'satellite', layerId: 'satellites', id: info.noradId, title: info.name, sub: `Satellite · NORAD ${info.noradId}`,
          speed: `${kms.toFixed(2)} km/s`, speedSub: `about ${num(Math.round(kms * 3600))} km/h`,
          facts: [
            ['Altitude', `${num(Math.round(info.altitudeM / 1000))} km`, ''],
            ['Latitude', `${Math.abs(info.latitude).toFixed(1)}° ${info.latitude >= 0 ? 'N' : 'S'}`, ''],
            ['Longitude', `${Math.abs(info.longitude).toFixed(1)}° ${info.longitude >= 0 ? 'E' : 'W'}`, ''],
          ],
        };
      }
    }
    if (this.dm.isEnabled('cctv')) {
      const ui = safe(() => this.mod('cctv')?.getUIState?.());
      const cam = ui?.activeCamera;
      if (cam) {
        return {
          kind: 'camera', layerId: 'cctv', id: cam.id, title: String(cam.name || 'Camera').replace(/\.$/, ''),
          sub: [cam.city, cam.provider].filter(Boolean).join(' · '), cameraId: cam.id, video: Boolean(cam.isVideo), facts: [],
        };
      }
    }
    return null;
  },
  async stopFollowing(selection) {
    if (selection?.kind === 'camera') await this.run('control_cctv', { action: 'disable' });
    else await this.run('stop_tracking', {});
  },
  capture() {
    try {
      this.viewer.render();
      const source = this.viewer.canvas;
      const out = document.createElement('canvas');
      out.width = 480;
      out.height = 360;
      const ctx = out.getContext('2d');
      const scale = Math.max(out.width / source.width, out.height / source.height);
      const w = source.width * scale;
      const h = source.height * scale;
      ctx.drawImage(source, (out.width - w) / 2, (out.height - h) / 2, w, h);
      return out.toDataURL('image/jpeg', 0.62);
    } catch (error) {
      console.warn('[gx] could not capture the view', error);
      return '';
    }
  },
  async share() {
    try {
      if (await this.sm.shareLinkManager.copyLink()) return true;
      throw new Error('copy refused');
    } catch {
      try {
        await navigator.clipboard.writeText(location.href);
        return true;
      } catch {
        return false;
      }
    }
  },
  openKeys() {
    const chip = $('#key-setup-chip');
    if (chip) chip.click();
    return Boolean(chip);
  },
  // The dialog is the engine's. We only tidy what it shows: long dashes become commas.
  watchKeyDialog() {
    const dialog = $('#key-setup');
    if (!dialog) return;
    const long = /\s*[\u2013\u2014]\s*/g;
    const tidy = () => {
      const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (long.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(long, ', ');
        long.lastIndex = 0;
      }
      // Words in place of the coloured emoji, so a screen reader says Paid or Free (SOP 07).
      for (const tier of $$('.key-setup-tier', dialog)) {
        const word = tier.textContent.includes('\u{1F534}') ? 'Paid' : tier.textContent.includes('\u{1F7E1}') ? 'Free' : '';
        if (!word) continue;
        tier.textContent = word;
        tier.dataset.gxTier = word.toLowerCase();
      }
      for (const node of $$('[title]', dialog)) {
        if (long.test(node.title)) node.title = node.title.replace(long, ', ');
        long.lastIndex = 0;
      }
      const kicker = $('.key-setup-kicker', dialog);
      if (kicker && kicker.textContent !== 'KEYS') kicker.textContent = 'KEYS';
      for (const input of $$('input[data-env-var]', dialog)) {
        const hint = /saved/i.test(input.placeholder) ? 'Saved. Paste a new key to replace it' : 'Paste your key';
        if (input.placeholder !== hint) input.placeholder = hint;
      }
    };
    tidy();
    const observer = new MutationObserver(tidy);
    observer.observe(dialog, { childList: true, subtree: true, characterData: true });
    this._offs.push(() => observer.disconnect());
  },

  selfTest() {
    const missing = [];
    for (const id of NEED_IDS) if (!$(id)) missing.push(`element ${id}`);
    const need = [
      [this.dm, ['getAll', 'setEnabled', 'subscribe', 'isEnabled']],
      [this.sm, ['setHudVisible', 'setStyle', 'applyCameraState', 'getCameraState', 'getControlState', 'setCleanView']],
      [this.msc, ['getActiveId', 'isStackAvailable']],
      [this.vc, ['runner']],
      [this.sm?.placeSearch, ['geocode']],
    ];
    for (const [object, names] of need) for (const name of names) if (typeof object?.[name] !== 'function') missing.push(`method ${name}`);
    if (typeof this.applyViewFn !== 'function') missing.push('applyView');
    if (typeof this.createViewFn !== 'function') missing.push('createView');
    if (typeof this.flyToPoiFn !== 'function') missing.push('flyToPOI');
    if (!(this.dm?.layers instanceof Map)) missing.push('dataManager.layers');
    const known = new Set(LAYER_GROUPS.flatMap((group) => group.ids));
    const have = new Set((this.dm?.getAll?.() || []).map((row) => row.id));
    for (const id of known) if (!have.has(id)) missing.push(`layer ${id}`);
    for (const item of missing) console.warn(`[gx self-test] missing ${item}`);
    return missing;
  },

  destroy() {
    for (const off of this._offs.splice(0)) {
      try {
        off();
      } catch {
        /* already gone */
      }
    }
  },
};
engine.whenReady = new Promise((resolve) => {
  engine._resolveReady = resolve;
});

// How far back to stand so the whole place fits: most of the diagonal of its bounding box.
function rangeForPlace(place) {
  const box = place.viewport;
  if (!box?.southwest || !box?.northeast) return 30000;
  const rad = Math.PI / 180;
  const lat1 = box.southwest.lat * rad;
  const lat2 = box.northeast.lat * rad;
  const dLat = lat2 - lat1;
  const dLon = (box.northeast.lng - box.southwest.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const diagonal = 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
  return clamp(diagonal * 0.9, 1500, 6000000);
}

function waitFor(test, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      const value = test();
      if (value) return resolve(value);
      if (performance.now() - started > timeoutMs) return reject(new Error('timed out waiting for the engine'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

// Wait for the engine before an action, with a note if it is still starting.
async function ready() {
  if (!state.engineReady) toast('Waking the globe. One moment.');
  await engine.whenReady;
}

// One place to change the look, so the bar, the keys and saved prefs stay in step.
function setLook(style) {
  const result = engine.setLook(style);
  if (result.ok) {
    store.setPrefs({ look: style });
    document.documentElement.dataset.gxLook = style;
    refreshDock();
  }
  return result;
}

/* ============================== KEY GUARD ============================== */

function installKeyGuard() {
  const BLOCK_ON_GLOBE = new Set(['v', 'f', 'h', 'c', 'd', 'o', '`']);
  const guard = (event) => {
    if (state.mode === 'console') return;
    if (event.target instanceof Element && event.target.closest('#key-setup')) return;
    if ((event.key === 'Escape' || event.key === 'Tab' || event.key === 'Enter') && stockDialogOpen()) return;
    const inShell = event.target instanceof Element && Boolean(event.target.closest('#gx'));
    if (state.screen !== 'globe' || inShell) {
      if (event.type === 'keydown') shellKey(event);
      event.stopImmediatePropagation();
      return;
    }
    const key = String(event.key || '').toLowerCase();
    const isSpace = event.code === 'Space' || event.key === ' ';
    if (event.type === 'keydown' && event.key === 'Escape' && closeTransient()) {
      event.stopImmediatePropagation();
      return;
    }
    // The engine's own 1 to 7 keys apply presets that switch the HUD on. We take them over.
    if (LOOK_KEYS[key]) {
      event.stopImmediatePropagation();
      if (event.type === 'keydown' && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey && state.engineReady) setLook(LOOK_KEYS[key]);
      return;
    }
    if (BLOCK_ON_GLOBE.has(key) || (isSpace && !state.voiceAllowed)) event.stopImmediatePropagation();
  };
  on(window, 'keydown', guard, true);
  on(window, 'keyup', guard, true);
}

function stockDialogOpen() {
  const dialog = $('#key-setup');
  return Boolean(dialog) && getComputedStyle(dialog).display !== 'none';
}

function closeTransient() {
  if (state.viewer) {
    closeViewer();
    return true;
  }
  if (state.menu) {
    closeMenu({ refocus: true });
    return true;
  }
  if (state.layersOpen && state.screen === 'globe') {
    toggleLayers(false);
    return true;
  }
  return false;
}

function shellKey(event) {
  const typing = event.target instanceof Element && event.target.matches('input, textarea, select, [contenteditable]');
  if (event.key === 'Escape') {
    if (closeTransient()) event.preventDefault();
    else if (typing) event.target.blur();
    return;
  }
  if (state.menu && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    const items = $$('#gx .gx-menu .gx-menu-item:not([disabled])');
    if (items.length) {
      event.preventDefault();
      const at = items.indexOf(document.activeElement);
      const next = event.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next].focus();
    }
    return;
  }
  if (event.key === '/' && !typing && !state.viewer) {
    const field = $('#gx .gx-screen:not([hidden]):not(.gx-leaving) [data-gx-search]');
    if (field) {
      event.preventDefault();
      field.focus();
    }
  }
}

/* ============================== ROUTER ============================== */

function setConsole(enabled, panelId = null, { auto = false } = {}) {
  const root = document.documentElement;
  state.mode = enabled ? 'console' : 'simple';
  state.consoleAuto = enabled && auto;
  root.classList.toggle('gx-console', enabled);
  root.classList.toggle('gx-simple', !enabled);
  if (enabled) {
    closeTransient();
    engine.showSun(true);
    if (!auto && narrow()) toast('The full console is built for wide windows. Widen this one if panels overlap.', { ms: 5200 });
    if (state.screen !== 'globe') go('globe');
    engine.render('full');
    engine.spin('off', { remember: false });
    window.dispatchEvent(new Event('resize'));
    if (panelId) engine.run('set_panel_open', { panelId, open: true });
  } else {
    engine.assertSimple();
    go(state.screen, { push: false });
  }
}

function go(screen, { push = true, params = {} } = {}) {
  const next = SCREENS.includes(screen) ? screen : 'home';
  const previous = state.screen;
  if (state.viewer) closeViewer();
  closeMenu();
  state.screen = next;
  state.params = params;
  const root = document.documentElement;
  const gx = $('#gx');
  if (!gx) return;
  root.dataset.gxScreen = next;
  if (next !== 'home') root.removeAttribute('data-gx-herooff');
  requestAnimationFrame(placeHomeCredits);
  if (GLOBE_SCREENS.has(next)) delete root.dataset.gxSolid;
  else root.dataset.gxSolid = '1';
  gx.dataset.screen = next;
  try {
    sessionStorage.setItem(KEY.screen, next);
  } catch {
    /* private mode */
  }
  if (push) {
    const url = new URL(location.href);
    if (next === 'landing') url.searchParams.delete('s');
    else url.searchParams.set('s', next);
    history.pushState(null, '', url.pathname + url.search + url.hash);
  }
  const landing = $('.gx-landing', gx);
  if (next === 'landing') {
    landing.hidden = false;
    landing.classList.remove('gx-leaving');
  } else if (previous === 'landing' && !landing.hidden) {
    if (!store.prefs().landing_seen) store.setPrefs({ landing_seen: true });
    landing.classList.add('gx-leaving');
    setTimeout(() => {
      if (state.screen !== 'landing') landing.hidden = true;
    }, reducedMotion() ? 0 : 900);
  } else {
    landing.hidden = true;
  }
  const calm = reducedMotion();
  // Home and Globe show the same live globe, so one fades off it while the other arrives.
  const crossfade = !calm && ((previous === 'home' && next === 'globe') || (previous === 'globe' && next === 'home'));
  for (const section of $$('.gx-screen', gx)) {
    const id = section.dataset.gxScreen;
    const active = id === next;
    if (crossfade && id === previous && !section.hidden) {
      section.inert = true;
      section.classList.add('gx-leaving');
      setTimeout(() => {
        section.classList.remove('gx-leaving');
        if (state.screen !== id) section.hidden = true;
      }, 200);
      continue;
    }
    section.classList.remove('gx-leaving');
    section.hidden = !active;
    section.inert = !active;
    if (active) {
      renderScreen(section, next);
      if (previous !== next && next !== 'globe') section.scrollTop = 0;
      if (previous !== next && !calm && (crossfade || next === 'globe' || section.classList.contains('gx-screen-solid'))) {
        section.classList.remove('gx-enter');
        void section.offsetWidth; // restart the entrance
        section.classList.add('gx-enter');
      }
    }
  }
  for (const item of $$('.gx-rail-item', gx)) {
    if (item.dataset.gxGo === next) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  if (state.engineReady) onScreenEnter(next, previous);
}

function onScreenEnter(next, previous) {
  engine.render(RENDER_POLICY[next] || 'paused');
  const prefs = store.prefs();
  if (next === 'landing' || next === 'home') {
    engine.spin(prefs.spin_rate || 'normal', { remember: false });
    // Home and landing show the whole Earth. Come back out if the globe was left somewhere close.
    const camera = engine.sm.getCameraState();
    const tracked = Boolean(engine.viewer.trackedEntity);
    const target = next === 'landing' ? landingAltitude() : BOOT_VIEW.alt;
    if (!tracked && (previous === 'landing' || previous === null || camera.alt < 6000000 || next === 'landing')) {
      engine.flyCamera({ lat: clamp(camera.lat, -55, 55), lon: camera.lon, alt: target, heading: 0, pitch: -90, roll: 0 }, 2.2);
    }
  } else if (next === 'globe') {
    refreshGlobe();
  }
}

// The far opening of the tunnel is about 42 percent of the viewport. Pick an altitude that fits the Earth in it.
function landingAltitude() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const halfFovLarger = Math.tan(Math.PI / 6); // Cesium applies its 60 degree field of view to the larger side
  const halfFovSmaller = halfFovLarger * (Math.min(w, h) / Math.max(w, h));
  const tanAlpha = (narrow() ? 0.43 : 0.34) * halfFovSmaller;
  const distance = 6371000 / Math.sin(Math.atan(tanAlpha));
  return clamp(distance - 6371000, 22000000, 60000000);
}

/* ============================== SCREENS ============================== */

function renderScreen(section, id) {
  const build = { home: buildHome, explore: buildExplore, globe: buildGlobe, cameras: buildCameras, radio: buildRadio, saved: buildSaved, settings: buildSettings, more: buildMore }[id];
  if (!build) return;
  if (!section.dataset.gxBuilt) {
    section.dataset.gxBuilt = '1';
    build(section);
  } else if (id === 'saved') renderSaved(section);
  else if (id === 'settings') renderSettings(section);
  else if (id === 'explore' && state.params.q != null) {
    state.exploreQuery = state.params.q;
    const field = $('[data-gx-search]', section);
    if (field) field.value = state.exploreQuery;
    renderExplore(section, { lookup: true });
  }
}

// placeholder: [wide, narrow]. label is what a screen reader hears. submit false gives a live filter with no button.
const searchForm = (name, { placeholder, label, value = '', small = false, submit = true }) => {
  const hint = narrow() ? placeholder[1] : placeholder[0];
  const button = !submit ? '' : `<button class="gx-btn gx-btn-accent gx-btn-sm" type="submit" aria-label="${small ? 'Go' : 'Search'}">${small ? icon('arrow') : 'Search'}</button>`;
  return `
  <form class="gx-search${small ? ' gx-search-sm' : ''}" data-gx-form="${name}" role="search">
    ${icon('search')}
    <input class="gx-input" type="search" name="q" data-gx-search autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="${esc(label)}" placeholder="${esc(hint)}" value="${esc(value)}">
    ${button}
  </form>`;
};

/* ---- Home ---- */

function buildHome(section) {
  section.innerHTML = `
    <div class="gx-hero" data-gx-hero>
      <h1 class="gx-hero-h">The live planet</h1>
      ${searchForm('home', { placeholder: ['Search a place, camera or station', 'Search the planet'], label: 'Search places, cameras and stations' })}
      <div class="gx-tools" data-gx-tools>${skeletonTools()}</div>
      <div class="gx-stats" data-gx-stats></div>
    </div>
    <div class="gx-body"><div class="gx-wrap">
      <div class="gx-sechead" style="margin-top:0"><h2 class="gx-h2">Featured views</h2><button class="gx-linkbtn" type="button" data-gx-go="explore">See everything</button></div>
      <div class="gx-grid gx-grid-tall" data-gx-featured>${skeletons(8)}</div>
      <div class="gx-sechead"><h2 class="gx-h2">Live around the globe</h2></div>
      <div data-gx-homechips></div>
      <div class="gx-grid" data-gx-live>${skeletons(8)}</div>
      <div class="gx-foot">
        <span>Engine: gods-eye-view by Bilawal Sidhu, MIT licence.</span>
        <span>All feeds are public sources. Credits sit under Data attribution on the globe.</span>
      </div>
    </div></div>`;
  data.catalog().then((catalog) => {
    const drawTools = (keys) => {
      const usable = (catalog.tools || []).filter((card) => {
        const need = card.action?.payload?.needsKey;
        return !need || !keys || keys.get(need) !== false;
      });
      const more = usable.find((card) => card.id === 'tool-more');
      const row = [...usable.filter((card) => card !== more).slice(0, 7), more].filter(Boolean);
      const host = $('[data-gx-tools]', section);
      if (!host) return;
      host.innerHTML = row.map((card) => {
        registerCard(card);
        return `<button class="gx-tool" type="button" data-gx-card="${esc(card.id)}"><span class="gx-tool-dot">${icon(card.icon)}</span><span>${esc(card.title)}</span></button>`;
      }).join('');
    };
    data.setup().then((setup) => drawTools(new Map((setup.keys || []).map((key) => [key.id, Boolean(key.set)])))).catch(() => drawTools(null));
    const featured = $('[data-gx-featured]', section);
    featured.innerHTML = (catalog.featured || []).map(cardHTML).join('');
    wireImages(featured);
  }).catch(() => {
    $('[data-gx-featured]', section).innerHTML = emptyHTML('Could not load the featured views.', 'Try again', 'reload-home');
  });
  renderHomeLive(section);
  // Pause drawing when the globe is scrolled out of sight.
  const hero = $('[data-gx-hero]', section);
  const observer = new IntersectionObserver(([entry]) => {
    if (state.screen !== 'home') return;
    document.documentElement.toggleAttribute('data-gx-herooff', !entry.isIntersecting);
    if (state.engineReady) engine.render(entry.isIntersecting ? 'half' : 'paused');
  }, { root: section, threshold: 0 });
  observer.observe(hero);
  cleanups.push(() => observer.disconnect());
  let ticking = false;
  on(section, 'scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      placeHomeCredits();
    });
  }, { passive: true });
  on(window, 'resize', placeHomeCredits);
  placeHomeCredits();
}

// On Home the credit chip sits just above the foot of the hero, like a caption for the globe.
// Set on the credit element itself (a child of body), never on the globe container.
function placeHomeCredits() {
  const credits = $('#cesium-credits');
  if (!credits) return;
  const hero = $('#gx .gx-screen[data-gx-screen="home"] [data-gx-hero]');
  if (state.screen !== 'home' || !hero) {
    credits.style.removeProperty('top');
    return;
  }
  const foot = hero.getBoundingClientRect().bottom;
  const height = credits.offsetHeight || 28;
  credits.style.setProperty('top', `${Math.round(clamp(foot - height - 14, 10, window.innerHeight - height - 10))}px`, 'important');
}
const skeletonTools = () => Array.from({ length: 8 }, () => '<span class="gx-tool"><span class="gx-tool-dot"></span><span class="gx-dim">&nbsp;</span></span>').join('');
// A compact row for a place or landmark: pin, name, where, arrow.
function linkRowHTML(card) {
  registerCard(card);
  return `<button class="gx-srow" type="button" data-kind="${esc(card.kind)}" data-gx-card="${esc(card.id)}">
    <span class="gx-srow-play">${icon(card.icon || KIND_ICON[card.kind] || 'pin')}</span>
    <span class="gx-srow-main"><span class="gx-srow-name">${esc(card.title)}</span>${card.subtitle ? `<span class="gx-srow-sub">${esc(card.subtitle)}</span>` : ''}</span>
    <span class="gx-srow-go">${icon('arrow')}</span>
  </button>`;
}
function stationRowHTML(s) {
  const card = registerCard(stationCard(s));
  const playing = state.player?.id === s.id;
  const sub = [s.country, s.tags.slice(0, 2).join(', '), 'via Radio Browser'].filter(Boolean).join(' · ');
  const meta = [s.bitrate ? `${s.bitrate}k` : '', s.codec || ''].filter(Boolean).join(' ');
  return `<button class="gx-srow" type="button" data-kind="station" data-gx-card="${esc(card.id)}"${playing ? ' data-playing' : ''}>
    <span class="gx-srow-play">${icon(playing ? 'pause' : 'play')}</span>
    <span class="gx-srow-main"><span class="gx-srow-name">${esc(s.name)}</span><span class="gx-srow-sub">${esc(sub)}</span></span>
    ${meta ? `<span class="gx-srow-meta">${esc(meta)}</span>` : ''}
  </button>`;
}
const emptyHTML = (text, action = '', act = '') =>
  `<div class="gx-empty" style="grid-column:1/-1"><span>${esc(text)}</span>${action ? `<button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="${act}">${esc(action)}</button>` : ''}</div>`;

const homeLive = { started: false, pending: 0, counts: {}, sets: { cameras: [], radio: [], space: [ISS_CARD], quakes: [], places: [] } };
const HOME_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'cameras', label: 'Cameras' }, { id: 'radio', label: 'Radio' },
  { id: 'space', label: 'Space' }, { id: 'quakes', label: 'Quakes' }, { id: 'places', label: 'Places' },
];

function startHomeLive() {
  if (homeLive.started) return;
  homeLive.started = true;
  const startedAt = performance.now();
  let late = 0;
  const redraw = () => {
    const section = $('#gx .gx-screen[data-gx-screen="home"]');
    if (!section?.dataset.gxBuilt) return;
    // Cards that jump as each feed lands look broken. Wait for all of them, or 1.5 s, then draw.
    if (homeLive.pending && performance.now() - startedAt < 1500) {
      clearTimeout(late);
      late = setTimeout(redraw, 1500 - (performance.now() - startedAt) + 20);
      return;
    }
    drawHomeLive(section);
  };
  const load = (promise, apply) => {
    homeLive.pending += 1;
    promise.then(apply).catch(() => {}).finally(() => {
      homeLive.pending -= 1;
      redraw();
    });
  };
  load(data.cameras(), (cams) => {
    homeLive.counts.cameras = cams.length;
    homeLive.sets.cameras = spread(cams.filter((c) => !c.video), (c) => c.pack, 12).map(cameraCard);
  });
  load(data.stations(), (stations) => {
    homeLive.counts.stations = stations.length;
    homeLive.sets.radio = spread(stations, (s) => s.code || s.country, 12).map(stationCard);
  });
  load(data.quakes(), (quakes) => {
    homeLive.counts.quakes = quakes.length;
    homeLive.sets.quakes = quakes.slice(0, 8).map(quakeCard);
  });
  load(data.launches(), (launches) => {
    homeLive.counts.launches = launches.length;
    const upcoming = launches.filter((l) => Date.parse(l.net) > Date.now()).sort((a, b) => Date.parse(a.net) - Date.parse(b.net));
    homeLive.sets.space = [ISS_CARD, ...(upcoming.length ? upcoming : launches).slice(0, 7).map(launchCard)];
  });
  load(data.landmarks(), (landmarks) => {
    homeLive.sets.places = spread(landmarks, (m) => m.cityId, 12).map(landmarkCard);
  });
}

function homeMix() {
  const all = [];
  const order = [['cameras', 3], ['radio', 2], ['space', 1], ['quakes', 1], ['places', 1]];
  for (let round = 0; all.length < 16 && round < 4; round += 1) {
    for (const [key, take] of order) all.push(...homeLive.sets[key].slice(round * take, round * take + take));
  }
  return all.slice(0, 16);
}

function drawHomeLive(section) {
  const grid = $('[data-gx-live]', section);
  const chipHost = $('[data-gx-homechips]', section);
  if (!grid || !chipHost) return;
  if (!chipHost.dataset.gxChip || chipHost.dataset.gxChip !== state.homeChip) {
    chipHost.dataset.gxChip = state.homeChip;
    chipHost.innerHTML = chipsHTML('home', HOME_CHIPS, state.homeChip);
  }
  const cards = state.homeChip === 'all' ? homeMix() : homeLive.sets[state.homeChip] || [];
  const signature = `${state.homeChip}:${cards.map((card) => card.id).join(',')}`;
  if (grid.dataset.gxSig !== signature) {
    grid.dataset.gxSig = signature;
    grid.innerHTML = cards.length ? cards.map(cardHTML).join('') : homeLive.pending ? skeletons(8) : emptyHTML('Nothing live in this group right now.', 'Try again', 'reload-home');
    wireImages(grid);
  }
  const stats = $('[data-gx-stats]', section);
  if (stats) {
    const c = homeLive.counts;
    const bits = [];
    // The words in <i> drop away on a narrow window, so the four counts sit two by two.
    if (c.cameras) bits.push(`<span><b data-gx-count="${c.cameras}">${num(c.cameras)}</b>&nbsp;<i>live </i>cameras</span>`);
    if (c.stations) bits.push(`<span><b data-gx-count="${c.stations}">${num(c.stations)}</b>&nbsp;<i>radio </i>stations</span>`);
    if (c.quakes) bits.push(`<span><b data-gx-count="${c.quakes}">${num(c.quakes)}</b>&nbsp;quakes today</span>`);
    if (c.launches) bits.push(`<span><b data-gx-count="${c.launches}">${num(c.launches)}</b>&nbsp;launches <i>in the last 30 days</i></span>`);
    const html = bits.join('');
    if (stats.dataset.gxHtml !== html) {
      stats.dataset.gxHtml = html;
      stats.innerHTML = html;
      for (const node of $$('[data-gx-count]', stats)) countUp(node);
    }
  }
}

// Numbers that have not been shown yet climb to their value once. Reduced motion shows them at once.
const counted = new Set();
function countUp(node) {
  const target = Number(node.dataset.gxCount);
  const key = `${target}`;
  if (!Number.isFinite(target) || counted.has(key) || reducedMotion()) return;
  counted.add(key);
  const started = performance.now();
  const step = (now) => {
    if (!node.isConnected) return;
    const t = Math.min(1, (now - started) / 900);
    node.textContent = num(Math.round(target * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderHomeLive(section) {
  startHomeLive();
  const chipHost = $('[data-gx-homechips]', section);
  if (chipHost && !chipHost.dataset.gxChip) {
    chipHost.dataset.gxChip = state.homeChip;
    chipHost.innerHTML = chipsHTML('home', HOME_CHIPS, state.homeChip);
  }
  if (!homeLive.pending || $('[data-gx-live] .gx-card', section)) drawHomeLive(section);
}

/* ---- Explore ---- */

function buildExplore(section) {
  state.exploreQuery = state.params.q ?? state.exploreQuery;
  section.innerHTML = `<div class="gx-wrap">
    <div class="gx-pagehead">
      <h1 class="gx-h1">Explore</h1>
      <p class="gx-lede">One search across places, cameras, radio, landmarks and views. Press Enter to look up a place.</p>
      ${searchForm('explore', { placeholder: ['Try Sydney, London, news, bridge', 'Try Sydney'], label: 'Search everything', value: state.exploreQuery })}
    </div>
    <div data-gx-explorechips></div>
    <div data-gx-exploreout><div class="gx-grid">${skeletons(8)}</div></div>
  </div>`;
  renderExplore(section, { lookup: Boolean(state.exploreQuery) });
}

function matcher(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return (text) => {
    const hay = String(text || '').toLowerCase();
    return tokens.every((token) => hay.includes(token));
  };
}

let exploreRun = 0;
async function renderExplore(section, { lookup = false, typing = false } = {}) {
  const run = ++exploreRun;
  const out = $('[data-gx-exploreout]', section);
  const chipHost = $('[data-gx-explorechips]', section);
  const query = state.exploreQuery.trim();
  const [catalog, cams, stations, landmarks] = await Promise.all([
    data.catalog().catch(() => ({ featured: [] })), data.cameras().catch(() => []), data.stations().catch(() => []), data.landmarks().catch(() => []),
  ]);
  if (run !== exploreRun) return;
  const hit = query ? matcher(query) : () => true;
  const layerCards = state.engineReady
    ? engine.layers().filter((row) => row.showInTogglePanel !== false).map((row) => ({
        id: `ly-${row.id}`, kind: 'tool', title: layerName(row), subtitle: 'Layer on the globe', badge: '', live: false, image: null,
        icon: LAYER_ICON[row.id] || 'layers', action: { type: 'layer', payload: { ids: [row.id], needsKey: keyFor(row) } },
      }))
    : [];
  const groups = {
    places: [],
    views: (catalog.featured || []).filter((card) => hit(`${card.title} ${card.subtitle}`)),
    landmarks: spread(landmarks.filter((m) => hit(`${m.name} ${m.city}`)), (m) => m.cityId, landmarks.length).map(landmarkCard),
    cameras: cams.filter((c) => hit(`${c.name} ${c.region} ${c.provider}`)).map(cameraCard),
    radio: stations.filter((s) => hit(`${s.name} ${s.country} ${s.tags.join(' ')}`)),
    layers: query ? layerCards.filter((card) => hit(card.title)) : [],
  };
  if (query && lookup && state.engineReady) {
    try {
      const found = await engine.geocode(query);
      if (run !== exploreRun) return;
      if (found?.place) {
        const place = found.place;
        groups.places.push({
          id: `pl-${place.lat.toFixed(4)}-${place.lng.toFixed(4)}`, kind: 'place', title: place.name || place.label || query, subtitle: place.label && place.label !== place.name ? place.label : 'Fly there',
          badge: 'PLACE', live: false, image: null, icon: 'pin', action: { type: 'place', payload: { query, lat: place.lat, lon: place.lng } },
        });
      }
    } catch {
      /* the local results still show */
    }
  }
  const chips = [
    { id: 'all', label: 'All' }, { id: 'places', label: 'Places', n: groups.places.length + groups.landmarks.length },
    { id: 'cameras', label: 'Cameras', n: groups.cameras.length }, { id: 'radio', label: 'Radio', n: groups.radio.length },
    { id: 'views', label: 'Views', n: groups.views.length },
  ];
  if (groups.layers.length) chips.push({ id: 'layers', label: 'Layers', n: groups.layers.length });
  if (!chips.some((chip) => chip.id === state.exploreChip)) state.exploreChip = 'all';
  chipHost.innerHTML = chipsHTML('explore', chips, state.exploreChip);
  const placeCards = [...groups.places, ...groups.landmarks];
  // [title, items, how many to draw, kind of block]. With no search the pictures lead; with one, the place does.
  const blocks = {
    places: ['Places', placeCards, 4, 'links'], views: ['Views', groups.views, 8, 'tall'], cameras: ['Cameras', groups.cameras, 12, 'cards'],
    radio: ['Radio', groups.radio, 8, 'rows'], layers: ['Layers', groups.layers, 8, 'cards'],
  };
  const order = query ? ['places', 'views', 'cameras', 'radio', 'layers'] : ['views', 'cameras', 'radio', 'places'];
  const picked = state.exploreChip === 'all' ? order.map((key) => blocks[key]) : [[...blocks[state.exploreChip].slice(0, 2), 48, blocks[state.exploreChip][3]]];
  const filled = picked.filter(([, items]) => items.length);
  if (!filled.length) {
    out.innerHTML = `<div class="gx-empty"><span>${query ? `Nothing matches "${esc(query)}".` : 'Nothing to show yet.'}</span><span class="gx-dim">Try a city, a road name or a kind of station.</span></div>`;
    return;
  }
  const draw = (card, index) => cardHTML(card, index, { animate: !typing });
  out.innerHTML = filled.map(([title, items, limit, kind], index) => {
    const shown = items.slice(0, limit);
    const count = shown.length < items.length ? `${num(shown.length)} of ${num(items.length)}` : num(items.length);
    const body = kind === 'rows' ? `<div class="gx-rows">${shown.map(stationRowHTML).join('')}</div>`
      : kind === 'links' ? `<div class="gx-rows">${shown.map(linkRowHTML).join('')}</div>`
        : `<div class="gx-grid${kind === 'tall' ? ' gx-grid-tall' : ''}">${shown.map(draw).join('')}</div>`;
    return `<div class="gx-sechead"${index === 0 ? ' style="margin-top:8px"' : ''}><h2 class="gx-h2">${title}</h2><span class="gx-dim gx-mono">${count}</span></div>${body}`;
  }).join('');
  wireImages(out);
}

/* ---- Cameras ---- */

function buildCameras(section) {
  section.innerHTML = `<div class="gx-wrap">
    <div class="gx-pagehead">
      <h1 class="gx-h1">Cameras</h1>
      <p class="gx-lede">Public road and city cameras. Stills are live from each provider. Tap one to watch it, then open it on the globe.</p>
    </div>
    <div data-gx-camchips></div>
    <div class="gx-grid" data-gx-camgrid>${skeletons(12)}</div>
    <div class="gx-morerow" data-gx-cammore></div>
  </div>`;
  renderCameras(section);
}

function renderCameras(section) {
  const grid = $('[data-gx-camgrid]', section);
  data.cameras().then((cams) => {
    const counts = new Map();
    for (const cam of cams) counts.set(cam.region, (counts.get(cam.region) || 0) + 1);
    let chips = [{ id: 'all', label: 'All regions', n: cams.length }, ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([region, n]) => ({ id: region, label: region, n }))];
    if (!chips.some((chip) => chip.id === state.cameraRegion)) state.cameraRegion = 'all';
    // A narrow window shows five regions and a chip that opens the rest, so the pictures start higher up.
    if (narrow() && !state.cameraChipsAll && chips.length > 6) {
      const keep = chips.slice(0, 5);
      const active = chips.find((chip) => chip.id === state.cameraRegion);
      if (active && !keep.includes(active)) keep.push(active);
      chips = [...keep, { id: '__more', label: 'More regions' }];
    }
    $('[data-gx-camchips]', section).innerHTML = chipsHTML('cameras', chips, state.cameraRegion);
    const list = state.cameraRegion === 'all' ? spread(cams, (c) => c.pack, cams.length) : cams.filter((c) => c.region === state.cameraRegion);
    state.cameraList = list.map((c) => c.id);
    const shown = list.slice(0, state.cameraShown);
    const already = grid.dataset.gxSig === state.cameraRegion ? $$('.gx-card', grid).length : 0;
    if (already && already < shown.length) grid.insertAdjacentHTML('beforeend', shown.slice(already).map((c, i) => cardHTML(cameraCard(c), i)).join(''));
    else if (!already || already > shown.length) grid.innerHTML = shown.map((c, i) => cardHTML(cameraCard(c), i % PAGE)).join('');
    grid.dataset.gxSig = state.cameraRegion;
    wireImages(grid);
    $('[data-gx-cammore]', section).innerHTML = list.length > shown.length
      ? `<button class="gx-btn gx-btn-ghost" type="button" data-gx-act="cam-more">Show more<span class="gx-n gx-mono gx-dim">${num(list.length - shown.length)} left</span></button>` : '';
  }).catch(() => {
    grid.innerHTML = emptyHTML('Could not load the cameras.', 'Try again', 'reload-cameras');
  });
}

/* ---- Radio ---- */

function buildRadio(section) {
  section.innerHTML = `<div class="gx-wrap">
    <div class="gx-pagehead">
      <h1 class="gx-h1">Radio</h1>
      <p class="gx-lede">Stations broadcasting right now, from the Radio Browser directory. Tap one to listen. It keeps playing while you move around.</p>
      ${searchForm('radio', { placeholder: ['Filter by name, country or style', 'Filter stations'], label: 'Filter stations', value: state.radioFilter, small: true, submit: false })}
    </div>
    <div data-gx-radiochips></div>
    <div class="gx-rows" data-gx-radiogrid>${Array.from({ length: 10 }, () => '<div class="gx-skel" style="aspect-ratio:auto;height:60px"></div>').join('')}</div>
    <div class="gx-morerow" data-gx-radiomore></div>
  </div>`;
  renderRadio(section);
}

function renderRadio(section) {
  const grid = $('[data-gx-radiogrid]', section);
  data.stations().then((stations) => {
    const counts = new Map();
    for (const s of stations) {
      const cat = stationCat(s);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const chips = RADIO_CATS.filter((cat) => cat.id === 'all' || counts.get(cat.id)).map((cat) => ({ id: cat.id, label: cat.label, n: cat.id === 'all' ? stations.length : counts.get(cat.id) }));
    $('[data-gx-radiochips]', section).innerHTML = chipsHTML('radio', chips, state.radioCat);
    const hit = state.radioFilter.trim() ? matcher(state.radioFilter) : () => true;
    const list = stations.filter((s) => (state.radioCat === 'all' || stationCat(s) === state.radioCat) && hit(`${s.name} ${s.country} ${s.tags.join(' ')}`));
    const shown = list.slice(0, state.radioShown);
    // "Show more" adds to the list. Only a new filter or category redraws it.
    const signature = `${state.radioCat}|${state.radioFilter.trim().toLowerCase()}`;
    const already = grid.dataset.gxSig === signature ? $$('.gx-srow', grid).length : 0;
    if (already && already < shown.length) grid.insertAdjacentHTML('beforeend', shown.slice(already).map(stationRowHTML).join(''));
    else if (!already || already > shown.length) grid.innerHTML = shown.length ? shown.map(stationRowHTML).join('') : emptyHTML('No station matches that.');
    grid.dataset.gxSig = signature;
    $('[data-gx-radiomore]', section).innerHTML = list.length > shown.length
      ? `<button class="gx-btn gx-btn-ghost" type="button" data-gx-act="radio-more">Show more<span class="gx-n gx-mono gx-dim">${num(list.length - shown.length)} left</span></button>` : '';
  }).catch(() => {
    grid.innerHTML = emptyHTML('Could not load the stations.', 'Try again', 'reload-radio');
  });
}

/* ---- Saved ---- */

function buildSaved(section) {
  section.innerHTML = `<div class="gx-wrap">
    <div class="gx-pagehead">
      <h1 class="gx-h1">Saved</h1>
      <p class="gx-lede">Views you saved from the globe: where you were, what was switched on, and the look. They live on this computer.</p>
    </div>
    <div data-gx-savedout></div>
  </div>`;
  renderSaved(section);
}

function renderSaved(section) {
  const out = $('[data-gx-savedout]', section);
  if (!out) return;
  const rows = store.saved();
  if (!rows.length) {
    out.innerHTML = `<div class="gx-emptywrap"><div class="gx-grid" aria-hidden="true">${Array.from({ length: 4 }, () => '<div class="gx-ghost"></div>').join('')}</div>
      <div class="gx-empty gx-empty-over"><span>Nothing saved yet.</span><span class="gx-dim">Open the globe, find a view you like, then press Save.</span><button class="gx-btn gx-btn-accent gx-btn-sm" type="button" data-gx-go="globe">Open the globe</button></div></div>`;
    return;
  }
  out.innerHTML = `<div class="gx-grid">${rows.map((row, index) => {
    const card = { id: `saved-${row.id}`, kind: 'view', title: row.title, subtitle: savedSub(row), badge: '', live: false, image: row.thumb || null, icon: 'saved', action: { type: 'view', payload: row.view } };
    return `<div class="gx-savedcard">${cardHTML(card, index)}
      <input class="gx-input gx-rename" type="text" maxlength="60" aria-label="Name of this saved view" data-gx-rename="${esc(row.id)}" value="${esc(row.title)}">
      <div class="gx-savedrow"><span class="gx-dim gx-mono" style="font-size:11px">${esc(String(row.created_at).slice(0, 10))}</span><button class="gx-linkbtn" type="button" data-gx-act="saved-remove" data-id="${esc(row.id)}">Remove</button></div>
    </div>`;
  }).join('')}</div>`;
  wireImages(out);
}
function savedSub(row) {
  const layers = row.view?.layers?.length || 0;
  const look = LOOKS.find((l) => l.id === row.view?.style)?.label || 'Normal';
  return `${layers} layer${layers === 1 ? '' : 's'} · ${look}`;
}

/* ---- Settings ---- */

function buildSettings(section) {
  section.innerHTML = `<div class="gx-wrap">
    <div class="gx-pagehead">
      <h1 class="gx-h1">Settings</h1>
      <p class="gx-lede">Everything runs with no keys. Free keys switch on more feeds. Paid keys stay off unless you add them yourself.</p>
    </div>
    <div data-gx-settingsout><div class="gx-list">${Array.from({ length: 4 }, () => '<div class="gx-skel" style="aspect-ratio:auto;height:96px"></div>').join('')}</div></div>
  </div>`;
  renderSettings(section);
}

const KEY_NOTE = {
  'google-maps': '3D cities straight from Google. Paid after the first 1,000 sessions a month, and camera stills can then bill through Street View.',
  openai: 'Voice control. Paid, a few cents a minute of talking.',
  aisstream: 'Live ships around the world. Free sign-up.',
  firms: 'Active fires seen by NASA satellites. Free sign-up.',
  tomtom: 'Real traffic flow in place of the simulation. Free sign-up, no card.',
  'cesium-ion': '3D cities and aerial maps. Free sign-up, no card. 1,000 sessions a month, personal use.',
  opensky: 'More frequent flight updates. Free sign-up.',
  'launch-library': 'More launch updates each hour. Free token.',
};
const KEY_ICON = { 'google-maps': 'map', openai: 'mic', aisstream: 'ship', firms: 'quake', tomtom: 'pin', 'cesium-ion': 'globe', opensky: 'plane', 'launch-library': 'rocket' };

function renderSettings(section) {
  const out = $('[data-gx-settingsout]', section);
  if (!out) return;
  const prefs = store.prefs();
  const seg = (group, items, active) => `<div class="gx-seg">${items.map(([id, label]) => `<button class="gx-chip" type="button" data-gx-chip="${group}" data-value="${id}" aria-pressed="${id === active}">${label}</button>`).join('')}</div>`;
  const prefsHTML = `
    <div class="gx-sechead"><h2 class="gx-h2">This computer</h2></div>
    <div class="gx-list">
      <div class="gx-item"><span class="gx-item-ico">${icon('spin')}</span><div class="gx-item-main"><span class="gx-item-title">Globe spin</span><span class="gx-item-sub">How fast the Earth turns on Home and when you press Spin.</span><div class="gx-item-actions">${seg('pref-spin', [['slow', 'Slow'], ['normal', 'Steady'], ['fast', 'Fast']], prefs.spin_rate)}</div></div></div>
      <div class="gx-item"><span class="gx-item-ico">${icon('look')}</span><div class="gx-item-main"><span class="gx-item-title">Motion</span><span class="gx-item-sub">Reduced motion stops the tunnel and the spin. Fades stay.</span><div class="gx-item-actions">${seg('pref-motion', [['full', 'Full'], ['reduced', 'Reduced']], prefs.reduced_motion ? 'reduced' : 'full')}</div></div></div>
    </div>`;
  const about = `
    <div class="gx-sechead"><h2 class="gx-h2">About</h2></div>
    <div class="gx-list">
      <div class="gx-item"><span class="gx-item-ico">${icon('eye')}</span><div class="gx-item-main"><span class="gx-item-title">${esc(GX_NAME)} <span class="gx-tag gx-mono">v${GX_VERSION}</span></span><span class="gx-item-sub">Engine: gods-eye-view by Bilawal Sidhu, MIT licence. ${esc(GX_NAME)} is a separate interface and is not affiliated with the original project.</span></div></div>
      <div class="gx-item"><span class="gx-item-ico">${icon('globe')}</span><div class="gx-item-main"><span class="gx-item-title">Data credits</span><span class="gx-item-sub">Every feed is a public source. The full list opens from Data attribution on the globe.</span><div class="gx-item-actions"><button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="credits">Show credits</button></div></div></div>
    </div>`;
  data.setup().then((setup) => {
    const keys = setup.keys || [];
    const keyHTML = keys.map((key) => {
      const paid = key.tier === 'metered';
      const tag = key.set ? '<span class="gx-tag" data-tone="live">On</span>' : paid ? '<span class="gx-tag" data-tone="warn">Paid, off</span>' : '<span class="gx-tag">Free, not added</span>';
      return `<div class="gx-item"><span class="gx-item-ico">${icon(KEY_ICON[key.id] || 'key')}</span><div class="gx-item-main">
        <span class="gx-item-title">${esc(KEY_NAME[key.id] || 'Another key')} ${tag}</span>
        <span class="gx-item-sub">${esc(KEY_NOTE[key.id] || 'Add it in the key screen.')}</span>
      </div></div>`;
    }).join('');
    out.innerHTML = `
      <div class="gx-sechead" style="margin-top:8px"><h2 class="gx-h2">Keys</h2><button class="gx-btn gx-btn-accent gx-btn-sm" type="button" data-gx-act="keys">${icon('key')}Add or change a key</button></div>
      <div class="gx-list">${keyHTML}</div>${prefsHTML}${about}`;
  }).catch(() => {
    out.innerHTML = `<div class="gx-empty"><span>The key screen only works on this computer's local server.</span></div>${prefsHTML}${about}`;
  });
}
const KEY_NAME = {
  'google-maps': 'Google Maps', openai: 'OpenAI', aisstream: 'AISStream', firms: 'NASA FIRMS', tomtom: 'TomTom',
  'cesium-ion': 'Cesium ion', opensky: 'OpenSky', 'launch-library': 'Launch Library 2',
};

/* ---- More ---- */

const MORE_TOOLS = [
  { title: 'Cockpit view', sub: 'Ride along with a plane. Follow one on the globe first, then press Cockpit.', icon: 'plane', act: 'more-cockpit' },
  { title: 'Scene director', sub: 'Build and play camera moves between saved shots.', icon: 'film', panel: 'scene-panel' },
  { title: 'Draw and annotate', sub: 'Pins, lines and areas on the map.', icon: 'draw', panel: 'pp-toggles' },
  { title: 'Directions', sub: 'A route between two points, then fly along it.', icon: 'arrow', panel: 'data-panel', layer: 'directions' },
  { title: 'Recent imagery', sub: 'Fresh satellite passes for a box you draw.', icon: 'globe', panel: 'data-panel', layer: 'recent-imagery' },
  { title: 'Look sliders and HUD', sub: 'Fine controls for each look, detection boxes, HUD styles.', icon: 'look', panel: 'pp-toggles' },
  { title: 'Camera calibration', sub: 'Line a camera picture up with the 3D scene.', icon: 'camera', panel: 'cctv-panel' },
  { title: 'Radio tuner and receiver', sub: 'The analogue tuner, plus a USB radio receiver if you have one.', icon: 'radio', panel: 'radio-panel' },
  { title: 'Contacts and space missions', sub: 'Who is near a plane, and what is flying in orbit.', icon: 'satellite', panel: 'global-context-panel' },
  { title: 'Voice control', sub: 'Talk to the globe. Needs a paid OpenAI key, so it is off until you add one.', icon: 'mic', act: 'more-voice' },
  { title: 'Full console', sub: "The engine's own panels, all of them, in our colours.", icon: 'console', act: 'console-on' },
];

function buildMore(section) {
  section.innerHTML = `<div class="gx-wrap">
    <div class="gx-pagehead">
      <h1 class="gx-h1">More</h1>
      <p class="gx-lede">Everything else the engine can do. Each one opens the globe with its own panel. Press Simple view to come back.</p>
    </div>
    <div data-gx-narrowonly>
      <div class="gx-list gx-list-3">
        ${[['radio', 'Radio', 'radio', 'Stations around the world.'], ['saved', 'Saved views', 'saved', 'Views you kept.'], ['settings', 'Settings and keys', 'settings', 'Keys, spin and motion.']].map(([id, label, ico, sub]) => `
          <button class="gx-item gx-item-btn" type="button" data-gx-go="${id}"><span class="gx-item-ico">${icon(ico)}</span><span class="gx-item-main"><span class="gx-item-title">${label}</span><span class="gx-item-sub">${sub}</span></span>${icon('arrow')}</button>`).join('')}
      </div>
      <div class="gx-sechead"><h2 class="gx-h2">Tools</h2><span class="gx-tag">Best on a wide window</span></div>
    </div>
    <div class="gx-list gx-list-3">${MORE_TOOLS.map((tool, index) => `
      <button class="gx-item gx-item-btn" type="button" data-gx-act="${tool.act || 'more-open'}" data-index="${index}"><span class="gx-item-ico">${icon(tool.icon)}</span><span class="gx-item-main">
        <span class="gx-item-title">${esc(tool.title)}</span><span class="gx-item-sub">${esc(tool.sub)}</span>
      </span>${icon('arrow')}</button>`).join('')}</div>
    <div class="gx-sechead"><h2 class="gx-h2">Ready-made scenes</h2></div>
    <div class="gx-list gx-list-3" data-gx-scenes><div class="gx-empty">Scenes load when the globe is ready.</div></div>
  </div>`;
  engine.whenReady.then(() => {
    const host = $('[data-gx-scenes]', section);
    let scenes = [];
    try {
      scenes = engine.sd?.listScenes?.() || [];
    } catch {
      scenes = [];
    }
    if (!host) return;
    host.innerHTML = scenes.length
      ? scenes.map((scene) => `<button class="gx-item gx-item-btn" type="button" data-gx-act="scene-play" data-id="${esc(scene.id)}"><span class="gx-item-ico">${icon('film')}</span><span class="gx-item-main"><span class="gx-item-title">${esc(scene.title || scene.id)}</span><span class="gx-item-sub">${num((scene.shots || []).length || scene.shots || 0)} shots. Plays in the full console.</span></span>${icon('play')}</button>`).join('')
      : '<div class="gx-empty">No scenes yet. Build one in the Scene director.</div>';
  });
}

/* ---- Globe ---- */

function buildGlobe(section) {
  section.innerHTML = `
    <div class="gx-gtop">
      <button class="gx-pillbtn" type="button" data-gx-act="layers-toggle" aria-expanded="false">${icon('layers')}<span>Layers</span><span class="gx-count" data-gx-layercount hidden>0</span></button>
      ${searchForm('globe', { placeholder: ['Fly to a place', 'Fly to a place'], label: 'Fly to a place', small: true })}
      <span class="gx-status" data-gx-status hidden></span>
    </div>
    <aside class="gx-panel gx-layers" data-closed aria-label="Layers">
      <div class="gx-panel-head"><span class="gx-panel-title">Layers</span><span style="display:flex;gap:2px"><button class="gx-linkbtn" type="button" data-gx-act="layers-clear" style="padding:0 8px">Clear all</button><button class="gx-iconbtn" type="button" data-gx-act="layers-toggle" aria-label="Close layers">${icon('close')}</button></span></div>
      <div class="gx-panel-body">
        <label class="gx-filter">${icon('search')}<input class="gx-input" type="search" data-gx-input="layer-filter" aria-label="Filter layers" placeholder="Filter layers" autocomplete="off"></label>
        <div data-gx-layerlist></div>
      </div>
    </aside>
    <aside class="gx-panel gx-details" data-closed aria-label="Selected"></aside>
    <div class="gx-dock" role="toolbar" aria-label="Globe controls">
      <button class="gx-dockbtn" type="button" data-gx-act="menu" data-menu="look" aria-haspopup="menu" aria-expanded="false">${icon('look')}<b>Look</b><small data-gx-docklook>Normal</small></button>
      <button class="gx-dockbtn" type="button" data-gx-act="menu" data-menu="map" aria-haspopup="menu" aria-expanded="false">${icon('map')}<b>Map</b><small data-gx-dockmap>Satellite</small></button>
      <button class="gx-dockbtn" type="button" data-gx-act="menu" data-menu="spin" aria-haspopup="menu" aria-expanded="false">${icon('spin')}<b>Spin</b><small data-gx-dockspin>Off</small></button>
      <button class="gx-dockbtn" type="button" data-gx-act="globe-reset">${icon('reset')}<b>Reset</b><small>Zoom out</small></button>
      <button class="gx-dockbtn" type="button" data-gx-act="globe-share">${icon('share')}<b>Share</b><small>Copy link</small></button>
      <button class="gx-dockbtn" type="button" data-gx-act="globe-save">${icon('saved')}<b>Save</b><small>This view</small></button>
    </div>
    <div class="gx-menu" data-closed role="menu" aria-labelledby="gx-menu-title"></div>`;
  on(window, 'resize', () => closeMenu()); // its place is worked out from the button when it opens
  // data-gx-sheet on <html> while a panel is open, so a narrow window can keep the sheet low (SOP 03).
  const panels = $$('.gx-panel', section);
  const markSheet = () => {
    if (panels.some((panel) => !panel.hasAttribute('data-closed'))) document.documentElement.dataset.gxSheet = '1';
    else delete document.documentElement.dataset.gxSheet;
  };
  const sheetWatch = new MutationObserver(markSheet);
  for (const panel of panels) sheetWatch.observe(panel, { attributes: true, attributeFilter: ['data-closed'] });
  cleanups.push(() => sheetWatch.disconnect());
  markSheet();
  refreshGlobe();
}

function refreshGlobe() {
  if (!state.engineReady) return;
  refreshDock();
  refreshLayers();
  refreshSelection();
}

function refreshDock() {
  const section = $('#gx .gx-screen[data-gx-screen="globe"]');
  if (!section || !section.dataset.gxBuilt || !state.engineReady) return;
  const style = engine.sm.getControlState().style || 'normal';
  $('[data-gx-docklook]', section).textContent = LOOKS.find((l) => l.id === style)?.label || 'Normal';
  $('[data-gx-dockmap]', section).textContent = MAP_LABEL[engine.msc.getActiveId?.()] || 'Map';
  $('[data-gx-dockspin]', section).textContent = SPIN_LABEL[engine.spinName] || 'Off';
  if (state.menu) openMenu(state.menu, { keep: true });
}

let layerTimer = 0;
function scheduleLayerRefresh() {
  if (layerTimer) return;
  layerTimer = setTimeout(() => {
    layerTimer = 0;
    if (state.screen === 'globe') refreshLayers();
  }, 120);
}

function layerMeta(row, keys) {
  const stats = row.stats || {};
  const state2 = String(row.lifecycleState || '');
  if (CONSOLE_LAYERS[row.id]) return ['Opens the full console', ''];
  if (keyFor(row) && keys && keys.get(keyFor(row)) === false) return ['Needs a free key', 'warn'];
  if (state2 === 'enabling' || stats.loading) return ['Loading', 'warn'];
  if (row.enabled && stats.error) return ['Could not load', 'warn'];
  if (row.enabled && Number.isFinite(stats.count)) return [`${num(stats.count)} live`, 'live'];
  if (row.enabled) return ['On', 'live'];
  return ['', ''];
}

function refreshLayers() {
  const section = $('#gx .gx-screen[data-gx-screen="globe"]');
  if (!section || !section.dataset.gxBuilt || !state.engineReady) return;
  const rows = engine.layers().filter((row) => row.showInTogglePanel !== false);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const onCount = rows.filter((row) => row.enabled).length;
  const count = $('[data-gx-layercount]', section);
  count.hidden = !onCount;
  count.textContent = String(onCount);
  const loading = rows.find((row) => String(row.lifecycleState) === 'enabling' || (row.enabled && row.stats?.loading));
  const status = $('[data-gx-status]', section);
  status.hidden = !loading;
  if (loading) status.textContent = `Loading ${layerName(loading).toLowerCase()}`;
  if (!state.layersOpen) return;
  const keys = state.keyMap || null;
  const hit = state.layerFilter.trim() ? matcher(state.layerFilter) : () => true;
  const seen = new Set();
  const groups = LAYER_GROUPS.map((group) => ({ title: group.title, rows: group.ids.map((id) => byId.get(id)).filter(Boolean) }));
  for (const group of groups) for (const row of group.rows) seen.add(row.id);
  const extra = rows.filter((row) => !seen.has(row.id));
  if (extra.length) groups[groups.length - 1].rows.push(...extra);
  const html = groups.map((group) => {
    const shown = group.rows.filter((row) => hit(`${layerName(row)} ${row.name}`));
    if (!shown.length) return '';
    return `<div class="gx-group">${esc(group.title)}</div>${shown.map((row) => {
      const [meta, tone] = layerMeta(row, keys);
      // A layer that opens the engine's own panel is a plain button with an arrow, not a switch.
      const opens = Boolean(CONSOLE_LAYERS[row.id]);
      return `<button class="gx-row" type="button" ${opens ? '' : `role="switch" aria-checked="${Boolean(row.enabled)}" `}data-gx-layer="${esc(row.id)}">
        ${icon(LAYER_ICON[row.id] || 'layers')}
        <span class="gx-row-main"><span class="gx-row-name">${esc(layerName(row))}</span>${meta ? `<span class="gx-row-meta" data-tone="${tone}">${esc(meta)}</span>` : ''}</span>
        ${opens ? icon('arrow') : '<span class="gx-switch"></span>'}
      </button>`;
    }).join('')}`;
  }).join('');
  $('[data-gx-layerlist]', section).innerHTML = html || '<div class="gx-empty" style="margin:8px">No layer matches that.</div>';
}

function toggleLayers(force) {
  const section = $('#gx .gx-screen[data-gx-screen="globe"]');
  if (!section) return;
  state.layersOpen = force ?? !state.layersOpen;
  const panel = $('.gx-layers', section);
  if (state.layersOpen) {
    panel.removeAttribute('data-closed');
    closeMenu();
    if (narrow()) $('.gx-details', section).setAttribute('data-closed', '');
    if (!state.keyMap) {
      data.setup().then((setup) => {
        state.keyMap = new Map((setup.keys || []).map((key) => [key.id, Boolean(key.set)]));
        refreshLayers();
      }).catch(() => {});
    }
  } else {
    panel.setAttribute('data-closed', '');
  }
  $('[data-gx-act="layers-toggle"]', section).setAttribute('aria-expanded', String(state.layersOpen));
  refreshLayers();
  refreshSelection();
}

async function onLayerRow(id) {
  if (CONSOLE_LAYERS[id]) {
    await engine.setLayer(id, true).catch(() => {});
    setConsole(true, CONSOLE_LAYERS[id]);
    return;
  }
  const row = engine.layers().find((item) => item.id === id);
  if (!row) return;
  if (!row.enabled && keyFor(row) && state.keyMap?.get(keyFor(row)) === false) {
    toast(`${layerName(row)} needs a free key.`, { action: 'Open Settings', onAction: () => go('settings') });
    return;
  }
  try {
    await engine.setLayer(id, !row.enabled);
  } catch (error) {
    toast(`Could not switch ${layerName(row)}.`);
    console.warn('[gx] layer toggle failed', error);
  }
  refreshLayers();
}

function refreshSelection() {
  const section = $('#gx .gx-screen[data-gx-screen="globe"]');
  if (!section || !section.dataset.gxBuilt || !state.engineReady) return;
  const panel = $('.gx-details', section);
  const sel = engine.readSelection();
  const hideForLayers = narrow() && state.layersOpen;
  if (!sel || hideForLayers) {
    panel.setAttribute('data-closed', '');
    state.selection = sel;
    return;
  }
  const sameThing = state.selection && state.selection.kind === sel.kind && state.selection.id === sel.id && panel.dataset.gxFor === `${sel.kind}:${sel.id}`;
  state.selection = sel;
  if (sameThing && sel.kind !== 'camera') {
    // Only the numbers change. Update them in place so the panel does not flicker.
    const speed = $('[data-gx-speed]', panel);
    if (speed) speed.textContent = sel.speed;
    const speedSub = $('[data-gx-speedsub]', panel);
    if (speedSub) speedSub.textContent = sel.speedSub;
    sel.facts.forEach(([, value, sub], index) => {
      const v = $(`[data-gx-fact="${index}"]`, panel);
      if (v) v.textContent = value;
      const s = $(`[data-gx-factsub="${index}"]`, panel);
      if (s) s.textContent = sub;
    });
    panel.removeAttribute('data-closed');
    return;
  }
  if (sameThing) {
    panel.removeAttribute('data-closed');
    return;
  }
  panel.dataset.gxFor = `${sel.kind}:${sel.id}`;
  const speedBlock = sel.speed ? `<div class="gx-kv-item" data-wide><div class="gx-kv-label">Speed</div><div class="gx-kv-value" data-gx-speed>${esc(sel.speed)}</div><div class="gx-kv-sub" data-gx-speedsub>${esc(sel.speedSub || '')}</div></div>` : '';
  const facts = sel.facts.map(([label, value, sub], index) => `<div class="gx-kv-item"><div class="gx-kv-label">${esc(label)}</div><div class="gx-kv-value" data-gx-fact="${index}">${esc(value)}</div><div class="gx-kv-sub" data-gx-factsub="${index}">${esc(sub)}</div></div>`).join('');
  const image = sel.kind === 'camera' ? `<div class="gx-details-img"><img alt="Live still from this camera" data-gx-detailframe></div>` : '';
  const actions = sel.kind === 'camera'
    ? `<button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="cam-step" data-step="prev">Previous</button><button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="cam-step" data-step="next">Next</button><button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="sel-stop">Close camera</button>`
    : `${sel.kind === 'aircraft' ? '<button class="gx-btn gx-btn-accent gx-btn-sm" type="button" data-gx-act="sel-cockpit">Cockpit</button>' : ''}<button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="sel-stop">Stop following</button>`;
  panel.innerHTML = `
    <div class="gx-panel-head"><span class="gx-panel-title">${esc(sel.title)}</span><button class="gx-iconbtn" type="button" data-gx-act="sel-stop" aria-label="Close">${icon('close')}</button></div>
    <div class="gx-panel-body">
      <div class="gx-details-sub">${esc(sel.sub || '')}</div>
      ${image}
      ${speedBlock || facts ? `<div class="gx-kv">${speedBlock}${facts}</div>` : ''}
      <div class="gx-actions">${actions}</div>
    </div>`;
  panel.removeAttribute('data-closed');
  if (sel.kind === 'camera') {
    const img = $('[data-gx-detailframe]', panel);
    frames.load(sel.cameraId, { fresh: true }).then((url) => {
      if (url && img.isConnected) img.src = url;
      else if (img.isConnected) img.closest('.gx-details-img').innerHTML = `<div class="gx-viewer-note">${sel.video ? 'Live video plays on the globe.' : 'No picture from this camera right now.'}</div>`;
    });
  }
}

function openMenu(kind, { keep = false, byKeyboard = false } = {}) {
  const section = $('#gx .gx-screen[data-gx-screen="globe"]');
  const menu = $('.gx-menu', section);
  if (!keep && state.menu === kind) return closeMenu({ refocus: byKeyboard });
  state.menu = kind;
  let title = '';
  let items = [];
  if (kind === 'look') {
    title = 'Look';
    const style = engine.sm.getControlState().style || 'normal';
    items = LOOKS.map((look, index) => ({ value: look.id, label: look.label, hint: String(index + 1), checked: look.id === style }));
  } else if (kind === 'map') {
    title = 'Map';
    items = engine.maps().map((map) => ({ value: map.id, label: map.label, hint: map.available ? '' : 'needs a key', checked: map.active, disabled: !map.available }));
  } else {
    title = 'Spin speed';
    items = Object.keys(SPIN_RATES).map((rate) => ({ value: rate, label: SPIN_LABEL[rate], hint: rate === 'off' ? '' : `${SPIN_RATES[rate]}° a second`, checked: engine.spinName === rate }));
  }
  menu.innerHTML = `<div class="gx-menu-title" id="gx-menu-title">${title}</div>${items.map((item) => `<button class="gx-menu-item" type="button" role="menuitemradio" aria-checked="${Boolean(item.checked)}" data-gx-menuitem="${kind}" data-value="${esc(item.value)}"${item.disabled ? ' disabled' : ''}><span>${esc(item.label)}</span><small>${esc(item.hint)}</small></button>`).join('')}`;
  const trigger = $(`[data-gx-act="menu"][data-menu="${kind}"]`, section);
  if (trigger) {
    // The menu opens from the button that owns it, kept inside the window.
    const host = section.getBoundingClientRect();
    const box = trigger.getBoundingClientRect();
    const half = Math.min(320, host.width - 24) / 2;
    const anchor = box.left + box.width / 2 - host.left;
    const rail = $('#gx .gx-rail').getBoundingClientRect();
    const floor = rail.height > rail.width ? rail.right - host.left + 12 : 12; // a side rail on a wide window, a tab bar when narrow
    const centre = clamp(anchor, floor + half, Math.max(floor + half, host.width - half - 12));
    menu.style.left = `${Math.round(centre)}px`;
    menu.style.transformOrigin = `${Math.round(clamp(anchor - (centre - half), 24, half * 2 - 24))}px 100%`;
  }
  menu.removeAttribute('data-closed');
  for (const button of $$('[data-gx-act="menu"]', section)) button.setAttribute('aria-expanded', String(button.dataset.menu === kind));
  if (narrow()) toggleLayersQuiet(section);
  if (byKeyboard) ($('.gx-menu-item[aria-checked="true"]', menu) || $('.gx-menu-item:not([disabled])', menu))?.focus();
}
function toggleLayersQuiet(section) {
  if (!state.layersOpen) return;
  state.layersOpen = false;
  $('.gx-layers', section).setAttribute('data-closed', '');
  $('[data-gx-act="layers-toggle"]', section).setAttribute('aria-expanded', 'false');
}
function closeMenu({ refocus = false } = {}) {
  if (!state.menu) return;
  const kind = state.menu;
  state.menu = null;
  const section = $('#gx .gx-screen[data-gx-screen="globe"]');
  if (!section) return;
  const menu = $('.gx-menu', section);
  const hadFocus = Boolean(menu && menu.contains(document.activeElement));
  menu?.setAttribute('data-closed', '');
  for (const button of $$('[data-gx-act="menu"]', section)) button.setAttribute('aria-expanded', 'false');
  if (refocus || hadFocus) $(`[data-gx-act="menu"][data-menu="${kind}"]`, section)?.focus();
}

async function onMenuItem(kind, value) {
  if (kind === 'look') setLook(value);
  else if (kind === 'spin') {
    engine.spin(value);
    if (value !== 'off' && engine.sm.getCameraState().alt < 3000000) toast('Spin starts once you pull back from the ground. Press Reset to see the whole Earth.');
  } else if (kind === 'map') {
    const result = await engine.setMap(value);
    if (result.ok === false) toast('That map is not available.');
  }
  refreshDock();
}

async function saveCurrentView() {
  const view = engine.currentView();
  const thumb = view.map === 'photoreal' ? '' : engine.capture(); // no stored Google imagery
  const place = `${Math.abs(view.camera.lat).toFixed(2)}° ${view.camera.lat >= 0 ? 'N' : 'S'}, ${Math.abs(view.camera.lon).toFixed(2)}° ${view.camera.lon >= 0 ? 'E' : 'W'}`;
  const row = store.addSaved(view, `View at ${place}`, thumb);
  if (row) toast('Saved.', { action: 'See saved views', onAction: () => go('saved') });
  else toast('Could not save. Storage on this computer is full or blocked.');
}

/* ---- Camera viewer ---- */

function openViewer(cameraId) {
  const modal = $('#gx .gx-modal');
  data.cameras().then((cams) => {
    const cam = cams.find((c) => c.id === cameraId);
    if (!cam) return toast('That camera is not in the list any more.');
    const list = state.cameraList && state.cameraList.includes(cameraId) ? state.cameraList : cams.filter((c) => c.pack === cam.pack).map((c) => c.id);
    state.viewer = { id: cameraId, list, opener: document.activeElement };
    modal.innerHTML = `
      <div class="gx-viewer">
        <div class="gx-viewer-stage" data-gx-stage><div class="gx-viewer-note">Loading the picture</div></div>
        <div class="gx-viewer-side">
          <div class="gx-savedrow"><span class="gx-tag" data-tone="live">${cam.video ? 'Live video' : 'Live still'}</span><button class="gx-iconbtn" type="button" data-gx-act="viewer-close" aria-label="Close">${icon('close')}</button></div>
          <div class="gx-viewer-title">${esc(cam.name)}</div>
          <div class="gx-viewer-rows">
            <span><b>${esc(cam.region)}</b></span>
            ${cam.provider ? `<span>Source: <b>${esc(cam.provider)}</b></span>` : ''}
            ${Number.isFinite(cam.heading) ? `<span>Facing <b>${Math.round(cam.heading)}°</b></span>` : ''}
            <span class="gx-mono gx-dim">${cam.lat.toFixed(4)}, ${cam.lon.toFixed(4)}</span>
          </div>
          <div class="gx-viewer-btns">
            <button class="gx-btn gx-btn-accent" type="button" data-gx-act="viewer-globe">${icon('globe')}Open on globe</button>
            <div class="gx-viewer-nav"><button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="viewer-step" data-step="-1">Previous</button><button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="viewer-step" data-step="1">Next</button></div>
            <button class="gx-btn gx-btn-ghost gx-btn-sm" type="button" data-gx-act="viewer-refresh">${icon('refresh')}Refresh picture</button>
          </div>
        </div>
      </div>`;
    modal.removeAttribute('data-closed');
    document.documentElement.dataset.gxModal = '1';
    $('#gx .gx-screens').inert = true;
    $('#gx .gx-rail').inert = true;
    $('[data-gx-act="viewer-globe"]', modal)?.focus();
    loadViewerFrame(cam);
  });
}
function loadViewerFrame(cam) {
  const stage = $('#gx [data-gx-stage]');
  if (!stage) return;
  frames.load(cam.id, { fresh: true }).then((url) => {
    if (!state.viewer || state.viewer.id !== cam.id || !stage.isConnected) return;
    stage.innerHTML = url
      ? `<img alt="Live still: ${esc(cam.name)}" src="${url}">`
      : `<div class="gx-viewer-note">${cam.video ? 'This one is live video. Press Open on globe to watch it.' : 'No picture from this camera right now. Try Refresh, or pick another.'}</div>`;
  });
}
function closeViewer() {
  const modal = $('#gx .gx-modal');
  if (!modal || !state.viewer) return;
  const opener = state.viewer.opener;
  state.viewer = null;
  modal.setAttribute('data-closed', '');
  delete document.documentElement.dataset.gxModal;
  $('#gx .gx-screens').inert = false;
  $('#gx .gx-rail').inert = false;
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

/* ---- Radio player ---- */

function renderPlayer() {
  const node = $('#gx .gx-player');
  if (!node) return;
  const ui = state.engineReady ? engine.radioState() : null;
  const selected = ui?.selected;
  if (!state.player || !selected) {
    node.setAttribute('data-closed', '');
    delete document.documentElement.dataset.gxPlayer;
    if (state.player && state.engineReady && ui && !selected) state.player = null;
    markPlaying();
    return;
  }
  const playing = ui.audioState === 'playing';
  const label = { playing: 'Playing', loading: 'Tuning in', buffering: 'Tuning in', paused: 'Paused', stopped: 'Stopped', error: 'Could not play this station' }[ui.audioState] || 'Tuning in';
  node.dataset.state = playing ? 'playing' : 'idle';
  const html = `
    <span class="gx-eq" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="gx-player-text"><span class="gx-player-name">${esc(tidyName(selected.name || state.player.name, 'Station'))}</span><span class="gx-player-sub">${esc([label, selected.country || state.player.country].filter(Boolean).join(' · '))}</span></span>
    <button class="gx-playbtn" type="button" data-gx-act="player-toggle" aria-label="${playing ? 'Pause' : 'Play'}">${icon(playing ? 'pause' : 'play')}</button>
    <button class="gx-iconbtn" type="button" data-gx-act="player-globe" aria-label="Show on globe">${icon('globe')}</button>
    <button class="gx-iconbtn" type="button" data-gx-act="player-close" aria-label="Stop and close">${icon('close')}</button>`;
  if (node.dataset.gxHtml !== html) {
    node.innerHTML = html;
    node.dataset.gxHtml = html;
  }
  node.removeAttribute('data-closed');
  document.documentElement.dataset.gxPlayer = '1'; // CSS lifts the bottom stack over the player (SOP 04)
  markPlaying();
}
function markPlaying() {
  for (const card of $$('#gx [data-kind="station"][data-gx-card]')) {
    const id = state.cards.get(card.dataset.gxCard)?.action?.payload?.id;
    const playing = Boolean(state.player) && id === state.player.id;
    if (playing === card.hasAttribute('data-playing')) continue;
    card.toggleAttribute('data-playing', playing);
    const dot = $('.gx-card-play, .gx-srow-play', card);
    if (dot) dot.innerHTML = icon(playing ? 'pause' : 'play');
  }
}

/* ============================== ACTIONS ============================== */

async function runCard(card, source) {
  const { type, payload } = card.action || {};
  if (type === 'screen') return go(payload.screen);
  if (type === 'camera') return openViewer(payload.id);
  if (type === 'station') {
    if (state.player?.id === payload.id) {
      engine.mod('radio')?.togglePlayback?.();
      return renderPlayer();
    }
    state.player = { id: payload.id, name: card.title, country: (card.subtitle || '').split(' · ')[0] };
    await ready();
    const result = await engine.playStation(payload.id, { focus: state.screen === 'globe' });
    if (result.ok === false) {
      state.player = null;
      toast('Could not start that station.');
    }
    return renderPlayer();
  }
  if (type === 'layer' && payload.needsKey) {
    const setup = await data.setup().catch(() => null);
    const key = setup?.keys?.find((item) => item.id === payload.needsKey);
    if (key && !key.set) {
      toast(`${card.title} needs a free key.`, { ms: 5200, action: 'Open Settings', onAction: () => go('settings') });
      return undefined;
    }
  }
  if (type === 'panel') {
    await ready();
    return setConsole(true, payload.panelId);
  }
  // Everything below happens on the globe.
  go('globe');
  await ready();
  let result = { ok: true };
  if (type === 'view') {
    const steps = await engine.openView(payload);
    result = { ok: !steps.some((step) => step.ok === false && step.step !== 'clear_annotations' && step.step !== 'stop_tracking') };
  } else if (type === 'layer') {
    if (payload.view) await engine.openView({ ...payload.view, layers: payload.ids });
    else for (const id of payload.ids) await engine.setLayer(id, true).catch(() => {});
    if (payload.ids.some((id) => CONSOLE_LAYERS[id])) setConsole(true, CONSOLE_LAYERS[payload.ids.find((id) => CONSOLE_LAYERS[id])]);
  } else if (type === 'place') {
    result = await engine.flyPlace(payload.query);
    if (result.ok === false && Number.isFinite(payload.lat)) result = await engine.flyPoint(payload.lat, payload.lon, 30000);
  } else if (type === 'landmark') {
    result = await engine.flyLandmark(payload.cityId, payload.index);
  } else if (type === 'quake' || type === 'launch') {
    await engine.setLayer(type === 'quake' ? 'earthquakes' : 'rocket-launches', true).catch(() => {});
    result = await engine.flyPoint(payload.lat, payload.lon, type === 'quake' ? 900000 : 60000);
  } else if (type === 'track') {
    result = await engine.track(payload.query, payload.layerId);
  }
  if (result && result.ok === false && !result.cancelled) toast('That did not load. Try again in a moment.');
  refreshGlobe();
  return source;
}

async function onClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  // A tap outside an open menu closes it.
  if (state.menu && !target.closest('.gx-menu') && !target.closest('[data-gx-act="menu"]')) closeMenu();
  if (target.classList.contains('gx-modal')) return closeViewer();

  const goTo = target.closest('[data-gx-go]');
  if (goTo) return go(goTo.dataset.gxGo);

  const cardNode = target.closest('[data-gx-card]');
  if (cardNode) {
    const card = state.cards.get(cardNode.dataset.gxCard);
    if (card) await runCard(card, cardNode);
    return;
  }
  const chip = target.closest('[data-gx-chip]');
  if (chip) return onChip(chip.dataset.gxChip, chip.dataset.value);
  const layer = target.closest('[data-gx-layer]');
  if (layer) return onLayerRow(layer.dataset.gxLayer);
  const menuItem = target.closest('[data-gx-menuitem]');
  if (menuItem && !menuItem.disabled) return onMenuItem(menuItem.dataset.gxMenuitem, menuItem.dataset.value);

  const actor = target.closest('[data-gx-act]');
  if (!actor) return;
  const act = actor.dataset.gxAct;
  const section = $('#gx .gx-screen:not([hidden]):not(.gx-leaving)');
  switch (act) {
    case 'console-off': return setConsole(false);
    case 'reload-home': {
      for (const key of ['cameras', 'stations', 'quakes', 'launches', 'landmarks', 'catalog']) data._cache.delete(key);
      homeLive.started = false;
      const home = $('#gx .gx-screen[data-gx-screen="home"]');
      delete home.dataset.gxBuilt;
      return renderScreen(home, 'home');
    }
    case 'reload-cameras': data._cache.delete('cameras'); return renderCameras(section);
    case 'reload-radio': data._cache.delete('stations'); return renderRadio(section);
    case 'cam-more': state.cameraShown += PAGE; return renderCameras(section);
    case 'radio-more': state.radioShown += PAGE; return renderRadio(section);
    case 'viewer-close': return closeViewer();
    case 'viewer-refresh': return data.cameras().then((cams) => loadViewerFrame(cams.find((c) => c.id === state.viewer?.id)));
    case 'viewer-step': {
      if (!state.viewer) return;
      const list = state.viewer.list;
      const index = list.indexOf(state.viewer.id);
      const next = list[(index + Number(actor.dataset.step) + list.length) % list.length];
      const opener = state.viewer.opener;
      state.viewer = null;
      openViewer(next);
      setTimeout(() => {
        if (state.viewer) state.viewer.opener = opener;
      }, 0);
      return;
    }
    case 'viewer-globe': {
      const id = state.viewer?.id;
      closeViewer();
      go('globe');
      await ready();
      const result = await engine.openCamera(id);
      if (result.ok === false) toast('Could not open that camera on the globe.');
      return refreshGlobe();
    }
    case 'saved-remove': {
      const id = actor.dataset.id;
      store.patchSaved(id, { deleted_at: nowIso() });
      renderSaved(section);
      return toast('Removed.', { ms: 6000, action: 'Undo', onAction: () => { store.patchSaved(id, { deleted_at: null }); renderSaved($('#gx .gx-screen[data-gx-screen="saved"]')); } });
    }
    case 'credits': {
      go('globe');
      await ready();
      await sleep(300);
      $('#cesium-credits .cesium-credit-expand-link')?.click();
      return;
    }
    default: break;
  }
  // The rest need the engine.
  await ready();
  switch (act) {
    case 'console-on': return setConsole(true);
    case 'keys': if (!engine.openKeys()) toast('The key screen is not available here.'); return;
    case 'layers-toggle': return toggleLayers();
    case 'layers-clear': await engine.clearLayers(); return refreshLayers();
    case 'menu': return openMenu(actor.dataset.menu, { byKeyboard: event.detail === 0 });
    case 'globe-reset': await engine.globe(); return refreshDock();
    case 'globe-share': return toast((await engine.share()) ? 'Link copied.' : 'Could not copy the link.');
    case 'globe-save': return saveCurrentView();
    case 'sel-stop': await engine.stopFollowing(state.selection); return refreshSelection();
    case 'sel-cockpit': {
      const result = await engine.run('control_cockpit', { action: 'enter', targetLayer: state.selection?.layerId });
      if (result.ok === false) toast('Cockpit needs a plane you are following.');
      return;
    }
    case 'cam-step': await engine.run('control_cctv', { action: actor.dataset.step === 'prev' ? 'prev' : 'next' }); return refreshSelection();
    case 'player-toggle': engine.mod('radio')?.togglePlayback?.(); return setTimeout(renderPlayer, 150);
    case 'player-close': state.player = null; renderPlayer(); return engine.stopRadio();
    case 'player-globe': {
      go('globe');
      const station = (await data.stations().catch(() => [])).find((s) => s.id === state.player?.id);
      if (station) await engine.flyPoint(station.lat, station.lon, 400000);
      return;
    }
    case 'more-open': {
      const tool = MORE_TOOLS[Number(actor.dataset.index)];
      if (tool?.layer) await engine.setLayer(tool.layer, true).catch(() => {});
      return setConsole(true, tool?.panel || null);
    }
    case 'more-cockpit': go('globe'); return toast('Switch on Flights in Layers, tap a plane, then press Cockpit.', { ms: 5200 });
    case 'more-voice': {
      const setup = await data.setup().catch(() => null);
      const key = setup?.keys?.find((item) => item.id === 'openai');
      if (!key?.set) return toast('Voice needs a paid OpenAI key. It stays off until you add one in Settings.', { ms: 5200, action: 'Open Settings', onAction: () => go('settings') });
      return setConsole(true);
    }
    case 'scene-play': {
      setConsole(true, 'scene-panel');
      const result = await engine.run('control_scene', { action: 'play', sceneId: actor.dataset.id });
      if (result.ok === false) toast('Could not start that scene.');
      return;
    }
    default: return undefined;
  }
}

function onChip(group, value) {
  const section = $('#gx .gx-screen:not([hidden]):not(.gx-leaving)');
  if (group === 'home') {
    state.homeChip = value;
    renderHomeLive(section);
  } else if (group === 'explore') {
    state.exploreChip = value;
    renderExplore(section);
  } else if (group === 'cameras') {
    if (value === '__more') state.cameraChipsAll = true;
    else {
      state.cameraRegion = value;
      state.cameraShown = PAGE;
    }
    renderCameras(section);
  } else if (group === 'radio') {
    state.radioCat = value;
    state.radioShown = PAGE;
    renderRadio(section);
  } else if (group === 'pref-spin') {
    store.setPrefs({ spin_rate: value });
    renderSettings(section);
    toast(`Spin set to ${SPIN_LABEL[value].toLowerCase()}.`);
  } else if (group === 'pref-motion') {
    store.setPrefs({ reduced_motion: value === 'reduced' });
    document.documentElement.toggleAttribute('data-gx-calm', value === 'reduced');
    if (value === 'reduced' && state.engineReady) engine.spin('off', { remember: false });
    renderSettings(section);
  }
}

let exploreTimer = 0;
function onInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.gxInput === 'layer-filter') {
    state.layerFilter = target.value;
    return refreshLayers();
  }
  if (target.dataset.gxRename && event.type === 'change') {
    const title = target.value.trim() || 'Saved view';
    store.patchSaved(target.dataset.gxRename, { title });
    return toast('Renamed.');
  }
  const form = target.closest('[data-gx-form]');
  if (!form || event.type !== 'input') return;
  const section = target.closest('.gx-screen');
  if (form.dataset.gxForm === 'explore') {
    state.exploreQuery = target.value;
    clearTimeout(exploreTimer);
    exploreTimer = setTimeout(() => renderExplore(section, { typing: true }), 220);
  } else if (form.dataset.gxForm === 'radio') {
    state.radioFilter = target.value;
    state.radioShown = PAGE;
    clearTimeout(exploreTimer);
    exploreTimer = setTimeout(() => renderRadio(section), 180);
  }
}

async function onSubmit(event) {
  const form = event.target.closest('[data-gx-form]');
  if (!form) return;
  event.preventDefault();
  const field = $('[data-gx-search]', form);
  const query = String(field?.value || '').trim();
  const name = form.dataset.gxForm;
  if (name === 'radio') return;
  if (!query) return field?.focus();
  if (name === 'home') return go('explore', { params: { q: query } });
  if (name === 'explore') {
    state.exploreQuery = query;
    clearTimeout(exploreTimer);
    return renderExplore(form.closest('.gx-screen'), { lookup: true });
  }
  if (name === 'globe') {
    await ready();
    field.blur();
    const result = await engine.flyPlace(query);
    if (result.ok === false && !result.cancelled) toast(`Could not find "${query}".`);
  }
}

/* ============================== BOOT ============================== */

function teardown() {
  engine.destroy();
  clearTimeout(layerTimer);
  clearTimeout(exploreTimer);
  for (const off of cleanups.splice(0).reverse()) {
    try {
      off();
    } catch {
      /* already gone */
    }
  }
  delete document.documentElement.dataset.gxModal;
  delete document.documentElement.dataset.gxPlayer;
  delete document.documentElement.dataset.gxSheet;
}

function failOpen(error) {
  console.error('[gx] shell failed, showing the stock app', error);
  teardown();
  if (stockTitle) document.title = stockTitle;
  document.documentElement.classList.remove('gx', 'gx-simple', 'gx-console');
}

async function boot() {
  try {
    preboot();
  } catch (error) {
    failOpen(error);
    return;
  }
  try {
    await engine.connect();
    state.engineReady = true;
    engine._resolveReady();
    if (DEV) {
      engine.selfTest();
      window.__gx = { engine, state, go, setConsole, store, toast, data, frames, keyFor, version: GX_VERSION };
    }
    try {
      localStorage.setItem(KEY.map, engine.msc.getActiveId());
    } catch {
      /* storage blocked */
    }
    const prefs = store.prefs();
    document.documentElement.toggleAttribute('data-gx-calm', Boolean(prefs.reduced_motion));
    setBoot('Live', 'ready');
    $('#gx .gx-landing')?.classList.add('gx-ready');
    onScreenEnter(state.screen, null);
    // The selection panel and the player follow the engine once a second.
    every(1000, () => {
      if (state.mode !== 'simple') return;
      if (state.screen === 'globe') refreshSelection();
      if (state.player) renderPlayer();
    });
  } catch (error) {
    console.error('[gx] engine did not start', error);
    setBoot('The globe did not start. Reload to try again.', 'failed');
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => teardown());
}

boot();
