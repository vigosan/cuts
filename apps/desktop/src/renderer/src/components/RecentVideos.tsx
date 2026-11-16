import { useRef, useState, type WheelEvent } from 'react'
import type { RecentVideo } from '@shared/api'
import { mediaKind } from '@shared/video-formats'
import { t } from '../i18n'
import { WaveIcon } from './icons'

const REVEAL = 80
const COMMIT = 160
const SETTLE_MS = 150

type Swipe = { path: string; offset: number; tracking: boolean }

export function RecentVideos({
  recents,
  onOpen,
  onRemove,
  onMenu
}: {
  recents: RecentVideo[]
  onOpen: (path: string) => void
  onRemove: (path: string) => void
  onMenu: (path: string) => void
}) {
  const [now] = useState(Date.now)
  const [swipe, setSwipe] = useState<Swipe | null>(null)
  const latest = useRef<Swipe | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = (next: Swipe | null) => {
    latest.current = next
    setSwipe(next)
  }

  const remove = (path: string) => {
    show(null)
    onRemove(path)
  }

  const settle = () => {
    const current = latest.current
    if (!current) return
    if (current.offset >= COMMIT) remove(current.path)
    else if (current.offset >= REVEAL / 2) show({ path: current.path, offset: REVEAL, tracking: false })
    else show(null)
  }

  const track = (event: WheelEvent<HTMLLIElement>, path: string) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
    const start = latest.current?.path === path ? latest.current.offset : 0
    const limit = event.currentTarget.offsetWidth || Infinity
    show({ path, offset: Math.min(Math.max(start + event.deltaX, 0), limit), tracking: true })
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(settle, SETTLE_MS)
  }

  return (
    <section data-testid="recent-videos" className="flex flex-col gap-1 p-3 pt-5">
      <h2 className="px-3 pb-1 text-xs font-medium text-ink-2">{t.recentVideos}</h2>
      <ul className="flex flex-col">
        {recents.map((recent, index) => {
          const offset = swipe?.path === recent.path ? swipe.offset : 0
          const tracking = swipe?.path === recent.path && swipe.tracking
          return (
            <li
              key={recent.path}
              className="relative overflow-hidden rounded-xl"
              onWheel={(event) => track(event, recent.path)}
              onContextMenu={(event) => {
                event.preventDefault()
                onMenu(recent.path)
              }}
            >
              <button
                data-testid={`recent-remove-${index + 1}`}
                style={{ visibility: offset > 0 ? 'visible' : 'hidden' }}
                className={`absolute inset-0 flex items-center justify-end bg-danger pr-4 text-sm font-medium text-white ${tracking ? '' : 'motion-safe:transition-[visibility] motion-safe:duration-200'}`}
                onClick={() => remove(recent.path)}
              >
                {t.removeRecent}
              </button>
              <button
                data-testid={`recent-video-${index + 1}`}
                title={recent.path}
                style={{ transform: `translateX(${-offset}px)` }}
                className={`relative flex w-full items-center gap-3 bg-surface px-2 py-2 text-left ease-out hover:bg-sunken active:scale-[0.99] transition-colors duration-150 ${tracking ? '' : 'motion-safe:transition motion-safe:duration-200'}`}
                onClick={() => (offset > 0 ? show(null) : onOpen(recent.path))}
              >
                <span className="grid aspect-video w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-sunken text-ink-3 ring-1 ring-line">
                  {recent.poster && (
                    <img
                      data-testid={`recent-poster-${index + 1}`}
                      src={recent.poster}
                      alt=""
                      draggable={false}
                      className="size-full object-cover"
                    />
                  )}
                  {!recent.poster && mediaKind(recent.path) === 'audio' && (
                    <WaveIcon data-testid={`recent-audio-${index + 1}`} className="size-5" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-ink">{recent.name}</span>
                  <span className="truncate text-xs text-ink-2">
                    {recent.folder} · {t.openedOn(recent.openedAt, now)}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-2">{t.recentClips(recent.clips)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
