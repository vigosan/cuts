export type Zoom = number | null

export const ZOOM_LEVELS: { span: Zoom; label: string }[] = [
  { span: null, label: 'Todo' },
  { span: 600, label: '10 min' },
  { span: 120, label: '2 min' },
  { span: 30, label: '30 s' }
]

export function nextViewStart(previous: number, time: number, duration: number, span: Zoom): number {
  if (span === null || span >= duration) return 0
  const inside = time >= previous && time <= previous + span
  const start = inside ? previous : time - span / 2
  return Math.min(Math.max(0, start), duration - span)
}
