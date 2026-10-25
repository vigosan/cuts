export type Framing = 'crop' | 'fit'

export type ClipFraming = { framing: Framing; cropX: number; cropY: number }

export const DEFAULT_FRAMING: ClipFraming = { framing: 'crop', cropX: 0.5, cropY: 0.5 }
