# PNG Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user put one PNG over every exported clip and the saved frame photo, placed and resized on the preview, identically on Mac and iPhone.

**Architecture:** All geometry (normalised placement, clamping, snapping, preview box) lives in a new `@cuts/core/overlay` module used by both apps. The desktop adds the PNG as a second FFmpeg input and overlays it after framing and before fades; the iPhone composites it in `Framer.swift` at the same point. Each app keeps one copied PNG in its app data and the placement in its global preferences.

**Tech Stack:** TypeScript 7, Vitest, React 19 + Tailwind v4 (Electron renderer), FFmpeg 9.0.2 (bundled), Expo SDK 58 + react-native-gesture-handler 3.3, Swift + Core Image + Swift Testing.

**Spec:** `docs/superpowers/specs/2026-11-05-png-overlay-design.md`

## Global Constraints

- Work in a git worktree, never switch branches in the main checkout (other sessions commit there).
- TDD: every task starts with a failing test. Tests say why the behaviour matters in their names.
- No code comments. Selectors: `data-testid` (desktop) / `testID` (mobile).
- Commit titles: one descriptive line, no body, no `feat:`/`fix:` prefix. One task = one commit.
- Before each commit: `npm test --workspaces`, `npm run typecheck --workspaces`, `npm run lint` (oxlint, not eslint). For Swift tasks also `make mobile-test`.
- Placement is `{ x, y, width }`, each 0–1, relative to the output frame; `x, y` is the top-left corner; height follows the PNG's aspect ratio.
- Default placement: top-left at the margin, width 25 % of the frame. Width range 5 %–100 %. Always fully inside the frame.
- Composite order: framing → overlay → image fade.
- No overlay = generated FFmpeg args and Swift output exactly as today.
- Labels: English "Overlay" / "Add…", Spanish "Superposición" / "Añadir…".
- Overlay is global preferences only; never stored in per-video sessions.

## Review Focus

1. **Format change pushes it out of the frame** — a PNG at the bottom-right of 9:16 switched to 1:1 must be clamped back inside, not cut off in the export. Test in Task 1.
2. **Tall PNG in a wide frame** — a portrait PNG (aspect 3) at width 100 % of a 16:9 Original would be taller than the frame; width must shrink so height ≤ 1. Test in Task 1.
3. **Fit mode** — the overlay sits on the whole canvas, including the blurred band; a pixel in the band where the overlay sits must be the overlay colour. Tests in Task 2 and Task 6.
4. **Portrait (rotated) Original** — the frame is the upright size; overlay must land at the same relative spot on a rotated source. Test in Task 6 (`rotated.mp4`).
5. **The PNG copy is gone** (app data cleared) — the preview image fails to load and the overlay is cleared instead of every export failing. Tests in Task 5 and Task 7.

---

### Task 1: Shared overlay geometry

**Files:**
- Create: `packages/core/src/overlay.ts`
- Test: `packages/core/src/overlay.test.ts`

**Interfaces:**
- Produces (all exported from `@cuts/core/overlay`):
  - `type OverlayPlacement = { x: number; y: number; width: number }`
  - `type Overlay = OverlayPlacement & { path: string; aspect: number }` — `aspect` = PNG height / PNG width
  - `type Size = { width: number; height: number }`
  - `type Guide = 'centerX' | 'centerY' | 'left' | 'right' | 'top' | 'bottom'`
  - `type Corner = 'tl' | 'tr' | 'bl' | 'br'`
  - constants `OVERLAY_DEFAULT_WIDTH = 0.25`, `OVERLAY_MIN_WIDTH = 0.05`, `OVERLAY_MAX_WIDTH = 1`, `OVERLAY_MARGIN = 0.04` (fraction of frame width, used on both axes in pixels), `OVERLAY_SNAP = 0.02` (fraction of frame width)
  - `outputFrame(format: OutputFormat, video: Size): Size` — `formatSize(format) ?? video`
  - `overlayHeight(p: OverlayPlacement, aspect: number, frame: Size): number` — normalised height
  - `defaultPlacement(aspect: number, frame: Size): OverlayPlacement`
  - `clampPlacement(p: OverlayPlacement, aspect: number, frame: Size): OverlayPlacement`
  - `moveOverlay(start: OverlayPlacement, dx: number, dy: number, aspect: number, frame: Size): { placement: OverlayPlacement; guides: Guide[] }` — `dx, dy` normalised to the frame
  - `resizeOverlay(start: OverlayPlacement, corner: Corner, dx: number, aspect: number, frame: Size): OverlayPlacement` — opposite corner stays fixed
  - `scaleOverlay(start: OverlayPlacement, scale: number, aspect: number, frame: Size): OverlayPlacement` — keeps the centre (iPhone pinch)
  - `previewFrame(container: Size, video: Size, target: Size | null, framing: Framing, zone: { cropX: number; cropY: number }): Box` — where the output frame sits in the preview: Original → `videoBox(container, video)`; crop → `cropBox(videoBox(...), target, cropX, cropY)`; fit → `videoBox(container, target)`
  - `overlayBox(frameBox: Box, p: OverlayPlacement, aspect: number): Box` — placement in preview pixels

- [ ] **Step 1: Write the failing tests** in `overlay.test.ts`, each named for why it matters:
  - `defaultPlacement(0.5, {width:1080,height:1350})` → `{ x: 0.04, y: 0.032, width: 0.25 }` (margin is 43.2 px on both axes).
  - "a logo at the bottom-right of 9:16 stays inside when switching to 1:1": `clampPlacement({x:0.7,y:0.9,width:0.25}, 0.5, {1080,1080})` → `y + overlayHeight ≤ 1`, `x` unchanged.
  - "a tall PNG never grows taller than the frame": `clampPlacement({x:0,y:0,width:1}, 3, {1920,1080})` → `overlayHeight === 1`, `width ≈ 0.1875`.
  - width below 5 % clamps to `0.05`.
  - `moveOverlay` with the centre 1 % off the vertical centre line snaps `x` so the centre is `0.5` and returns `guides` containing `'centerX'`; 5 % off returns no guides and the raw position.
  - `moveOverlay` near the left margin snaps `x` to `0.04` with `'left'`.
  - `resizeOverlay(..., 'br', 0.1, ...)` grows width by `0.1` and keeps `x, y`; `'tl'` keeps the bottom-right corner.
  - `scaleOverlay(..., 2, ...)` doubles width around the same centre, clamped.
  - `previewFrame` for each framing returns the same box as the existing `videoBox` / `cropBox` calls.
  - `overlayBox` of `{x:0.5,y:0.1,width:0.25}`, aspect `0.5`, frame box `{0,0,1080,1350}` → `{ left: 540, top: 135, width: 270, height: 135 }` (the parity box used in Tasks 2 and 6).

- [ ] **Step 2: Run** `npm test -w packages/core -- overlay` — Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `packages/core/src/overlay.ts`. Snapping compares in pixels of the frame (multiply by frame width/height) so the threshold is the same on both axes.
- [ ] **Step 4: Run** `npm test -w packages/core` — Expected: PASS.
- [ ] **Step 5: Commit** spec, plan and module: `git add docs/superpowers packages/core/src/overlay*` → `git commit -m "Add shared geometry for placing a PNG overlay on the output frame"`

### Task 2: FFmpeg overlay in clips and frame photos

**Files:**
- Modify: `apps/desktop/src/main/ffmpeg-args.ts`
- Test: `apps/desktop/src/main/ffmpeg-args.test.ts`, `apps/desktop/src/main/ffmpeg.integration.test.ts`

**Interfaces:**
- Consumes: `OverlayPlacement` from Task 1.
- Produces: `type ExportOverlay = OverlayPlacement & { path: string }`; `CutOptions.overlay?: ExportOverlay | null`; `FrameOptions.overlay?: ExportOverlay | null`.

- [ ] **Step 1: Write failing unit tests** in `ffmpeg-args.test.ts`:
  - without overlay, `buildFfmpegArgs` / `buildFrameArgs` output is identical to today's (existing tests keep passing untouched).
  - with overlay `{ path: '/o.png', x: 0.5, y: 0.1, width: 0.25 }`: the PNG `-i /o.png` comes right after the video `-i` and **before** `-t` (otherwise `-t` becomes an input option of the PNG); there is no `-vf`; there is `-filter_complex` whose graph is `[0:v]<framing>,split[base][ref];[1:v][ref]scale=w='rw*0.25':h=-1[ov];[base][ov]overlay=x='main_w*0.5':y='main_h*0.1'<,fades>[v]` (Original: `[0:v]split[base][ref];…`); and `-map [v] -map 0:a?`. `-af` stays as today.
- [ ] **Step 2: Write failing integration tests** in `ffmpeg.integration.test.ts`. In `beforeAll` make a solid red 200×100 PNG with FFmpeg (`-f lavfi -i color=red:s=200x100 -frames:v 1`). Read a pixel by running FFmpeg with `crop=1:1:X:Y` to `-f rawvideo -pix_fmt rgb24 -` and reading 3 bytes.
  - "the overlay lands where it was placed so the export matches the preview": `buildFrameArgs` 4:5 crop with the parity placement → pixel (675, 202) is red (R > 200, G < 60, B < 60); pixel (100, 100) is not red.
  - "in Fit the overlay sits on the blurred band too": 4:5 fit, placement `{x:0.04,y:0.032,width:0.25}` → pixel at its centre is red.
  - a clip with overlay exports at 1080×1350 with its audio stream.
- [ ] **Step 3: Run** `npm test -w apps/desktop -- ffmpeg` — Expected: FAIL.
- [ ] **Step 4: Implement** the graph in `ffmpeg-args.ts` (`scale` with a reference input works on the bundled FFmpeg 9.0.2; checked 2026-11-05).
- [ ] **Step 5: Run** `make test` — Expected: PASS.
- [ ] **Step 6: Commit** `"Burn the PNG overlay into exported clips and frame photos"`

### Task 3: Desktop import of the PNG into app data

**Files:**
- Create: `apps/desktop/src/main/overlay.ts`, `apps/desktop/src/main/overlay.test.ts`
- Modify: `apps/desktop/src/main/index.ts` (IPC + media allow-list), `apps/desktop/src/main/media-protocol.ts` (`'.png': 'image/png'`), `apps/desktop/src/shared/api.ts`, `apps/desktop/src/preload/index.ts`

**Interfaces:**
- Produces:
  - `pngSize(bytes: Uint8Array): Size | null` — checks the 8-byte PNG signature and reads width/height from IHDR (bytes 16–23, big-endian)
  - `importOverlay(source: string, dir: string, deps: { read, write, list, remove, now }): Promise<{ path: string; aspect: number } | null>` — `null` when not a PNG; copies to `<dir>/overlay-<now>.png` and removes other files in `dir`
  - `Api.chooseOverlay(): Promise<{ path: string; aspect: number } | 'invalid' | null>` (open dialog filtered to `png`)
  - `Api.importOverlay(path: string): Promise<{ path: string; aspect: number } | 'invalid'>` (for drops; use `pathForFile` first)
  - `dir = join(app.getPath('userData'), 'overlays')`, allowed by the media protocol
- [ ] **Step 1: Failing tests** in `overlay.test.ts`: `pngSize` of a real 200×100 PNG buffer → `{200,100}`; of a JPEG header → `null`; `importOverlay` writes one new file, deletes the old copy, returns `aspect 0.5`; a renamed `.txt` returns `null` and keeps the old copy ("a bad file never wipes the overlay you already had").
- [ ] **Step 2: Run** `npm test -w apps/desktop -- overlay` — FAIL.
- [ ] **Step 3: Implement** `overlay.ts` and wire the IPC handlers and preload.
- [ ] **Step 4: Run** `make test` and `npm run typecheck --workspaces` — PASS.
- [ ] **Step 5: Commit** `"Copy a chosen PNG into Cuts so the overlay survives moving the original"`

### Task 4: Desktop Overlay row and preferences

**Files:**
- Modify: `apps/desktop/src/renderer/src/preferences.ts`, `apps/desktop/src/renderer/src/components/ExportPanel.tsx`, `apps/desktop/src/renderer/src/App.tsx`, `packages/core/src/i18n.ts`
- Test: `apps/desktop/src/renderer/src/App.test.tsx` (and a preferences test next to the file if one exists; else in `App.test.tsx`)

**Interfaces:**
- Consumes: `Overlay`, `defaultPlacement`, `clampPlacement`, `outputFrame` (Task 1); `Api.chooseOverlay`, `Api.importOverlay` (Task 3); `ExportOverlay` (Task 2).
- Produces: `Preferences.overlay: Overlay | null` (default `null`); `ExportRequest.overlay: ExportOverlay | null`; `FrameRequest.overlay: ExportOverlay | null`; App state `overlay` / `setOverlay(next: Overlay | null)` that also saves preferences; i18n keys `overlay`, `overlayAdd`, `overlayRemove`, `overlayInvalid` ("That file isn't a PNG image." / "Ese archivo no es una imagen PNG."), in English and Spanish.
- [ ] **Step 1: Failing tests** in `App.test.tsx` (mock `window.api` like existing tests):
  - the row `overlay-row` shows `overlay-add` when empty; after `chooseOverlay` resolves, shows `overlay-thumb` and `overlay-name`, and `overlay-remove` clears it.
  - "the overlay comes back on the next video": the chosen overlay is in `localStorage` preferences and is restored on reload.
  - `chooseOverlay` resolving `'invalid'` shows the notice with `overlayInvalid` and keeps the previous overlay.
  - dropping a file on `overlay-row` calls `importOverlay` with its path.
  - export and the File menu frame photo send `overlay` with `path, x, y, width` clamped to the current format's output frame; `saveSession` payload has no `overlay`.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — FAIL.
- [ ] **Step 3: Implement.** New placement on add: `defaultPlacement(aspect, outputFrame(format, videoSize))`. The row sits after Format in `ExportPanel`, same grid and `field` styling; thumbnail over a checkerboard via `mediaUrl(path)`.
- [ ] **Step 4: Run** `make test`, typecheck, lint — PASS.
- [ ] **Step 5: Commit** `"Add an Overlay row under Format to choose or remove a PNG"`

### Task 5: Desktop placing on the preview

**Files:**
- Create: `apps/desktop/src/renderer/src/components/OverlayLayer.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx` (render it over the video, after `CropFrame` / `FitPreview`)
- Test: `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: `previewFrame`, `overlayBox`, `moveOverlay`, `resizeOverlay`, `clampPlacement` (Task 1); App `overlay` / `setOverlay` (Task 4).
- Produces: `OverlayLayer({ video: Size, target: Size | null, framing, zone, overlay: Overlay, onChange(p: OverlayPlacement), onMissing() })`. Measures its container with `ResizeObserver` like `CropFrame`. `data-testid`: `overlay`, `overlay-handle-tl|tr|bl|br`, `overlay-guide-<guide>`.
- [ ] **Step 1: Failing tests:**
  - with an overlay and format 4:5 crop, `overlay` is drawn at `overlayBox(previewFrame(...))`.
  - dragging `overlay` calls `setOverlay` with the moved placement and does not move the crop frame (pointerdown stops propagation).
  - dragging a handle resizes with the opposite corner fixed.
  - while a snap is active the matching `overlay-guide-*` is shown, and hidden after pointerup.
  - handles are hidden until hover.
  - "a missing PNG clears the overlay instead of breaking every export": the `img` firing `error` calls `onMissing`, and App clears the overlay.
  - changing format re-clamps the stored placement (`clampPlacement` with the new output frame) and saves it.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Pointer deltas are divided by the frame box width/height to get normalised `dx, dy`. Guide lines are 1 px, the app's accent colour.
- [ ] **Step 4: Run** `make test`, typecheck, lint — PASS. Then `make dev` and check by eye on a real video (isolated `--user-data-dir` in the scratchpad, never the user's sessions): drag, resize, snap, all four formats, Fit, export, open the clip.
- [ ] **Step 5: Commit** `"Move and resize the PNG overlay on the video preview"`

### Task 6: iPhone Core Image composite

**Files:**
- Modify: `apps/mobile/modules/cuts-media/ios/CutsMedia/Sources/CutsMedia/ExportJob.swift`, `Framer.swift`, `Frames.swift`, `Exporter.swift` (pass the overlay image once per job), `apps/mobile/modules/cuts-media/ios/CutsMediaModule.swift` (`JobRecord` / `FrameRecord` fields), `apps/mobile/scripts/make-fixtures.sh` (add `overlay-red.png`, solid red 200×100)
- Test: `apps/mobile/modules/cuts-media/ios/CutsMedia/Tests/CutsMediaTests/ExporterTests.swift`, `FramesTests.swift`, `Inspect.swift` (add `pixel(_ image: CGImage, x:, y:) -> (UInt8, UInt8, UInt8)` and a frame-at-time helper)

**Interfaces:**
- Produces: `public struct OverlaySpec: Codable, Sendable { url: URL; x: Double; y: Double; width: Double }`; `ExportJob.overlay: OverlaySpec?` and `FrameJob.overlay: OverlaySpec?` (default `nil`, init parameter last with default); `Framer.overlay(image: CIImage) -> CIImage` applied between `render` and `fade`. Records: `overlayPath: String = ""` (empty = none), `overlayX`, `overlayY`, `overlayWidth: Double`.
- [ ] **Step 1: Failing tests** (same expectations as Task 2, so Mac and iPhone are checked against one box):
  - `overlayLandsWhereTheMacPutsIt`: 4:5 crop, placement `{0.5, 0.1, 0.25}`, `overlay-red.png` → exported frame pixel (675, 202) red, (100, 100) not red.
  - `overlaySitsOnTheBlurredBandInFit`: as Task 2's Fit test.
  - `overlayFollowsTheUprightFrameOnRotatedVideo`: `rotated.mp4`, Original, placement `{0.5, 0.1, 0.25}` → red at the centre of the expected box in the upright size.
  - `overlayFadesWithTheClip`: black fade, first frame luma ≈ 0 with overlay.
  - `savedFrameCarriesTheOverlayLikeTheMac` in `FramesTests`.
  - existing tests unchanged (no overlay → identical output).
- [ ] **Step 2: Run** `make mobile-test` — FAIL.
- [ ] **Step 3: Implement.** Load the PNG as `CIImage` once per job. Scale `s = width * W / pngWidth`, translate to `(x * W, H - y * H - pngHeight * s)` (Core Image origin is bottom-left), `composited(over:)`.
- [ ] **Step 4: Run** `make mobile-test` — PASS.
- [ ] **Step 5: Commit** `"Composite the PNG overlay into iPhone clips and saved frames"`

### Task 7: iPhone picking, row and placing

**Files:**
- Modify: `apps/mobile/modules/cuts-media/ios/CutsMediaModule.swift` (`pickOverlay`), `apps/mobile/modules/cuts-media/index.ts` (typings), `apps/mobile/src/media.ts`, `apps/mobile/src/editor/preferences.ts`, `apps/mobile/src/editor/session.tsx`, `apps/mobile/src/editor/export-jobs.ts`, `apps/mobile/src/components/ExportSheet.tsx`, `apps/mobile/src/components/Stage.tsx`, `apps/mobile/src/screens/Cut.tsx`, `packages/core/src/i18n.ts` (`mobile.overlayFromFiles`, `mobile.overlayFromPhotos`)
- Test: `apps/mobile/src/editor/preferences.test.ts`, `export-jobs.test.ts`, `editor.test.ts` or a new `src/components/Stage.test.tsx`, `src/screens/Export.test.tsx`

**Interfaces:**
- Consumes: Task 1 geometry; Task 6 records; i18n keys from Task 4.
- Produces: native `pickOverlay(source: 'files' | 'photos'): Promise<{ path: string; aspect: number } | 'invalid' | null>` — copies to Application Support `overlays/overlay-<timestamp>.png`, deletes older copies, validates with `CGImageSource` type `public.png`; `Preferences.overlay: Overlay | null`; `EditorSession.overlay` / `setOverlay`; `ExportJob.overlay` and `FrameJob.overlay` in `media.ts` mapped to the record fields.
- [ ] **Step 1: Failing tests:**
  - preferences round-trip `overlay`, default `null`.
  - `exportJobs` passes the overlay clamped to the output frame of `format`; `null` → no overlay fields.
  - `ExportSheet` shows `overlay-add`; picking (mocked) shows `overlay-name` and `overlay-remove`; `'invalid'` shows `overlayInvalid` and keeps the previous one.
  - `Stage` draws `overlay` at `overlayBox(previewFrame(...))` in Original, crop and fit; image `onError` clears the overlay.
  - `scaleOverlay` is what the pinch calls (unit-test the handler, not the gesture).
- [ ] **Step 2: Run** `make mobile-test` — FAIL.
- [ ] **Step 3: Implement.** "Add…" opens an action sheet with Files / Photos. Pan with one finger (`usePanGesture`) and pinch (`usePinchGesture`) run together; check RNGH 3.3's composition hook for simultaneous gestures (the Timeline already uses `useCompetingGestures` / `useExclusiveGestures`). Read Expo SDK 58 docs before any Expo API, as `apps/mobile/AGENTS.md` requires.
- [ ] **Step 4: Run** `make mobile-test`, typecheck, lint — PASS. Check on the simulator with screenshots (XCUITest driver in the scratchpad), and send Vicent screenshots before any TestFlight upload.
- [ ] **Step 5: Commit** `"Choose, move and pinch the PNG overlay on iPhone"`

### Task 8: Website

**Files:**
- Modify: `apps/web/content.ts` (English and Spanish "Fades and format" items)
- [ ] **Step 1:** Add one item to both languages: EN "Put a PNG over every clip, like your logo or your handle: drag it on the video and pull a corner to resize it." ES "Pon un PNG encima de todos los clips, como tu logo o tu usuario: arrástralo sobre el vídeo y tira de una esquina para cambiar su tamaño."
- [ ] **Step 2: Run** `make web` — PASS. Run `make media` and check the frames by eye.
- [ ] **Step 3: Commit** `"List the PNG overlay among the website features"`
