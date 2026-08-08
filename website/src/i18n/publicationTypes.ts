import type { TranslationStatus } from './locales'
import type { LocalizedRoutePair } from './routes'

export interface LocalizedPublicationSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface LocalizedWhitePaperAsset {
  pdfPath: string
  image: string
  date: string
  pageCount: number
  version: string
  topics: string[]
  searchKeywords: string[]
}

export interface LocalizedPublicationPage {
  translationKey: string
  sourceLocale: 'en-US'
  sourceRevision: string
  translationStatus: TranslationStatus
  kind: 'white-paper'
  title: string
  metaTitle: string
  description: string
  eyebrow: string
  lead: string
  sections: LocalizedPublicationSection[]
  whitePaper: LocalizedWhitePaperAsset
  route: LocalizedRoutePair
}

export type LocalizedPublicationInput = Omit<
  LocalizedPublicationPage,
  'sourceLocale' | 'sourceRevision' | 'translationStatus' | 'route'
>
