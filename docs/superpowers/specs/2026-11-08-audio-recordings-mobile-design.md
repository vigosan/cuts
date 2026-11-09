# Audio recordings on iPhone — design

## Intent

Bring the Mac 1.9 work to Cuts for iPhone, so the phone keeps "the same features as Cuts for Mac" (cuts-mobile design, 2026-11-03). Vicent chose the full scope on 2026-11-08: audio recordings with a background, waveform and progress bar layers placed on the preview with their own colour and opacity, export of the full recording, "Export again" after changes, and one export button with options. The Mac design (`2026-11-08-audio-recordings-design.md`) listed iPhone audio as a non-goal; this document supersedes that line.

## Goals

- Open an audio recording (WAV, MP3, M4A, AAC, FLAC) from the Files app (Vicent, 2026-11-08), next to the existing Photos and Files video picks.
- Background: a looping video or a still image, chosen from Photos or Files, copied into app data (one kept, 500 MB limit), global preference.
- Waveform and progress bar: off by default, each with colour and opacity, placed and resized on the preview like the PNG overlay. Same defaults, shapes and clamping as the Mac (`@cuts/core/audio-layers`).
- Export the full recording as one file (`<name>-full.mp4`) for any source, with the default fades, saved to the Cuts album like clips.
- One export button: the main part exports the clips (or the full recording when no clip is marked); a chevron offers both.
- After an export, changing format, name, overlay, background or the layers offers Export again instead of keeping the done state.

## Non-goals

- Opening audio from Photos (Photos has no audio files) or from the Share sheet.
- A live waveform in the preview: it shows the shape in its colour and opacity, as on the Mac.
- Pixel-identical waveform with the Mac: the iPhone draws it itself (no FFmpeg); same place, size, colour, opacity and faded ends, drawn from the real audio.

## Behaviour

### Home and opening
- Home gains "Choose audio from Files"; the Files picker for audio accepts `public.audio`.
- An audio recording opens like a video: duration, peaks, suggestions, clips, sessions and recents. Its recent row shows a waveform glyph instead of a poster.

### Cut screen with an audio recording
- The stage shows the background (looping muted video or still image) with the crop frame, overlay and layers on top. Without a background, the stage shows "Add a background", which opens the background choice.
- The filmstrip shows no thumbnails for audio; the waveform stays.
- Touching a layer (overlay, waveform, bar) makes it the active one: pan moves the touched layer, pinch scales the active layer. With only the overlay, behaviour is unchanged.

### Export sheet
- Rows after Overlay, only for audio recordings: Background (add / thumbnail + name / remove, from Photos or Files), Waveform (switch, colour, opacity), Progress bar (switch, colour, opacity).
- Colour opens the iOS colour picker; opacity is a segmented choice of 10, 30, 50, 80, 100 %. Defaults: waveform white 30 %, bar white 80 %.
- Without a background, export is disabled and the sheet says why (`t.backgroundMissing`).

### Export
- Audio exports render the background (video looped from its start, or the still image) through the existing framing, then overlay, waveform, progress bar and image fade, at 30 fps, 4 Mb/s. The audio span gets the usual fades.
- Waveform: the real audio of each frame's window, mono, drawn as a centred line per column with sqrt scaling, in the chosen colour, opacity multiplied by the faded-ends mask (22 % of its width), at the placement.
- Progress bar: filled from its left edge to `width × t / length` in its colour and opacity.
- Full recording: one job from 0 to the duration, `videoFadeIn` true, file `<name>-full.mp4`, 12 Mb/s for videos and 4 Mb/s for audio.

## Anti-goals

- Changing video-source clip exports beyond the button and the outdated rule.
- Holding a whole two-hour WAV in memory: the waveform streams the audio at 44.1 kHz mono and keeps only the current frame's window.
