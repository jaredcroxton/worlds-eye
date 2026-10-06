#!/usr/bin/env python3
"""Static gate for our own files. No browser needed.

Usage: python3 tools/check_app.py

Input contract: app/shell/gev-shell.js, app/index.html, app/public/shell/catalog.json,
our markdown files, and git (remote "upstream" fetched).
Output contract: one PASS or FAIL line per check on stdout, a report at
.tmp/check_app_report.json, exit code 0 when every check passes, 1 otherwise.
Rules live in claude.md, architecture/03_shell.md and architecture/04_design_system.md.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
SHELL = APP / "shell" / "gev-shell.js"
INDEX = APP / "index.html"
CATALOG = APP / "public" / "shell" / "catalog.json"
HOOK = '<script type="module" src="/shell/gev-shell.js"></script>'
DASHES = re.compile("[" + chr(8211) + chr(8212) + "]")
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0000FE0F]")
BANNED_NAME = "Sar" + "ah"
BANNED_WORDS = ("platform", "suite", "seamless", "all-in-one", "leverage")
# www.w3.org is the SVG namespace string inside the tab icon. It is a name, never a request.
ALLOWED_HOSTS = ("earthquake.usgs.gov", "www.w3.org")
ALLOWED_NEW = ("shell/gev-shell.js", "public/shell/")
ALLOWED_CHANGED = ("index.html",)
IGNORED_PREFIXES = ("node_modules/", "dist/", ".gev-cache/", ".gev-logs/")
KINDS = {"view", "place", "camera", "station", "satellite", "quake", "launch", "tool"}
TYPES = {"view", "camera", "station", "track", "layer", "panel", "screen", "place", "landmark", "quake", "launch"}
STYLES = {"normal", "retro", "surveillance", "thermal", "anime", "noir", "snow"}
MAPS = {"photoreal", "bing-aerial", "bing-labels", "esri-imagery", "osm"}
SCREENS = {"landing", "home", "explore", "globe", "cameras", "radio", "saved", "settings", "more"}
CARD_FIELDS = ("id", "kind", "title", "subtitle", "badge", "image", "live", "action")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False).stdout


def css_of(source):
    match = re.search(r"const CSS = `(.*?)`\.replace\(", source, re.S)
    return match.group(1) if match else ""


def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def walk_rules(css):
    """Yield (selector, body, media) for every style rule, descending into @media."""
    out = []

    def parse(block, media):
        index = 0
        while index < len(block):
            brace = block.find("{", index)
            if brace == -1:
                break
            prelude = block[index:brace].strip()
            depth, end = 1, brace + 1
            while end < len(block) and depth:
                depth += block[end] == "{"
                depth -= block[end] == "}"
                end += 1
            body = block[brace + 1:end - 1]
            if prelude.startswith("@media") or prelude.startswith("@supports"):
                parse(body, prelude)
            elif prelude.startswith("@"):
                pass  # @font-face, @keyframes
            else:
                out.append((prelude, body, media))
            index = end

    parse(css, "")
    return out


def main():
    results = []

    def check(name, ok, detail=""):
        results.append({"check": name, "pass": bool(ok), "detail": detail})
        print(f"{'PASS' if ok else 'FAIL'}  {name}{(' : ' + detail) if detail and not ok else ''}")

    for path in (SHELL, INDEX, CATALOG):
        if not path.exists():
            print(f"FAIL  {path.relative_to(ROOT)} is missing")
            return 1
    shell = SHELL.read_text(encoding="utf-8")
    index = INDEX.read_text(encoding="utf-8")
    catalog_text = CATALOG.read_text(encoding="utf-8")

    # 1. The hook, and upstream's own page untouched around it.
    check("index.html has the one-line hook exactly once", index.count(HOOK) == 1)
    check("index.html keeps the engine's script tag", '<script type="module" src="/src/main.js"></script>' in index)
    check("index.html keeps the nine template markers", len(re.findall(r"<!-- gev:template [a-z-]+ -->", index)) == 9)
    upstream_index = git("show", "upstream/main:index.html")
    if upstream_index:
        ours = [line for line in index.splitlines() if line.strip() != HOOK]
        check("index.html differs from upstream by the hook line only", ours == upstream_index.splitlines())
    else:
        check("upstream index.html readable from git", False, "run: git fetch --no-tags upstream main")

    # 2. Only the allowed files differ from upstream under app/.
    listing = git("ls-tree", "-r", "upstream/main")
    upstream_files = {}
    for line in listing.splitlines():
        meta, _, name = line.partition("\t")
        upstream_files[name] = meta.split()[2]
    if upstream_files:
        def local_only(name):
            # Key files and caches are ours to keep out of git. .env.example is an upstream file.
            return name.startswith(IGNORED_PREFIXES) or name == ".env" or (name.startswith(".env.") and name != ".env.example") or name.endswith(".DS_Store")

        working = [str(p.relative_to(APP)) for p in APP.rglob("*") if p.is_file() and not local_only(str(p.relative_to(APP)))]
        # git reads these paths from the top of the work tree, so they carry the app/ prefix.
        hashed = subprocess.run(["git", "hash-object", "--stdin-paths"], cwd=ROOT, input="\n".join("app/" + name for name in working), capture_output=True, text=True, check=False)
        hashes = hashed.stdout.split()
        check("every app file could be hashed", len(hashes) == len(working), hashed.stderr.strip()[:160])
        have = dict(zip(working, hashes))
        changed = sorted(name for name, blob in upstream_files.items() if name in have and have[name] != blob)
        removed = sorted(name for name in upstream_files if name not in have)
        added = sorted(name for name in have if name not in upstream_files)
        bad_changed = [name for name in changed if name not in ALLOWED_CHANGED]
        bad_added = [name for name in added if not name.startswith(ALLOWED_NEW)]
        check("upstream files changed: index.html only", not bad_changed, ", ".join(bad_changed[:5]))
        check("no upstream file removed", not removed, ", ".join(removed[:5]))
        check("our new files sit in app/shell and app/public/shell only", not bad_added, ", ".join(bad_added[:5]))
        shell_files = [name for name in added if name.startswith("shell/")]
        check("one frontend file", shell_files == ["shell/gev-shell.js"], ", ".join(shell_files))
    else:
        check("upstream tree readable from git", False, "run: git fetch --no-tags upstream main")

    # 3. Words and characters.
    ours_text = {"shell": shell, "catalog": catalog_text}
    for md in list(ROOT.glob("*.md")) + list((ROOT / "architecture").glob("*.md")) + list((ROOT / "tools").glob("*.py")):
        ours_text[str(md.relative_to(ROOT))] = md.read_text(encoding="utf-8")
    dashed = [name for name, text in ours_text.items() if DASHES.search(text)]
    check("no em or en dashes in our files", not dashed, ", ".join(dashed))
    emoji = [name for name in ("shell", "catalog") if EMOJI.search(ours_text[name])]
    check("no emoji in the UI", not emoji, ", ".join(emoji))
    named = [name for name, text in ours_text.items() if BANNED_NAME in text]
    check("banned name absent", not named, ", ".join(named))
    ui_text = (shell + catalog_text).lower()
    words = [word for word in BANNED_WORDS if re.search(r"\b" + re.escape(word) + r"\b", ui_text)]
    check("no banned words in the UI", not words, ", ".join(words))

    # 4. CSS rules.
    css = strip_comments(css_of(shell))
    check("CSS block found in the shell", bool(css))
    rules = walk_rules(css)
    def split_top(selector):
        """Split on commas that are not inside brackets, so :is(a, b) stays whole."""
        parts, depth, start = [], 0, 0
        for position, char in enumerate(selector):
            depth += char in "(["
            depth -= char in ")]"
            if char == "," and depth == 0:
                parts.append(selector[start:position])
                start = position + 1
        parts.append(selector[start:])
        return parts

    bad_selectors = []
    for selector, _, _ in rules:
        for part in split_top(selector):
            part = part.strip()
            if part and not part.startswith(("#gx", "html.gx", ":root.gx")):
                bad_selectors.append(part[:60])
    check("every selector starts with #gx, html.gx or :root.gx", not bad_selectors, " | ".join(bad_selectors[:4]))
    check("no sideways scroller in the stylesheet", not re.search(r"overflow(-x)?\s*:\s*(auto|scroll)\b", css), "use overflow-y only")
    # A fraction such as 1.1fr ends in "1fr" too; a digit or a dot in front means it is not a bare track.
    bare_fr = [m.group(0) for m in re.finditer(r"(?<!minmax\(0, )(?<!minmax\(0,)(?<![\d.])\b1fr\b", css)]
    check("grid tracks use minmax(0, 1fr)", not bare_fr, f"{len(bare_fr)} bare 1fr")
    touching = [sel[:60] for sel, _, _ in rules if "#cesiumContainer" in sel]
    check("nothing styles #cesiumContainer", not touching, " | ".join(touching))
    hidden_credits = [sel[:60] for sel, body, _ in rules if "#cesium-credits" in sel and re.search(r"display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d])", body)]
    check("credits are never hidden", not hidden_credits, " | ".join(hidden_credits))
    check("no transition: all", not re.search(r"transition\s*:\s*all\b", css))
    check("nothing animates from scale(0)", not re.search(r"scale\(0\)", css))
    check("no ease-in curve", not re.search(r"\bease-in\b(?!-out)", css))
    loose_hover = [sel[:60] for sel, _, media in rules if ":hover" in sel and "hover: hover" not in media]
    check("hover rules sit inside a hover media query", not loose_hover, " | ".join(loose_hover[:4]))
    check("reduced motion is handled", "prefers-reduced-motion" in css)

    # 5. Script rules.
    code = shell.replace(css_of(shell), "")
    check("no Cesium global", "window.Cesium" not in code)
    check("hash is written once, in preboot", len(re.findall(r"history\.replaceState\(", code)) == 1 and not re.search(r"location\.hash\s*=[^=]", code))
    check("no static imports at the top", not re.search(r"^import\s", code, re.M))
    hosts = sorted(set(re.findall(r"https?://([a-z0-9.-]+)", code)))
    bad_hosts = [host for host in hosts if host not in ALLOWED_HOSTS]
    check("no outside hosts beyond the quake feed", not bad_hosts, ", ".join(bad_hosts))
    check("the preset look action is not used", "set_visual_style" not in re.sub(r"//.*", "", code))
    check("HUD is kept off in simple mode", "setHudVisible('off')" in code)
    check("scene handler is guarded", re.search(r"preUpdate\.addEventListener\(\(\) => \{\s*try \{", code) is not None)

    # 6. Catalog.
    try:
        catalog = json.loads(catalog_text)
    except Exception as error:
        check("catalog.json parses", False, str(error))
        catalog = None
    if catalog:
        check("catalog version is 1", catalog.get("version") == 1)
        registry = (APP / "src" / "data" / "layerState.js").read_text(encoding="utf-8")
        block = registry[registry.find("export const LAYER_STATE_REGISTRY"):]
        block = block[:block.find("]);")]
        layer_ids = set(re.findall(r"id:\s*'([a-z0-9-]+)'", block))
        problems = []
        seen = set()
        for card in list(catalog.get("featured", [])) + list(catalog.get("tools", [])):
            cid = card.get("id", "?")
            if cid in seen:
                problems.append(f"{cid}: duplicate id")
            seen.add(cid)
            for field in CARD_FIELDS:
                if field not in card:
                    problems.append(f"{cid}: missing {field}")
            if card.get("kind") not in KINDS:
                problems.append(f"{cid}: kind {card.get('kind')}")
            action = card.get("action") or {}
            payload = action.get("payload") or {}
            if action.get("type") not in TYPES:
                problems.append(f"{cid}: action type {action.get('type')}")
            views = []
            if action.get("type") == "view":
                views.append(payload)
            if action.get("type") == "layer":
                for layer in payload.get("ids", []):
                    if layer not in layer_ids:
                        problems.append(f"{cid}: unknown layer {layer}")
                if payload.get("view"):
                    views.append(payload["view"])
            if action.get("type") == "screen" and payload.get("screen") not in SCREENS:
                problems.append(f"{cid}: unknown screen {payload.get('screen')}")
            for view in views:
                camera = view.get("camera") or {}
                if not (-90 <= camera.get("lat", 999) <= 90 and -180 <= camera.get("lon", 999) <= 180):
                    problems.append(f"{cid}: camera position")
                if not 50 <= camera.get("altitude_m", 0) <= 20_000_000:
                    problems.append(f"{cid}: altitude outside 50 to 20,000,000")
                if not -90 <= camera.get("pitch_deg", 1) <= 0:
                    problems.append(f"{cid}: pitch outside -90 to 0")
                if not 0 <= camera.get("heading_deg", -1) <= 360:
                    problems.append(f"{cid}: heading outside 0 to 360")
                for layer in view.get("layers", []):
                    if layer not in layer_ids:
                        problems.append(f"{cid}: unknown layer {layer}")
                if view.get("style") and view["style"] not in STYLES:
                    problems.append(f"{cid}: unknown style {view['style']}")
                if view.get("map") and view["map"] not in MAPS:
                    problems.append(f"{cid}: unknown map {view['map']}")
                if view.get("map") == "photoreal":
                    problems.append(f"{cid}: featured views must not pin the Google map")
        check(f"catalog cards are valid ({len(seen)} cards, {len(layer_ids)} engine layers known)", not problems, " | ".join(problems[:5]))

    report = ROOT / ".tmp" / "check_app_report.json"
    report.parent.mkdir(exist_ok=True)
    report.write_text(json.dumps(results, indent=2), encoding="utf-8")
    failed = [row for row in results if not row["pass"]]
    print(f"\n{len(results) - len(failed)} of {len(results)} checks passed. Report: {report}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
