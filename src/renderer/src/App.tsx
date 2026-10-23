import { useEffect, useReducer, useRef, useState } from 'react'
import { defaultBaseName, formatTime, isOverLimit, type Clip } from '@shared/clips'
import type { OutputFormat } from '@shared/formats'
import { mediaUrl } from '@shared/media-url'
import { ClipList } from './components/ClipList'
import { ExportPanel, type ExportState } from './components/ExportPanel'
import { Timeline } from './components/Timeline'
import { clipsReducer, initialClipsState } from './clips-reducer'

const SEEK_STEP = 5

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
  const [fade, setFade] = useState(true)
  const [format, setFormat] = useState<OutputFormat>('original')
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' })

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
    setExportState({ status: 'idle' })
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
    const result = await window.api.exportClips({ input: videoPath, folder, baseName, fade, format, clips })
    setExportState(result.ok ? { status: 'done', files: result.files } : { status: 'error', error: result.error })
  }

  const playClip = (clip: Clip) => {
    seekTo(clip.start)
    void videoRef.current?.play()
  }

  const canExport =
    clips.length > 0 && !clips.some(isOverLimit) && folder !== null && baseName.trim() !== ''

  return (
    <div
      data-testid="app"
      className="flex min-h-screen flex-col gap-4 bg-zinc-950 p-5 text-zinc-100"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (!file) return
        if (clips.length > 0 && !window.confirm('¿Abrir otro vídeo? Se perderán los trozos marcados.')) return
        load(window.api.pathForFile(file))
      }}
    >
      {!videoPath ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400">
          <p className="text-lg">Arrastra aquí el vídeo de la sesión</p>
          <button
            data-testid="open-video"
            className="rounded bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
            onClick={async () => {
              const path = await window.api.openVideo()
              if (path) load(path)
            }}
          >
            o elige un archivo…
          </button>
        </div>
      ) : (
        <>
          <p className="truncate text-sm text-zinc-400">{videoPath}</p>
          <video
            ref={videoRef}
            data-testid="video"
            src={mediaUrl(videoPath)}
            className="max-h-[50vh] w-full rounded-lg bg-black"
            onClick={togglePlay}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setVideoError(true)}
          />
          {videoError && (
            <p data-testid="video-error" className="text-sm text-red-400">
              No se puede reproducir este vídeo.
            </p>
          )}
          <div className="flex items-center gap-3 tabular-nums">
            <button
              data-testid="play"
              className="w-10 rounded bg-zinc-800 py-1 hover:bg-zinc-700"
              onClick={togglePlay}
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <span className="text-sm">{formatTime(time)}</span>
            <Timeline duration={duration} time={time} clips={clips} pendingStart={pendingStart} onSeek={seekTo} />
            <span className="text-sm text-zinc-500">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button data-testid="mark-start" className="rounded bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700" onClick={markStart}>
              [ Marcar inicio (I)
            </button>
            <button data-testid="mark-end" className="rounded bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700" onClick={markEnd}>
              Marcar fin (O) ]
            </button>
            {pendingStart !== null && (
              <span data-testid="pending" className="text-zinc-400">
                trozo en curso desde {formatTime(pendingStart)}
              </span>
            )}
          </div>
          <ClipList
            clips={clips}
            time={time}
            onPlay={playClip}
            onSetStart={(clip) => dispatch({ type: 'setStart', id: clip.id, time: now() })}
            onSetEnd={(clip) => dispatch({ type: 'setEnd', id: clip.id, time: now() })}
            onDelete={(clip) => dispatch({ type: 'remove', id: clip.id })}
          />
          <ExportPanel
            clipCount={clips.length}
            canExport={canExport}
            baseName={baseName}
            folder={folder}
            fade={fade}
            format={format}
            state={exportState}
            onBaseName={setBaseName}
            onChooseFolder={async () => {
              const chosen = await window.api.chooseFolder()
              if (chosen) setFolder(chosen)
            }}
            onFade={setFade}
            onFormat={setFormat}
            onExport={runExport}
            onReveal={window.api.reveal}
          />
        </>
      )}
    </div>
  )
}
