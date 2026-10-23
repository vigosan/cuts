# Carousel Cutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A macOS Electron app to drop a long session video, mark clips by ear, and export them numbered, with optional 1 s fades and Instagram output formats.

**Architecture:** electron-vite project with three entry points (main, preload, renderer). Pure logic lives in `src/shared` (time, clips, formats) and `src/main` (range parsing, ffmpeg args, progress parsing) and is unit-tested. The main process serves the video through a `media://` protocol with Range support streamed from disk, and runs Homebrew ffmpeg per clip. The renderer is React 19 + Tailwind v4.

**Tech Stack:** Electron 45, electron-vite 6, Vite 8, React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), Vitest 5 + Testing Library + jsdom, electron-builder, Homebrew ffmpeg.

**Spec:** `docs/superpowers/specs/2026-10-23-carousel-cutter-design.md`

## Global Constraints

- Never read the source video into memory; protocol responses are `fs.createReadStream` with `start`/`end`.
- `MAX_CLIP_SECONDS = 59`, inclusive.
- `FADE_SECONDS = 1`; video `fade` + audio `afade`, in at 0, out at `duration - 1`.
- Output names: `<base>-<n>.mp4`, n starting at 1 in list order.
- Formats: `original`, `4:5` 1080x1350, `1:1` 1080x1080, `9:16` 1080x1920; center crop then scale; frame rate kept.
- Encoding: `-ss <start>` before `-i`, `-t <duration>`, `h264_videotoolbox -b:v 12M`, `aac -b:a 320k`, `-movflags +faststart`.
- ffmpeg resolved from `/opt/homebrew/bin/ffmpeg` then `/usr/local/bin/ffmpeg`.
- Zero code comments, `data-testid` selectors, Makefile targets.

## Review Focus

- Clip shorter than 2 s with fades on: fades must clamp to half the duration (never negative `st`). Test in Task 3.
- "Mark end" before "Mark start" or at a time before the start: rejected, no clip added. Test in Task 4.
- Range header open-ended (`bytes=1000-`) or beyond file size: served correctly / 416. Test in Task 2.
- Output files already existing: confirm before overwriting. Handled in Task 6 (main dialog).
- Paths with spaces (his files are `2026-10-22 22-33-13.mov`): args passed as array, protocol URL-encoded. Test in Tasks 2 and 3.

---

### Task 1: Scaffold + shared clip logic

**Files:** `package.json`, `electron.vite.config.ts`, `tsconfig*.json`, `vitest.config.ts`, `Makefile`, `.gitignore`, `src/shared/clips.ts`, `src/shared/clips.test.ts`

**Produces:**
- `MAX_CLIP_SECONDS = 59`, `FADE_SECONDS = 1`
- `type Clip = { id: string; start: number; end: number }`
- `clipDuration(c: Clip): number`, `isOverLimit(c: Clip): boolean`
- `formatTime(seconds: number): string` → `HH:MM:SS` (`00:09:44`)
- `formatDuration(seconds: number): string` → `M:SS` (`0:59`, `1:05`)
- `outputFileName(base: string, index: number): string` → `${base}-${index+1}.mp4`
- `defaultBaseName(path: string): string` → file name without extension

Tests: 59.0 not over limit, 59.01 over; formatTime(584) = `00:09:44`; formatDuration(65) = `1:05`; outputFileName('sesion', 0) = `sesion-1.mp4`; defaultBaseName('/Users/x/Movies/2026-10-22 22-33-13.mov') = `2026-10-22 22-33-13`.

### Task 2: Range parsing + media protocol

**Files:** `src/main/range.ts`, `src/main/range.test.ts`, `src/main/media-protocol.ts`

**Produces:** `parseRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null` (null = no header → full file). `mediaUrl(path)` in `src/shared/media-url.ts` → `media://file/<encodeURIComponent(path)>`. `registerMediaProtocol()` handles `media://` returning 206 with `Content-Range`, `Accept-Ranges: bytes`, `Content-Length`, content type by extension.

Tests: `bytes=0-99` → 0..99; `bytes=1000-` → 1000..size-1; `bytes=-500` → size-500..size-1; end beyond size clamps; start ≥ size → `'invalid'`; garbage → `'invalid'`; mediaUrl round-trips a path with spaces.

### Task 3: ffmpeg args, formats, progress

**Files:** `src/shared/formats.ts`, `src/main/ffmpeg-args.ts`, `src/main/ffmpeg-args.test.ts`, `src/main/ffmpeg.ts`, `src/main/ffmpeg.integration.test.ts`

**Produces:**
- `type OutputFormat = 'original' | '4:5' | '1:1' | '9:16'`, `FORMATS: { id: OutputFormat; label: string; width?: number; height?: number }[]`
- `buildFfmpegArgs(o: { input: string; output: string; start: number; end: number; fade: boolean; format: OutputFormat }): string[]`
- `parseProgressSeconds(chunk: string): number | null` (reads `out_time_us=`)
- `findFfmpeg(exists: (p: string) => boolean): string | null`
- `runFfmpeg(ffmpeg: string, args: string[], onSeconds: (s: number) => void): Promise<void>`

Video filter: crop `crop='min(iw,ih*W/H)':'min(ih,iw*H/W)',scale=W:H,setsar=1` then fades. Fade length `min(FADE_SECONDS, duration/2)`.

Tests: original + no fade → no `-vf`/`-af`; `-ss` precedes `-i`; `-t` equals end-start; fade on 59 s clip → `fade=t=out:st=58:d=1` and `afade=t=out:st=58:d=1`; 1.5 s clip → `d=0.75`; `4:5` contains `scale=1080:1350`; input with spaces is a single array element. Integration: generate 4 s 320x180 testsrc+sine fixture, export 1..3 with `4:5` + fade, ffprobe shows 1080x1350 and duration ≈ 2 s (±0.1).

### Task 4: Clip state

**Files:** `src/renderer/src/useClips.ts`, `src/renderer/src/clips-reducer.ts`, `src/renderer/src/clips-reducer.test.ts`

**Produces:** `clipsReducer(state: ClipsState, action)` with `ClipsState = { clips: Clip[]; pendingStart: number | null }`, actions `markStart(time)`, `markEnd(time)`, `remove(id)`, `setStart(id,time)`, `setEnd(id,time)`, `reset()`. `markEnd` without pendingStart or with time ≤ pendingStart → state unchanged. `setStart`/`setEnd` that would make end ≤ start → unchanged.

### Task 5: UI

**Files:** `src/renderer/src/App.tsx`, `components/DropZone.tsx`, `components/Player.tsx`, `components/Timeline.tsx`, `components/ClipList.tsx`, `components/ExportPanel.tsx`, `App.test.tsx`

Layout per sketch: player, timeline with clip blocks (red if over limit), mark buttons (I / O keys, space play/pause, ←/→ 5 s), clip table (play ▶ seeks to start, set start/end from playhead, delete), export panel (fade checkbox default on, format select default Original, base name, folder chooser, export button disabled when no clips / any over limit / no folder). Renderer calls `window.api` (typed in `src/preload/api.ts`).

Tests (mocked `window.api`): marking start at 10 and end at 70 shows a row with `1:00` flagged and export disabled; deleting it re-enables nothing until valid clip exists; export calls `api.exportClips` with base name, folder, fade, format and clips in order.

### Task 6: IPC, export runner, packaging

**Files:** `src/main/index.ts`, `src/main/export.ts`, `src/preload/index.ts`, `src/preload/api.ts`, `electron-builder.yml`, `Makefile`

`window.api`: `pathForFile(file: File): string`, `openVideo(): Promise<string|null>`, `chooseFolder(): Promise<string|null>`, `exportClips(req): Promise<ExportResult>`, `onExportProgress(cb: (p: { index: number; ratio: number }) => void): () => void`, `reveal(path: string)`. Export runs clips sequentially, confirms overwrite via `dialog.showMessageBox` when any target exists, errors (ffmpeg missing, ffmpeg failure) returned as `{ ok: false, error }` and shown in UI.

`make install | dev | test | lint | build | app` — `app` builds with electron-builder `--dir` and copies `Carousel Cutter.app` to `/Applications`.

Verification: `make test` passes, `make build` succeeds, launching the app loads the real 2.5 GB `.mov` and exports a clip.
