# 06 Engine update

## Goal

Pull a newer upstream engine into `app/` without losing our one-line hook or our shell.

## Steps

1. Commit or stash all work. The tree must be clean.
2. `cd` to the project root (the folder that holds `app/` and `tools/`).
3. `git fetch --no-tags upstream main`
4. `git subtree merge --prefix=app upstream/main --squash -m "Update engine to <short sha>"`
5. If `app/index.html` conflicts: keep upstream's version and re-add the one line after the stylesheet link: `<script type="module" src="/shell/gev-shell.js"></script>`.
6. `cd app && PUPPETEER_SKIP_DOWNLOAD=1 npm ci` (with Node 24 first on the path)
7. Start the dev server and open the page. Read the browser console for lines starting `[gx self-test]`. Each line names a method, action or element id that upstream renamed or removed. Repair only the `engine` adapter and the hide list.
8. Run `python3 tools/check_app.py`, `.venv/bin/python tools/check_fit.py`, and `npm test` inside `app/`.
9. Record the new commit, the test counts and any repairs in `progress.md`.

## Rules

- Never edit files under `app/src`, `app/server` or `app/build` to make an update pass. Fix our side.
- Check `app/package.json` `engines.node` after each update. If it moves past Node 24, install the new version the same keg-only way.
- Read upstream `CHANGELOG.md` for changes to layer ids, action names, the share-hash format and the CSP.

## Known failure modes

- `npm ci` prints "install scripts not yet covered by allowScripts" for esbuild, fsevents and puppeteer. That is npm 11 policy. Vite still runs. Leave it.
- A changed CSP that blocks inline styles would break our injected `<style>`. Move the CSS into `app/shell/gev-shell.css` in that case and update `claude.md` first, because it breaks the one-file rule.
