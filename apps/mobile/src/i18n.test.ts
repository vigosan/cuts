import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }))

describe('i18n', () => {
  it('speaks Spanish to a Spanish phone', async () => {
    const { t } = await import('./i18n')
    expect(t.suggestMoments).toBe('Sugerir momentos')
  })
})
