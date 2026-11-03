# Cuts for iPhone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An iPhone app with every Cuts for Mac feature, adapted to touch. It opens a set from Photos, cuts it on one screen, and exports the carousel to a "Cuts" album in Photos.

**Architecture:**
- `apps/mobile` is an Expo app in TypeScript that imports `@cuts/core` unchanged.
- All media work lives in a Swift package, `CutsMedia`: audio peaks, thumbnails, export with AVFoundation, and Photos access. It builds for macOS and iOS, so `swift test` runs it on the Mac against generated fixture videos.
- A local Expo module, `modules/cuts-media`, wraps that package for JavaScript.
- The UI is built from pure TypeScript modules tested with Vitest, plus React Native components that carry `testID`s.

**Tech Stack:** Expo SDK 58 (react-native 0.88), expo-router, expo-video, expo-file-system, @shopify/react-native-skia 2.x, react-native-reanimated 4.x + react-native-worklets, react-native-gesture-handler 3.x, Swift 6 / AVFoundation / CoreImage / Photos, Vitest 5, @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-11-03-cuts-mobile-design.md`

## Global Constraints

- Bundle ID `com.vigosan.cuts` (same App Store record as the Mac app, universal purchase). Display name `Cuts`.
- iPhone only, portrait only. `ios.supportsTablet: false`.
- Exports: MP4, H.264 at 12 Mbps, AAC at 320 kbps, source frame rate, SDR Rec. 709 (HDR sources are tone-mapped).
- Formats come from `@cuts/core/formats`: original, 4:5 at 1080×1350, 1:1 at 1080×1080, 9:16 at 1080×1920.
- File names `<base>-<n>.mp4` from `outputFileName`; frame `<base>-0.jpg` from `frameFileName`. The base name always goes through `safeBaseName`.
- The first clip in the list (`position === 0`) has no image fade-in. This holds even when only some clips are exported.
- Peaks: mono, resampled to 2000 Hz, max |sample| / 32768 over every 40 samples, giving 50 per second (`PEAKS_PER_SECOND`).
- The fit background: the frame at quarter size, Gaussian blur σ=10, colour × 0.7, scaled up to fill. The foreground is the whole video, centred.
- Video fade colour is black or white; the audio fade is `audioGain` (natural = quarter-sine, or linear). Fade length is `min(fadeSeconds, clipLength / 2)`.
- Never copy the set into app storage. Never use file URLs that the picker copied.
- Every string in both `en` and `es` inside `packages/core/src/i18n.ts`. Its test checks that both locales have the same keys.
- Repo rules: TDD (red first), zero code comments, `testID` / `data-testid` selectors, `npm run lint` (oxlint) clean, commit titles in plain English without a prefix, one feature per commit.
- Work in a git worktree on branch `mobile`. Never switch branches in the main checkout.
- Tests never touch Vicent's real sets or the Photos library on his phone. Fixtures are generated into `apps/mobile/fixtures/` (gitignored).

## Review Focus

1. **Portrait or rotated phone video** (`preferredTransform` ≠ identity): the preview, crop frame, thumbnails and every export must show it upright. Tested in Task 3 and Task 4 with a fixture rotated 90°.
2. **A set that is only in iCloud:** opening it shows download progress and Cancel, and never hangs on a blank screen. Tested in Task 6 (`resolveAsset` progress events) and Task 8 (loading state).
3. **Clips close to or beyond the video's end, or shorter than twice the fade:** the export length equals the clip length to within one frame, and the fades are capped at half the clip. Tested in Task 4.
4. **Leaving the app or locking the phone mid-export:** the export stops cleanly with the Mac's "cancelled, N kept" message. No half-written clip is saved to Photos. Tested in Task 12.
5. **No audio track:** ✦ Suggest shows `suggestNoAudio`, the timeline draws without a waveform, and export still works with silence omitted. Tested in Task 2 and Task 4.

---

## File Structure

```
apps/mobile/
  app.json, package.json, tsconfig.json, vitest.config.ts, babel.config.js, metro.config.js
  app/_layout.tsx                 stack navigator, gesture root, i18n locale
  app/index.tsx                   Home screen
  app/cut/[assetId].tsx           Cut screen
  src/editor/marks.ts             Start here / End here → ClipsAction
  src/editor/editor.ts            editor reducer: clips history + clipSettings + selection
  src/editor/export-jobs.ts       clips → native export jobs
  src/editor/timeline-geometry.ts time ↔ x, pinch zoom, hit testing
  src/editor/sessions.ts          session + recents persistence (pure + storage adapter)
  src/editor/preferences.ts       remembered settings and format
  src/editor/export-run.ts        export loop: progress, stop, kept count
  src/i18n.ts                     resolveLocale(getLocales()) → messages
  src/components/*.tsx            UI pieces (one per file, listed in tasks)
  modules/cuts-media/             Expo module (expo-module.config.json, ios/*.swift, index.ts)
  native/CutsMedia/               Swift package: Package.swift, Sources/CutsMedia, Tests/CutsMediaTests
  scripts/make-fixtures.sh        generates fixture videos with ffmpeg
```

Makefile targets added at the root: `mobile-fixtures`, `mobile-test` (vitest + swift test), `mobile-ios` (prebuild + build + run on the simulator), `mobile-testflight`.

---

### Task 1: Scaffold apps/mobile

**Files:**
- Create: `apps/mobile/` (Expo app, the files above minus `src/components`), `apps/mobile/src/i18n.ts`, `apps/mobile/src/i18n.test.ts`
- Modify: root `package.json` (add `apps/mobile` to workspaces; add `apps/mobile/src apps/mobile/app` to the `lint` script), `Makefile`, `.gitignore` (`apps/mobile/ios`, `apps/mobile/android`, `apps/mobile/fixtures`, `native/CutsMedia/.build`)

**Interfaces:**
- Produces: `t: Messages` from `src/i18n.ts`, chosen with `resolveLocale(getLocales().map(l => l.languageTag))` (expo-localization).

- [ ] **Step 1:** Create the worktree: `git worktree add ../videos-instagram-mobile -b mobile`. Work there from now on.
- [ ] **Step 2:** Scaffold `npx create-expo-app@latest apps/mobile --template default@sdk-58`. Strip the template's demo screens. Set `app.json`: `name: "Cuts"`, `slug: "cuts"`, `ios.bundleIdentifier: "com.vigosan.cuts"`, `ios.supportsTablet: false`, `orientation: "portrait"`, `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`, `ios.infoPlist.LSApplicationQueriesSchemes: ["instagram"]`, the Photos usage strings `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` in English (Spanish via `locales`), and the icon from `apps/desktop/build/icon.svg` rendered to 1024 px PNG.
- [ ] **Step 3: Write the failing test** `src/i18n.test.ts`: `it('speaks Spanish to a Spanish phone')`. Mock `expo-localization` `getLocales` → `[{ languageTag: 'es-ES' }]` and expect `t.suggestMoments` to be `'Sugerir momentos'`.
- [ ] **Step 4:** Run `npx vitest run src/i18n.test.ts` in `apps/mobile`. Expected: FAIL (module missing).
- [ ] **Step 5:** Implement `src/i18n.ts`. Set up `vitest.config.ts` (node environment for `src/editor`, and the react-native preset for components in later tasks).
- [ ] **Step 6:** Run the test again. Expected: PASS. Then run `npm run lint` at the root. Expected: no warnings.
- [ ] **Step 7:** Run `make mobile-ios`, which is `cd apps/mobile && npx expo prebuild -p ios --clean && npx expo run:ios`. Expected: the app launches on an iPhone simulator showing an empty Home.
- [ ] **Step 8:** Commit "Start the Cuts iPhone app".

### Task 2: Audio peaks in Swift

**Files:**
- Create: `native/CutsMedia/Package.swift` (platforms macOS 15, iOS 18), `Sources/CutsMedia/Peaks.swift`, `Tests/CutsMediaTests/PeaksTests.swift`, `apps/mobile/scripts/make-fixtures.sh`, `apps/mobile/scripts/reference-peaks.mjs`

Note: the `native/CutsMedia` paths in this task and later ones are relative to `apps/mobile/`.

**Interfaces:**
- Produces: `public func readPeaks(asset: AVAsset) async throws -> [Float]?` returns `nil` when there is no audio track.
- Produces: fixtures `fixtures/set.mp4` and `fixtures/set-reference-peaks.json`.

`fixtures/set.mp4`: 10 min at 640×360 and 30 fps. Its audio is a synthetic set made with ffmpeg `aevalsrc`: a 124 BPM kick, and quiet breakdowns at 2:00 and 6:00 followed by drops. Also generated:
- `fixtures/silent.mp4`: no audio track.
- `fixtures/rotated.mp4`: 20 s at 360×640 with `-display_rotation 90`.
- `fixtures/hdr.mov`: 5 s of HLG HEVC.

`reference-peaks.mjs` runs the Mac pipeline (`waveformArgs` + `peaksFromSamples` from `apps/desktop/src/main/preview.ts`) with Homebrew ffmpeg.

- [ ] **Step 1: Write the failing tests.**
  - `testPeaksMatchMacPipeline`: read `set.mp4`. The count must equal the reference count ± 1, the mean |diff| must be < 0.01, and the max |diff| must be < 0.05.
  - `testNoAudioGivesNil`: `silent.mp4` returns nil.
- [ ] **Step 2:** Run `make mobile-fixtures && cd apps/mobile/native/CutsMedia && swift test --filter PeaksTests`. Expected: FAIL (`readPeaks` undefined).
- [ ] **Step 3:** Implement `readPeaks` with `AVAssetReaderAudioMixOutput` / track output. Output settings: LinearPCM, Int16, 1 channel, `AVSampleRateKey 2000`. Take the max |s| / 32768 per 40 samples, as in `peaksFromSamples`.
- [ ] **Step 4:** Run the tests again. Expected: PASS.
- [ ] **Step 5: Write the failing test** `apps/mobile/src/editor/suggest-parity.test.ts`. It loads `fixtures/set-reference-peaks.json` and `fixtures/set-swift-peaks.json`. The second file is written by `swift run cuts-media-cli peaks fixtures/set.mp4`, an executable target in the package that `make mobile-fixtures` runs. Both go through `suggestMoments` with `clipLength: 59`, `existing: []`. Expect the same number of moments, and every start to be within 0.75 s (one beat at the slowest tempo `beats.ts` allows).
- [ ] **Step 6:** Add the `cuts-media-cli` target, rerun the fixtures, then run the test. Expected: PASS.
- [ ] **Step 7:** Commit "Read audio peaks on iPhone the same way as on the Mac".

### Task 3: Thumbnails and frames in Swift

**Files:**
- Create: `Sources/CutsMedia/Frames.swift`, `Tests/CutsMediaTests/FramesTests.swift`

**Interfaces:**
- Produces: `public func thumbnail(asset: AVAsset, at seconds: Double, height: Int) async throws -> CGImage`. It is upright: `appliesPreferredTrackTransform = true`, with a tolerance of 0.5 s for the filmstrip.
- Produces: `public func frame(asset: AVAsset, at seconds: Double, job: FrameJob) async throws -> Data` returns JPEG at quality 0.95 with zero tolerance, rendered through the same `Framer` as export (Task 4). `FrameJob { format: String; framing: String; cropX: Double; cropY: Double }`.

- [ ] **Step 1: Write the failing tests.**
  - `testThumbnailIsUpright`: `rotated.mp4` at height 64 is portrait (height > width).
  - `testFrameUsesFormat`: a frame from `set.mp4` with 4:5 crop is 1080×1350.
- [ ] **Step 2:** Run `swift test --filter FramesTests`. Expected: FAIL.
- [ ] **Step 3:** Implement with `AVAssetImageGenerator`. `frame` renders via `Framer.render(image:)` from Task 4. Order: implement Task 4's `Framer` first, then come back to this task.
- [ ] **Step 4:** Run the tests again. Expected: PASS.
- [ ] **Step 5:** Commit "Make upright thumbnails and framed stills on iPhone".

### Task 4: Export clips in Swift

**Files:**
- Create: `Sources/CutsMedia/ExportJob.swift`, `Sources/CutsMedia/Framer.swift`, `Sources/CutsMedia/Exporter.swift`, `Tests/CutsMediaTests/ExporterTests.swift`

**Interfaces:**
- Produces:
  ```swift
  public struct ExportJob: Codable, Sendable {
    public var start: Double; public var end: Double
    public var format: String          // "original" | "4:5" | "1:1" | "9:16"
    public var framing: String         // "crop" | "fit"
    public var cropX: Double; public var cropY: Double
    public var videoFade: String       // "black" | "white" | "none"
    public var audioFade: String       // "natural" | "linear" | "none"
    public var fadeSeconds: Double
    public var videoFadeIn: Bool
    public var output: URL
  }
  public struct Framer { init(job: ExportJob, sourceSize: CGSize); var renderSize: CGSize; func render(image: CIImage) -> CIImage; func fade(image: CIImage, at seconds: Double, clipLength: Double) -> CIImage }
  public final class Exporter { public init(); public func export(asset: AVAsset, job: ExportJob, progress: @Sendable (Double) -> Void) async throws; public func cancel() }
  ```
  `sourceSize` is the upright size (natural size after `preferredTransform`). `renderSize` is the format size, or the upright source size for original.

- [ ] **Step 1: Write the failing tests.** Exporting from `set.mp4` unless noted.
  - `testLengthMatchesClip`: 30.0 → 89.0 gives a duration of 59.0 ± 1/30 s.
  - `testFormatSizeAndCodec`: 4:5 gives a 1080×1350 avc1 track, ≈ 30 fps, an AAC track, an estimated data rate of 12 Mbps ± 30%, and Rec. 709 primaries.
  - `testOriginalKeepsUprightSize`: `rotated.mp4` in original format is 360×640.
  - `testCoverStartsWithImage`: with `videoFadeIn: false`, the mean luma of the first frame is > 0.2. With true, it is < 0.05 for black fade, and > 0.95 for white.
  - `testShortClipCapsFade`: a 1.0 s clip with `fadeSeconds 5` gives a frame at 0.5 s whose luma is ≈ that of the source frame (the fade ends at the clip midpoint).
  - `testAudioFadeFollowsAudioGain`: natural fade over 2 s. The RMS of the 50 ms window at 0.5 s divided by the RMS at 5 s equals `sin(π/8)` ± 0.08, in the steady part of the fixture.
  - `testSilentSourceExportsVideoOnly`: `silent.mp4` gives no audio track and no error.
  - `testHdrBecomesSdr`: `hdr.mov` gives transfer function ITU_R_709_2.
  - `testCancelRemovesFile`: cancel at the first progress callback. It throws `CancellationError` and no file exists at `output`.
- [ ] **Step 2:** Run `swift test --filter ExporterTests`. Expected: FAIL.
- [ ] **Step 3:** Implement `Framer`.
  - Crop: crop the upright image to the target aspect at `(iw-ow)*cropX`, `(ih-oh)*cropY` (like `framingFilters`), then scale to the target size.
  - Fit: the background is the frame scaled to fill `(w/4, h/4)`, cropped, given `CIGaussianBlur` with radius 10, `CIColorMatrix` × 0.7 per RGB, and scaled to `(w, h)`. The foreground is scaled to fit and centred over it.
  - Fade: blend toward a solid black or white `CIImage` with alpha `1 - linear ramp`, over `min(fadeSeconds, length/2)`. Skip the fade-in when `!videoFadeIn`.
- [ ] **Step 4:** Implement `Exporter`.
  - Reading: `AVAssetReader` on the time range, with `AVAssetReaderVideoCompositionOutput` (a video composition built with `AVMutableVideoComposition(asset:applyingCIFiltersWithHandler:)` using `Framer`; colour primaries, transfer and matrix set to 709) and `AVAssetReaderAudioMixOutput`. The audio mix uses volume ramps of 20 segments per fade, sampled from the same curve as `audioGain`.
  - Writing: `AVAssetWriter` .mp4, H.264 `AVVideoAverageBitRateKey 12_000_000`, AAC 320 000 bit/s 44.1 kHz stereo, `shouldOptimizeForNetworkUse = true`.
  - Progress is the presentation time divided by the length. On cancel or error, delete the output.
- [ ] **Step 5:** Run the tests again. Expected: PASS.
- [ ] **Step 6: Write the failing test** `testSpeedOnMac`. Export six 59 s 4:5 crop clips from `set.mp4`, then log the seconds taken. This gives a baseline and no gate on the Mac; the real gate is Task 14.
- [ ] **Step 7:** Commit "Export clips on iPhone with the same framing and fades as the Mac".

### Task 5: Photos access in Swift

**Files:**
- Create: `Sources/CutsMedia/Library.swift`, `Tests/CutsMediaTests/LibraryTests.swift`

**Interfaces:**
- Produces:
  - `public func resolveAsset(id: String, progress: @Sendable (Double) -> Void) async throws -> AVURLAsset`. It uses `PHImageManager.requestAVAsset` with `isNetworkAccessAllowed = true` and `deliveryMode .highQualityFormat`, and passes progress through for iCloud downloads. No copy.
  - `public func saveToAlbum(files: [URL], album: String) async throws`. It creates the album named `"Cuts"` if missing and adds the files in array order.
  - `public func saveImageToAlbum(data: Data, album: String) async throws`.
  - `public struct AssetInfo { id, name, duration, width, height }` and `func info(id:) -> AssetInfo`. `name` is the original filename from `PHAssetResource`.
- [ ] **Step 1: Write the failing test** `testAlbumOrderIsInputOrder`. It covers the pure part: `func albumInsertionOrder(_ files: [URL]) -> [URL]` returns the input order. PhotoKit itself is exercised on the simulator in Task 8, never in `swift test`.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement. Run it again. Expected: PASS.
- [ ] **Step 3:** Commit "Read sets from Photos and save clips to a Cuts album".

### Task 6: The Expo module

**Files:**
- Create: `apps/mobile/modules/cuts-media/{expo-module.config.json, index.ts, ios/CutsMediaModule.swift, ios/CutsMediaView.swift, ios/CutsMedia.podspec}` (the podspec pulls in `native/CutsMedia/Sources`), `apps/mobile/src/media.ts`, `apps/mobile/src/media.test.ts`

**Interfaces:**
- Produces `src/media.ts`, the only JS entry to native code. Tests mock it.
  ```ts
  export type AssetInfo = { id: string; name: string; duration: number; width: number; height: number; uri: string }
  export function pickVideo(): Promise<string | null>                    // PHPicker, photoLibrary: .shared(), videos only → asset id
  export function openAsset(id: string, onDownload: (ratio: number) => void): Promise<AssetInfo>
  export function readPeaks(id: string): Promise<Float32Array | null>
  export function thumbnail(id: string, time: number, height: number): Promise<string>   // file uri in Caches/thumbs, cached by (id,time,height)
  export type ExportJob = { start: number; end: number; format: OutputFormat; framing: Framing; cropX: number; cropY: number; videoFade: VideoFade; audioFade: AudioFade; fadeSeconds: number; videoFadeIn: boolean; fileName: string }
  export function exportClip(id: string, job: ExportJob, onProgress: (ratio: number) => void): Promise<string>  // temp file uri
  export function cancelExport(): void
  export function saveToCutsAlbum(fileUris: string[]): Promise<void>
  export function saveFrame(id: string, time: number, job: Omit<ExportJob, 'start' | 'end' | 'videoFade' | 'audioFade' | 'fadeSeconds' | 'videoFadeIn'>): Promise<void>
  export function requestLibraryAccess(): Promise<'granted' | 'limited' | 'denied'>
  ```
- [ ] **Step 1: Write the failing test** `media.test.ts`: `it('gives peaks as Float32Array so core can read them')`. Mock the native module returning `number[]`. Expect `readPeaks` to resolve a `Float32Array` of the same values.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement the module and the wrappers. Run it again. Expected: PASS.
- [ ] **Step 3:** Run `make mobile-ios`. Expected: it builds; the module links.
- [ ] **Step 4:** Commit "Bridge the iPhone media code to the app".

### Task 7: Editor logic

**Files:**
- Create: `src/editor/marks.ts`, `src/editor/editor.ts`, `src/editor/export-jobs.ts`, `src/editor/timeline-geometry.ts`, `src/editor/preferences.ts`, `src/editor/sessions.ts`, each with its `.test.ts`

**Interfaces:**
- Consumes: `@cuts/core` (`clipsReducer`, `withHistory`, `dragClip`, `snapToBeat`, `suggestMoments`, `nextViewStart`, `viewStartForClip`, `DEFAULT_SETTINGS`, `outputFileName`, `safeBaseName`, `formatSize`).
- Produces:
  ```ts
  // marks.ts
  export function startHere(state: ClipsState, time: number, selectedId: string | null): ClipsAction
  export function endHere(state: ClipsState, time: number, selectedId: string | null, newId: string): ClipsAction
  // editor.ts
  export type EditorState = { history: History<ClipsState>; clipSettings: Record<string, ClipSettings>; defaultSettings: ClipSettings; selectedId: string | null; picked: string[] | null; magnet: boolean }
  export type EditorAction = ClipsAction | HistoryAction | { type: 'select'; id: string | null } | { type: 'settings'; change: Partial<ClipSettings> } | { type: 'magnet' } | { type: 'pickMode'; on: boolean } | { type: 'pick'; id: string } | { type: 'load'; session: Session | null; defaults: ClipSettings }
  export function editorReducer(state: EditorState, action: EditorAction): EditorState
  export function settingsOf(state: EditorState, id: string): ClipSettings
  // export-jobs.ts
  export function exportJobs(clips: Clip[], picked: string[] | null, settingsOf: (id: string) => ClipSettings, format: OutputFormat, baseName: string): ExportJob[]
  // timeline-geometry.ts
  export type View = { start: number; span: number; width: number }
  export function timeAt(view: View, x: number): number
  export function xAt(view: View, time: number): number
  export function pinch(view: View, duration: number, scale: number, focusX: number): View   // span clamped to [30, duration]
  export function hitClip(clips: Clip[], view: View, x: number, edgeSlop: number): { id: string; mode: DragMode } | null
  // preferences.ts
  export type Preferences = { settings: ClipSettings; format: OutputFormat }
  export function loadPreferences(store: KeyValue): Preferences; export function savePreferences(store: KeyValue, change: Partial<Preferences>): void
  // sessions.ts
  export type Session = { clips: Clip[]; clipSettings: Record<string, ClipSettings>; defaultSettings: ClipSettings; baseName: string }
  export type Recent = { assetId: string; name: string; duration: number; clips: number; openedAt: number }
  export type KeyValue = { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }
  export function loadSession(store: KeyValue, assetId: string): Session | null
  export function saveSession(store: KeyValue, assetId: string, session: Session): void
  export function recents(store: KeyValue): Recent[]; export function touchRecent(store: KeyValue, recent: Recent): void
  ```
  `KeyValue` is backed by `expo-sqlite/kv-store` (synchronous API) in the app, and by a `Map` in tests.

- [ ] **Step 1: Write the failing tests.** Each name states why the behaviour matters:
  - `marks`:
    - `'with nothing selected, Start then End makes a new clip'`
    - `'with a clip selected, Start here moves its start to the playhead'`
    - `'End here on a selected clip moves its end, not a new clip'`
  - `editor`:
    - `'changing settings with a clip selected only touches that clip'`
    - `'with nothing selected, settings change the defaults and every clip'` (as on the Mac)
    - `'split copies the clip settings to the new half'`
    - `'undo restores clips but keeps the selection valid'`: the selection is cleared if its clip is gone.
    - `'load merges stored settings over DEFAULT_SETTINGS'` (old sessions keep working)
  - `export-jobs`:
    - `'only the first clip in the list skips the image fade-in, even when exporting a subset'`
    - `'numbering follows list position'`: picking clips 2 and 4 gives `base-2.mp4` and `base-4.mp4`.
    - `'the base name is made safe'`
  - `timeline-geometry`:
    - `'pinch keeps the time under the fingers fixed'`
    - `'pinch never zooms past 30 s or out past the whole set'`
    - `'a touch near a clip edge grabs the edge, inside grabs the clip'`, with an edge slop of 16 pt.
  - `preferences`: `'a fresh install uses DEFAULT_SETTINGS and original'`
  - `sessions`:
    - `'an empty session is deleted, not stored'`
    - `'recents are newest first and capped at 10'`
- [ ] **Step 2:** Run `npx vitest run src/editor`. Expected: FAIL.
- [ ] **Step 3:** Implement. `editorReducer` wraps `withHistory(clipsReducer)` for the clip actions, and holds the rest beside it as the Mac's `App.tsx` does.
- [ ] **Step 4:** Run the tests again. Expected: PASS. Run lint. Expected: clean.
- [ ] **Step 5:** Commit "Give the iPhone app the Mac's editing rules".

### Task 8: Home screen and opening a set

**Files:**
- Create: `app/index.tsx`, `src/components/RecentRow.tsx`, `src/components/OpeningProgress.tsx`, `app/index.test.tsx`
- Modify: `packages/core/src/i18n.ts` (adds the `en` + `es` keys `chooseVideo`, `recents`, `downloadingFromICloud(percent)`, `cancel`, `photosDenied`, `openSettings`)

**Interfaces:**
- Consumes: `pickVideo`, `openAsset`, `requestLibraryAccess`, `thumbnail`, `recents`, `touchRecent`.
- Produces: the route `/cut/[assetId]`.

- [ ] **Step 1: Write the failing tests** (RNTL, `media` mocked):
  - `'shows recent sets newest first with their clip count'`
  - `'choosing a video opens the cut screen for that asset'`
  - `'a set in iCloud shows download progress and can be cancelled'`
  - `'denied Photos access explains and links to Settings'`
- [ ] **Step 2:** Run them. Expected: FAIL. Implement following the mockup's screen 1 (`.superpowers/brainstorm/79692-1793700712/content/parity-touch-v2.html`). Run them again. Expected: PASS.
- [ ] **Step 3:** On the simulator, add `fixtures/set.mp4` with `xcrun simctl addmedia booted apps/mobile/fixtures/set.mp4`, pick it, and check that the cut route opens.
- [ ] **Step 4:** Commit "Open sets from Photos and list recent ones".

### Task 9: Cut screen, player and transport

**Files:**
- Create: `app/cut/[assetId].tsx`, `src/components/Player.tsx` (expo-video `VideoView`, seek with zero tolerance), `src/components/Transport.tsx`, `src/components/TopBar.tsx`, `app/cut/cut.test.tsx`
- Modify: `packages/core/src/i18n.ts` (`startHere`, `endHere`, `split`, `fadesAndFraming`, `magnetOn`, `magnetOff`, `saveFrame`, `frameSaved`)

**Interfaces:**
- Consumes: `editorReducer`, `startHere`, `endHere`, `snapToBeat` (when `magnet`), `loadSession` / `saveSession` (debounced 300 ms, as on the Mac), `readPeaks`.

- [ ] **Step 1: Write the failing tests:**
  - `'Start here and End here mark a clip at the beat when the magnet is on'`
  - `'with the magnet off the clip starts exactly at the playhead'`
  - `'frame step moves one frame at the video frame rate'`
  - `'undo button reverts the last clip change'`
  - `'the session is saved and comes back on reopen'`
  - `'··· Save frame saves the current frame with the clip framing'`
- [ ] **Step 2:** Run them. Expected: FAIL. Implement screen 2 of the mockup without the timeline: a placeholder `View` of the same height, filled in Task 10. Run them again. Expected: PASS.
- [ ] **Step 3:** Commit "Cut screen with player, marks and the beat magnet".

### Task 10: Timeline

**Files:**
- Create: `src/components/Timeline.tsx` (Skia `Canvas`: filmstrip tiles from `filmstripTiles` + `thumbnail`, waveform from `waveformColumns`, clip blocks, uncovered ranges dimmed, playhead), `src/components/useTimelineGestures.ts` (Gesture Handler: Pan on a clip = move, Pan on an edge = trim, Pan elsewhere = scrub, Pinch = zoom, Tap = select; all on the UI thread with Reanimated shared values), `src/components/Timeline.test.tsx`

**Interfaces:**
- Consumes: `timeAt`, `xAt`, `pinch`, `hitClip`, `dragClip`, `snapToBeat`, `nextViewStart`, `viewStartForClip`.
- Produces: `onDragEnd(clip: Clip)` dispatches `replace` with `transient: false`. Drag updates during the gesture use `transient: true`, so one drag is one undo step, as on the Mac.

- [ ] **Step 1: Write the failing tests.** Gestures are simulated through the gesture handler's `fireGestureHandler` test utils.
  - `'dragging a clip edge trims it and snaps to the beat'`
  - `'a whole drag is a single undo step'`
  - `'pinching zooms around the fingers'`
  - `'over 59 s the selected clip duration turns red'`
- [ ] **Step 2:** Run them. Expected: FAIL. Implement. Run them again. Expected: PASS.
- [ ] **Step 3:** On the simulator with `set.mp4`, drag, trim and pinch at 60 fps. Check this by eye with the Perf Monitor on. Then commit "Timeline you can drag, trim and pinch".

### Task 11: Carousel list, Suggest, Split, Delete

**Files:**
- Create: `src/components/CarouselList.tsx` (Reanimated drag-to-reorder on ≡ long press; Select mode with checkboxes), `src/components/SuggestEmpty.tsx`, `src/components/ClipActions.tsx`, `src/components/CarouselList.test.tsx`
- Modify: `packages/core/src/i18n.ts` (`select`, `done`, `carouselEmpty`, `suggestExplain`, plus the Mac's `suggest*` keys reused)

- [ ] **Step 1: Write the failing tests:**
  - `'an empty carousel offers Suggest moments first'`
  - `'Suggest adds clips without touching ones I marked'` (through `suggestMoments` + the `suggest` action)
  - `'no audio: Suggest explains it cannot listen'` (`suggestNoAudio`)
  - `'reordering changes the export numbering'`
  - `'Split cuts the selected clip at the playhead'`
  - `'clips past 20 are marked as outside the carousel'` (`isPastCarousel`)
- [ ] **Step 2:** Run them. Expected: FAIL. Implement screens 2a and 2. Run them again. Expected: PASS.
- [ ] **Step 3:** Commit "Carousel list with Suggest, reorder, split and select".

### Task 12: Clip sheet, crop frame and export

**Files:**
- Create: `src/components/ClipSheet.tsx`, `src/components/AudioFadeLine.tsx` (handles 0.5–5 s snapping to `nearestFadeSeconds`), `src/components/CropFrame.tsx` (core `videoBox` / `cropBox` / `dragCrop`), `src/components/FitPreview.tsx`, `src/components/ExportSheet.tsx`, `src/editor/export-run.ts`, tests for each
- Modify: `packages/core/src/i18n.ts` (reuse the Mac's export keys; add `openInstagram`, `savedToAlbum(count)`, `stop`)

**Interfaces:**
- Produces: `export async function runExport(jobs: ExportJob[], deps: { exportClip; saveToCutsAlbum; cancelled(): boolean; onProgress(index: number, ratio: number): void }): Promise<{ ok: true } | { ok: false; error: string }>`. It exports every clip to temp files first, then saves them all to the album in order. On cancel it saves the clips already finished and returns `exportCancelledKept(n)`, the same message as the Mac.

- [ ] **Step 1: Write the failing tests:**
  - `'fit shows the whole video over a blurred copy'`
  - `'dragging the crop frame changes only the selected clip'`
  - `'audio fade handles snap to 0.5, 1, 2, 3 or 5 s'`
  - `'export saves clips to the Cuts album in carousel order'`
  - `'stopping keeps the finished clips and says how many'`
  - `'going to the background stops the export cleanly'` (AppState `background` → `cancelExport`)
  - `'when done, Open Instagram opens the instagram:// app'`
- [ ] **Step 2:** Run them. Expected: FAIL. Implement screens 3 and the export sheet. Run them again. Expected: PASS.
- [ ] **Step 3:** On the simulator, export 3 clips of `set.mp4` in 4:5. Check that the Cuts album holds `set-1…3` in order, and that the first clip's first frame is not black.
- [ ] **Step 4:** Commit "Fades, framing and export to Photos on iPhone".

### Task 13: TestFlight build

**Files:**
- Create: `apps/mobile/scripts/testflight.sh`, `docs/release/iphone-testflight.md`
- Modify: `Makefile` (`mobile-testflight`)

- [ ] **Step 1:** In App Store Connect, add the iOS platform to the existing Cuts app record (universal purchase on `com.vigosan.cuts`). Try the API with key PN375CPCF7 from 1Password, Software vault. If the API cannot add a platform, stop and ask Vicent to click "Add platform → iOS" in App Store Connect.
- [ ] **Step 2:** `testflight.sh` runs these steps:
  1. `expo prebuild -p ios --clean`
  2. `xcodebuild archive`, signed with automatic signing, team TKAZA7ZPZ2
  3. `xcodebuild -exportArchive` with method `app-store-connect`
  4. `xcrun altool --upload-app` with the API key

  Version `1.7.0`, the same as the Mac; the build number is a timestamp.
- [ ] **Step 3:** Run `make mobile-testflight`. Expected: the upload is accepted, and the build appears in TestFlight → Internal Testing for Vicent.
- [ ] **Step 4:** Commit "Upload the iPhone app to TestFlight".

### Task 14: Device check with Vicent

This needs Vicent and his iPhone. Do not fake it.

- [ ] **Step 1:** Ask Vicent to install from TestFlight, open a real 1 h set, and export 6 clips in 4:5 Crop. Ask him to report the time from Export until the last clip appears in Photos. The gate is under 60 s.
- [ ] **Step 2:** If the export is over 60 s, profile it with Instruments on the device and fix it as a separate task.
- [ ] **Step 3:** Ask Vicent to compare one clip side by side with the Mac's export of the same clip: framing, fades and colour.
