import type { CSSProperties } from 'react'
import { t } from '../i18n'

const SPREAD_PX = 14

export function JoiningVideos({ paths }: { paths: string[] }) {
  const middle = (paths.length - 1) / 2
  return (
    <div
      data-testid="joining"
      role="status"
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-canvas/85 px-8 backdrop-blur-sm transition-opacity duration-300 ease-out starting:opacity-0"
    >
      <div className="flex max-w-full">
        {paths.map((path, index) => (
          <span
            key={path}
            style={{ '--from': `${(index - middle) * SPREAD_PX}px` } as CSSProperties}
            className="-ml-px max-w-44 min-w-0 truncate border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 shadow-sm first:ml-0 first:rounded-l-lg last:rounded-r-lg animate-[join_1.4s_cubic-bezier(0.22,1,0.36,1)_infinite_alternate] motion-reduce:animate-none"
          >
            {path.split(/[\\/]/).pop()}
          </span>
        ))}
      </div>
      <p className="text-sm text-ink-2">{t.joiningVideos}</p>
    </div>
  )
}
