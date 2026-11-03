import { expect, it } from 'vitest'

it('plural messages work on Hermes, which ships without Intl.PluralRules', async () => {
  Reflect.deleteProperty(Intl, 'PluralRules')
  expect('PluralRules' in Intl).toBe(false)
  await import('./polyfills')
  const { messagesFor } = await import('@cuts/core/i18n')
  expect(messagesFor('en').exportClips(1)).toBe('Export 1 clip')
  expect(messagesFor('es').exportClips(2)).toBe('Exportar 2 clips')
})
