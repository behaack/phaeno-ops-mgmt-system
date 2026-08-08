import type { SupportedLocale } from '../locales'
import { arPageContent } from './ar'
import { enUSPageContent } from './en-US'
import { frPageContent } from './fr'
import { esPageContent } from './es'
import { zhHansPageContent } from './zh-Hans'
import { jaPageContent } from './ja'
import { deDEPageContent } from './de-DE'
import { itPageContent } from './it'
import type { WebsitePageCatalog } from './types'

const pageCatalogs: Record<SupportedLocale, WebsitePageCatalog> = {
  'en-US': enUSPageContent,
  ar: arPageContent,
  fr: frPageContent,
  es: esPageContent,
  'zh-Hans': zhHansPageContent,
  ja: jaPageContent,
  'de-DE': deDEPageContent,
  it: itPageContent,
}

export function getPageCatalog(locale: SupportedLocale) {
  return pageCatalogs[locale]
}

export type { WebsitePageCatalog } from './types'
