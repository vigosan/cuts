const BARS = 64

const heights = Array.from({ length: BARS }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)))

export function WavePreview({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg viewBox={`0 0 ${BARS} 2`} preserveAspectRatio="none" aria-hidden className="size-full select-none">
      {heights.map((height, i) => (
        <rect
          key={i}
          x={i + 0.2}
          y={1 - height}
          width={0.6}
          height={height * 2}
          fill={color}
          opacity={opacity * Math.min(1, Math.min(i + 0.5, BARS - i - 0.5) / (0.22 * BARS))}
        />
      ))}
    </svg>
  )
}

export function BarPreview({ color, opacity, progress }: { color: string; opacity: number; progress: number }) {
  return (
    <div className="relative size-full select-none">
      <div className="absolute -inset-y-2 inset-x-0" />
      <div className="absolute inset-0 opacity-15" style={{ backgroundColor: color }} />
      <div data-testid="bar-fill" className="relative h-full" style={{ width: `${progress * 100}%`, backgroundColor: color, opacity }} />
    </div>
  )
}
