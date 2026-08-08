import { arabicWhitePapers } from './arabicPages'
import { frenchWhitePapers } from './frenchPages'
import type { LocalizedLocale } from './locales'
import type { LocalizedPublicationPage } from './publicationTypes'

const publications: Record<LocalizedLocale, LocalizedPublicationPage[]> = {
  ar: arabicWhitePapers,
  fr: frenchWhitePapers,
}

export function getLocalizedWhitePapers(locale: LocalizedLocale) {
  return publications[locale]
}

export function getLocalizedWhitePaper(
  locale: LocalizedLocale,
  translationKey: string,
) {
  return publications[locale].find((page) => page.translationKey === translationKey)
}
