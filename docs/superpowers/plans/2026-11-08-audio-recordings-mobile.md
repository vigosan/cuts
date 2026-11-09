# Audio Recordings on iPhone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Mac 1.9 features to Cuts for iPhone: audio recordings with a background, placeable waveform and progress bar with colour and opacity, full-recording export, Export again after changes, and one export button with options.

**Architecture:** Shared shapes move to `@cuts/core` (`AudioExtras`, layer defaults already there). The Swift package gains testable pieces (asset kind, background store, audio samples, layer drawing, an audio export path in `Exporter`); the Expo module only bridges them. The RN editor keeps background and layers in global preferences, builds richer `ExportJob`s, and extends `Stage` and the export sheet.

**Tech Stack:** Expo SDK 58 + React Native, expo-video, react-native-gesture-handler 3.3, vitest + jest-expo, Swift (AVFoundation, Core Image, Swift Testing), ffmpeg for fixtures.

**Spec:** `docs/superpowers/specs/2026-11-08-audio-recordings-mobile-design.md`

## Global Constraints

- Work in the `mobile-audio` worktree. TDD, test names say why. No code comments. testIDs kebab-case.
- Commit titles: one line, no body, no prefix. One task = one commit.
- Gate before each commit: `npm test --workspaces`, `npm run typecheck --workspaces`, `npm run lint`, and `cd apps/mobile && npx jest` plus `swift test --package-path apps/mobile/modules/cuts-media/ios/CutsMedia` (or `make mobile-test`).
- Audio extensions: wav, mp3, m4a, aac, flac. Background: mov, mp4, m4v, png, jpg, jpeg, from Photos or Files, ≤ 500 MB, one copy in Application Support/backgrounds.
- Layer geometry, defaults and clamping come only from `@cuts/core/audio-layers` and `@cuts/core/overlay`.
- Defaults: waveform and bar off; waveform white 0.3; bar white 0.8. Opacities `[0.1, 0.3, 0.5, 0.8, 1]`.
- Audio exports: 30 fps, 4 Mb/s. Video exports unchanged (12 Mb/s). Full recording file `<name>-full.mp4`.
- Video-source clip exports must render byte-for-byte as today (existing ExporterTests stay green untouched).

## Review Focus

1. **Two-hour WAV full export** — memory stays bounded (2 kHz mono samples, streamed writer), progress reaches 1, cancel removes the file. Test in Task 3 (memory proxy: samples array length for a 2 h duration computed, not allocated in the test).
2. **Background shorter than the clip** — picture keeps moving after the loop point. Test in Task 3.
3. **Audio recording reopened from Recents after the background copy was deleted** — empty state returns, export disabled, no crash. Test in Task 5.
4. **Pinch with overlay and waveform both present** — only the active layer scales. Test in Task 5.
5. **Video opened after an audio session with background and layers on** — no background row, video export job carries no background/layers. Test in Task 4.

---

### Task 1: Open audio recordings

**Files:** `modules/cuts-media/ios/CutsMedia/Sources/CutsMedia/Library.swift` (add `AssetKind`, `mediaInfo`), `modules/cuts-media/ios/CutsMediaModule.swift` (`pickAudio`, `openFile` uses `mediaInfo`), `modules/cuts-media/index.ts`, `src/media.ts`, `src/screens/Home.tsx`, `src/components/RecentRow*`, `src/editor/sessions.ts`, `scripts/make-fixtures.sh` (+ `set.wav`, 12 s sine with kicks), core i18n `mobile.chooseAudio` ("Choose audio from Files" / "Elegir audio de Archivos"). Tests: `Tests/CutsMediaTests/LibraryTests.swift` (create), `src/screens/Home.test.tsx`.

**Interfaces — Produces:** Swift `enum AssetKind: String { case video, audio }`, `func mediaInfo(asset: AVURLAsset) async throws -> (kind: AssetKind, duration: Double, size: CGSize, frameRate: Double)` (audio: size `.zero`, frameRate 30; neither track → `LibraryError.notAVideo`). JS `AssetInfo.kind: 'video' | 'audio'`, `pickAudio(): Promise<string | null>`, `Recent.kind?: 'video' | 'audio'`.

- [ ] Tests: `mediaInfo` on `set.wav` → kind audio, duration ≈ 12; on `set.mp4` → video 640×360; Home "Choose audio" button (`choose-audio`) calls `pickAudio` and opens the cut route; a recent with kind audio shows `recent-audio-${id}` and no poster request.
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Open audio recordings from Files on iPhone".

### Task 2: Background store

**Files:** create `Sources/CutsMedia/Backgrounds.swift`, bridge `pickBackground(source)` in `CutsMediaModule.swift` (Files: `[.movie, .png, .jpeg]` asCopy; Photos: `PHPicker` filter `.any(of: [.videos, .images])`), `modules/cuts-media/index.ts` (`backgroundDir` constant), `src/media.ts`. Test: `Tests/CutsMediaTests/BackgroundsTests.swift`.

**Interfaces — Produces:** Swift `struct StoredBackground: Codable { path: String; kind: String; name: String; width: Double; height: Double }`, `func storeBackground(from: URL, in dir: URL, now: Int) throws -> StoredBackground` throwing `BackgroundError.invalid | .tooBig` (limit `500 * 1024 * 1024`). JS `type Background = { path: string; kind: 'video' | 'image'; name: string; width: number; height: number }`, `pickBackground(source: 'photos' | 'files'): Promise<Background | 'invalid' | 'too-big' | null>`, `backgroundUri(path)`.

- [ ] Tests: mp4 copied as `background-<now>.mp4`, kind video, size 640×360, previous removed; JPG → image with pixel size; gif → invalid; size over limit → tooBig with nothing copied (inject size via a `size:` closure parameter).
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Store a looping video or image as the background on iPhone".

### Task 3: Audio export in Swift

**Files:** create `Sources/CutsMedia/AudioSamples.swift`, `Sources/CutsMedia/Layers.swift`; modify `ExportJob.swift` (`BackgroundSpec`, `LayerSpec`, `bitrate`), `Exporter.swift` (audio path), `CutsMediaModule.swift` (`JobRecord` fields), `scripts/make-fixtures.sh` (+ `loop.mp4` 2 s testsrc 320×180, `still.png` 320×180, `black.mp4` 2 s). Test: `Tests/CutsMediaTests/AudioExportTests.swift`.

**Interfaces — Produces:**
- `struct BackgroundSpec: Codable { url: URL; isImage: Bool; width: Double; height: Double }`, `struct LayerSpec: Codable { x, y, width: Double; color: String; opacity: Double }`; `ExportJob` gains `background: BackgroundSpec?`, `wave: LayerSpec?`, `bar: LayerSpec?`, `bitrate: Int` (default 12_000_000).
- `func readSamples(asset: AVAsset, range: CMTimeRange, rate: Double = 2000) async throws -> [Int16]` (mono).
- `struct Layers { func wave(samples: ArraySlice<Int16>, size: CGSize, color: CIColor, opacity: Double) -> CIImage; func bar(progress: Double, size: CGSize, color: CIColor, opacity: Double) -> CIImage }` — wave columns: amplitude `sqrt(|s|/32768)`, alpha × `min(1, min(x, w−x)/(0.22w))`.
- Exporter: when `job.background != nil`, build an `AVMutableComposition` with the background video track inserted repeatedly to cover `length` (image: a generated 1 s black H.264 placeholder, applier substitutes the image), the recording's audio over `start..<end`; the applier runs `fade(bar(wave(overlay(render(base)))))` using `Framer`; frame duration 1/30; average bitrate `job.bitrate`. Wave size `even(W·w)` × `max(2, even(waveW·WAVE_ASPECT))`, bar height `max(2, round(barW/480))`, positions from x/y (Core Image y up). Colour parsed from `#rrggbb`, anything else white.
- [ ] Tests (mirror the Mac integration tests, fixtures above, outputs via `Inspect`): 2 s loop under a 10 s clip of `set.wav` → 10 s ± 1/30, 30 fps, frames at 4.5 s and 5 s differ; still background → 6 s, last-second frame exists; waveform on over `black.mp4`, pixel at (50 %, 82 %) brighter than (50 %, 30 %) by 30; bar at the mid frame lit at 25 % width and dark at 75 % on the last row; bar colour `#ff0000` gives a red pixel; `readSamples` over 2 s returns 4000 samples; video-source jobs still pass every existing ExporterTest.
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Export audio recordings over a looping background with waveform and progress bar on iPhone".

### Task 4: Editor state and jobs

**Files:** `packages/core/src/audio-layers.ts` (move `AudioExtras` + `DEFAULT_EXTRAS` + `WAVE_OPACITIES` here; desktop `@shared/api` re-exports them), `src/editor/preferences.ts`, `src/editor/export-jobs.ts`, `src/media.ts` (`withLayers` flattening), `src/editor/session.tsx` (`background`, `extras`, `setBackground`, `setExtras`, `outdated`). Tests: `packages/core/src/audio-layers.test.ts`, `src/editor/export-jobs.test.ts`, `src/editor/preferences.test.ts`.

**Interfaces — Produces:** core `type AudioExtras` (same fields as desktop today), `DEFAULT_EXTRAS`, `WAVE_OPACITIES`. `exportJobs(..., overlay?, audio?: { background: Background; extras: AudioExtras; frame: Size })` adds `background`, `wave`, `bar` (placements clamped, null when off) and `bitrate: 4_000_000`; `fullJob(duration, settings, format, baseName, overlay?, audio?) => ExportJob` with `fileName` `-full.mp4`, `videoFadeIn: true`. Session: `exporting` is reported as idle when any of `[clips, clipSettings, defaultSettings, format, baseName, overlay, background, extras]` changed since the export started.

- [ ] Tests: jobs for audio carry background and clamped wave/bar, `bitrate` 4 M; waveform off → `wave` undefined; video asset → no background/layers even with preferences set (Review Focus 5); `fullJob` name and fade-in; preferences round-trip background and extras with defaults off; desktop suite unchanged.
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Keep background and audio layers in the iPhone editor and build their export jobs".

### Task 5: Stage with background and layers

**Files:** `src/components/Stage.tsx` (background view, empty state `background-empty`, `WaveLayer`/`BarLayer`, active layer), `src/screens/Cut.tsx`, `src/components/Timeline.tsx` (no thumbnails for audio). Tests: `src/components/Stage.test.tsx`, `src/screens/Cut.test.tsx`.

**Interfaces — Consumes:** Task 4 session fields. **Produces:** `Stage` props `background?: Background | null`, `extras?: AudioExtras`, `onExtras?(e)`, `onAddBackground?()`.

- [ ] Tests: audio without background → `background-empty` pressable calls `onAddBackground`; with video background → muted looping player (`background-video`), image → `background-image`; waveform on → `wave` box at `overlayBox(previewFrame(...), defaultWavePlacement)`; pan on `wave` reports a moved placement; with overlay and wave, touching wave then pinching scales only wave (Review Focus 4); bar fill width follows `time / duration`; background image load error clears the background (Review Focus 3); audio timeline never calls `thumbnail`.
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Show the background, waveform and progress bar on the iPhone stage".

### Task 6: Export sheet rows

**Files:** `src/components/ExportSheet.tsx`, `src/screens/ExportClips.tsx`, bridge `pickColor(initial: string): Promise<string | null>` (UIColorPickerViewController) in `CutsMediaModule.swift` + `index.ts` + jest mock. Tests: `src/components/ExportSheet.test.tsx`.

- [ ] Tests: rows only for audio; `background-add` offers Photos/Files (ActionSheet) and stores the pick; `too-big`/`invalid` show the core messages; switches `extras-waveform`/`extras-progress` default off; when on, `extras-color`/`bar-color` call `pickColor` and `extras-opacity-0.5` etc. set opacity; without background `start-export` disabled with `t.backgroundMissing`.
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Add background, waveform and progress bar rows to the iPhone export sheet".

### Task 7: One export button and full recording

**Files:** `src/screens/Cut.tsx` (main + chevron `export-menu` → ActionSheetIOS), `src/editor/session.tsx` (`startExport` accepts `'full'`), `src/editor/export-run.ts`, `src/components/ExportSheet.tsx` (title/labels for full). Tests: `src/screens/Cut.test.tsx`, `src/editor/export-run.test.ts`.

- [ ] Tests: no clips → `export` reads `t.exportFull` and opens the sheet for a full export; with clips, `export-menu` offers `t.exportClips(n)` and `t.exportFull`; full export runs one job with `-full.mp4` and saves it to the album; after done, changing a layer shows `start-export` again (Export again); while running the chevron is hidden.
- [ ] Run (FAIL) → implement → run (PASS) → gate → commit "Make the iPhone export button offer clips or the full recording".
