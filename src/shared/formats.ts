export type OutputFormat = 'original' | '4:5' | '1:1' | '9:16'

export type FormatOption = { id: OutputFormat; size?: { width: number; height: number } }

export const FORMATS: FormatOption[] = [
  { id: 'original' },
  { id: '4:5', size: { width: 1080, height: 1350 } },
  { id: '1:1', size: { width: 1080, height: 1080 } },
  { id: '9:16', size: { width: 1080, height: 1920 } }
]

export function formatSize(id: OutputFormat): { width: number; height: number } | undefined {
  return FORMATS.find((f) => f.id === id)?.size
}
