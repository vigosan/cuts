# Multi-video sessions without joining — design

## Intent

The multi-video sessions merged on 2026-11-12 (`2026-11-11-multi-video-sessions-design.md`) join the originals into one file in `userData/joined/` before showing the timeline. After weighing it, Vicent chose (2026-11-12) to drop the join and play the original videos back to back on the timeline instead: no wait, no copy on disk, X and + become instant. The side effect he raised, a video that is no longer on disk, is handled with a placeholder: "simplemente podríamos mostrar un placeholder que dé a entender que el vídeo no se ha encontrado".

Everything the user sees from the previous design stays: one timeline with joins and names, X on hover to remove a video, + to add videos, clips never cross a join, carousel rows show their video and local times, order by file name, Mac only. The join step, the joined files and the joining animation go away.

The joined build was never pushed or released, so there is nothing to migrate: no user has joined files or joined sessions.

## Goals

- Opening several videos (dialog, drop, Finder) shows the session immediately from the originals; Cuts only reads each video's duration (and size, frame rate) first.
- Playback runs across videos: playing past the end of one continues at the start of the next; seeking, frame stepping, shuttle, play-clip and play-all-clips loops work across videos. A short pause at a join while the next file loads is acceptable.
- Filmstrip thumbnails and the waveform cover the whole session, drawn from each original.
- X and + change the session instantly (no rejoin); X still asks for confirmation when the video has clips.
- Exporting clips cuts each clip from its own original with its local times. The full export (`<name>-full.mp4`) joins all videos in order into one file, re-encoding as the full export already does. Export frame uses the video under the playhead.
- Videos of a session may differ in format: resolution, orientation, HDR, frame rate. There is no compatibility check any more.
- **Missing video placeholder.** When an original is not on disk (moved, deleted, unplugged drive) or not readable (App Store permission lost):
  - its stretch keeps its place and length on the timeline, drawn as a hatched/grey block with "Not found: <name>" and a **Locate…** button;
  - when the playhead is inside it, the preview shows the same message instead of a picture; playing through continues in the next available video;
  - its clips stay in the carousel, marked unavailable; they are never deleted;
  - exporting clips when some are unavailable asks to export the others and skip those, or cancel;
  - the full export and export frame on a missing video are disabled with the reason shown;
  - Locate… opens a file dialog; the chosen file replaces the original in the session when its duration matches the stored one, otherwise Cuts shows a notice and keeps the placeholder.
- Sessions save and restore with their videos, order and clips. Reopening from Recents or opening the same set of files again restores them, even if some videos are now missing (they show as placeholders).
- A single video behaves exactly as today.

## Non-goals

- iPhone.
- Gapless playback across joins.
- Reordering videos by dragging.
- Relinking several missing videos in one go (Locate is per video).
- Mixing audio recordings with videos in one session.

## Anti-goals

- Copying or joining originals to edit them.
- Losing clips because a video is missing.
- Making the single-video case slower or different in behavior.

## Decided by Vicent

- Play the original videos back to back instead of joining them (2026-11-12).
- A missing video shows a placeholder that makes clear it was not found.
- Everything visible from the previous design stays (layout A, X, +, no clip across videos, row source and local times, full export = whole session, Mac only).

## Builder's calls (Claude's, flagged for Vicent to check)

- **Locate…** accepts a file whose duration is within 0.5 s of the stored one; it does not check the name.
- **Unavailable clips on export:** a confirmation "Export N clips and skip M from missing videos?" with Export / Cancel.
- **Mixed formats:** framing, crop frame, overlay placement and frame stepping follow the video under the playhead; each clip exports at its own video's size and orientation; the full export uses the first video's size and fits the others into it the way an image of another shape is fitted today.
- **Recents:** a multi-video session is one entry (first name + "+N", poster from the first available clip). It stays listed while at least one of its videos exists; opening it shows the missing ones as placeholders.
- **Reopening:** a session is identified by its set of original paths, in any order; reopening restores the stored order. When no session matches the paths (the folder was moved or renamed, or the drive mounts under another name), Cuts looks for a saved session whose videos have the same file names and durations and restores it with the new paths.
- **Single videos keep today's behaviour,** including disappearing from Recents when the file is gone; the placeholder is for sessions of two or more videos. A session reduced to one video by X becomes a normal single-video session.
- **When missing is detected:** when the session opens, when the window regains focus (so plugging a drive back in clears the placeholder), and whenever playback, thumbnails or an export fail to read a video (it switches to the placeholder instead of an error).
- **Full export mixing HDR and SDR videos** is disabled with the reason shown; the bundled ffmpeg cannot tone-map. Clip exports are unaffected, and mixing sizes or orientations in the full export works as described above.
- **One `<video>` element** whose source switches at joins; no preloading of the next video.
- **Opening** shows no joining animation any more; if reading durations takes noticeably long, the existing loading state is enough.
- **Removal of the join code:** `join.ts` helpers that only serve joining (`concatList`, `joinArgs`, `firstMismatch`), the `userData/joined/` directory handling, `JoiningVideos`, the `cannotJoin` copy and the mismatch result go. `parseMediaInfo` (duration, size, rotation) stays if useful. Leftover `userData/joined/` folders from dev builds are deleted on launch.

## Left to the builder

- Where session-time ↔ (video, local time) mapping lives (extend `@cuts/core/parts`), and how playback switches sources without breaking `useTransport`, `useClipLoop` and the playhead.
- How a multi-video session is keyed on disk and in Recents (it has no single file path), keeping single-video keys unchanged.
- How `ExportRequest` carries per-clip inputs and how the full export builds its ffmpeg concat with scaling.
- Exact placeholder look, following the app design direction and the timeline's existing styling.
- Security: every original path reaching ffmpeg or the media protocol must be one the main process allowed (dialog, drop, Finder, Recents bookmark, Locate).

## Constraints

- TDD, tests encode why. Existing single-video tests keep passing unchanged.
- Lint with `npm run lint`; typecheck; one functionality per commit.
- After the UI change, update website copy if it mentions joining ("Cuts joins them without re-encoding") and regenerate media when the source video is available.
