import { isWebsiteReviewMode } from '@/lib/reviewMode'

export const supportedLocales = ['en-US', 'ar'] as const

export type SupportedLocale = (typeof supportedLocales)[number]
export type TextDirection = 'ltr' | 'rtl'
export type TranslationStatus =
  | 'not_started'
  | 'draft'
  | 'review'
  | 'published'
  | 'stale'
  | 'withdrawn'

export interface LocaleDefinition {
  code: SupportedLocale
  prefix: '' | '/ar'
  direction: TextDirection
  nativeName: string
  administrativeName: string
  formattingLocale: string
  sourceLocale: SupportedLocale
}

export const locales: Record<SupportedLocale, LocaleDefinition> = {
  'en-US': {
    code: 'en-US',
    prefix: '',
    direction: 'ltr',
    nativeName: 'English (US)',
    administrativeName: 'US English',
    formattingLocale: 'en-US',
    sourceLocale: 'en-US',
  },
  ar: {
    code: 'ar',
    prefix: '/ar',
    direction: 'rtl',
    nativeName: 'العربية',
    administrativeName: 'Arabic (Modern Standard)',
    formattingLocale: 'ar',
    sourceLocale: 'en-US',
  },
}

export const arabicTranslationStatus: TranslationStatus = 'draft'

const requestedArabicMode =
  import.meta.env.PUBLIC_I18N_ARABIC_MODE?.trim().toLowerCase() ?? 'off'

if (!['off', 'preview', 'published'].includes(requestedArabicMode)) {
  throw new Error(
    'PUBLIC_I18N_ARABIC_MODE must be one of: off, preview, published.',
  )
}

if (requestedArabicMode === 'preview' && !isWebsiteReviewMode) {
  throw new Error(
    'Arabic preview routes require PUBLIC_SITE_REVIEW_MODE=true so draft translations cannot be indexed or submitted.',
  )
}

if (
  requestedArabicMode === 'published'
  && arabicTranslationStatus !== 'published'
) {
  throw new Error(
    'Arabic cannot be published until the translation status is changed to published after language and scientific review.',
  )
}

export const isArabicEnabled =
  requestedArabicMode === 'published'
  || (requestedArabicMode === 'preview' && isWebsiteReviewMode)

export function getLocaleDefinition(locale: SupportedLocale) {
  return locales[locale]
}

const alternateLocales: Record<SupportedLocale, SupportedLocale> = {
  'en-US': 'ar',
  ar: 'en-US',
}

export function getAlternateLocale(locale: SupportedLocale) {
  return alternateLocales[locale]
}

export function prefixPathForLocale(locale: SupportedLocale, pathname: string) {
  const path = pathname === '/' ? '' : pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${getLocaleDefinition(locale).prefix}${path}` || '/'
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale)
}

export function normalizeRequestedLocale(value: string | undefined): SupportedLocale {
  if (!value) return 'en-US'

  const normalized = value.trim().toLowerCase()
  if (normalized === 'ar' || normalized.startsWith('ar-')) return 'ar'
  return 'en-US'
}
