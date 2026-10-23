export type OutputFormat = 'original' | '4:5' | '1:1' | '9:16'

export type FormatOption = { id: OutputFormat; label: string; size?: { width: number; height: number } }

export const FORMATS: FormatOption[] = [
  { id: 'original', label: 'Original' },
  { id: '4:5', label: '4:5 vertical · 1080×1350', size: { width: 1080, height: 1350 } },
  { id: '1:1', label: '1:1 cuadrado · 1080×1080', size: { width: 1080, height: 1080 } },
  { id: '9:16', label: '9:16 reels · 1080×1920', size: { width: 1080, height: 1920 } }
]

export function formatSize(id: OutputFormat): { width: number; height: number } | undefined {
  return FORMATS.find((f) => f.id === id)?.size
}
