import { arabicWhitePapers } from './arabicPages'
import { frenchWhitePapers } from './frenchPages'
import { spanishWhitePapers } from './spanishPages'
import { simplifiedChineseWhitePapers } from './simplifiedChinesePages'
import { japaneseWhitePapers } from './japanesePages'
import { germanWhitePapers } from './germanPages'
import { italianWhitePapers } from './italianPages'
import type { LocalizedLocale } from './locales'
import type { LocalizedPublicationPage } from './publicationTypes'

const publications: Record<LocalizedLocale, LocalizedPublicationPage[]> = {
  ar: arabicWhitePapers,
  fr: frenchWhitePapers,
  es: spanishWhitePapers,
  'zh-Hans': simplifiedChineseWhitePapers,
  ja: japaneseWhitePapers,
  'de-DE': germanWhitePapers,
  it: italianWhitePapers,
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
