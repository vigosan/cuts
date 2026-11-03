import { getLocales } from 'expo-localization'
import { messagesFor, resolveLocale } from '@cuts/core/i18n'

export const locale = resolveLocale(getLocales().map((l) => l.languageTag))
export const t = messagesFor(locale)
