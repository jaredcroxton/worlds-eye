# 04 Design system

## Direction

Layout follows the pattern of modern creative tools: a left rail, a hero with one search bar, quick tools, and card grids. Our own name (World's Eye), mark, words, colours and pictures. Dark, calm, one accent. The globe is the picture; the UI stays out of its way.

## Tokens (CSS variables on `#gx`)

| Token | Value | Use |
|---|---|---|
| `--gx-bg` | `#07070B` | page and solid screens |
| `--gx-surface` | `rgba(255,255,255,0.045)` | cards, inputs |
| `--gx-surface-2` | `rgba(255,255,255,0.08)` | hover, active chip |
| `--gx-solid` | `#101016` | panels that sit over the live globe (no blur) |
| `--gx-line` | `rgba(255,255,255,0.09)` | hairline borders |
| `--gx-line-2` | `rgba(255,255,255,0.16)` | hover borders |
| `--gx-text` | `#F4F5F7` | primary text |
| `--gx-text-2` | `rgba(244,245,247,0.64)` | secondary |
| `--gx-text-3` | `rgba(244,245,247,0.52)` | hints. Raised from 0.40 after the design review: 0.42 measured 3.8 to 1 on our darks, 0.52 measures 5.3 to 1 |
| `--gx-accent` | `#6B5BFF` | orbit violet: primary actions, the tunnel, active states |
| `--gx-accent-2` | `#8E82FF` | accent text on dark |
| `--gx-live` | `#4ADE80` | live dots and LIVE badges only |
| `--gx-warn` | `#F5B544` | needs-key state |
| `--gx-r-card` | `14px` | cards |
| `--gx-r-panel` | `18px` | panels and sheets |
| `--gx-r-rail` | `22px` | rail |
| `--gx-rail-w` | `76px` | rail width on desktop |
| `--gx-tab-h` | `64px` | bottom tab bar when narrow |

One accent only. Live green never appears as a button colour or as card art. Amber is for the needs-key state only. Accent hover goes darker (`#5F4FF5`), never lighter, so white text keeps 4.5 to 1.

## Type

- Display: Unbounded, weights 700 and 900, self-hosted woff2 in `app/public/shell/fonts/`. Used for the tunnel, the hero headline and screen titles. Upper case, tight tracking.
- Text: Inter (already loaded by the engine). 400, 500, 600.
- Data: JetBrains Mono (already loaded). Speeds, coordinates, counts.
- Scale: 12, 13, 15, 17, 22, 28, 40, then `clamp()` for the hero. Body is 15.

## Layout

- Desktop (above 720 px): rail on the left, content column max 1400 px.
- Narrow (720 px and below): bottom tab bar with five items (Home, Explore, Globe, Cameras, More). Layers open from a button on the Globe screen. Panels become bottom sheets, at most 42 percent of the height, so the followed thing at screen centre stays in view. The dock hides while a sheet is open.
- Grids: `grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr))` or fixed counts with `minmax(0,1fr)`. Two columns at 500 px.
- Chip rows wrap. Nothing scrolls sideways. No element is wider than its parent.
- Gutters 16 px narrow, 24 px desktop, 32 px above 1200.

### The bottom stack (Globe screen)

Our own pieces never sit on each other. From the bottom edge up, each piece is placed by variable, not by a loose number:

1. Tab bar (narrow only), 64 px (`--gx-tab-h`).
2. Radio player, when a station is open: 62 px tall. Above 1240 px it sits bottom right, clear of the dock. At 1240 px and below it takes the bottom row and everything else lifts by `--gx-lift` (70 px). The shell sets `data-gx-player` on `<html>` while the player is open; CSS turns that into the lift.
3. Credit pill: 12 px up on desktop, 20 px above the tab bar when narrow. It lifts with the player only at 880 px and below (`--gx-lift-pill`); wider than that the pill and the player share the bottom row, left and right.
4. Dock: bottom edge at `--gx-dock-b` (56 px desktop, tab bar plus 56 px narrow, plus the lift), height `--gx-dock-h` (74 desktop, 66 narrow). That leaves 8 px over the pill.
5. Menus and toasts: bottom edge at `--gx-above-dock` (dock bottom plus dock height plus 8 px). While a menu is open, toasts move to the top of the screen instead.
6. Panels (desktop) end at `--gx-above-dock`. Sheets (narrow) sit 62 px above the tab bar and never lift. While a sheet is open on a narrow window the dock and the radio player both step aside (the station keeps playing) and the lift drops to zero, so a details sheet never climbs over the screen centre. Found by the second design review: with the player open the lifted sheet hid the followed thing.

On the other screens only toasts use the lift, so a toast never lands on the player. A dock menu is the one piece allowed to overlay a panel, because it is a popover. It scrolls inside itself on a short window.

## Components

- Rail item: 20 px icon, 11 px label, active pill behind.
- Search bar: 56 px tall, surface, leading icon, trailing action button.
- Quick tool: 56 px round button, label under.
- Card, two kinds. Picture card (featured and saved views): image 4:5, gradient scrim, title and subtitle over the picture. Caption card (cameras, stations in mixed grids, quakes, launches, places, satellites, layers): picture or drawn art on top at 16:10, title and subtitle underneath, so our words never print over a provider's burned-in caption.
- Drawn art comes from the card's own data, not from its kind alone: a large display glyph (quake magnitude, initials of a station or place) and a violet glow whose position is seeded by the card id. Violet family only.
- Station list (Radio screen): dense rows, not cards. Play button, name, country and style, bit rate. One row per station: the directory lists some stations once per stream quality, so rows with the same shown name in the same country collapse to the best bit rate, in the first one's place. Counts shown anywhere are counts of these rows.
- Empty Saved screen: four dashed ghost tiles with the message card centred over them (never hung across their bottom edge).
- Search hints: every field has a wide and a narrow hint, and the narrow one must fit a 320 px window without an ellipsis.
- Explore with a search term: places are compact rows (pin, name, where, arrow), at most four, so real pictures lead the page. Drawn initials on a violet glow are for a lone card, never a whole first screen.
- Live dot on a camera card: grey until that camera's still has loaded, then green. A dot claims something is live, so it waits for proof.
- Every layer has its own icon. Street traffic is a car, Transit a bus, Bike share a bicycle.
- Amber means a key is needed or money is involved. Nothing else uses it (the "Best on a wide window" tag is neutral).
- Scene titles from the engine keep their own capitals: they are names (places such as Bhote Koshi). The sentence-case rule is for our words.
- The Cesium sun billboard is hidden in simple mode (it glowed beside the tools and the Layers panel) and shown again in console mode. Lighting does not depend on it.
- Camera card with no picture: the art pulses while the still loads; if no still comes, the badge reads NO STILL and the dot goes grey. A green dot only ever means a live picture or feed.
- Chip: 34 px pill, active uses `--gx-surface-2` and `--gx-line-2`.
- Panel over the globe: `--gx-solid`, hairline border, radius 18. No backdrop blur.
- Toast: bottom centre, above the tab bar when narrow.
- Credit chip: the provider credits sit in a solid pill so they read over violet type and over bright imagery. On Home the pill rides the bottom edge of the hero, like a caption for the globe, and drops behind the page once the globe has scrolled away.
- Touch targets are at least 44 px on coarse pointers.

## Motion (from the emil-design-eng skill)

- Curves: `--gx-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--gx-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, sheets `cubic-bezier(0.32, 0.72, 0, 1)`. Never ease-in.
- UI transitions stay under 300 ms. Press feedback `scale(0.97)` in 140 ms. Never `transition: all`. Never animate from `scale(0)`.
- Only `transform` and `opacity` animate. Transitions, not keyframes, for anything a person can interrupt.
- Hover effects sit inside `@media (hover: hover) and (pointer: fine)`.
- Keyboard-triggered changes do not animate.
- Grid entries stagger by 40 ms, capped at 8 items.
- The tunnel is the one long, decorative animation: linear, constant, CSS only.
- Home and Globe cross-fade both ways, never a cut, because they show the same live globe. The leaving layer fades out over 180 ms and is hidden at 200 ms. Into Globe, the dock and top bar slide in over 360 ms. Back to Home, the hero and the page fade in over 240 ms. Entrances fill backwards, so no transform stays on the element afterwards. While a layer is leaving it is `inert` and carries `gx-leaving`; code that asks for the shown screen must skip it.
- A dock menu opens from the button that owns it (its left edge and its transform origin follow that button), clamped to the window.
- Reduced motion: tunnel and spin stop, fades stay.

## Words

- Short, plain, sentence case for UI text. Display lines are upper case.
- No em dashes. No emoji. Banned words: platform, suite, seamless, all-in-one, leverage.
- Units: knots and km/h for speed, feet and metres for altitude.
- Feed names are tidied before they are shown: a trailing codec note such as `| MP3 128k` and a leading code such as `(C014)` are dropped, and ALL CAPS names become title case.
- The same thing has the same name everywhere: Ships (not Live AIS Vessels), Cameras, Earthquakes, Plate reader cameras. The dock shows the name of each control with its value under it.

## Known failure modes

- A horizontal scroller that looks neat at 1440 fails at 500. Wrap instead.
- Text over the live globe needs a scrim, or it loses contrast over ice and cloud.
- Violet on near-black fails contrast for small text. Use `--gx-accent-2` for text.
- Bottom pieces placed by loose numbers drifted into each other (found 6 Oct 2026): the toast and the narrow menu sat 6 px into the dock, the credit pill 4 px into the dock from 721 to about 1350 px, and the radio player covered a third of the dock below 1240 px and floated over an open sheet when narrow. Fix: the bottom stack above, and a gate check that no two pieces overlap.
