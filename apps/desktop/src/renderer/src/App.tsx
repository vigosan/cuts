import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from 'react'
import { defaultBaseName, formatTime, isOverLimit, MAX_CLIP_SECONDS, type Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import type { ExportResult, ImportedOverlay, RecentVideo } from '@shared/api'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import { clampPlacement, defaultPlacement, outputFrame, type Overlay } from '@cuts/core/overlay'
import { mediaUrl } from '@shared/media-url'
import { isSupportedVideo } from '@shared/video-formats'
import { ClipList, type SelectMode } from './components/ClipList'
import { ExportPanel, type ExportState } from './components/ExportPanel'
import { ClipControls } from './components/ClipControls'
import { CropFrame } from './components/CropFrame'
import { FitPreview } from './components/FitPreview'
import { OverlayLayer } from './components/OverlayLayer'
import { PauseIcon, PlayIcon, SparkleIcon, SpinnerIcon, TrashIcon } from './components/icons'
import { Notice } from './components/Notice'
import { RecentVideos } from './components/RecentVideos'
import appIcon from '../../../build/icon.svg'
import { ShortcutsPanel } from './components/ShortcutsPanel'
import { Timeline } from './components/Timeline'
import { clipsReducer, initialClipsState } from '@cuts/core/clips-reducer'
import { withHistory } from '@cuts/core/history'
import { t } from './i18n'
import { nextViewStart, viewStartForClip, ZOOM_LEVELS, type Zoom } from '@cuts/core/timeline-view'
import { suggestMoments } from '@cuts/core/suggest'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import { snapToBeat } from '@cuts/core/beats'
import { useClipLoop } from './useClipLoop'
import { useTransport } from './useTransport'
import { useWaveform } from './useVideoPreview'
import { loadPreferences, savePreferences } from './preferences'

const SEEK_STEP = 5
const SAVE_DELAY_MS = 300
const NOTICE_MS = 5000
const DEFAULT_FPS = 30
const clipsHistory = withHistory(clipsReducer)
const APP_FOLDER = 'Cuts'

function zoomLabel(span: Zoom): string {
  if (span === null) return t.zoomAll
  return span >= 60 ? `${span / 60} min` : `${span} s`
}

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [videoError, setVideoError] = useState(false)
  const [unsupportedDrops, setUnsupportedDrops] = useState(0)
  const [history, dispatch] = useReducer(clipsHistory, { past: [], present: initialClipsState, future: [] })
  const { clips, pendingStart } = history.present
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [baseName, setBaseName] = useState('')
  const [folder, setFolder] = useState<string | null>(() => loadPreferences().folder)
  const [defaultSettings, setDefaultSettings] = useState<ClipSettings>(() => loadPreferences().settings)
  const [clipSettings, setClipSettings] = useState<Record<string, ClipSettings>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectionAnchor = useRef<string | null>(null)

  const settingsOf = (clip: Clip) => clipSettings[clip.id] ?? defaultSettings
  const fades = useMemo(() => clips.map((clip) => clipSettings[clip.id] ?? defaultSettings), [clips, clipSettings, defaultSettings])
  const selectedClips = clips.filter((clip) => selectedIds.includes(clip.id))
  const selectedClip = selectedClips.length === 1 ? selectedClips[0] : null
  const selectedIndex = selectedClip ? clips.indexOf(selectedClip) : -1
  const changeSettings = (change: Partial<ClipSettings>) => {
    if (selectedClips.length > 0) {
      setClipSettings({
        ...clipSettings,
        ...Object.fromEntries(selectedClips.map((clip) => [clip.id, { ...settingsOf(clip), ...change }]))
      })
    } else {
      const settings = { ...defaultSettings, ...change }
      setDefaultSettings(settings)
      savePreferences({ settings })
      setClipSettings(Object.fromEntries(Object.entries(clipSettings).map(([id, own]) => [id, { ...own, ...change }])))
    }
  }
  const [format, setFormat] = useState<OutputFormat>(() => loadPreferences().format)
  const [overlay, setOverlayState] = useState<Overlay | null>(() => loadPreferences().overlay)
  const setOverlay = (next: Overlay | null) => {
    setOverlayState(next)
    savePreferences({ overlay: next })
  }
  const [restoredFor, setRestoredFor] = useState<string | null>(null)
  const openedPath = useRef<string | null>(null)
  const [fps, setFps] = useState(DEFAULT_FPS)
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null)
  const scopeClips = selectedClips.length > 0 ? selectedClips : clips
  const shownSettings = scopeClips.length > 0 ? settingsOf(scopeClips[0]) : defaultSettings
  const mixed = Object.fromEntries(
    (Object.keys(shownSettings) as (keyof ClipSettings)[]).map((key) => [
      key,
      scopeClips.some((clip) => settingsOf(clip)[key] !== shownSettings[key])
    ])
  ) as Record<keyof ClipSettings, boolean>
  const target = formatSize(format)
  const [lastExport, setExportState] = useState<ExportState>({ status: 'idle' })
  const [zoom, setZoom] = useState<Zoom>(null)
  const [viewStart, setViewStart] = useState(0)

  const [suggesting, setSuggesting] = useState(false)
  const [panned, setPanned] = useState<{ time: number; zoom: Zoom } | null>(null)

  const keepPanned = panned?.time === time && panned.zoom === zoom
  const currentViewStart = keepPanned ? viewStart : nextViewStart(viewStart, time, duration, zoom)
  if (currentViewStart !== viewStart) setViewStart(currentViewStart)
  const viewSpan = zoom === null ? duration : Math.min(zoom, duration)

  const { now, seekTo, togglePlay, stepTo, shuttleForward, stopShuttle } = useTransport(videoRef, duration)
  const { peaks, analysing } = useWaveform(videoPath)
  const onBeat = (time: number) => (peaks ? snapToBeat(time, peaks, PEAKS_PER_SECOND) : time)
  const markStart = (free = false) => dispatch({ type: 'markStart', time: free ? now() : onBeat(now()) })
  const markEnd = (free = false) => dispatch({ type: 'markEnd', time: free ? now() : onBeat(now()), id: crypto.randomUUID() })
  const split = () => {
    const time = now()
    const inside = (clip: Clip) => clip.start < time && time < clip.end
    const clip = selectedClip && inside(selectedClip) ? selectedClip : clips.find(inside)
    if (!clip) return
    const newId = crypto.randomUUID()
    if (clipSettings[clip.id]) setClipSettings({ ...clipSettings, [newId]: clipSettings[clip.id] })
    dispatch({ type: 'split', id: clip.id, time, newId })
  }

  const load = (path: string) => {
    setVideoPath(path)
    setVideoError(false)
    setTime(0)
    setDuration(0)
    setVideoSize(null)
    setBaseName(defaultBaseName(path))
    if (!folder) void window.api.moviesDir().then((dir) => setFolder(`${dir}/${APP_FOLDER}`))
    setExportState({ status: 'idle' })
    setViewStart(0)
    setClipSettings({})
    setSelectedIds([])
    dispatch({ type: 'reset', resetHistory: true })
    setRestoredFor(null)
    openedPath.current = path
    void window.api.frameRate(path).then((rate) => openedPath.current === path && setFps(rate))
    void window.api.loadSession(path).then((session) => {
      if (openedPath.current !== path) return
      if (session) {
        dispatch({ type: 'restore', clips: session.clips, resetHistory: true })
        setClipSettings(session.clipSettings)
        setDefaultSettings(session.defaultSettings)
        setFormat(session.format)
        setBaseName(session.baseName)
      }
      setRestoredFor(path)
    })
  }

  useEffect(() => {
    if (unsupportedDrops === 0) return
    const timer = setTimeout(() => setUnsupportedDrops(0), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [unsupportedDrops])

  const [suggestNotice, setSuggestNotice] = useState<string | null>(null)
  useEffect(() => {
    if (suggestNotice === null) return
    const timer = setTimeout(() => setSuggestNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [suggestNotice])

  useEffect(() => {
    if (!videoPath || restoredFor !== videoPath) return
    const timer = setTimeout(
      () => window.api.saveSession(videoPath, { clips, clipSettings, defaultSettings, format, baseName }),
      SAVE_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [videoPath, restoredFor, clips, clipSettings, defaultSettings, format, baseName])

  const exportInputs = [clips, clipSettings, defaultSettings, format, baseName, folder, selectedIds]
  const [exportedWith, setExportedWith] = useState(exportInputs)
  const outdated = exportedWith.some((input, index) => input !== exportInputs[index])
  const exportState: ExportState =
    outdated && (lastExport.status === 'done' || lastExport.status === 'error') ? { status: 'idle' } : lastExport

  const { loopingId, loop, playClip, keepLooping, seekFromTimeline } = useClipLoop({ videoRef, clips, playing, seekTo })

  const selectClip = (clip: Clip, mode: SelectMode = 'only') => {
    const from = clips.findIndex((other) => other.id === selectionAnchor.current)
    if (mode === 'range' && from !== -1) {
      const to = clips.indexOf(clip)
      setSelectedIds(clips.slice(Math.min(from, to), Math.max(from, to) + 1).map((other) => other.id))
      return
    }
    selectionAnchor.current = clip.id
    if (mode === 'toggle') {
      setSelectedIds(selectedIds.includes(clip.id) ? selectedIds.filter((id) => id !== clip.id) : [...selectedIds, clip.id])
      return
    }
    setSelectedIds([clip.id])
  }

  const jumpToClip = (clip: Clip) => {
    selectClip(clip)
    setViewStart(viewStartForClip(clip, duration, zoom))
    setTime(clip.start)
    seekFromTimeline(clip.start)
  }

  const pickClip = (clip: Clip, mode: SelectMode = 'only') => {
    if (mode !== 'only') return selectClip(clip, mode)
    if (selectedClip?.id === clip.id) return setSelectedIds([])
    jumpToClip(clip)
  }

  const deleteSelected = () => {
    dispatch({ type: 'checkpoint' })
    for (const id of selectedIds) dispatch({ type: 'remove', id, transient: true })
    setSelectedIds([])
  }

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)
  useEffect(() => window.api.onMenuShortcuts(() => setShortcutsOpen(true)), [])

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (shortcutsOpen) return
    if (exportState.status === 'running' && e.metaKey && e.key === '.') {
      e.preventDefault()
      return window.api.cancelExport()
    }
    if (e.target instanceof HTMLInputElement && e.target.type === 'text') return
    if (e.metaKey || e.ctrlKey) return
    if (e.altKey && selectedIndex !== -1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      const to = selectedIndex + (e.key === 'ArrowUp' ? -1 : 1)
      if (to >= 0 && to < clips.length) dispatch({ type: 'reorder', from: selectedIndex, to })
      return
    }
    if (selectedClip && e.shiftKey && (e.code === 'KeyI' || e.code === 'KeyO')) {
      e.preventDefault()
      dispatch({ type: e.code === 'KeyI' ? 'setStart' : 'setEnd', id: selectedClip.id, time: now() })
      return
    }
    const lastSelected = clips.findLastIndex((clip) => selectedIds.includes(clip.id))
    const actions: Record<string, () => void> = {
      ...(clips.length > 0
        ? {
            ArrowDown: () => jumpToClip(clips[lastSelected === -1 ? 0 : Math.min(lastSelected + 1, clips.length - 1)]),
            ArrowUp: () => jumpToClip(clips[lastSelected === -1 ? clips.length - 1 : Math.max(lastSelected - 1, 0)])
          }
        : {}),
      ...(selectedIds.length > 0 ? { Escape: () => setSelectedIds([]), Backspace: deleteSelected, Delete: deleteSelected } : {}),
      i: () => markStart(),
      o: () => markEnd(),
      s: split,
      ' ': togglePlay,
      '?': () => setShortcutsOpen(true),
      ArrowLeft: () => seekTo(now() - SEEK_STEP),
      ArrowRight: () => seekTo(now() + SEEK_STEP)
    }
    const frame = e.shiftKey ? 1 : 1 / fps
    const byPosition: Record<string, () => void> = {
      ...(e.altKey ? { KeyI: () => markStart(true), KeyO: () => markEnd(true) } : {}),
      Comma: () => stepTo(now() - frame),
      Period: () => stepTo(now() + frame),
      KeyJ: () => seekTo(now() - SEEK_STEP),
      KeyK: stopShuttle,
      KeyL: shuttleForward
    }
    const action = byPosition[e.code] ?? actions[e.key.length === 1 ? e.key.toLowerCase() : e.key]
    if (!action) return
    e.preventDefault()
    action()
  })

  useEffect(() => {
    if (!videoPath) return
    const listener = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [videoPath])

  useEffect(
    () =>
      window.api.onExportProgress(({ index, ratio }) =>
        setExportState((s) =>
          s.status === 'running' ? { ...s, progress: s.progress.map((r, i) => (i === index ? ratio : r)) } : s
        )
      ),
    []
  )

  const destination = videoPath && folder ? `${folder}/${defaultBaseName(videoPath)}` : null

  const exported = selectedClips.length > 0 ? selectedClips : clips

  const [exportIds, setExportIds] = useState<string[]>([])
  const exportStatus: Record<string, number> = {}
  if (exportState.status === 'done') exportIds.forEach((id) => (exportStatus[id] = 1))
  if (exportState.status === 'running') {
    const active = exportState.progress.findIndex((ratio) => ratio < 1)
    exportIds.forEach((id, index) => {
      if (exportState.progress[index] >= 1) exportStatus[id] = 1
      else if (index === active) exportStatus[id] = exportState.progress[index]
    })
  }

  const overlayFrame = () => outputFrame(format, videoSize ?? { width: 1920, height: 1080 })
  const exportOverlay = () => {
    if (!overlay) return null
    const { x, y, width } = clampPlacement(overlay, overlay.aspect, overlayFrame())
    return { path: overlay.path, x, y, width }
  }
  const takeOverlay = (chosen: ImportedOverlay | 'invalid' | null) => {
    if (chosen === 'invalid') return setSuggestNotice(t.overlayInvalid)
    if (chosen) setOverlay({ ...chosen, ...defaultPlacement(chosen.aspect, overlayFrame()) })
  }

  const runExport = async () => {
    if (!videoPath || !destination) return
    setExportedWith(exportInputs)
    setExportState({ status: 'running', progress: exported.map(() => 0) })
    setExportIds(exported.map((clip) => clip.id))
    const result = await window.api
      .exportClips({
        input: videoPath,
        folder: destination,
        baseName,
        format,
        clips: exported.map((clip) => ({ ...clip, ...settingsOf(clip), position: clips.indexOf(clip) })),
        overlay: exportOverlay()
      })
      .catch((error: Error): ExportResult => ({ ok: false, error: error.message }))
    setExportState(result.ok ? { status: 'done', files: result.files } : { status: 'error', error: result.error })
  }

  const runExportFrame = async () => {
    if (!videoPath || !destination || exporting) return
    const { framing, cropX, cropY } = shownSettings
    const result = await window.api
      .exportFrame({ input: videoPath, folder: destination, baseName, format, time: now(), framing, cropX, cropY, overlay: exportOverlay() })
      .catch((error: Error): ExportResult => ({ ok: false, error: error.message }))
    if (result.ok) return window.api.reveal(result.files[0])
    setExportedWith(exportInputs)
    setExportState({ status: 'error', error: result.error })
  }
  const onMenuExportFrame = useEffectEvent(() => void runExportFrame())
  useEffect(() => window.api.onMenuExportFrame(() => onMenuExportFrame()), [])

  const suggest = async (path: string) => {
    setSuggesting(true)
    const peaks = await window.api
      .waveform(path)
      .catch(() => null)
      .finally(() => setSuggesting(false))
    if (openedPath.current !== path) return
    if (!peaks) return setSuggestNotice(t.suggestNoAudio)
    const moments = suggestMoments({ peaks, peaksPerSecond: PEAKS_PER_SECOND, duration, clipLength: MAX_CLIP_SECONDS, existing: clips.filter((clip) => !clip.suggested) })
    if (moments.length === 0) return setSuggestNotice(t.suggestNoneFound)
    dispatch({ type: 'suggest', clips: moments.map((moment) => ({ id: crypto.randomUUID(), ...moment })) })
  }

  const exporting = exportState.status === 'running'

  const openVideo = async () => {
    if (exporting) return
    if (clips.length > 0 && !window.confirm(t.replaceVideoConfirm)) return
    const path = await window.api.openVideo()
    if (path) load(path)
  }

  const onMenuOpenVideo = useEffectEvent(() => void openVideo())
  useEffect(() => window.api.onMenuOpenVideo(() => onMenuOpenVideo()), [])

  const onOpenPath = useEffectEvent((path: string) => {
    if (exporting) return
    if (clips.length > 0 && !window.confirm(t.replaceVideoConfirm)) return
    load(path)
  })
  useEffect(() => window.api.onOpenPath((path) => onOpenPath(path)), [])

  const [recents, setRecents] = useState<RecentVideo[]>([])
  useEffect(() => void window.api.recentVideos().then(setRecents), [])
  const openRecent = async (path: string) => {
    const opened = await window.api.openRecent(path)
    if (opened) load(opened)
    else setRecents((current) => current.filter((recent) => recent.path !== path))
  }

  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  useEffect(() => window.api.onUpdateReady(setUpdateVersion), [])

  useEffect(
    () =>
      window.api.onMenuCommand((command) => {
        const target = document.activeElement
        if (target instanceof HTMLInputElement && target.type === 'text') document.execCommand(command)
        else dispatch({ type: command })
      }),
    []
  )

  const canExport =
    clips.length > 0 && folder !== null && baseName.trim() !== ''

  const fileName = videoPath?.split(/[\\/]/).pop()

  useEffect(() => {
    document.title = fileName ?? 'Cuts'
  }, [fileName])

  return (
    <div
      data-testid="app"
      className="flex h-screen flex-col bg-canvas text-ink"
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) setDragDepth((depth) => depth + 1)
      }}
      onDragLeave={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) setDragDepth((depth) => Math.max(0, depth - 1))
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragDepth(0)
        const file = e.dataTransfer.files[0]
        if (!file || exporting) return
        if (!isSupportedVideo(file.name)) {
          setUnsupportedDrops((count) => count + 1)
          return
        }
        if (clips.length > 0 && !window.confirm(t.replaceVideoConfirm)) return
        load(window.api.pathForFile(file))
      }}
    >
      {(window.api.platform === 'darwin' || videoPath) && (
        <header
          data-testid="toolbar"
          className={`relative flex h-13 shrink-0 items-center border-b border-line px-3 ${window.api.platform === 'darwin' ? '[-webkit-app-region:drag]' : ''}`}
        >
          {window.api.platform === 'darwin' && (
            <span
              data-testid="titlebar"
              className="pointer-events-none absolute inset-x-0 truncate px-72 text-center text-sm font-medium text-ink-2"
              title={videoPath ?? undefined}
            >
              {fileName ?? 'Cuts'}
            </span>
          )}
          {videoPath && (
            <div className="relative ml-auto flex items-center gap-1.5 [-webkit-app-region:no-drag]">
              <button
                data-testid="suggest"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:hover:bg-transparent"
                title={t.suggestMoments}
                aria-label={t.suggestMoments}
                aria-busy={suggesting}
                disabled={suggesting}
                onClick={() => void suggest(videoPath)}
              >
                {suggesting ? <SpinnerIcon className="size-3.5" /> : <SparkleIcon className="size-3.5" />}
                {t.suggestShort}
              </button>
            </div>
          )}
        </header>
      )}

      {!videoPath ? (
        <main data-testid="welcome" className="flex min-h-0 flex-1">
          <section className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
            <img src={appIcon} alt="" className="size-28 drop-shadow-lg" draggable={false} />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl font-semibold tracking-tight">Cuts</h1>
              <p className="text-ink-2">{t.dropSubtitle}</p>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <button
                data-testid="open-video"
                className="flex h-9 items-center gap-3 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition duration-150 ease-out active:scale-[0.97] hover:bg-accent-hover"
                onClick={openVideo}
              >
                {t.chooseVideo}
                <span className="text-on-accent/60">{window.api.platform === 'darwin' ? '⌘O' : 'Ctrl+O'}</span>
              </button>
              <p className="text-xs text-ink-3">{t.dropAnywhere}</p>
            </div>
          </section>
          {recents.length > 0 && (
            <aside className="flex w-[22rem] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface">
              <RecentVideos recents={recents} onOpen={(path) => void openRecent(path)} />
            </aside>
          )}
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <section className="flex min-w-0 flex-col lg:flex-1">
            <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-black lg:min-h-0 lg:flex-1">
              <video
                ref={videoRef}
                data-testid="video"
                src={mediaUrl(videoPath)}
                className={`max-h-[55vh] w-full cursor-pointer object-contain lg:absolute lg:inset-0 lg:h-full lg:max-h-none ${target && shownSettings.framing === 'fit' ? 'opacity-0' : ''}`}
                onClick={togglePlay}
                onTimeUpdate={(e) => {
                  keepLooping(e.currentTarget)
                  setTime(e.currentTarget.currentTime)
                }}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration)
                  setVideoSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => {
                  setPlaying(false)
                  loop(null)
                }}
                onError={() => setVideoError(true)}
              />
              {target && videoSize && shownSettings.framing === 'crop' && (
                <CropFrame
                  videoWidth={videoSize.width}
                  videoHeight={videoSize.height}
                  targetWidth={target.width}
                  targetHeight={target.height}
                  zone={shownSettings}
                  onChange={changeSettings}
                />
              )}
              {duration === 0 && !videoError && (
                <p data-testid="video-loading" className="absolute flex items-center gap-2 text-sm text-white/70">
                  <SpinnerIcon className="size-4" />
                  {t.loadingVideo}
                </p>
              )}
              {target && videoSize && shownSettings.framing === 'fit' && (
                <FitPreview videoRef={videoRef} targetWidth={target.width} targetHeight={target.height} />
              )}
              {overlay && videoSize && videoSize.width > 0 && (
                <OverlayLayer
                  video={videoSize}
                  target={target ?? null}
                  framing={shownSettings.framing}
                  zone={shownSettings}
                  overlay={overlay}
                  onChange={(placement) => setOverlay({ ...overlay, ...placement })}
                  onMissing={() => setOverlay(null)}
                />
              )}
              {videoError && (
                <p data-testid="video-error" className="absolute rounded-lg bg-black/70 px-3 py-2 text-sm text-white">
                  {t.videoUnplayable}
                </p>
              )}
              {!videoError && videoSize?.width === 0 && (
                <p data-testid="video-no-picture" className="absolute mx-6 max-w-md rounded-lg bg-black/70 px-3 py-2 text-center text-sm text-white">
                  {t.videoNoPicture}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-line p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <button
                  data-testid="play"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-canvas transition duration-150 ease-out active:scale-[0.97] hover:opacity-85"
                  title={playing ? t.pause : t.play}
                  aria-label={playing ? t.pause : t.play}
                  onClick={togglePlay}
                >
                  {playing ? <PauseIcon /> : <PlayIcon className="ml-0.5 size-4" />}
                </button>
                <span className="mx-1 text-sm tabular-nums">
                  {formatTime(time)}
                  <span className="text-ink-3"> / {formatTime(duration)}</span>
                </span>
                <MarkButton testId="mark-start" shortcut="I" title={t.markStartHint} onClick={() => markStart()}>
                  {t.markStart}
                </MarkButton>
                <MarkButton testId="mark-end" shortcut="O" title={t.markEndHint} onClick={() => markEnd()}>
                  {t.markEnd}
                </MarkButton>
                {pendingStart !== null && (
                  <span
                    data-testid="pending"
                    title={t.pendingSince(formatTime(pendingStart))}
                    className="flex items-center gap-1.5 text-sm tabular-nums text-accent"
                  >
                    <span className="size-1.5 rounded-full bg-accent" />
                    {formatTime(pendingStart)} →
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {zoom !== null && (
                    <span className="hidden text-xs tabular-nums text-ink-3 sm:inline">
                      <span data-testid="view-start">{formatTime(currentViewStart)}</span> –{' '}
                      <span data-testid="view-end">{formatTime(currentViewStart + viewSpan)}</span>
                    </span>
                  )}
                  <div className="flex rounded-lg bg-sunken p-0.5 text-xs" role="group" aria-label={t.zoomGroup}>
                    {ZOOM_LEVELS.map((span) => (
                      <button
                        key={span ?? 'all'}
                        data-testid={`zoom-${span ?? 'all'}`}
                        aria-pressed={zoom === span}
                        className={`rounded-md px-1.5 py-1 transition-colors ${zoom === span ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
                        onClick={() => setZoom(span)}
                      >
                        {zoomLabel(span)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Timeline
                videoPath={videoPath}
                peaks={peaks}
                analysingAudio={analysing}
                onBeat={onBeat}
                duration={duration}
                viewStart={currentViewStart}
                viewSpan={viewSpan}
                time={time}
                videoRef={videoRef}
                playing={playing}
                clips={clips}
                fades={fades}
                pendingStart={pendingStart}
                selectedIds={selectedIds}
                onSelect={selectClip}
                onSeek={seekFromTimeline}
                onDragStart={() => dispatch({ type: 'checkpoint' })}
                onFadeSeconds={(seconds) => changeSettings({ fadeSeconds: seconds })}
                onClipChange={(clip) => dispatch({ type: 'replace', clip, transient: true })}
                onPan={(start) => {
                  setViewStart(Math.min(Math.max(0, start), duration - viewSpan))
                  setPanned({ time, zoom })
                }}
              />

            </div>
          </section>

          <aside data-testid="carousel-pane" className="flex shrink-0 flex-col overflow-hidden border-line bg-surface max-lg:border-t lg:w-[23rem] lg:border-l">
            <div className="flex h-12 items-center justify-between px-4 pt-3">
              <h2 className="flex items-baseline gap-1.5 text-sm font-semibold">
                {t.carousel}{' '}
                {clips.length > 0 && <span className="text-xs font-normal tabular-nums text-ink-3">{clips.length}</span>}
              </h2>
              <span className="flex items-center gap-1">
                {clips.length > 0 && (
                  <button
                    data-testid="clear-clips"
                    className="grid size-6 place-items-center rounded-md text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                    title={t.clearClipsHint(window.api.platform === 'darwin' ? '⌘Z' : 'Ctrl+Z')}
                    aria-label={t.clearClips}
                    onClick={() => {
                      dispatch({ type: 'reset' })
                      setSelectedIds([])
                    }}
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                )}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <ClipList
                clips={clips}
                time={time}
                selectedIds={selectedIds}
                onSelect={pickClip}
                onPlay={playClip}
                suggesting={suggesting}
                onSuggest={() => void suggest(videoPath)}
                loopingId={loopingId}
                onSetStart={(clip) => dispatch({ type: 'setStart', id: clip.id, time: now() })}
                onSetEnd={(clip) => dispatch({ type: 'setEnd', id: clip.id, time: now() })}
                onDelete={(clip) => dispatch({ type: 'remove', id: clip.id })}
                onReorder={(from, to) => dispatch({ type: 'reorder', from, to })}
                exportStatus={exportStatus}
                framings={target && new Set(fades.map((fade) => fade.framing)).size > 1 ? fades.map((fade) => fade.framing) : null}
              />
            </div>
            <ClipControls
              format={format}
              hasClips={clips.length > 0}
              scope={
                selectedClips.length === 0
                  ? t.settingsScopeAll
                  : selectedClip
                    ? t.settingsScopeClip(selectedIndex + 1)
                    : t.settingsScopeSelected(selectedClips.length)
              }
              settings={shownSettings}
              mixed={mixed}
              onChange={changeSettings}
            />
            <ExportPanel
              positions={exported.map((clip) => clips.indexOf(clip))}
              partial={selectedClips.length > 0}
              overLimit={exported.filter(isOverLimit).length}
              canExport={canExport}
              baseName={baseName}
              format={format}
              onFormat={(chosen) => {
                setFormat(chosen)
                savePreferences({ format: chosen })
              }}
              overlay={overlay}
              onChooseOverlay={() => void window.api.chooseOverlay().then(takeOverlay, () => takeOverlay('invalid'))}
              onDropOverlay={(file) =>
                void window.api.importOverlay(window.api.pathForFile(file)).then(takeOverlay, () => takeOverlay('invalid'))
              }
              onRemoveOverlay={() => setOverlay(null)}
              folder={folder}
              destination={destination}
              state={exportState}
              onBaseName={setBaseName}
              onChooseFolder={async () => {
                const chosen = await window.api.chooseFolder(folder)
                if (!chosen) return
                setFolder(chosen)
                savePreferences({ folder: chosen })
              }}
              onExport={runExport}
              onCancel={window.api.cancelExport}
              onReveal={window.api.reveal}
              onShare={window.api.share}
              canShare={window.api.platform === 'darwin'}
            />
          </aside>
        </main>
      )}

      {dragDepth > 0 && (
        <div
          data-testid="drop-highlight"
          className="pointer-events-none fixed inset-0 z-40 bg-accent-soft ring-[3px] ring-accent/60 ring-inset"
        />
      )}

      {shortcutsOpen && <ShortcutsPanel platform={window.api.platform} onClose={() => setShortcutsOpen(false)} />}

      <div className="fixed right-5 bottom-5 flex flex-col items-end gap-2">
        {unsupportedDrops > 0 && (
          <Notice
            key={unsupportedDrops}
            testId="unsupported-video"
            text={t.unsupportedVideo}
            ms={NOTICE_MS}
            onClose={() => setUnsupportedDrops(0)}
          />
        )}

        {suggestNotice && (
          <Notice key={suggestNotice} testId="suggest-notice" text={suggestNotice} ms={NOTICE_MS} onClose={() => setSuggestNotice(null)} />
        )}

        {updateVersion && (
          <div
            data-testid="update-ready"
            role="status"
            className="flex items-center gap-3 rounded-xl bg-surface py-2 pr-2 pl-4 text-sm shadow-lg ring-1 ring-ink-3/20 transition duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
          >
            {t.updateReady(updateVersion)}
            <button
              data-testid="restart-to-update"
              className="h-8 rounded-lg bg-accent px-3 font-medium text-on-accent transition duration-150 ease-out active:scale-[0.97] hover:bg-accent-hover"
              onClick={window.api.restartToUpdate}
            >
              {t.restartToUpdate}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MarkButton({
  testId,
  shortcut,
  title,
  onClick,
  children
}: {
  testId: string
  shortcut: string
  title: string
  onClick: () => void
  children: string
}) {
  return (
    <button
      data-testid={testId}
      className="flex h-8 items-center rounded-lg bg-sunken px-3 text-sm font-medium transition duration-150 ease-out active:scale-[0.97] hover:bg-accent-soft hover:text-accent"
      title={`${title} (${shortcut})`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
