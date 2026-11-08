# Audio Recordings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open an audio-only recording in Cuts, give it a looping video or still background, and export clips and the full recording (with optional real waveform and progress bar), plus a 16:9 format and a full-recording export for every source.

**Architecture:** The audio file stays the "input" everywhere (sessions, waveform, suggestions, playback through the existing media element). The background is a second visual source copied into app data like the overlay PNG; the renderer treats it as the video for framing and preview. Audio exports go through a new `buildAudioArgs` beside `buildFfmpegArgs`, so video-source args do not change.

**Tech Stack:** TypeScript 7, Vitest + Testing Library, React 19 + Tailwind v4 (Electron renderer), bundled LGPL FFmpeg (`h264_videotoolbox`, `showwaves`), Swift (iPhone format table only).

**Spec:** `docs/superpowers/specs/2026-11-08-audio-recordings-design.md`

## Global Constraints

- Work in a git worktree, never switch branches in the main checkout (other sessions commit there).
- TDD: every task starts with a failing test. Test names say why the behaviour matters.
- No code comments. Selectors: `data-testid`.
- Commit titles: one descriptive line, no body, no `feat:`/`fix:`. One task = one commit.
- Before each commit: `npm test --workspaces`, `npm run typecheck --workspaces`, `npm run lint`. Task 1 also `make mobile-test`.
- With a video open, `buildFfmpegArgs` output for clips is byte-for-byte what it is today.
- Audio extensions `wav mp3 m4a aac flac aif aiff`; background extensions `mov mp4 m4v png jpg jpeg`; background size limit 500 MB.
- Waveform: white 30 %, width 52 %, height 7.4 %, bottom at 86 %, ends faded over 22 %. Progress bar: white 80 %, height `max(2, round(H × 0.0037))`, bottom edge.
- Output 30 fps for audio exports. Bitrate 4M for audio recordings, 12M otherwise.
- Labels EN/ES: "Background"/"Fondo", "Add a background"/"Añade un fondo", "Waveform"/"Onda", "Progress bar"/"Barra de progreso", "Export full recording"/"Exportar grabación completa", "16:9 YouTube · 1920×1080" (both).
- Background and the two toggles are global preferences only; never in per-video sessions.

## Review Focus

1. **Background loop shorter than the clip** — a 2 s loop under a 10 s clip must give a 10 s file whose picture keeps moving, not a 2 s file or a frozen last frame. Test in Task 4.
2. **Still image background** — a PNG background must still produce a 30 fps video exactly as long as the audio span. Test in Task 4.
3. **Background copy removed** (app data cleared) — preview fails to load the background, it is cleared from preferences and the empty state returns instead of every export failing. Test in Task 6.
4. **Audio opened while a background is set, then a video opened** — Background row, toggles and audio args disappear for the video; its export args are today's. Test in Task 6.
5. **Full recording of a 2 h file** — progress ratio uses the full duration and cancel removes the partial `-full.mp4`. Test in Task 5.

---

### Task 1: 16:9 format on Mac and iPhone

**Files:**
- Modify: `packages/core/src/formats.ts`, `packages/core/src/i18n.ts` (both `formats` maps)
- Modify: `apps/mobile/modules/cuts-media/ios/CutsMedia/Sources/CutsMedia/ExportJob.swift:50-53`
- Test: `packages/core/src/formats.test.ts` (create), the existing Swift ExportJob tests

**Interfaces:**
- Produces: `OutputFormat` gains `'16:9'`; `formatSize('16:9')` → `{ width: 1920, height: 1080 }`, listed last in `FORMATS`.

- [ ] **Step 1: Write the failing tests:** `formatSize('16:9')` equals `{ width: 1920, height: 1080 }` ("YouTube needs full HD landscape"); `FORMATS.at(-1)?.id === '16:9'`. Swift: an export job with format `"16:9"` renders 1920×1080.
- [ ] **Step 2: Run** `npm test -w packages/core -- formats` and `make mobile-test` — Expected: FAIL.
- [ ] **Step 3: Implement** the entry, both labels `'16:9 YouTube · 1920×1080'`, and `"16:9": CGSize(width: 1920, height: 1080)`.
- [ ] **Step 4: Run** the full gate — Expected: PASS (typecheck catches every `Record<OutputFormat, …>`).
- [ ] **Step 5: Commit** spec, plan and change: `git commit -m "Add a 16:9 full HD format for YouTube"`

### Task 2: Audio files are openable media

**Files:**
- Modify: `apps/desktop/src/shared/video-formats.ts`, `apps/desktop/src/main/media-protocol.ts` (`CONTENT_TYPES`), `apps/desktop/src/main/index.ts` (open dialog filter, `savePoster`)
- Test: `apps/desktop/src/shared/video-formats.test.ts`, `apps/desktop/src/main/media-protocol.test.ts`

**Interfaces:**
- Produces: `AUDIO_EXTENSIONS: string[]`, `BACKGROUND_EXTENSIONS: string[]`, `mediaKind(name: string): 'video' | 'audio' | null`, `isSupportedMedia(name: string): boolean` (replaces `isSupportedVideo` at its callers).

- [ ] **Step 1: Write the failing tests:** `mediaKind('set.WAV') === 'audio'`, `mediaKind('a.mov') === 'video'`, `mediaKind('notes.txt') === null`; media protocol serves `.wav` as `audio/wav`, `.mp3` `audio/mpeg`, `.m4a` `audio/mp4`, `.flac` `audio/flac`, `.aif/.aiff` `audio/aiff`, `.jpg/.jpeg` `image/jpeg`.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- video-formats media-protocol` — Expected: FAIL.
- [ ] **Step 3: Implement.** Dialog filter lists video + audio extensions under the existing `videoFilter` label (rename text to "Videos and audio"/"Vídeos y audio"). `savePoster` returns early for audio.
- [ ] **Step 4: Run** the gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Let Cuts open audio recordings like videos"`

### Task 3: Background import

**Files:**
- Create: `apps/desktop/src/main/background.ts`, `apps/desktop/src/main/background.test.ts`
- Modify: `apps/desktop/src/main/index.ts` (IPC + media allow-list), `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/api.ts`

**Interfaces:**
- Produces (in `shared/api.ts`): `type BackgroundKind = 'video' | 'image'`, `type ImportedBackground = { path: string; kind: BackgroundKind; name: string }`, `type ExportBackground = { path: string; kind: BackgroundKind }`, Api methods `chooseBackground(): Promise<ImportedBackground | 'invalid' | 'too-big' | null>`, `importBackgroundFile(file: File): Promise<ImportedBackground | 'invalid' | 'too-big'>`.
- Produces (in `background.ts`): `importBackground(source: string, dir: string, deps: BackgroundDeps): Promise<ImportedBackground | 'invalid' | 'too-big'>`, `isOwnedBackground(path: string, dir: string): boolean`, `BACKGROUND_MAX_BYTES = 500 * 1024 * 1024`. `BackgroundDeps` = `OverlayDeps` minus `read`, plus `size(path): Promise<number>` and `copy(from, to): Promise<void>` (stream copy, files can be large).

- [ ] **Step 1: Write the failing tests:** an `.mp4` is copied to `dir/background-<now>.mp4` with kind `video` and the previous background removed; a `.JPG` gives kind `image`; `.gif` → `'invalid'`; 600 MB → `'too-big'` and nothing copied; `isOwnedBackground` false for a path outside `dir`.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- background` — Expected: FAIL.
- [ ] **Step 3: Implement** following `overlay.ts`. IPC `choose-background` / `import-background`; `handleMediaProtocol` also allows `isOwnedBackground(path, backgroundsDir)` with `backgroundsDir = userData/backgrounds`.
- [ ] **Step 4: Run** the gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Import a looping video or still image as the background for audio recordings"`

### Task 4: FFmpeg args for audio recordings

**Files:**
- Modify: `apps/desktop/src/main/ffmpeg-args.ts`
- Test: `apps/desktop/src/main/ffmpeg-args.test.ts`, `apps/desktop/src/main/ffmpeg.integration.test.ts`

**Interfaces:**
- Consumes: `ExportBackground` (Task 3).
- Produces: `type AudioExtras = { waveform: boolean; progressBar: boolean }`, `type AudioCutOptions = CutOptions & { background: ExportBackground; extras: AudioExtras; bitrate: string; frame: Size }` (`frame` = background size, used when format is `'original'`), `buildAudioArgs(o: AudioCutOptions, platform?: NodeJS.Platform): string[]`. Also `bitrate` becomes an optional field of `CutOptions` defaulting to `'12M'`.

Input order: `0` background (`-stream_loop -1 -i` for video, `-loop 1 -framerate 30 -i` for image), `1` audio (`-ss start -i`), `2` overlay PNG if any. Graph: background → framing → overlay → waveform overlay → progress overlay → `fps=30` → image fades → `[v]`; audio → audio fades → `asplit` (only when waveform) → `[a]` and showwaves. Output `-t duration -map [v] -map [a]`, same encoder/audio/progress flags as clips.

- [ ] **Step 1: Write the failing arg tests:** image background uses `-loop 1 -framerate 30` and video uses `-stream_loop -1`; audio input carries `-ss`; `-t` equals clip length; with `waveform:false, progressBar:false` the graph has no `showwaves` and no `color=`; with overlay, the PNG is input `2` (`[2:v]`); progress bar `x` expression divides `t` by the clip length; `-b:v` follows `bitrate`; `buildFfmpegArgs` output for an existing test case is unchanged.
- [ ] **Step 2: Write the failing integration tests** (real ffmpeg, generated fixtures like the existing ones): a 2 s `testsrc` loop under a 10 s sine `.wav` exports a 10 s ± 0.1 s file at 1920×1080, 30 fps, and frames at 1 s and 7 s differ ("a short loop keeps moving"); a PNG background exports 6 s at 30 fps; with waveform on and a loud tone, the pixel at (50 %, 82 %) is brighter than the background; with progress bar on, at the file's midpoint the pixel at (25 %, last row) is light and at (75 %, last row) is not.
- [ ] **Step 3: Run** `npm test -w apps/desktop -- ffmpeg` — Expected: FAIL.
- [ ] **Step 4: Implement** `buildAudioArgs`, reusing `framingFilters` and `fadeFilters`. Waveform: `showwaves=s=<0.52W>x<0.074H>:mode=cline:rate=30:scale=sqrt:draw=full:colors=white`, then `format=rgba,geq` alpha `alpha(X,Y)*0.3*min(1,min(X,W-X)/(0.22*W))`, overlaid at `x=(W-w)/2:y=0.86*H-h`. Progress: `color=c=white@0.8:s=<W>x<h>:r=30` overlaid at `x='-W+W*t/<duration>':y=H-h:eval=frame`. Sizes from `formatSize(format)`; for `'original'` use `o.frame`.
- [ ] **Step 5: Run** the gate — Expected: PASS.
- [ ] **Step 6: Commit:** `git commit -m "Build FFmpeg args that put audio recordings over a looping background with waveform and progress bar"`

### Task 5: Export routing and full recording

**Files:**
- Modify: `packages/core/src/clips.ts` (+ test), `packages/core/src/i18n.ts`, `apps/desktop/src/shared/api.ts`, `apps/desktop/src/main/export.ts`, `apps/desktop/src/main/index.ts` (`export-clips` passes `ownedBackground`)
- Test: `apps/desktop/src/main/export.test.ts`

**Interfaces:**
- Consumes: `buildAudioArgs`, `AudioExtras` (Task 4), `ExportBackground` (Task 3).
- Produces: `fullFileName(base: string): string` → `` `${base}-full.mp4` ``. `ExportRequest` gains `kind: 'clips' | 'full'`, `background: ExportBackground | null`, `extras: AudioExtras`, `frame: Size`. With `background` set, `exportClips` uses `buildAudioArgs` with bitrate `'4M'`; otherwise `buildFfmpegArgs` with `'12M'`. With `kind: 'full'` the single clip is written to `fullFileName`. New message `t.backgroundMissing` ("Add a background to export this recording" / "Añade un fondo para exportar esta grabación") when the input is audio and `background` is null.

- [ ] **Step 1: Write the failing tests:** `fullFileName('set')` → `'set-full.mp4'`; a `full` request writes `folder/set-full.mp4` and asks before overwriting it; with a background the args contain `-stream_loop` and `-b:v 4M`; without, args equal today's; progress for a 7200 s full clip reports `ratio 0.5` at 3600 s; cancelling mid-way removes `set-full.mp4` and returns the cancelled message; a background path outside `backgrounds/` is dropped by `index.ts` (request goes out with `background: null` and export refuses with the "add a background" message for audio input).
- [ ] **Step 2: Run** `npm test -w apps/desktop -- export` and `npm test -w packages/core -- clips` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Export audio recordings over their background and the full recording as one file"`

### Task 6: Audio recordings in the UI

**Files:**
- Modify: `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/preferences.ts`, `apps/desktop/src/renderer/src/components/ExportPanel.tsx`, the filmstrip/timeline component that calls `thumbnail`, `packages/core/src/i18n.ts`
- Test: `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: `mediaKind` (Task 2), `chooseBackground` / `importBackgroundFile` (Task 3), `ExportRequest` fields (Task 5).
- Produces: preferences gain `background: ImportedBackground | null` and `extras: AudioExtras` (default `{ waveform: true, progressBar: false }`).

- [ ] **Step 1: Write the failing tests** (mocked `window.api`, `data-testid`s in brackets):
  - dropping `set.wav` opens it; the stage shows the empty state [`background-empty`] and export [`export`] is disabled ("there is no picture to export yet").
  - adding a background via [`background-add`] shows [`background-name`], a muted looping `<video>` [`background-video`] (or `<img>` [`background-image`] for a JPG) in the stage, and enables export.
  - toggles [`extras-waveform`] (checked) and [`extras-progress`] (unchecked) appear only for audio; the export request carries `extras`, `background`, `frame`.
  - the timeline never calls `api.thumbnail` for an audio recording.
  - the background element's `error` event clears the background and shows the empty state (Review Focus 3).
  - open audio with a background set, then open a video: no Background row, no toggles, request has `background: null` (Review Focus 4).
  - `chooseBackground` resolving `'too-big'` shows the notice "That file is over 500 MB" / "Ese archivo supera los 500 MB".
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — Expected: FAIL.
- [ ] **Step 3: Implement.** For audio, `videoSize` comes from the background element's natural size; the existing `<video>` keeps playing the audio input and stays hidden. Background row and toggles go right after the Overlay row with its styles.
- [ ] **Step 4: Run** the gate, then `make dev` and check a WAV with the XTV loop by eye — Expected: PASS, preview loops, timeline shows waveform.
- [ ] **Step 5: Commit:** `git commit -m "Open audio recordings with a background, waveform and progress bar options"`

### Task 7: Export full recording button

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/ExportPanel.tsx`, `apps/desktop/src/renderer/src/App.tsx`, `packages/core/src/i18n.ts`, `README.md` ("What it does")
- Test: `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: `ExportRequest.kind` (Task 5).

- [ ] **Step 1: Write the failing tests:** [`export-full`] is enabled with a video open and no clips marked; clicking it sends one clip `{ start: 0, end: duration, position: 0 }` with `kind: 'full'` and the default settings' fades; while exporting it is disabled like [`export`]; for an audio recording without background it is disabled.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — Expected: FAIL.
- [ ] **Step 3: Implement** a secondary button under the export button, same progress and result notice as clips.
- [ ] **Step 4: Run** the gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Add Export full recording for videos and audio recordings"`

### Task 8: Waveform colour and opacity

Added on 2026-11-08 at Vicent's request, after Tasks 1–7.

**Files:**
- Modify: `apps/desktop/src/shared/api.ts` (`AudioExtras`), `apps/desktop/src/main/ffmpeg-args.ts`, `apps/desktop/src/renderer/src/preferences.ts`, `apps/desktop/src/renderer/src/components/ExportPanel.tsx`, `packages/core/src/i18n.ts`
- Test: `apps/desktop/src/main/audio-args.test.ts`, `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Produces: `AudioExtras = { waveform: boolean; progressBar: boolean; color: string; opacity: number }`, defaults `color: '#ffffff'`, `opacity: 0.3`; `WAVE_OPACITIES = [0.1, 0.3, 0.5, 0.8, 1]`.

- [ ] **Step 1: Write the failing tests:** `colors=0x4da8ff` and `alpha(X,Y)*0.5*` for `{ color: '#4DA8FF', opacity: 0.5 }`; progress bar `color=c=0x4da8ff@0.8`; a colour that is not `#rrggbb` (e.g. `'red;drawtext'`) falls back to white so nothing reaches the filter graph; opacity outside 0.1–1 is clamped. App: [`extras-color`] and [`extras-opacity`] appear only for audio and their values reach the export request.
- [ ] **Step 2: Run** `npx vitest run audio-args App.test` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Let the waveform take any colour and opacity"`
