---
name: release
description: Cut a Cuts release (patch, minor or major) with curated Spanish and English release notes. Use when the user asks to release, ship, publish or "sacar" a new version of Cuts.
argument-hint: patch | minor | major
disable-model-invocation: true
---

Cut a Cuts release. Bump level: `$ARGUMENTS`. It must be exactly `patch`, `minor` or `major`; if it is anything else (or empty), stop and ask.

Pushing the tag `vX.Y.Z` runs `.github/workflows/release.yml`: it builds Mac, Windows and Linux, publishes them to `vigosan/cuts-releases` (the website download and the in-app auto-update both read from there), updates the Homebrew cask in `vigosan/homebrew-cuts`, and leaves the Microsoft Store package as the `store-appx` run artifact. The Mac App Store and Microsoft Store submissions stay manual (step 6).

Work directly on `master` for this flow: the release is two small commits and a tag pushed straight from it. If other sessions are committing in the main checkout, pull first and keep the window between pull and push short.

## 1. Preflight

- The working tree must be clean apart from untracked files that are not part of the release, and the branch must be `master`. Run `git pull --ff-only origin master`. Abort on any failure.
- Run what CI runs, from the repo root, and abort on anything red. Never release over a failing check:
  - `npm run lint`
  - `npm run typecheck --workspaces`
  - `make test` (builds the bundled ffmpeg first if it is missing)

## 2. Compute the new version

- Current version: `node -p "require('./apps/desktop/package.json').version"`.
- Derive the next version for the requested bump yourself. Do not bump anything yet: the release notes need it first.

## 3. Curate the release notes

- List everything since the last release: `git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges`.
- Keep ONLY user-facing changes to the desktop app: new features and meaningful changes to existing ones. Exclude refactors, tests, CI and release plumbing, dependency bumps, recording and screenshot scripts, and web-only commits (`apps/web`). Collapse related commits into one item.
- Write from the user's point of view: what they can now do, or what stops going wrong. Never name what they cannot see (state, components, IPC, codecs as code). Match the tone and length of the existing items in `docs/release/nueva-version.md`.
- Add a section to `docs/release/nueva-version.md`, newest first, right above the previous `## Novedades de la …`:
  - **minor / major**: `## Novedades de la X.Y`.
  - **patch**: `## Novedades de la X.Y.Z`. App Store Connect asks for "what's new" text on every version, patches included.
  - Each section has `### Español` and `### English` with the same items in the same order.
- If nothing user-facing changed since the last tag, say so, do not write a section, and ask whether to release anyway. Never pad the notes with filler.
- Commit the notes on their own: `Add the X.Y release notes` (or `X.Y.Z` for a patch).

## 4. Bump the version

- `npm version X.Y.Z --no-git-tag-version -w apps/desktop`. It changes `apps/desktop/package.json` and the root `package-lock.json`; check that `git status` shows exactly those two.
- Commit: `Set version X.Y.Z`.
- **minor / major only**: set `VERSION` in `apps/web/content.ts` to `"X.Y"` (it shows next to the website download), then commit `Show version X.Y next to the website download`. A patch leaves it alone.

## 5. Tag and push

- Lightweight tag on the version commit, as the previous releases: `git tag vX.Y.Z`. The workflow fails if the tag does not match `apps/desktop/package.json`.
- `git push origin master && git push origin vX.Y.Z`. `origin` is SSH; if a push is rejected, stop and report it instead of retrying with other flags.
- Confirm the run started: `gh run list --workflow=release.yml --limit 1`. Do not block on `gh run watch`; check its status once or twice if the user asks.

## 6. Report

Report the new version, the release notes added (or that none were warranted), and the Actions URL. A complete run publishes `Cuts-mac.dmg`, `Cuts-mac.zip`, `Cuts-windows.exe`, `Cuts-linux.AppImage`, the `latest*.yml` files and their blockmaps to `vigosan/cuts-releases`.

Then list what is left for the user, by hand, following `docs/release/nueva-version.md` and `docs/release/microsoft-store.md`:

- Mac App Store: `APPLE_TEAM_ID=TKAZA7ZPZ2 make mas`, upload `apps/desktop/dist/mas-universal/Cuts-mac.pkg` with Transporter, try it in TestFlight, then create version X.Y.Z in App Store Connect with the notes from step 3. Only possible if the previous version is no longer waiting for or in review.
- Microsoft Store: download the `store-appx` artifact from the run and submit it.
