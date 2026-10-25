import { useEffect, useReducer, useRef, useState } from 'react'
import { defaultBaseName, formatTime, type Clip } from '@shared/clips'
import { DEFAULT_SETTINGS, type ClipSettings } from '@shared/fades'
import type { ExportResult } from '@shared/api'
import { formatSize, type OutputFormat } from '@shared/formats'
import { mediaUrl } from '@shared/media-url'
import { ClipList } from './components/ClipList'
import { ExportPanel, type ExportState } from './components/ExportPanel'
import { ClipControls } from './components/ClipControls'
import { CropFrame } from './components/CropFrame'
import { FilmIcon, PauseIcon, PlayIcon, TrashIcon } from './components/icons'
import { Timeline } from './components/Timeline'
import { clipsReducer, initialClipsState } from './clips-reducer'
import { withHistory } from './history'
import { t } from './i18n'
import { nextViewStart, viewStartForClip, ZOOM_LEVELS, type Zoom } from './timeline-view'

const SEEK_STEP = 5
const SAVE_DELAY_MS = 300
const DEFAULT_FPS = 30
const MAX_SHUTTLE = 4
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
  const [history, dispatch] = useReducer(clipsHistory, { past: [], present: initialClipsState, future: [] })
  const { clips, pendingStart } = history.present
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [baseName, setBaseName] = useState('')
  const [folder, setFolder] = useState<string | null>(null)
  const [defaultSettings, setDefaultSettings] = useState<ClipSettings>(DEFAULT_SETTINGS)
  const [clipSettings, setClipSettings] = useState<Record<string, ClipSettings>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loopingId, setLoopingId] = useState<string | null>(null)

  const settingsOf = (clip: Clip) => clipSettings[clip.id] ?? defaultSettings
  const selectedIndex = clips.findIndex((clip) => clip.id === selectedId)
  const selectedClip = selectedIndex === -1 ? null : clips[selectedIndex]
  const changeSettings = (change: Partial<ClipSettings>) => {
    if (selectedClip) {
      setClipSettings({ ...clipSettings, [selectedClip.id]: { ...settingsOf(selectedClip), ...change } })
    } else {
      setDefaultSettings({ ...defaultSettings, ...change })
      setClipSettings({})
    }
  }
  const [format, setFormat] = useState<OutputFormat>('original')
  const [restoredFor, setRestoredFor] = useState<string | null>(null)
  const openedPath = useRef<string | null>(null)
  const shuttle = useRef(0)
  const looping = useRef<string | null>(null)
  const [fps, setFps] = useState(DEFAULT_FPS)
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null)
  const shownSettings = selectedClip ? settingsOf(selectedClip) : defaultSettings
  const target = formatSize(format)
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })
  const [zoom, setZoom] = useState<Zoom>(null)
  const [viewStart, setViewStart] = useState(0)

  const currentViewStart = nextViewStart(viewStart, time, duration, zoom)
  if (currentViewStart !== viewStart) setViewStart(currentViewStart)
  const viewSpan = zoom === null ? duration : Math.min(zoom, duration)

  const now = () => videoRef.current?.currentTime ?? 0
  const seekTo = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(t, duration || t))
  }
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }
  const stepTo = (t: number) => {
    videoRef.current?.pause()
    seekTo(t)
  }
  const shuttleForward = () => {
    const video = videoRef.current
    if (!video) return
    shuttle.current = shuttle.current === 0 ? 1 : Math.min(shuttle.current * 2, MAX_SHUTTLE)
    video.playbackRate = shuttle.current
    if (shuttle.current === 1) void video.play()
  }
  const stopShuttle = () => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    shuttle.current = 0
    video.playbackRate = 1
  }
  const markStart = () => dispatch({ type: 'markStart', time: now() })
  const markEnd = () => dispatch({ type: 'markEnd', time: now() })

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
    setSelectedId(null)
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
    if (!videoPath || restoredFor !== videoPath) return
    const timer = setTimeout(
      () => window.api.saveSession(videoPath, { clips, clipSettings, defaultSettings, format, baseName }),
      SAVE_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [videoPath, restoredFor, clips, clipSettings, defaultSettings, format, baseName])

  useEffect(() => {
    setExportState((s) => (s.status === 'done' || s.status === 'error' ? { status: 'idle' } : s))
  }, [clips, clipSettings, defaultSettings, format, baseName, folder])

  useEffect(() => {
    if (!videoPath) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'text') return
      const actions: Record<string, () => void> = {
        i: markStart,
        o: markEnd,
        ' ': togglePlay,
        ArrowLeft: () => seekTo(now() - SEEK_STEP),
        ArrowRight: () => seekTo(now() + SEEK_STEP)
      }
      const frame = e.shiftKey ? 1 : 1 / fps
      const byPosition: Record<string, () => void> = {
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(
    () =>
      window.api.onExportProgress(({ index, ratio }) =>
        setExportState((s) =>
          s.status === 'running' ? { ...s, progress: s.progress.map((r, i) => (i === index ? ratio : r)) } : s
        )
      ),
    []
  )

  const runExport = async () => {
    if (!videoPath || !folder) return
    setExportState({ status: 'running', progress: clips.map(() => 0) })
    const result = await window.api
      .exportClips({
        input: videoPath,
        folder: `${folder}/${defaultBaseName(videoPath)}`,
        baseName,
        format,
        clips: clips.map((clip) => ({ ...clip, ...settingsOf(clip) }))
      })
      .catch((error: Error): ExportResult => ({ ok: false, error: error.message }))
    setExportState(result.ok ? { status: 'done', files: result.files } : { status: 'error', error: result.error })
  }

  const loopingClip = clips.find((clip) => clip.id === loopingId) ?? null

  const loop = (id: string | null) => {
    looping.current = id
    setLoopingId(id)
  }

  const playClip = (clip: Clip) => {
    if (loopingId === clip.id) {
      videoRef.current?.pause()
      loop(null)
      return
    }
    loop(clip.id)
    seekTo(clip.start)
    void videoRef.current?.play()
  }

  const keepLooping = (video: HTMLVideoElement) => {
    const index = clips.findIndex((clip) => clip.id === looping.current)
    if (index < 0 || video.currentTime < clips[index].end) return
    const next = clips[(index + 1) % clips.length]
    loop(next.id)
    video.currentTime = next.start
  }

  const seekFromTimeline = (t: number) => {
    if (loopingClip && (t < loopingClip.start || t > loopingClip.end)) loop(null)
    seekTo(t)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !loopingClip || !playing) return
    let frame = requestAnimationFrame(function check() {
      keepLooping(video)
      frame = requestAnimationFrame(check)
    })
    return () => cancelAnimationFrame(frame)
  })

  const pickClip = (clip: Clip) => {
    if (clip.id === selectedId) return setSelectedId(null)
    setSelectedId(clip.id)
    setViewStart(viewStartForClip(clip, duration, zoom))
    setTime(clip.start)
    seekFromTimeline(clip.start)
  }

  const exporting = exportState.status === 'running'

  const openVideo = async () => {
    if (exporting) return
    if (clips.length > 0 && !window.confirm(t.replaceVideoConfirm)) return
    const path = await window.api.openVideo()
    if (path) load(path)
  }

  useEffect(() => window.api.onMenuOpenVideo(() => void openVideo()))

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

  const fileName = videoPath?.split('/').pop()

  return (
    <div
      data-testid="app"
      className="flex h-screen flex-col bg-canvas text-ink"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (!file || exporting) return
        if (clips.length > 0 && !window.confirm(t.replaceVideoConfirm)) return
        load(window.api.pathForFile(file))
      }}
    >
      <header className="flex h-11 shrink-0 items-center justify-center px-24 text-sm [-webkit-app-region:drag]">
        <span className="truncate font-medium text-ink-2" title={videoPath ?? undefined}>
          {fileName ?? 'Cuts'}
        </span>
      </header>

      {!videoPath ? (
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed border-ink-3/40 bg-surface px-8 py-14 text-center">
            <FilmIcon className="size-10 text-ink-3" />
            <div className="flex flex-col gap-1">
              <p className="text-lg font-medium">{t.dropTitle}</p>
              <p className="text-sm text-ink-2">{t.dropSubtitle}</p>
            </div>
            <button
              data-testid="open-video"
              className="mt-2 h-9 rounded-xl bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              onClick={openVideo}
            >
              {t.chooseVideo}
            </button>
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 lg:flex-row lg:overflow-hidden">
          <section className="flex min-w-0 flex-col gap-3 lg:flex-1">
            <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-2xl bg-black lg:min-h-0 lg:flex-1">
              <video
                ref={videoRef}
                data-testid="video"
                src={mediaUrl(videoPath)}
                className="max-h-[55vh] w-full cursor-pointer object-contain lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
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
              {videoError && (
                <p data-testid="video-error" className="absolute rounded-lg bg-black/70 px-3 py-2 text-sm text-white">
                  {t.videoUnplayable}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <button
                  data-testid="play"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-canvas transition-opacity hover:opacity-85"
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
                <MarkButton testId="mark-start" shortcut="I" title={t.markStartHint} onClick={markStart}>
                  {t.markStart}
                </MarkButton>
                <MarkButton testId="mark-end" shortcut="O" title={t.markEndHint} onClick={markEnd}>
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
                duration={duration}
                viewStart={currentViewStart}
                viewSpan={viewSpan}
                time={time}
                clips={clips}
                fades={clips.map(settingsOf)}
                pendingStart={pendingStart}
                selectedId={selectedClip?.id ?? null}
                onSelect={(clip) => setSelectedId(clip.id)}
                onSeek={seekFromTimeline}
                onDragStart={() => dispatch({ type: 'checkpoint' })}
                onClipChange={(clip) => dispatch({ type: 'replace', clip, transient: true })}
              />

            </div>
          </section>

          <aside className="flex shrink-0 flex-col overflow-hidden rounded-2xl bg-surface lg:w-[23rem]">
            <div className="flex h-12 items-center justify-between px-4 pt-3">
              <h2 className="text-sm font-semibold">{t.carousel}</h2>
              {clips.length > 0 && (
                <span className="flex items-center gap-2">
                  <button
                    data-testid="clear-clips"
                    className="grid size-6 place-items-center rounded-md text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                    title={t.clearClips}
                    aria-label={t.clearClips}
                    onClick={() => {
                      dispatch({ type: 'reset' })
                      setSelectedId(null)
                    }}
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                  <span className="text-xs text-ink-3">{clips.length}</span>
                </span>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <ClipList
                clips={clips}
                time={time}
                videoFades={clips.map((clip) => settingsOf(clip).videoFade)}
                selectedId={selectedClip?.id ?? null}
                onSelect={pickClip}
                onPlay={playClip}
                loopingId={loopingId}
                onSetStart={(clip) => dispatch({ type: 'setStart', id: clip.id, time: now() })}
                onSetEnd={(clip) => dispatch({ type: 'setEnd', id: clip.id, time: now() })}
                onDelete={(clip) => dispatch({ type: 'remove', id: clip.id })}
                onReorder={(from, to) => dispatch({ type: 'reorder', from, to })}
              />
            </div>
            {clips.length > 0 && (
              <ClipControls
                settings={shownSettings}
                format={format}
                onChange={changeSettings}
              />
            )}
            <ExportPanel
              clipCount={clips.length}
              canExport={canExport}
              baseName={baseName}
              folder={folder}
              format={format}
              state={exportState}
              onBaseName={setBaseName}
              onChooseFolder={async () => {
                const chosen = await window.api.chooseFolder(folder)
                if (chosen) setFolder(chosen)
              }}
              onFormat={setFormat}
              onExport={runExport}
              onReveal={window.api.reveal}
              onCancel={window.api.cancelExport}
              onShare={window.api.share}
            />
          </aside>
        </main>
      )}
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
      className="flex h-8 items-center gap-1.5 rounded-lg bg-sunken px-2.5 text-sm font-medium transition-colors hover:bg-accent-soft hover:text-accent"
      title={`${title} (${shortcut})`}
      onClick={onClick}
    >
      {children}
      <kbd className="rounded bg-surface px-1.5 font-sans text-[11px] text-ink-3">{shortcut}</kbd>
    </button>
  )
}
