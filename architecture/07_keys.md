# 07 Keys and spend

## Goal

Add or rotate a key safely, and keep paid features off unless the owner turns them on.

## Where keys live

- Only in `app/.env` (git-ignored, owner-only permissions). The launcher unsets paid keys from the shell, so a key exported somewhere else on the Mac never counts.
- `.env.example` at the project root lists names only.
- The owner pastes keys himself. The assistant never types, prints or stores a key value.

## Add a key

1. Open Settings in the app and press "Add key". The engine's own key screen opens. Paste the key there and save. The engine writes `app/.env` and restarts the dev server.
2. Or edit `app/.env` by hand and restart the dev server.
3. Run `python3 tools/handshake.py` to confirm the route now answers.

## Free keys (sign-up only)

| Key | Unlocks | Where |
|---|---|---|
| `CESIUM_ION_TOKEN` | photoreal 3D cities, 1,000 sessions a month, personal use | cesium.com/ion |
| `AISSTREAM_API_KEY` | live ships | aisstream.io |
| `FIRMS_MAP_KEY` | active fires | firms.modaps.eosdis.nasa.gov |
| `TOMTOM_API_KEY` | live traffic flow | developer.tomtom.com |
| `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET` | more flight updates | opensky-network.org |

## Paid keys (only on the owner's word, cost named first)

- `OPENAI_API_KEY`: voice, a few cents a minute. The 5 dollar session cap is enforced in the browser only. Set a hard budget in the OpenAI account.
- `GOOGLE_MAPS_API_KEY`: direct Google 3D. About 6 US dollars per 1,000 sessions after the first 1,000 a month. It also arms the Street View fallback for camera stills. Prefer the free Cesium token on the Mac.

## Spend guards in the shell

- HUD kept logically off in simple mode, re-asserted after every look change. A HUD hidden only by CSS still calls OpenAI every 15 s.
- Hold-Space voice is blocked outside console mode unless voice is switched on in Settings.
- Camera stills load only for visible cards, with no auto refresh. A still served with `X-CCTV-Source: streetview` is not requested again.
- Flights stay off until the person turns them on.

## Verify no spend

With a paid key present, run the browser walk-through with the network log open. There must be no request to `/api/openai/*`, `/api/realtime/token` or `/api/google/*` unless the feature was turned on by hand.

## Rotate or remove

Edit `app/.env`, delete or replace the line, restart. Revoke the old key at the provider.

## Key dialog wording (shell re-skin)

The engine's dialog marks each key with a coloured emoji. The shell's watcher swaps it for the word Paid or Free (screen readers used to read the emoji aloud), titles the dialog Keys, and replaces the field hints (`paste GOOGLE_MAPS_API_KEY`, and a saved hint with a long dash) with plain words. The field's accessible name stays the variable name, so it is clear which key goes where.

Known failure (6 Oct 2026, found by the second design review): every badge read PAIDPAID or FREEFREE, because the old CSS that drew the word with `::after` stayed when the real words went in. Fix: the `::after` rules are gone, and the watcher also takes long dashes out of `title` tooltips. The walk-through now opens the dialog and fails if a badge is not exactly Paid or Free, if any `::after` word is drawn, or if a long dash shows in its text, tooltips or field hints.
