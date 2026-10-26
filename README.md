# Cuts

Mac app that turns a long recording into short clips, ready for an Instagram carousel. Drag in a video, mark where each clip starts and ends (or let Cuts suggest the best moments), and it exports them all at once, numbered in carousel order.

Website: [cuts.vicent.io](https://cuts.vicent.io)

## What it does

- Mark clips while you listen: <kbd>I</kbd> and <kbd>O</kbd> for in and out, <kbd>Space</kbd> to play.
- Timeline with thumbnails and waveform, zoom and drag; clips with adjustable edges.
- Fine-tune from the keyboard: <kbd>,</kbd> <kbd>.</kbd> one frame (with <kbd>⇧</kbd>, one second) and <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>.
- ✦ Suggest moments: detects the drops in a set (the mix dipping and coming back) and proposes up to 10 clips spread across the set.
- Per-clip video and audio fades, and per-clip framing in 4:5, 1:1 and 9:16.
- Listen to the whole carousel on a loop and share the exported clips to Photos or AirDrop.
- Remembers the work for each video, with undo and redo.
- In English and Spanish. Everything happens on the Mac: no accounts, no uploads, no analytics.

## Tech

Electron + electron-vite, React 19, TypeScript and Tailwind CSS v4. Tests with Vitest and Testing Library. Packaged with electron-builder (universal arm64 + x86_64 app). Clips are exported with an FFmpeg bundled in the app, built from the official source without GPL components (LGPL v2.1 license).

## Getting started

Requirements: macOS with Xcode Command Line Tools, and Node.js with npm.

```bash
make install   # dependencies
make ffmpeg    # builds the universal LGPL FFmpeg into apps/desktop/resources/ffmpeg (takes a while, first time only)
make dev       # app in development mode
```

## Commands

| Command | What it does |
|---|---|
| `make dev` / `npm run dev:desktop` | Desktop app locally |
| `make test` | All tests |
| `make lint` | Linter (oxlint) |
| `make typecheck` | Type checking |
| `cd apps/desktop && npm run app` | Builds an unsigned `apps/desktop/dist/mac-universal/Cuts.app` |
| `make app` | Same, and also copies it to `/Applications` (replacing the installed one) |
| `APPLE_TEAM_ID=… make mas` | Signed `.pkg` for the Mac App Store |
| `make icon` | Regenerates the icon |
| `make web` / `make web-dev` (`npm run dev:web`) | Website tests and build / website locally |

## Structure

```
apps/desktop/           desktop app (Electron)
  src/main/             main process: window, menu, FFmpeg, export, sessions
  src/preload/          secure bridge between the main process and the UI
  src/renderer/         React UI
  src/shared/           inter-process communication types and video URLs
  scripts/              FFmpeg build, icon, screenshots, local sandbox test
  build/                icon, entitlements and Mac App Store profile
apps/web/               cuts.vicent.io website (Next.js, deployed on Vercel)
packages/core/          UI-free logic: clips, fades, formats, framing, suggestions, undo, strings (i18n)
docs/                   Mac App Store release, privacy, languages
```

## Documentation

- [Publishing to the Mac App Store](docs/release/mac-app-store.md)
- [How to ship a new version](docs/release/nueva-version.md)
- [App Store listing](docs/release/app-store-listing.md)
- [Privacy](docs/release/privacy.md)
- [Languages](docs/i18n.md)
