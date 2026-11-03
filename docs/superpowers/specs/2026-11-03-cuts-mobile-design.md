# Cuts for iPhone — design

## Intent

Vicent records DJ sets of about an hour on a phone on a tripod. Today he moves each set to the Mac, cuts it in Cuts, exports the clips, and saves them to Photos so he can post an Instagram carousel (almost always several clips, rarely a single Reel). Cuts for iPhone removes the Mac from that loop: open the set from Photos, cut it on the phone, export, and post.

Success, in his words: the export is fast and goes straight to Instagram. "Straight to Instagram" means (agreed 2026-11-03): the clips land in Photos in carousel order, then Cuts offers to open Instagram, where he picks them with "Select multiple". No app can post for him, and handing several videos to Instagram at once is not documented, so this is the flow.

## Goals

- An iPhone app with **the same features as Cuts for Mac** (Vicent, 2026-11-03), adapted to touch. Feature list: `apps/web/content.ts` (the "features" section) plus ✦ Suggest moments.
- iPhone first (Vicent, 2026-11-03). Android follows later from the same code; the Google Play account and real-device testing are out of scope now.
- Layout A, everything on one screen (Vicent, 2026-10-25, confirmed 2026-11-03). Mockups approved 2026-11-03: `.superpowers/brainstorm/79692-1793700712/content/parity-touch-v2.html`.

### Screens

1. **Home.** "Choose video from Photos" button, and recent videos with their thumbnail, length and clip count, reopening with the clips he marked (same as the Mac start screen).
2. **Cut screen.** Top bar: back to videos, video name, undo ↶, menu ···. Below, the video with the crop frame drawn over it. Then a card with play/pause, current time / total, the beat-snap magnet 🧲, the timeline (filmstrip + waveform + clip blocks + playhead), a row with **Start here**, ‹ frame, frame ›, **End here**, and, when a clip is selected, a row with ✂︎ Split, Fades · framing, and delete. Then the carousel list with ✦ Suggest and Select, and the **Export N clips** button at the foot.
3. **Empty carousel.** A freshly opened video with no clips shows a big **✦ Suggest moments** button in the carousel card, with a line saying Cuts listens to the set and adds 10 clips, or he can mark them with Start and End.
4. **Clip sheet** (Fades · framing). Bottom sheet for the selected clip: framing Crop / Fit with blurred background; image fade Black / White / None; audio fade Natural / Linear / None; the audio fade drawn as a volume line with handles dragged from 0.5 s to 5 s. While the sheet is open, he drags the crop frame on the video.
5. **Export sheet.** Format Original / 4:5 / 1:1 / 9:16, name, and the export action; per-clip progress in the list; a Stop button while exporting; when done, "Open Instagram".

### Mac → iPhone mapping (approved 2026-11-03)

| Mac | iPhone |
|-----|--------|
| Space play/pause | ▶ button or tap the video |
| I / O mark | Start here / End here; with no clip selected they create a new clip |
| ⇧I / ⇧O | The same buttons with a clip selected move its start or end to the playhead |
| Snap to the nearest beat; hold ⌥ for exact | Magnet 🧲 on by default; tap it off to cut exact |
| S split | ✂︎ Split button |
| ↑ / ↓ walk clips | Tap the clip in the list or on the timeline |
| Drag clips and edges, zoom | Same with the finger; pinch to zoom; ‹ › step one frame |
| Drag rows to reorder | Hold ≡ and drag |
| ⌘-click to export some | "Select" in the carousel, tick clips |
| Hover the button to stop export | Stop button while exporting |
| File → Save frame | ··· → "Save frame to Photos" |
| ⌘Z undo | ↶ button, plus shake to undo |
| Remembers fades, format, folder | Remembers fades and format; the "folder" is the Cuts album in Photos |
| ? shortcuts | Not needed |

### Behaviour that must match the Mac exactly

These come from `packages/core` and `apps/desktop/src/main/ffmpeg-args.ts`; the iPhone must produce the same results:

- Clips up to 59 s are carousel-ready; longer ones show over the limit (red) but can still be exported. Max 20 carousel items.
- The first clip in the list has no image fade-in, so the cover is never black.
- Output files numbered in list order, named `<base>-1.mp4`, `<base>-2.mp4`… (`outputFileName`).
- Formats: original, or 4:5 1080×1350, 1:1 1080×1080, 9:16 1080×1920. Crop: frame positioned by `cropX`/`cropY`. Fit: the whole video over a blurred, darkened (×0.7) background of itself.
- Image fades to black or white; audio fades natural (quarter-sine, `audioGain`) or linear; fade length capped at half the clip.
- H.264 ~12 Mbps, AAC 320 kbps, MP4, source frame rate kept, frame-accurate cuts.
- ✦ Suggest and beat snap use the same audio peaks (mono, 50 peaks per second, max of |sample| per slot as in `peaksFromSamples`), so the same set suggests the same moments on both devices.
- Undo history, per-clip settings, defaults remembered between videos.
- Spanish and English, from `packages/core/src/i18n.ts`.

**What "the same" means** (Claude's call): byte-identical output is impossible without ffmpeg on the phone, so "the same" means:
- The cut times, settings and file names are identical. All of them come from `@cuts/core`.
- The output looks the same side by side: same framing, the same blur and darkening of the fit background within reason, the same fade colours and fade lengths.
- The peaks go through the same steps as the Mac: mix to mono, resample to 2000 Hz (`WAVEFORM_SAMPLE_RATE`), then take the max of |sample| over every 40 samples. On a reference set, the suggested moments must match the Mac's within one beat, using golden peaks exported from the Mac.
- The Mac app does not change for this.

**Speed bar** (Claude's call): Instagram's carousel holds 20 clips, but a set's carousel is usually about 6. Export 6 clips of 59 s in 4:5 Crop from a 1 h set on Vicent's iPhone in under a minute. Time it from tapping Export to the last clip landing in Photos. Fit and Original are measured and reported, not gated.

## Non-goals

- Android in this round (the code stays ready for it).
- Posting to Instagram from Cuts, or sending several videos to Instagram directly. A later experiment, never a blocker.
- iPad layout, landscape layout.
- Recording video inside Cuts.
- Features the Mac doesn't have.

## Anti-goals

- A slow export: if exporting a carousel from a 1 h set feels slower than doing it on the Mac and AirDropping, the app has failed even if it works.
- Clips that differ from the Mac's: different cut points, framing, fades, or suggested moments for the same input.
- Copying the multi-GB set into the app's storage, or holding it in memory.
- A timeline that lags behind the finger.
- Accounts, uploads, tracking. Everything stays on the phone, like the Mac ("Private by design").

## How it gets built (Claude's proposal, approved by Vicent 2026-11-03)

- New workspace `apps/mobile`: Expo (React Native), TypeScript, importing `@cuts/core` unchanged.
- A local Expo module in Swift for the system work: reading audio peaks, filmstrip thumbnails, and exporting clips with AVFoundation (AVMutableComposition + video composition for crop / fit-with-blur and image fades, audio mix for fades, hardware H.264). Android later gets the same module interface written with Media3.
- Timeline drawn with React Native Skia, gestures with Reanimated + Gesture Handler, so dragging and pinching run on the UI thread.
- Video picked from Photos; exports saved to an album named "Cuts" in carousel order.
- Sessions (clips, per-clip settings, defaults) stored on the phone, keyed by the Photos asset, so Recents reopen them.
- Tests with Vitest for logic, like the rest of the repo. Export speed measured on Vicent's iPhone with a real 1 h set.

## Constraints

- Repo rules: TDD, zero code comments, `data-testid` selectors, Makefile for common commands, `npm run lint` (oxlint; typescript-eslint can't parse TS 7), one feature per commit.
- Other sessions commit in the main checkout: work in a git worktree, never switch branches there.
- **Shipping** (Vicent, 2026-11-03): same App Store record as Cuts for Mac, bundle ID `com.vigosan.cuts`. Buying or downloading it on one platform makes it available on the other (universal purchase). This round ends at TestFlight for Vicent only. The App Store listing, the privacy policy update (Photos access instead of folders) and the website changes come later, when he is happy with it.
- **Sets in iCloud** (Vicent doesn't know where his sets will be; Claude's call): handle both cases. If the original is only in iCloud, Photos downloads it (network allowed) and Cuts shows a progress bar and a cancel button. The download goes into Photos' own storage, not Cuts', so it doesn't count as a copy under the anti-goal.
- **HDR** (Vicent doesn't know whether he records HDR; Claude's call): always export SDR in Rec. 709, tone-mapping HDR sources. The preview on screen may show HDR, the clips never do.
- Testing never touches Vicent's real sets or sessions; use test videos and isolated data.

## Left to the builder

- Package versions, Expo SDK, folder layout inside `apps/mobile`, and how the native module is split.
- How Photos access is requested. Claude's call: read access to reference the original asset by its identifier (no copy, and Recents can reopen it), plus add-only access to save exports. The builder may choose otherwise if it keeps the "no copy" anti-goal.
- Thumbnail density and caching on the timeline, waveform analysis caching.
- Exact visual styling, following the Mac's minimal native look (see the approved mockups).
- Whether undo also responds to shake (nice to have, not required).
