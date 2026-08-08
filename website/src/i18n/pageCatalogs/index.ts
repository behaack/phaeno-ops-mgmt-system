import type { SupportedLocale } from '../locales'
import { arPageContent } from './ar'
import { enUSPageContent } from './en-US'
import { frPageContent } from './fr'
import type { WebsitePageCatalog } from './types'

const pageCatalogs: Record<SupportedLocale, WebsitePageCatalog> = {
  'en-US': enUSPageContent,
  ar: arPageContent,
  fr: frPageContent,
}

export function getPageCatalog(locale: SupportedLocale) {
  return pageCatalogs[locale]
}

export type { WebsitePageCatalog } from './types'
