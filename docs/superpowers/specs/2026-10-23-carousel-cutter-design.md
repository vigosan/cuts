# Carousel Cutter — design

## Intent

Vicent records long DJ sessions (e.g. `~/Movies/2026-10-22 22-33-13.mov`: 1h21m, 1280x720 @ 60fps, H.264/AAC, 2.5 GB). For each session he posts an Instagram carousel with ~6 clips of his best mixes. Today he opens the file in Final Cut, picks each clip by ear, and exports them one by one. That is slow. This app replaces that workflow: drop the video, mark clips while listening, export them all at once with numbered names.

## Goals

- macOS desktop app (Electron + React + TypeScript + Vite + Tailwind v4, Vitest), launched from the Dock / Finder like any app.
- Drag a video file onto the window to load it. Also a "choose file" button as fallback.
- Must handle multi-GB files smoothly: the file is **never** read into memory. Playback streams from disk with HTTP-style range reads so seeking is instant anywhere in an 80+ minute file. Memory use stays flat regardless of file size.
- Player with play/pause, seek bar, current time, and keyboard-friendly scrubbing (space = play/pause, arrows = small seek).
- Clip marking: "Mark start" sets the in-point at the current playhead, "Mark end" sets the out-point and adds the clip to the list. Clip boundaries are chosen freely by the user; clips can be any length up to the limit.
- Clip list is the carousel order (Vicent, 2026-10-24): rows can be reordered by drag and drop; position 1 is the cover (no image fade-in) and output numbering follows the list. Fades are per clip (Vicent, 2026-10-24): clicking a row selects it and the fade controls under the list edit only that clip; with no selection they apply to all clips. On the selected row, clicking a time moves it to the playhead; on other rows it only selects. Image fade: black / white / none; audio fade: natural (qsin curve) / linear / none. Fades and the cover are shown on the timeline blocks and list rows with icons, no explanatory text. Each clip shows number, start, end, duration. Clicking a clip seeks to its start for preview. Clips can be deleted and their start/end re-set from the current playhead. Clips are numbered in list order (order added); no reordering needed in v1.
- Duration limit: 59 s inclusive (constant in one place). My call: Instagram's carousel max is 60 s, but re-encoding can add a few ms (AAC padding), and 59 s is what Vicent already uploads successfully. A clip over the limit is shown in red as a warning; export is still allowed (Vicent: a clip may be for a regular post, which can be longer).
- Export: destination defaults to ~/Movies/Carousel Cutter/<video name>/ (created on export; Vicent, 2026-10-24) and can be changed with the native folder dialog; and a base name (default: source file name without extension). Output files: `<base>-1.mp4`, `<base>-2.mp4`, … Export all clips in one action, showing per-clip progress and a done state with a "show in Finder" action.
- Fades: separate "Imagen" and "Audio" switches (both on by default) plus a shared length of 0.5 / 1 / 2 s (default 1 s), applied to every clip (Vicent, 2026-10-24). Original behavior: Each clip gets a 1 s fade in from black and a 1 s fade out to black on the video, plus a matching 1 s audio fade in from silence and fade out to silence (ffmpeg `fade` + `afade`, out-fade starting at duration − 1 s). Duration stays fixed at 1 s (constant in one place). Exception (Vicent): the first clip has no image fade-in, because Instagram uses its first frame as the carousel cover; its image fade-out and audio fades stay. My call: one global toggle, not per clip; fade to black, not crossfade.
- Output format selector next to export, applied to all clips:
  - Original (default): same resolution and frame rate, no crop, no scaling.
  - 4:5 — 1080x1350 (Instagram carousel/feed max).
  - 1:1 — 1080x1080.
  - 9:16 — 1080x1920 (Reels/Stories).
  - Non-original formats: center crop to the target aspect ratio (fill, no black bars), then scale to the target size. My call.
  - Frame rate always kept. MP4 container, H.264 video, AAC audio.
- Frame-accurate cuts: re-encode each clip (not stream copy, which snaps to keyframes and can shift the start by seconds). Use `h264_videotoolbox` (hardware) with a high bitrate (decision: ~10 Mbps for 720p, scale reasonably if source is larger); AAC 320k. Use input-side `-ss` + `-t` so ffmpeg seeks directly without scanning the file.

## Non-goals

- No manual crop positioning (crop is always centered), no captions, overlays, or audio processing beyond the fades above.
- No waveform display in v1 (he picks by ear).
- No uploading to Instagram.
- No project saving / reopening sessions.
- No Windows/Linux support. No code signing / notarization (personal use).

## Anti-goals

- Loading the whole file into memory or copying it anywhere before playback/export.
- Cuts that start/end somewhere other than where he marked.
- Exported clips with an aspect other than the one selected, or degraded quality noticeable on Instagram.

## Constraints

- ffmpeg: use the Homebrew install (`/opt/homebrew/bin/ffmpeg`, confirmed present with `h264_videotoolbox` and `libx264`). Apps launched from the Dock don't inherit the shell PATH, so resolve by absolute path (check `/opt/homebrew/bin` then `/usr/local/bin`); if not found, show a clear error. Not bundling ffmpeg is my call (personal machine, already in his Brewfile).
- Source files are typically `.mov` H.264/AAC from his recording setup; Chromium plays these. If a file can't play, show an error rather than failing silently.
- Video served to the renderer via a custom Electron protocol that supports Range requests (implemented with `fs` streams, not by reading the file).
- File path from drag-and-drop obtained via `webUtils.getPathForFile` in the preload; renderer never gets general fs access (contextIsolation on, minimal IPC: open dialog, choose folder, export with progress events, reveal in Finder).
- Global dev rules apply: TDD, zero code comments, `data-testid` selectors, Makefile for common commands.

## Decided by Vicent

- Mac app, Electron + React.
- Pick clips by listening; he chooses both start and end of each clip.
- Clips can be shorter than 59 s; enforce Instagram's limit.
- Output format configurable: original or Instagram sizes.
- Output named `<name>-1`, `-2`, … in a chosen folder.
- Must cope with multi-GB files.
- 1 s fade in/out on both image and audio.

## Left to the builder

- Electron tooling (e.g. electron-vite), packaging tool (electron-builder or Forge) and producing a `.app` to put in `/Applications` via a `make` target.
- Exact UI layout and styling (dark, simple, player on top, clip list below is the expectation).
- Testing split: unit tests for pure logic (time formatting, clip validation, ffmpeg argument building, output naming, range parsing); component tests for the clip list/marking flow; one integration test running real ffmpeg on a tiny generated fixture.
- Behavior if output files already exist (suggestion: ask before overwriting).
