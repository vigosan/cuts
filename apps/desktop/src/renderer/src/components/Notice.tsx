import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { t } from '../i18n'
import { CloseIcon } from './icons'

type Props = {
  testId: string
  text: string
  ms: number
  onClose: () => void
}

export function Notice({ testId, text, ms, onClose }: Props) {
  const [hovered, setHovered] = useState(false)
  const remaining = useRef(ms)
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (hovered) return
    const started = Date.now()
    const timer = setTimeout(close, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [hovered])

  return (
    <div
      data-testid={testId}
      role="status"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className="relative flex items-center gap-2 overflow-hidden rounded-xl bg-surface py-2 pr-2 pl-4 text-sm shadow-lg ring-1 ring-ink-3/20 transition duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
    >
      {text}
      <button
        data-testid={`close-${testId}`}
        className="grid size-7 place-items-center rounded-lg text-ink-2 transition-[background-color,color,transform] duration-150 ease-out hover:bg-sunken hover:text-ink active:scale-[0.97]"
        title={t.close}
        aria-label={t.close}
        onClick={onClose}
      >
        <CloseIcon />
      </button>
      <span
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent"
        style={{ animation: `countdown ${ms}ms linear forwards`, animationPlayState: hovered ? 'paused' : 'running' }}
      />
    </div>
  )
}
