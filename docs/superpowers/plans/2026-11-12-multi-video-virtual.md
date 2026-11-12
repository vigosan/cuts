# Multi-video Sessions Without Joining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the join step of multi-video sessions with playback of the original videos back to back, with a "Not found" placeholder and Locate… for missing videos.

**Architecture:** A multi-video session is identified by `session:<joinKey(paths)>` instead of a joined file; its `Session` JSON now stores `sources`. The renderer keeps one `<video>` whose `src` is the source under the playhead, and a `useSessionClock` hook converts between session time and (source, local time) for transport, clip loop, playhead, thumbnails and waveform. Exports send each clip's own `input` with local times; the full export concatenates the sources with scaling.

**Tech Stack:** TypeScript 7, Vitest + Testing Library, React 19 + Tailwind v4 (Electron renderer), bundled FFmpeg.

**Spec:** `docs/superpowers/specs/2026-11-12-multi-video-virtual-design.md`

## Global Constraints

- Work in a git worktree, never switch branches in the main checkout (other sessions commit there).
- TDD: every task starts with a failing test. Test names say why the behaviour matters.
- No code comments. Selectors: `data-testid`.
- Commit titles: one descriptive line, no body, no `feat:`/`fix:`. One task = one commit.
- Before each commit: `npm test --workspaces`, `npm run typecheck --workspaces`, `npm run lint`. Tasks touching `packages/core` also `make mobile-test` (restore `apps/mobile/fixtures/set-swift-peaks.json` if it regenerates).
- A single video behaves exactly as today: `OpenResult` `{ ok: true, path: <file>, sources: [] }`, session key `sha256(path)`, Recents entry dropped when the file is gone, no placeholder. Existing single-video tests pass unchanged.
- Nothing joins or copies originals; `userData/joined/` is deleted on launch.
- Kept from the previous build: joins and names on the timeline, X (confirm when clips), +, clips confined to one video, row source + local times, order by name (`orderVideos`), audio stays single-file, export subfolder from the first video kept across X/+.
- Locate… accepts a file whose duration is within 0.5 s of the stored one.
- Copy EN/ES (remove `joiningVideos`, `cannotJoin`, `videoMissing`):
  - `notFound(name)`: "Not found: {name}" / "No encontrado: {name}"
  - `locate`: "Locate…" / "Localizar…"
  - `locateMismatch(name)`: "{name} doesn’t match the missing video." / "{name} no coincide con el vídeo que falta."
  - `skipMissingConfirm(count, skipped)`: "Export {count} clips and skip {skipped} from missing videos?" / "¿Exportar {count} clips y saltar {skipped} de vídeos que faltan?"
  - `fullNeedsAllVideos`: "Some videos are missing." / "Faltan vídeos."
  - `fullMixesHdr`: "The full recording mixes HDR and non-HDR videos." / "La grabación completa mezcla vídeos HDR y no HDR."

## Review Focus

1. **Playing through a join while a clip loop is active** — "play all clips" with clips in videos 1 and 3 jumps between sources and keeps looping; the playhead never shows the wrong video's time. Test in Task 3.
2. **The last video ends** — playback stops at the session end instead of restarting or jumping to video 1. Test in Task 3.
3. **A video goes missing mid-session** (drive unplugged): the `<video>` error turns that stretch into the placeholder and playback continues in the next available video; no crash, clips kept. Test in Task 5.
4. **Moved folder** — opening the same files from a new folder restores the saved clips through the names + durations match, and the old session file is removed. Test in Task 2.
5. **Portrait clip in a landscape session** — the clip exports with its own size and orientation, and the full export fits it into the first video's frame. Integration test in Task 6.

---

### Task 1: Session time across sources in core

**Files:**
- Modify: `packages/core/src/parts.ts`, `packages/core/src/parts.test.ts`

**Interfaces:**
- Produces:
  - `type Part = { duration: number; missing?: boolean }` (extends the existing type).
  - `joinPeaks(peaks: (Float32Array | null)[], durations: number[], peaksPerSecond: number): Float32Array` — each source padded or trimmed to `round(duration × peaksPerSecond)`; `null` (missing or failed) becomes zeros.
  - `nextAvailable(parts: Part[], from: number): number | null` — first index ≥ `from` whose part is not missing.
  - `partStarts`, `localTime`, `partBoundsAt`, `confineMoment`, `removePart`, `orderVideos` unchanged.

- [ ] **Step 1: Write the failing tests:** `joinPeaks([a(3 peaks), null, b(5 peaks)], [0.1, 0.04, 0.08], 50)` has length 5 + 2 + 4 = 11 with zeros for the null part and `b` trimmed ("the waveform must line up with session time even when a file is short or missing"); `nextAvailable([{1}, {1, missing}, {1}], 1)` → 2; `nextAvailable(…, 3)` → null.
- [ ] **Step 2: Run** `npm test -w packages/core -- parts` — Expected: FAIL.
- [ ] **Step 3: Implement** in `parts.ts`.
- [ ] **Step 4: Run** the full gate plus `make mobile-test` — Expected: PASS.
- [ ] **Step 5: Commit** spec, plan and change: `git commit -m "Add session waveform and next available video helpers"`

### Task 2: Open multi-video sessions without joining

**Files:**
- Modify: `apps/desktop/src/main/join.ts` (keep `parseMediaInfo`, `joinKey`; remove `concatList`, `joinArgs`, `firstMismatch`), `apps/desktop/src/main/join.test.ts`, delete `apps/desktop/src/main/join.integration.test.ts`
- Modify: `apps/desktop/src/main/open-videos.ts`, `apps/desktop/src/main/open-videos.test.ts`, `apps/desktop/src/main/sessions.ts`, `apps/desktop/src/main/sessions.test.ts`, `apps/desktop/src/main/recents.ts`, `apps/desktop/src/main/recents.test.ts`, `apps/desktop/src/main/index.ts`, `apps/desktop/src/shared/api.ts`, `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`; delete `apps/desktop/src/renderer/src/components/JoiningVideos.tsx`; `packages/core/src/i18n.ts` (remove joining copy)

**Interfaces:**
- Produces (in `shared/api.ts`):
  - `type Source = { path: string; name: string; duration: number; width: number; height: number; hdr: boolean; missing: boolean }` — `width`/`height` are display size (rotation applied); `hdr` true when the pixel format names `bt2020`, `smpte2084` or `arib-std-b67`.
  - `type OpenResult = { ok: true; path: string; sources: Source[] }` — `path` is the file for a single video and `session:<joinKey(paths)>` for several; the `ok: false` branch is removed.
  - `Session` gains `sources?: Source[]` (saved by the renderer for multi-video sessions).
  - `Api.openVideos(paths: string[], replacing: string | null, carry?: Session): Promise<OpenResult>`, `Api.checkSources(paths: string[]): Promise<boolean[]>` (exists and readable), `Api.locateVideo(duration: number): Promise<{ path: string } | 'mismatch' | null>`.
  - `parseMediaInfo` returns `{ duration, width, height, rotation, hdr, video, audio }`.
- Behaviour: `openVideos` with one path (or any audio) is today's single path. With several: probe each existing path (missing ones get `missing: true` and the duration/size stored in a matching saved session, else 0); save `carry` under the new id before removing `replacing`'s session when `replacing` starts with `session:`; when no session exists for the id, look for a saved session whose `sources` have the same names and durations (within 0.5 s), re-save it under the new id with the new paths and remove the old file. Recents: a multi entry `{ path: 'session:<key>', sources, bookmarks? }`, named first + " +N", listed while any source exists; `open-recent` restores it with missing sources flagged. Every existing path is added to the allow-list. `userData/joined/` is removed on launch. The renderer drops `JoiningVideos` and the failure notices and loads results directly.

- [ ] **Step 1: Write the failing tests:** `open-videos.test.ts` — two videos open with `path` `session:<key>` and no ffmpeg join; a missing second video comes back `missing: true` with the duration from its saved session; carry saved under the new id before the old `session:` file is removed; opening the same names/durations from another folder restores the saved clips and deletes the old session file (Review Focus 4); one video still returns `{ path, sources: [] }`. `join.test.ts` — `parseMediaInfo` on the portrait HDR fixture gives `width 1080, height 1920, rotation -90, hdr true`. `recents.test.ts` — a multi entry stays listed when one source is gone and drops when all are gone. App: choosing three files loads the first source in the video element without any joining overlay.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- open-videos join recents sessions App` — Expected: FAIL.
- [ ] **Step 3: Implement** the main changes, API/preload, recents (poster from the first clip of the first available source), and the minimal `App.tsx` adaptation: `<video src>`, `frameRate`, `waveform` and thumbnails use the first available source's path when `sources.length > 0` (never the `session:` id, which is not a file); session saved with `sources`.
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Open multi-video sessions from the original videos"`

### Task 3: Playback across videos

**Files:**
- Create: `apps/desktop/src/renderer/src/useSessionClock.ts`, `apps/desktop/src/renderer/src/useSessionClock.test.ts`
- Modify: `apps/desktop/src/renderer/src/useTransport.ts`, `apps/desktop/src/renderer/src/useClipLoop.ts`, `apps/desktop/src/renderer/src/components/Timeline.tsx` (playhead), `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 `localTime`, `partStarts`, `nextAvailable`; Task 2 `Source`.
- Produces: `useSessionClock(videoRef, parts: { path: string; duration: number; missing?: boolean }[]): { src: string; index: number; now(): number; seekTo(time: number): void; onLoadedMetadata(): void; onEnded(): void }` — `now()` = current part start + `video.currentTime`; `seekTo` switches `src` when the time is in another part and applies the local time once metadata loads, resuming play if it was playing; `onEnded` moves to `nextAvailable(parts, index + 1)` at local 0, or stays paused at the session end when there is none; seeking into a missing part shows that part (Task 5 draws it) with the video paused. For a single video `parts` is `[{ path: videoPath, duration }]`. `useTransport(now, seekTo, videoRef, duration)` and `useClipLoop({ videoRef, clips, playing, now, seekTo })` take the clock instead of reading `currentTime`; `Timeline` gets `now: () => number` for its playhead. Frame stepping uses `frameRate` of the source under the playhead (re-read when `index` changes).

- [ ] **Step 1: Write the failing tests:** `useSessionClock.test.ts` with a fake video element: `seekTo(65)` over parts 60/30 sets `src` to part 2 and `currentTime` 5 after `onLoadedMetadata`; `now()` reads 65; `onEnded` on part 1 moves to part 2 and keeps playing; `onEnded` on the last part stays at the session end (Review Focus 2); `onEnded` skips a missing part. App: "play all clips" with clips in videos 1 and 3 switches sources and loops (Review Focus 1); I/O marks and frame stepping use session time across a join; single-video transport tests unchanged.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- useSessionClock App` — Expected: FAIL.
- [ ] **Step 3: Implement** the hook and switch `useTransport`, `useClipLoop`, the playhead and `onTimeUpdate` to it.
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Play a multi-video session across its videos"`

### Task 4: Filmstrip and waveform across videos

**Files:**
- Modify: `apps/desktop/src/renderer/src/useVideoPreview.ts`, `apps/desktop/src/renderer/src/useVideoPreview.test.ts`, `apps/desktop/src/renderer/src/components/Timeline.tsx`, `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/main/index.ts` (waveform cache per path)

**Interfaces:**
- Consumes: Task 1 `joinPeaks`, `localTime`; Task 3 parts.
- Produces: `useWaveform(parts: { path: string; duration: number; missing?: boolean }[]): { peaks: Float32Array | null; analysing: boolean }` — one `api.waveform` per available part, joined with `joinPeaks`; `useThumbnails(requests: { path: string; time: number }[]): Map<string, string>` keyed `` `${path}|${time}` ``; Timeline maps each tile's session time to `{ path, time: local }` and skips missing parts. The main waveform cache keeps one entry per path.

- [ ] **Step 1: Write the failing tests:** `useVideoPreview.test.ts` — two parts call `waveform` for both paths and return joined peaks of the right length; a missing part yields zeros without calling `waveform`; thumbnails request the second video's local time for a tile past the join. Single-video hooks keep their behaviour.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- useVideoPreview App` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Draw the filmstrip and waveform from every video of a session"`

### Task 5: Missing video placeholder and Locate

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/Timeline.tsx`, `apps/desktop/src/renderer/src/components/ClipList.tsx`, `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`, `apps/desktop/src/main/index.ts` (`check-sources`, `locate-video` handlers), `packages/core/src/i18n.ts`

**Interfaces:**
- Consumes: Task 2 `Api.checkSources`, `Api.locateVideo`, `Source.missing`; Task 3 clock.
- Produces: a missing source's stretch renders `missing-<i>` (hatched, `notFound(name)`, button `locate-<i>` with `locate`); the preview shows `preview-missing` with `notFound(name)` while the playhead is in it; rows of clips in missing sources get `clip-unavailable-<n>`. `sources` are re-checked with `checkSources` on window `focus` and after a `<video>` `error` on the current source; a source turning available clears its placeholder. Locate: `locateVideo(source.duration)` → `{ path }` replaces that source's path through `openVideos(newPaths, videoPath, carry)`; `'mismatch'` shows `locateMismatch(name)`.

- [ ] **Step 1: Write the failing tests:** a session with a missing middle video shows `missing-1` with its name and keeps its clips (`clip-unavailable-<n>`); a `<video>` `error` on the current source marks it missing and playback moves on (Review Focus 3); a window `focus` after `checkSources` reports it back clears the placeholder; Locate with a matching file reloads with the new path and the same clips; Locate `'mismatch'` shows the notice and keeps the placeholder.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — Expected: FAIL.
- [ ] **Step 3: Implement** the placeholder (app tokens, matching the timeline style), preview message, re-check and Locate (main handler probes with `parseMediaInfo`, compares durations within 0.5 s, allows the path).
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Show missing videos as placeholders you can locate"`

### Task 6: Export from the original videos

**Files:**
- Modify: `apps/desktop/src/shared/api.ts`, `apps/desktop/src/main/export.ts`, `apps/desktop/src/main/export.test.ts`, `apps/desktop/src/main/ffmpeg-args.ts`, `apps/desktop/src/main/ffmpeg-args.test.ts`, `apps/desktop/src/main/index.ts` (`export-clips` checks every input is allowed), `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`, `packages/core/src/i18n.ts`
- Create: `apps/desktop/src/main/concat.integration.test.ts` (follow `ffmpeg.integration.test.ts`)

**Interfaces:**
- Consumes: Task 1 `localTime`; Task 2 `Source` (`width`, `height`, `hdr`, `missing`).
- Produces: `ExportClip` gains `input?: string` and `frame?: Size` (local `start`/`end` when set); `ExportRequest` gains `inputs?: { path: string; duration: number }[]` for a multi-video full export; `buildConcatArgs(o: CutOptions & { inputs: { path: string; duration: number }[]; frame: Size })` in `ffmpeg-args.ts` scales and pads each input into `frame` (keeping aspect), adds silent audio for inputs without audio, then applies the same fades, framing and overlay as `buildFfmpegArgs`. Renderer: clips export with their source path, local times and source size; clips in missing sources are left out after `skipMissingConfirm(count, skipped)` (Cancel exports nothing); the full export is disabled with `fullNeedsAllVideos` when any source is missing and with `fullMixesHdr` when sources mix `hdr` values; export frame uses the source under the playhead and is disabled there when it is missing.

- [ ] **Step 1: Write the failing tests:** `export.test.ts` — a clip with `input` runs ffmpeg on that input with its local times; `ffmpeg-args.test.ts` — `buildConcatArgs` for 1920x1080 + 1080x1920 inputs scales both into 1920x1080 with padding; integration — joining a 320x180 and a 180x320 test video gives a 320x180 file whose duration is the sum within one frame (Review Focus 5); App — exporting with one missing video asks `skipMissingConfirm` and sends only the others; the full-export button is disabled with each reason; a clip in a portrait source exports with frame 1080x1920.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- export ffmpeg-args concat App` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Export multi-video sessions from the original videos"`

### Task 7: Website copy

**Files:**
- Modify: `apps/web/content.ts`, `apps/web/content.test.ts`

- [ ] **Step 1:** Update the multi-video item to drop "joins them without re-encoding": EN "On Mac, open all the videos of a session at once: each name shows on the timeline and you cut from all of them." / ES "En Mac, abre todos los vídeos de una sesión a la vez: cada nombre aparece en la línea de tiempo y cortas de todos." Adjust `content.test.ts` if it pins the old text.
- [ ] **Step 2: Run** the apps/web tests — Expected: PASS.
- [ ] **Step 3: Commit:** `git commit -m "Describe multi-video sessions without joining on the website"`
