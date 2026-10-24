import { describe, expect, it } from 'vitest'
import { FALLBACK_LOCALE, messagesFor, resolveLocale, SUPPORTED_LOCALES } from './i18n'

describe('resolveLocale', () => {
  it('uses Spanish for any Spanish region', () => {
    expect(resolveLocale(['es-ES'])).toBe('es')
    expect(resolveLocale(['es-MX', 'en-US'])).toBe('es')
  })

  it('picks the first supported language in the user preference order', () => {
    expect(resolveLocale(['fr-FR', 'es-ES', 'en-US'])).toBe('es')
    expect(resolveLocale(['de-DE', 'en-GB'])).toBe('en')
  })

  it('falls back to English when no preferred language is supported', () => {
    expect(resolveLocale(['fr-FR', 'de-DE'])).toBe(FALLBACK_LOCALE)
    expect(resolveLocale([])).toBe('en')
  })
})

describe('messagesFor', () => {
  it('pluralizes whole sentences instead of concatenating words', () => {
    expect(messagesFor('en').exportClips(1)).toBe('Export 1 clip')
    expect(messagesFor('en').exportClips(3)).toBe('Export 3 clips')
    expect(messagesFor('es').exportClips(1)).toBe('Exportar 1 clip')
    expect(messagesFor('es').exportedClips(2)).toBe('2 clips exportados')
  })

  it('formats decimal fade lengths with the locale separator', () => {
    expect(messagesFor('en').fadeSeconds(0.5)).toBe('0.5 s')
    expect(messagesFor('es').fadeSeconds(0.5)).toBe('0,5 s')
  })

  it('translates every message into every supported language', () => {
    const keys = Object.keys(messagesFor(FALLBACK_LOCALE)).sort()
    for (const locale of SUPPORTED_LOCALES) expect(Object.keys(messagesFor(locale)).sort()).toEqual(keys)
  })
})
