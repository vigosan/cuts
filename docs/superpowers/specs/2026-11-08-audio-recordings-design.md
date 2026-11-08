# Audio recordings — design

## Intent

Many sets are recorded as audio only (a WAV from the mixer). Vicent wants the same session to become both the full video for YouTube and the carousel clips for Instagram, without leaving Cuts. Cuts keeps doing one job, turning a long recording into content; the recording can now be audio, with a background the user chooses (agreed 2026-11-08).

## Goals

- Open an audio file exactly like a video: dialog, drop, recents.
- The picture comes from a **background**: a video that loops for the whole length (for example an animated brand loop) or a still image.
- Everything that works on a video works on an audio recording: timeline with waveform, ✦ suggestions, I/O, fades, framing, overlay PNG, sessions, undo.
- Optional, only for audio recordings: a real **waveform** of the audio and a thin **progress bar**, drawn in the export.
- New output format **16:9 · 1920×1080** for YouTube, for every source, Mac and iPhone.
- New action **Export full recording**, for every source: one file from 0 to the end, with the fades of the default settings.

## Non-goals

- Audio recordings on iPhone.
- Live waveform or progress bar in the preview (they only appear in the export; the toggles say so).
- Brand templates, animated effects made by Cuts, crossfading a background that does not loop cleanly, a different background per clip.
- Filmstrip thumbnails for audio recordings: the timeline shows the waveform only.

## Behaviour

### Opening
- Audio extensions: `wav`, `mp3`, `m4a`, `aac`, `flac`, `aif`, `aiff`. The open dialog lists video and audio together.
- Recents work the same; audio recordings have no poster.

### Background
- A row **Background** ("Fondo") in the export settings, after Overlay, shown only when an audio recording is open. Same look as Overlay: "Add…", thumbnail + name + ✕, drop a file on the row.
- Accepted: `mov`, `mp4`, `m4v` (video, looped) and `png`, `jpg`, `jpeg` (still).
- Cuts copies the file into its app data (`backgrounds/`, one kept, like overlays). Files over 500 MB are refused with a notice.
- Global preference, never in per-video sessions.
- Without a background, the stage shows a quiet empty state with "Add a background" and export is disabled.
- In the preview the background plays muted in a loop; framing (crop/fit) and the overlay apply to it as they do to a video today.

### Waveform and progress bar
- Two toggles under Background, only for audio recordings: **Waveform** ("Onda", default on) and **Progress bar** ("Barra de progreso", default off). Global preferences.
- Waveform: the real audio (after fades), white at 30 % opacity, centred horizontally, 52 % of the frame width, 7.4 % of the frame height, bottom edge at 86 % of the frame height, both ends faded over 22 % of its width.
- Progress bar: white at 80 %, full width, height `max(2, round(frame height × 0.0037))` px, at the very bottom, growing from 0 to 100 % over the exported file (each clip has its own).

### Export full recording
- A secondary button under the export button: **Export full recording** ("Exportar grabación completa").
- Writes `<name>-full.mp4` in the chosen folder, with the overwrite prompt, progress and cancel of today.
- Video bitrate: 12 Mb/s for video sources (as clips), 4 Mb/s for audio recordings (a looping background does not need more; a 2 h set stays near 3.6 GB).

### 16:9
- `{ id: '16:9', size: 1920×1080 }`, label "16:9 YouTube · 1920×1080" in both languages.

## Anti-goals

- Changing anything for video sources beyond the new format and the full-recording button: with a video open, generated FFmpeg args for clips stay exactly as today.
- Export output frozen or out of sync: the output is always exactly as long as the audio span.
