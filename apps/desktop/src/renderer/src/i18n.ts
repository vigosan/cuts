import { messagesFor, resolveLocale } from '@cuts/core/i18n'

export const locale = resolveLocale(navigator.languages)
export const t = messagesFor(locale)
