# Multi-video Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open several short videos of one session on the Mac, join them without re-encoding into one file, and cut one carousel from it with joins visible, an X to remove a video and a + to add more.

**Architecture:** The main process joins the originals with the ffmpeg concat demuxer (stream copy) into `userData/joined/<key>.<ext>` plus a `<key>.json` manifest of the originals and their durations. The renderer opens the joined file exactly like a single video; the only new renderer state is `sources` (the originals with durations), which draws the joins and confines clips to one video. Every way of opening (dialog, drop, Finder, Recents, X, +) goes through one IPC call, `openVideos(paths, replacing)`.

**Tech Stack:** TypeScript 7, Vitest + Testing Library, React 19 + Tailwind v4 (Electron renderer), bundled FFmpeg.

**Spec:** `docs/superpowers/specs/2026-11-11-multi-video-sessions-design.md`

## Global Constraints

- Work in a git worktree, never switch branches in the main checkout (other sessions commit there).
- TDD: every task starts with a failing test. Test names say why the behaviour matters.
- No code comments. Selectors: `data-testid`.
- Commit titles: one descriptive line, no body, no `feat:`/`fix:`. One task = one commit.
- Before each commit: `npm test --workspaces`, `npm run typecheck --workspaces`, `npm run lint`. Tasks touching `packages/core` also `make mobile-test`.
- One video opened alone behaves exactly as today: same session key (`sha256(path)`), same Recents entry, no joins, no X, no join step. Existing `App.test.tsx` expectations about a single video keep passing (only the mocks' return shapes change).
- Joining never re-encodes (`-c copy`). Videos that differ from the first in video codec, resolution or audio format are not joined.
- Order: videos opened together are sorted by file name (numeric-aware); videos added with + go after the existing ones, sorted among themselves; duplicates ignored. If any chosen file is audio, only the first file opens, as today.
- Joined files live only in `userData/joined/`; one is deleted when replaced by X/+ and when its entry falls out of Recents (`MAX_RECENTS = 5`).
- Copy EN/ES:
  - `joiningVideos`: "Joining videos…" / "Juntando vídeos…"
  - `addVideos`: "Add videos" / "Añadir vídeos"
  - `removeVideo(name)`: "Remove {name}" / "Quitar {name}"
  - `removeVideoConfirm(name, count)`: "Remove {name} and its {count} clips?" / "¿Quitar {name} y sus {count} clips?"
  - `cannotJoin(name)`: "{name} can't be joined: it was recorded in a different format." / "No se puede juntar {name}: está grabado en otro formato."
  - `videoMissing(name)`: "Can't find {name}. The session stays as it was." / "No encuentro {name}. La sesión se queda como estaba."

## Review Focus

1. **Join offsets drift from the real joined file** — with three originals of odd lengths (e.g. 1.37 s, 2.11 s, 1.53 s) the frame shown at the third join must come from the third original, within one frame. Integration test in Task 2.
2. **Cuts quits or crashes mid-join** — a half-written joined file must never be reused; the join writes to a temp name and renames on success. Test in Task 3.
3. **An original is moved after joining** — the session still opens from Recents and exports; X and + show `videoMissing` and change nothing. Tests in Tasks 3 and 5.
4. **Removing a video after the user reordered the carousel** — the remaining clips keep their carousel order and per-clip settings, and clips after the removed video move left by its duration. Test in Task 1 (`removePart`) and Task 5.
5. **Dropping a mix of supported, unsupported and duplicate files** — unsupported files show the existing unsupported notice, duplicates are ignored, the rest open as one session. Test in Task 4.

---

### Task 1: Parts of a session in core

**Files:**
- Create: `packages/core/src/parts.ts`, `packages/core/src/parts.test.ts`
- Modify: `packages/core/src/drag-clip.ts`, `packages/core/src/drag-clip.test.ts`

**Interfaces:**
- Produces:
  - `type Part = { duration: number }`
  - `partStarts(parts: Part[]): number[]` — cumulative start of each part.
  - `partBoundsAt(parts: Part[], time: number, duration: number): { start: number; end: number }` — bounds of the part holding `time` (half-open, last part closed); `{ start: 0, end: duration }` when `parts.length < 2`.
  - `localTime(parts: Part[], time: number): { index: number; time: number }`
  - `confineMoment<T extends { start: number; end: number }>(parts: Part[], moment: T): T` — moved fully inside the part holding most of it, shortened when that part is shorter.
  - `removePart<T extends { start: number; end: number }>(clips: T[], parts: Part[], index: number): T[]` — drops clips inside the part, shifts later clips left by its duration, keeps array order.
  - `orderVideos(existing: string[], added: string[]): string[]` — `existing` then `added` minus duplicates, `added` sorted by basename with `localeCompare(…, undefined, { numeric: true })`.
  - `dragClip(clip, mode, delta, max: number, min = 0): Clip` — `duration` parameter renamed `max`, new optional `min` lower bound; mobile callers unchanged.

- [ ] **Step 1: Write the failing tests** in `parts.test.ts`: starts `[0, 10, 30]` for durations 10/20/5; `partBoundsAt` at 10 → `{10, 30}` ("a clip begun at a join belongs to the next video"), at 35 → `{30, 35}`; single part → whole duration; `localTime(…, 12)` → `{ index: 1, time: 2 }`; `confineMoment` of 8–14 → 10–16 (most in part 1), of 28–34 in a 5 s last part → 30–35; `removePart` index 1 drops a clip at 12–15, keeps 2–5, moves 31–33 to 11–13, and keeps `[c, a]` order when the input order was `[c, a]`; `orderVideos(['/a/IMG_0412.mov'], ['/b/IMG_0410.mov', '/a/IMG_0412.mov', '/b/IMG_09.mov'])` → `['/a/IMG_0412.mov', '/b/IMG_09.mov', '/b/IMG_0410.mov']`. In `drag-clip.test.ts`: moving a clip with `min = 10, max = 30` never starts before 10 or ends after 30.
- [ ] **Step 2: Run** `npm test -w packages/core -- parts drag-clip` — Expected: FAIL.
- [ ] **Step 3: Implement** `parts.ts` and the `dragClip` bounds.
- [ ] **Step 4: Run** the full gate plus `make mobile-test` — Expected: PASS.
- [ ] **Step 5: Commit** spec, plan and change: `git commit -m "Add session parts to keep clips inside one video"`

### Task 2: Joining videos with ffmpeg

**Files:**
- Create: `apps/desktop/src/main/join.ts`, `apps/desktop/src/main/join.test.ts`, `apps/desktop/src/main/join.integration.test.ts` (follow `ffmpeg.integration.test.ts` for fixtures and skipping without ffmpeg)

**Interfaces:**
- Produces:
  - `type MediaInfo = { duration: number; video: string | null; audio: string | null }`
  - `parseMediaInfo(ffmpegOutput: string): MediaInfo` — `Duration: HH:MM:SS.ss`; `video` = codec + `WxH` of the first `Video:` stream; `audio` = codec + sample rate + channel layout of the first `Audio:` stream. Frame rate is not part of either.
  - `firstMismatch(infos: MediaInfo[]): number` — index of the first info whose `video` or `audio` differs from `infos[0]`, or `-1`.
  - `joinKey(paths: string[]): string` — `sha256` of the paths sorted and joined with `\n`, first 32 hex chars.
  - `concatList(paths: string[]): string` — ffconcat text, `file '…'` lines with `'` escaped as `'\''`.
  - `joinArgs(listFile: string, output: string): string[]` — `-f concat -safe 0 -i list -map 0:v -map 0:a? -c copy output` with `-hide_banner -loglevel error -y`.

- [ ] **Step 1: Write the failing tests:** `parseMediaInfo` on a captured iPhone `.mov` stderr (h264 1920x1080, aac 48000 Hz stereo, plus a data stream) gives duration and signatures ignoring fps; a 3840x2160 video mismatches at its index; a path with `'` survives `concatList`; `joinKey` is equal for `[a, b]` and `[b, a]`. Integration: generate three test videos of 1.37 s, 2.11 s, 1.53 s with distinct solid colours, join them, assert the joined duration equals the sum within one frame and a thumbnail at `1.37 + 2.11 + 0.1` has the third colour.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- join` — Expected: FAIL.
- [ ] **Step 3: Implement** `join.ts`.
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Join videos with ffmpeg without re-encoding"`

### Task 3: One way to open videos in the main process

**Files:**
- Create: `apps/desktop/src/main/open-videos.ts`, `apps/desktop/src/main/open-videos.test.ts`
- Modify: `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx` (mock shapes only), `apps/desktop/src/shared/api.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/main/index.ts` (dialog `multiSelections`, `allow-video`, `open-file` batching, `open-recent`, new `open-videos` handler), `apps/desktop/src/main/recents.ts`, `apps/desktop/src/main/recents.test.ts`

**Interfaces:**
- Consumes: Task 2 `parseMediaInfo`, `firstMismatch`, `joinKey`, `concatList`, `joinArgs`.
- Produces (in `shared/api.ts`):
  - `type Source = { path: string; name: string; duration: number }`
  - `type OpenResult = { ok: true; path: string; sources: Source[] } | { ok: false; problem: 'mismatch' | 'missing'; name: string }` — `sources` is `[]` for a single video.
  - `Api.openVideo(): Promise<string[] | null>` (dialog, several files), `Api.openVideos(paths: string[], replacing: string | null): Promise<OpenResult>`, `Api.onOpenPaths(callback: (paths: string[]) => void)` replacing `onOpenPath`, `Api.openRecent(path: string): Promise<OpenResult | null>`.
  - `RecentEntry` gains `sources?: string[]` and `bookmarks?: string[]`; `rememberRecent` returns the evicted entries; `toRecentVideo` names a session `"<first name> +N"` and takes its folder from the first source.
  - `openVideos(paths, replacing, deps: OpenDeps): Promise<OpenResult>` in `open-videos.ts`, with `OpenDeps` covering file existence, ffmpeg info, running the join, reading/writing the manifest, renaming, removing files, removing a session file and forgetting/remembering recents.
- Behaviour: one path, or a first path that is audio → `{ ok: true, path, sources: [] }` and remembered as today. Several → missing original → `missing`; mismatch → `mismatch`; a manifest for the same key with an existing joined file → reused; otherwise join to `<key>.joining.<ext>` and rename to `<key>.<ext>`, write `<key>.json`. Then discard `replacing` when it is a joined file (file, manifest, its session, its recent), remember the joined entry with `sources`/`bookmarks`, and delete joined files of evicted entries. `allow-video` and the Finder path no longer remember recents; only `openVideos` does. Finder `open-file` events within 300 ms are sent as one `open-paths`. `open-recent` for an entry with `sources` calls `openVideos(entry.sources, null)` after starting each bookmark.

- [ ] **Step 1: Write the failing tests** in `open-videos.test.ts` with fake deps: one video skips joining; two videos join once and a second call reuses the manifest; a failed join leaves no `<key>.<ext>` and the next call joins again (Review Focus 2); a missing original returns `missing` with its name; `replacing` a joined file removes its file, manifest, session and recent; an evicted joined entry's file is deleted. In `recents.test.ts`: a session entry is named `IMG_0412.mov +2`; `rememberRecent` returns the entry pushed past five.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- open-videos recents` — Expected: FAIL.
- [ ] **Step 3: Implement** `open-videos.ts`, the recents changes, the API/preload and the `index.ts` wiring.
- [ ] **Step 4: Adapt `App.tsx` to compile against the new API without new UI:** dialog, drop, `onOpenPaths` and Recents go through `openVideos(paths, null)` and load `result.path` when `ok`; update `App.test.tsx` mocks to the new shapes (`openVideo` → `[VIDEO]`, `openVideos` → `{ ok: true, path: paths[0], sources: [] }`, `openRecent` → `OpenResult`).
- [ ] **Step 5: Run** the full gate — Expected: PASS.
- [ ] **Step 6: Commit:** `git commit -m "Open several videos as one joined session"`

### Task 4: Opening several videos in the window

**Files:**
- Create: `apps/desktop/src/renderer/src/components/JoiningVideos.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`, `packages/core/src/i18n.ts`

**Interfaces:**
- Consumes: Task 3 `OpenResult`, `Source`, `Api.openVideos`, `Api.onOpenPaths`.
- Produces: `App` state `sources: Source[]`; `load(result: { path: string; sources: Source[] }, carry?: Session)` — `carry` replaces the session restore (Task 5 uses it); `openPaths(paths: string[], replacing: string | null)` — shows `JoiningVideos` (`data-testid="joining"`, names of the files coming together into one strip, `motion-reduce` shows them still with the `joiningVideos` label) while `openVideos` runs when `paths.length > 1`, then loads or shows `cannotJoin`/`videoMissing` in the existing `Notice`.
- Names: title `"<first name> +N"` with every source name in the tooltip; default `baseName` and export subfolder from `sources[0].path` when there are sources.

- [ ] **Step 1: Write the failing tests:** choosing three files in the dialog calls `openVideos` with them sorted by name and shows `joining` until it resolves; dropping two videos plus a `.txt` and a duplicate opens the two and shows the unsupported notice (Review Focus 5); a `mismatch` result shows `cannotJoin` with that name and keeps the open video; the title reads `IMG_0412.mov +2`; the export name is `IMG_0412`; opening one video still calls `loadSession` with its own path.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — Expected: FAIL.
- [ ] **Step 3: Implement** the copy, `JoiningVideos` and the `App` changes.
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Show joining while several videos open as one session"`

### Task 5: Joins, X and + on the timeline

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/Timeline.tsx`, `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 `partStarts`, `partBoundsAt`, `removePart`, `orderVideos`; Task 4 `openPaths`, `load(result, carry)`.
- Produces: `Timeline` props `sources: Source[]`, `onRemoveSource(index: number)`, `onAddVideos()`. Each source after the first starts with a join line (`data-testid="join-<i>"`); each stretch shows its name; hovering a stretch shows `remove-video-<i>` (only when `sources.length > 1`); `add-videos` sits after the timeline for any video that is not audio. Dragging uses `dragClip(…, bounds.end, bounds.start)` with `partBoundsAt(sources, clip.start, duration)`.
- Remove: confirm with `removeVideoConfirm` when the video has clips; then `openPaths(remaining paths, videoPath)` with `carry` = current session whose clips go through `removePart` and whose `clipSettings` keep only surviving ids. Add: `openVideo()` → `orderVideos(current paths, chosen)` → `openPaths(…, videoPath)` with `carry` = current session unchanged. For a single video the current paths are `[videoPath]`.

- [ ] **Step 1: Write the failing tests:** three sources draw `join-1` and `join-2` at their starts; removing the middle video after reordering the carousel keeps the others' order, settings and shifted times (Review Focus 4) and calls `openVideos` with the other two and the joined path as `replacing`; cancelling the confirmation changes nothing; `videoMissing` on remove leaves clips and sources as they were (Review Focus 3); + on a single video calls `openVideos([videoPath, added…], videoPath)` and keeps its clips; dragging a clip's end past a join stops at the join.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — Expected: FAIL.
- [ ] **Step 3: Implement** the timeline UI (follow the mockup and the minimal Mac direction) and the `App` handlers.
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Remove and add videos from the session timeline"`

### Task 6: Clips stay inside one video

**Files:**
- Modify: `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/src/renderer/src/components/ClipList.tsx`, `apps/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1 `partBoundsAt`, `localTime`, `confineMoment`.
- Produces: `markEnd` clamps its time to `partBoundsAt(sources, pendingStart, duration).end`; row set start/end clamp `now()` to the clip's part; Suggest passes every moment through `confineMoment`. `ClipList` prop `sources: Source[]`; with two or more sources each row shows the source name (`clip-source-<n>`) and start/end from `localTime`.

- [ ] **Step 1: Write the failing tests:** marking I in video 1 and O in video 2 makes a clip ending at the join; Suggest over two sources never returns a clip that crosses the join; row 1 of a clip at 12–15 s in the second of two 10 s videos shows `IMG_0413.mov` and `00:00:02 → 00:00:05`; with one video the row looks as today.
- [ ] **Step 2: Run** `npm test -w apps/desktop -- App` — Expected: FAIL.
- [ ] **Step 3: Implement** the clamps and the row display.
- [ ] **Step 4: Run** the full gate — Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Keep clips inside one video and show their source"`

### Task 7: Website feature and media

**Files:**
- Modify: `apps/web/content.ts` (features list, EN and ES), regenerated media under `apps/web/public/screenshots`

- [ ] **Step 1:** Add a feature entry for opening several videos of one session in the existing tracklist style (approved design direction: Geist Sans, mono details).
- [ ] **Step 2: Run** `make media` and look at every regenerated frame by eye; the joins and names must read in both themes.
- [ ] **Step 3: Run** the web build/tests the repo already uses for `apps/web` — Expected: PASS.
- [ ] **Step 4: Commit:** `git commit -m "Show multi-video sessions on the website"`
