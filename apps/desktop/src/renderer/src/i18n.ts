import { messagesFor, resolveLocale } from '@shared/i18n'

export const locale = resolveLocale(navigator.languages)
export const t = messagesFor(locale)
