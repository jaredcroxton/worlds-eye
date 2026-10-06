# SOP 08: Publish to GitHub

## Goal

Put a clean public copy on GitHub that anyone can clone and run on their own computer, without the private project notes. Repeatable, one command.

## Where

- Public repository: `github.com/jaredcroxton/worlds-eye` (public). In the local repository the remote is named `public`.
- The local `main` branch is the private working history. It is never pushed.
- The local `public` branch is a chain of snapshots made by the tool. Only this branch is pushed, to `main` on GitHub.

## What goes out

Everything tracked at `HEAD`, minus the private notes: `claude.md`, `task_plan.md`, `findings.md`, `progress.md`. They stay on this computer.

Never tracked, so never published: `.env`, `app/.env`, `.tmp/`, `.venv/`, `handover/`, and the card pictures in `app/public/shell/cards/` (captures of map imagery; a cloner makes their own with `tools/capture_cards.py`).

## Tool: `tools/publish.py`

- Input: a clean working tree on `main` (nothing uncommitted). `--push` to send; without it the tool does a dry run.
- Logic, in order. Any failure stops the run before anything is sent.
  1. Refuse when the working tree is dirty or the branch is not `main`.
  2. Run `tools/scan_keys.py` and `tools/check_app.py`. Both must pass.
  3. Build the public tree from `HEAD` in a temporary index and drop the private paths.
  4. Privacy scan of our own files in that tree (everything outside `app/`, plus `app/shell/` and `app/public/shell/`): no home folder paths, no email addresses, no owner's first name outside the README copyright line, no local folder names.
  5. Size check: no file over 50 MB.
  6. Commit the tree on the local `public` branch (parent: the last snapshot, when there is one). Message: `Publish <date>: <subject of HEAD>`.
  7. With `--push`: push `public` to `main` on the `public` remote.
  8. Install the `pre-push` hook (below) when it is missing or old.
- Output: one line per step, `.tmp/publish_report.json`, exit code 0 only when every step passed.

## Safety net: the pre-push hook

`.git/hooks/pre-push` refuses any push, to any remote, of a commit whose tree holds one of the private paths. It exists so that a mistyped `git push public main` cannot publish the private history. The hook is local and not tracked; the tool installs it.

## Rules

- Publish only on the owner's word, each time.
- The name on screen and in the README is World's Eye. The engine keeps its own name and credit: gods-eye-view by Bilawal Sidhu, MIT licence. The README says the two are not affiliated.
- Licences travel with the files: `app/LICENSE`, `app/THIRD_PARTY_NOTICES.md`, `app/DATA_SOURCES.md` (the engine's), and `app/public/shell/fonts/OFL.txt` (our display font).
- No paid key, no private note and no captured map picture goes into the public tree.

## Proof that a clone runs (done after the first publish, and after any change to the run steps)

1. Clone the public repository into a scratch folder.
2. Check the file list: none of the private paths, the README is there.
3. Give it the same dependencies the lock file names, start it on a spare port, and wait for the shell to report the engine ready with eight quick tools on Home.
4. Stop it and delete the scratch folder.

## Known failure modes

- Pushing `main` by hand would publish the private notes and their history. The hook stops it. Do not remove the hook.
- GitHub may block a push when it thinks a file holds a secret. Read the message, do not bypass it: if the file is ours, fix it; if it is one of the engine's test files, tell the owner.
- A cloner on another port: the tools default to `http://localhost:4177`. The README tells them to copy `.env.example` to `app/.env`, which sets that port.
