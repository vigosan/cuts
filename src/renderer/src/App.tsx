import { useEffect, useReducer, useRef, useState } from 'react'
import { defaultBaseName, formatTime, type Clip } from '@shared/clips'
import { DEFAULT_FADE, type ClipFade } from '@shared/fades'
import type { ExportResult } from '@shared/api'
import type { OutputFormat } from '@shared/formats'
import { mediaUrl } from '@shared/media-url'
import { ClipList } from './components/ClipList'
import { ExportPanel, type ExportState } from './components/ExportPanel'
import { FadeControls } from './components/FadeControls'
import { FilmIcon, PauseIcon, PlayIcon } from './components/icons'
import { Timeline } from './components/Timeline'
import { clipsReducer, initialClipsState } from './clips-reducer'
import { t } from './i18n'
import { nextViewStart, ZOOM_LEVELS, type Zoom } from './timeline-view'

const SEEK_STEP = 5
const APP_FOLDER = 'Cuts'

function zoomLabel(span: Zoom): string {
  if (span === null) return t.zoomAll
  return span >= 60 ? `${span / 60} min` : `${span} s`
}

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [videoError, setVideoError] = useState(false)
  const [{ clips, pendingStart }, dispatch] = useReducer(clipsReducer, initialClipsState)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [baseName, setBaseName] = useState('')
  const [folder, setFolder] = useState<string | null>(null)
  const [defaultFade, setDefaultFade] = useState<ClipFade>(DEFAULT_FADE)
  const [fades, setFades] = useState<Record<string, ClipFade>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fadeOf = (clip: Clip) => fades[clip.id] ?? defaultFade
  const selectedIndex = clips.findIndex((clip) => clip.id === selectedId)
  const selectedClip = selectedIndex === -1 ? null : clips[selectedIndex]
  const changeFade = (change: Partial<ClipFade>) => {
    if (selectedClip) {
      setFades({ ...fades, [selectedClip.id]: { ...fadeOf(selectedClip), ...change } })
    } else {
      setDefaultFade({ ...defaultFade, ...change })
      setFades({})
    }
  }
  const [format, setFormat] = useState<OutputFormat>('original')
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
  const markStart = () => dispatch({ type: 'markStart', time: now() })
  const markEnd = () => dispatch({ type: 'markEnd', time: now() })

  const load = (path: string) => {
    setVideoPath(path)
    setVideoError(false)
    setTime(0)
    setDuration(0)
    setBaseName(defaultBaseName(path))
    if (!folder) void window.api.moviesDir().then((dir) => setFolder(`${dir}/${APP_FOLDER}`))
    setExportState({ status: 'idle' })
    setViewStart(0)
    setFades({})
    setSelectedId(null)
    dispatch({ type: 'reset' })
  }

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
      const action = actions[e.key.length === 1 ? e.key.toLowerCase() : e.key]
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
        clips: clips.map((clip) => ({ ...clip, ...fadeOf(clip) }))
      })
      .catch((error: Error): ExportResult => ({ ok: false, error: error.message }))
    setExportState(result.ok ? { status: 'done', files: result.files } : { status: 'error', error: result.error })
  }

  const playClip = (clip: Clip) => {
    seekTo(clip.start)
    void videoRef.current?.play()
  }

  const exporting = exportState.status === 'running'

  const openVideo = async () => {
    if (exporting) return
    if (clips.length > 0 && !window.confirm(t.replaceVideoConfirm)) return
    const path = await window.api.openVideo()
    if (path) load(path)
  }

  useEffect(() => window.api.onMenuOpenVideo(() => void openVideo()))

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
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => setVideoError(true)}
              />
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
                fades={clips.map(fadeOf)}
                pendingStart={pendingStart}
                selectedId={selectedClip?.id ?? null}
                onSelect={(clip) => setSelectedId(clip.id)}
                onSeek={seekTo}
                onClipChange={(clip) => dispatch({ type: 'replace', clip })}
              />

            </div>
          </section>

          <aside className="flex shrink-0 flex-col overflow-hidden rounded-2xl bg-surface lg:w-[23rem]">
            <div className="flex items-baseline justify-between px-4 pt-4 pb-1">
              <h2 className="text-sm font-semibold">{t.carousel}</h2>
              {clips.length > 0 && <span className="text-xs text-ink-3">{clips.length}</span>}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <ClipList
                clips={clips}
                time={time}
                videoFades={clips.map((clip) => fadeOf(clip).videoFade)}
                selectedId={selectedClip?.id ?? null}
                onSelect={(clip) => setSelectedId(clip.id === selectedId ? null : clip.id)}
                onPlay={playClip}
                onSetStart={(clip) => dispatch({ type: 'setStart', id: clip.id, time: now() })}
                onSetEnd={(clip) => dispatch({ type: 'setEnd', id: clip.id, time: now() })}
                onDelete={(clip) => dispatch({ type: 'remove', id: clip.id })}
                onReorder={(from, to) => dispatch({ type: 'reorder', from, to })}
              />
            </div>
            {clips.length > 0 && (
              <FadeControls
                fade={selectedClip ? fadeOf(selectedClip) : defaultFade}
                onChange={changeFade}
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
