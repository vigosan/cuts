# Multi-video sessions on Mac — design

## Intent

Today Cuts opens one video and the carousel is cut from it. Vicent records a session as several separate videos and wants to build one carousel from all of them (2026-11-11): "mostrarlos todos y elegir trozos". The videos are separate takes, so "lógicamente un trozo no puede ser de dos vídeos distintos". The videos are short, under 4 minutes each (Vicent).

Vicent chose layout A from the mockups (`.superpowers/brainstorm/…/timeline-varios-videos.html`): all videos back to back on the one existing timeline, with a visible join between them. Hovering a video on the timeline shows an X that removes it. He confirmed in chat ("perfecto"): the clips of a removed video go with it, a + at the end adds videos, each carousel row says which video it comes from with times inside that video, the session reopens with the same videos and clips, the full export is the whole session, and this is Mac only.

Vicent then asked whether it would be simpler for Cuts to join the videos into one file before showing the timeline. Since the videos come from the same recording and are short, joining without re-encoding takes a second or two and little disk space, so this design joins them. Everything downstream of the join is the existing single-video app.

## Goals

- Open several videos at once: the Open dialog (Cmd+O), dropping several files on the window, and opening several files from Finder/Dock all start one multi-video session.
- Cuts joins the videos, in session order, into one file without re-encoding, then opens that file exactly as it opens a single video today. While joining (on open, drop, X or +), the window shows an animation that makes clear the videos are being joined and prepared (Vicent, 2026-11-11), for example the videos' names or posters coming together into one strip. It is calm, follows the app design direction, and has a reduced-motion variant.
- The timeline shows a visible join between videos and each video's file name on its stretch. Playhead, zoom, panning, filmstrip, waveform, playback, Suggest and export behave as today because they work on the joined file.
- A clip always lies inside one video. Creating, dragging, resizing, splitting, I/O marks, Suggest and beat snapping never produce a clip that crosses a join.
- Hovering a video's stretch shows an X at its top right; clicking it removes that video and its clips, Cuts rejoins the rest, the clips of the remaining videos keep their place in their videos, and clips renumber. No X when only one video is left.
- A + at the end of the timeline opens the dialog and appends the chosen videos; Cuts rejoins, keeping all existing clips.
- Carousel list: each row shows its video's name and start → end measured from the start of that video. Numbering follows timeline order as today. The 20-item and 59 s limits are unchanged.
- Exporting clips, frame and full recording work as today on the joined file; the full export is the whole session.
- The session saves and restores: reopening it from Recents, or opening the same set of files again, brings back the joined file and its clips without rejoining.
- A single video opens exactly as today (no join, no joined file), and sessions saved before this change still open with their clips.

## Non-goals

- iPhone. `apps/mobile` is untouched; shared `@cuts/core` changes must keep it compiling and its tests green.
- Re-encoding videos that can't be joined as they are (see Builder's calls).
- Reordering videos by dragging.
- Clips that span two videos, or transitions between videos.
- Mixing audio recordings with videos in one session.

## Anti-goals

- Making the single-video case slower or different in look or behavior.
- Joined files piling up on disk with no way out.
- Any quality loss from joining.
- A visible "session" concept (names, management screen). A session is just the set of videos open together.

## Decided by Vicent

- Layout A: one continuous timeline, videos back to back, joins visible, name on each video.
- X on hover over a video removes it; its clips go with it; others renumber.
- + at the end of the timeline adds videos.
- No clip crosses two videos.
- Carousel rows show source video and times local to it.
- Full export = whole session.
- Join the videos into one file before showing the timeline.
- Mac only for now.

## Builder's calls (Claude's, flagged for Vicent to check)

- **Order:** files chosen, dropped or opened together are sorted by file name (camera names like `IMG_0412` sort chronologically). Files added with + go after the existing ones, sorted among themselves the same way.
- **Cmd+O, drop and Finder open keep replacing** the open session (with today's confirmation when there are clips), now with one or several files. Only + adds. Finder sends one `open-file` event per file; events that arrive together are gathered into one open.
- **Duplicates:** a file already in the session is ignored when added.
- **Videos that can't be joined as they are:** if a video differs from the first in video codec, resolution or audio format, Cuts doesn't join and shows a notice naming that file; the session stays as it was. Frame-rate differences don't block the join.
- **Removing a video with clips asks for confirmation** (same style as the replace-video confirmation). Undo/redo keep covering clips only; removing or adding a video clears the undo history.
- **Missing originals:** once joined, the session works from the joined file, so originals that are moved or on an unplugged drive don't affect editing or export. Only X and + need the originals; if one is missing, Cuts shows a notice naming it and leaves the session unchanged.
- **Where joined files live and when they go:** in Cuts' app data (`userData/joined/`). A joined file is deleted when it is replaced by a rejoin (X or +) and when its session falls out of Recents (5 entries). Nothing in `Movies/Cuts` or next to the originals.
- **Reopening:** a session is identified by its set of original paths, in any order. Opening exactly the same set again reuses the existing joined file and session. Opening one of those videos alone opens that video on its own, as today.
- **Recents:** a multi-video session is one entry, named after the first video plus "+N", with its poster from the first clip. The videos in it don't get their own entries.
- **Names:** the window title shows the first video's name plus "+N" (full list in the tooltip). The default export name and output subfolder come from the first video. They don't change if the first video is later removed.
- **Audio recordings stay single-file:** if the selection contains an audio file, Cuts opens only the first file, as today, and + is hidden while an audio file is open.

## Left to the builder

- The ffmpeg join (concat demuxer with stream copy is the expected route) and the container of the joined file.
- How join offsets are measured so the joins on the timeline line up with the joined file within one frame (for example by probing each original, or reading the joined file's segment boundaries).
- How the session records its originals (paths, names, durations/offsets) and the joined file path, keeping old single-video sessions loading unchanged.
- How clips are kept in their videos across a rejoin: clips in the removed video go; clips after it move left by its duration; clips before it stay.
- Exact look of the join, the name label, the X and the + following the app design direction (Mac-native, minimal) and the mockup.
- Security: the joined file and every original are paths the main process allowed; the Mac App Store sandbox needs bookmarks for the originals to rejoin after relaunch, and a missing permission is treated like a missing original.

## Constraints

- TDD, tests pinning why behavior matters; the existing `App.test.tsx` cases and main/core tests keep passing with single-video behavior unchanged.
- Lint with `npm run lint` (oxlint).
- One functionality per commit.
- After the UI change, update website features in `apps/web/content.ts` and regenerate media (`make media`), checking frames by eye.
