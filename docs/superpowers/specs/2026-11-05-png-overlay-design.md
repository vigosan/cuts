# PNG overlay — design

## Intent

DJs often brand their clips with an image on top: a logo, their Instagram handle, a frame. Most OBS recordings already have it burned in, but phone recordings and other sources do not. Cuts lets Vicent put any PNG with transparency over every exported clip, place it on the video and resize it there, without adding panels to the minimal UI.

This is the first of four features agreed on 2026-11-05 (the others, each with its own design later: matched loudness, loop fade, mix audio from a separate recording). "Copy post text" was dropped by Vicent.

Mockup shown on 2026-11-05: `.superpowers/brainstorm/27641-1793859167/content/nuevas-features.html` (item 1).

## Goals

- Any PNG, not only a logo (Vicent, 2026-11-05). Transparency is respected.
- The PNG is shown over the video in the preview and the user moves it and resizes it there (Vicent, 2026-11-05).
- Position and size are relative to the output frame and adapt on their own when the format changes; the user reviews it (Vicent, 2026-11-05).
- Mac and iPhone ship the feature together and behave the same (Vicent, 2026-11-05).

## Non-goals

- Typing text in the app. Text goes in the PNG.
- Opacity, rotation, blend modes, animation, per-clip overlays, several overlays at once.
- Moving the PNG or its position between Mac and iPhone (that would need iCloud; separate project).
- Android.

## Anti-goals

- Any control above the video or a new panel. The video pane stays free of chrome when no overlay is set (see the app design direction: everything at hand, nothing duplicated).
- The overlay landing in a different place in the export than in the preview, or differently on Mac and iPhone.
- Making exports noticeably slower.

## Behaviour

### Adding and removing
- A new row **Overlay** ("Superposición") in the export settings, right after Format. On the Mac that is the form at the foot of the carousel pane (Name, Folder, Format, Overlay). On the iPhone it sits with the format in the export sheet.
- Empty, the row shows "Add…". Choosing it opens a file picker limited to PNG (Mac: open dialog; iPhone: Files or Photos). On the Mac a PNG can also be dropped on the row.
- With a PNG set, the row shows a small thumbnail over a checkerboard, the file name, and ✕ to remove it.
- Cuts copies the PNG into its own app data. Deleting or moving the original does not break it.
- A file that is not a decodable PNG shows the existing notice style with a plain message and leaves the previous overlay in place.

### Placing it
- The overlay is drawn over the preview at the size and place it will have in the export.
- Mac: drag it to move it; drag one of its four corner handles to resize it, keeping the PNG's aspect ratio. Handles show only while the pointer is over it or while dragging.
- iPhone: drag it with one finger; pinch to resize, keeping the aspect ratio.
- Snapping: while dragging, when its centre comes near the frame's centre line (horizontal or vertical) or its edge comes near a frame edge inset by a fixed margin, it snaps there and a thin guide line shows. Thresholds and margin are shared values in `@cuts/core`.
- It cannot leave the frame: position is clamped so the PNG stays fully inside. Minimum width 5 % of the frame, maximum 100 %.
- The overlay and the crop frame (Mac and iPhone) can both be on screen. Dragging on the overlay moves the overlay; dragging elsewhere keeps today's behaviour.

### Geometry
- Stored as `{ x, y, width }`, each 0–1, relative to the **output frame** (e.g. 1080×1350 for 4:5, the video's own size for Original). `x, y` is the top-left corner. Height follows the PNG's aspect ratio.
- In Fit mode the output frame is the whole canvas including the blurred background, not just the video.
- Changing format keeps the same `{ x, y, width }`; the new frame shape changes the result and the user reviews it. Clamping applies again after a format change.
- Default when a PNG is first added: top-left corner at the margin, width 25 % of the frame.
- All geometry (default placement, clamping, snapping, normalised ↔ pixel conversion) lives in `@cuts/core` (new module, e.g. `overlay.ts`) and is used by both apps.

### Where it applies
- Every exported clip of the video.
- The saved frame photo on both apps, so the cover matches the clips: the Mac's "Save current frame as photo" (File menu, `buildFrameArgs`) and the iPhone's save current frame (`saveCurrentFrame` in `Cut.tsx`, `FrameJob` / `frame(...)` in `Frames.swift`).
- The overlay is composited after framing and **before** the image fade, so it fades to black or white with the clip.

### Remembering
- Overlay image and geometry are saved with the other preferences (format, fades, folder) and apply to the next video. ✕ clears them.
- Desktop: `apps/desktop/src/renderer/src/preferences.ts`. iPhone: `apps/mobile/src/editor/preferences.ts`. Same shape in both (path to Cuts' copy of the PNG + `{ x, y, width }`).
- Only one overlay is kept: adding a new PNG replaces the previous copy. No "recent" list (the mockup showed one; dropped for simplicity — Claude's call).
- The overlay is global, not per video: the desktop does not store it in the per-video session (`sessions.ts`), so reopening an older video uses the current overlay, clamped to that video's restored format. This keeps Mac and iPhone the same, since the iPhone has no per-video format (Claude's call).

## Export implementation

- **Mac / Windows / Linux (FFmpeg)** in `apps/desktop/src/main/ffmpeg-args.ts`: add the PNG as a second input (`-i overlay.png`), move the video chain to `-filter_complex`, scale the PNG to its pixel width and `overlay` it at its pixel position after the framing filters and before `fade`. `buildFrameArgs` does the same without fades. Without an overlay, the generated args stay exactly as today.
- **iPhone (Core Image)** in `Framer.swift`: load the PNG once per job as a `CIImage`, scale and place it (flip Y for Core Image's bottom-left origin), composite it over `render(image:)` before `fade`. `ExportJob` and `FrameJob` get an optional overlay (file URL + `x`, `y`, `width`), passed through the native module bridge.

## Testing

- `@cuts/core`: unit tests for default placement, clamping after a format change, snapping and pixel conversion, with the reason each matters (e.g. "a logo placed at the bottom-right of 9:16 must stay inside the frame when switching to 1:1").
- Desktop: `ffmpeg-args` tests for the new graph with and without overlay (and unchanged args without one); an integration test in `ffmpeg.integration.test.ts` that exports a frame with a solid-colour PNG and checks the pixel colour at the expected spot.
- iPhone: `ExporterTests` checks the same pixel on an exported frame.
- Parity: both platform tests use the same fixture PNG, geometry and expected pixel box, so Mac and iPhone are checked against one expectation.
- UI tests with `data-testid` for adding, removing and the row's states, on both apps.
- After the UI change: update `apps/web/content.ts` features and regenerate the website media (`make media`).

## Left to the builder

- Exact snap threshold and edge margin values, handle look, guide colour (follow the app's existing colours).
- How the iPhone chooses between Files and Photos (one sheet with both, or the system picker).
- Where in app data the PNG copy lives and its file name.
- Labels in English and Spanish in each app's i18n files ("Overlay" / "Superposición").
