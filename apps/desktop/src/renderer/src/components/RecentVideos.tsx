import { useState } from 'react'
import type { RecentVideo } from '@shared/api'
import { t } from '../i18n'

export function RecentVideos({ recents, onOpen }: { recents: RecentVideo[]; onOpen: (path: string) => void }) {
  const [now] = useState(Date.now)
  return (
    <section data-testid="recent-videos" className="flex flex-col gap-1">
      <h2 className="px-3 text-sm font-medium text-ink-2">{t.recentVideos}</h2>
      <ul className="flex flex-col">
        {recents.map((recent, index) => (
          <li key={recent.path}>
            <button
              data-testid={`recent-video-${index + 1}`}
              title={recent.path}
              className="flex w-full items-center gap-4 rounded-xl px-3 py-2 text-left transition duration-150 ease-out hover:bg-surface active:scale-[0.99]"
              onClick={() => onOpen(recent.path)}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-ink">{recent.name}</span>
                <span className="truncate text-xs text-ink-2">
                  {recent.folder} · {t.openedOn(recent.openedAt, now)}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-2">{t.recentClips(recent.clips)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
