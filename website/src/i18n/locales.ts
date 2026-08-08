import { isWebsiteReviewMode } from '@/lib/reviewMode'

export const supportedLocales = ['en-US', 'ar', 'fr'] as const

export type SupportedLocale = (typeof supportedLocales)[number]
export type LocalizedLocale = Exclude<SupportedLocale, 'en-US'>
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
  prefix: '' | `/${LocalizedLocale}`
  direction: TextDirection
  nativeName: string
  shortName: string
  administrativeName: string
  formattingLocale: string
  openGraphLocale: string
  sourceLocale: SupportedLocale
}

export const locales: Record<SupportedLocale, LocaleDefinition> = {
  'en-US': {
    code: 'en-US',
    prefix: '',
    direction: 'ltr',
    nativeName: 'English (US)',
    shortName: 'EN',
    administrativeName: 'US English',
    formattingLocale: 'en-US',
    openGraphLocale: 'en_US',
    sourceLocale: 'en-US',
  },
  ar: {
    code: 'ar',
    prefix: '/ar',
    direction: 'rtl',
    nativeName: 'العربية',
    shortName: 'AR',
    administrativeName: 'Arabic (Modern Standard)',
    formattingLocale: 'ar',
    openGraphLocale: 'ar_AR',
    sourceLocale: 'en-US',
  },
  fr: {
    code: 'fr',
    prefix: '/fr',
    direction: 'ltr',
    nativeName: 'Français',
    shortName: 'FR',
    administrativeName: 'French',
    formattingLocale: 'fr-FR',
    openGraphLocale: 'fr_FR',
    sourceLocale: 'en-US',
  },
}

export const translationStatuses: Record<LocalizedLocale, TranslationStatus> = {
  ar: 'draft',
  fr: 'draft',
}

const requestedModes: Record<LocalizedLocale, string> = {
  ar: import.meta.env.PUBLIC_I18N_ARABIC_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  fr: import.meta.env.PUBLIC_I18N_FRENCH_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
}

const localeLabels: Record<LocalizedLocale, string> = {
  ar: 'Arabic',
  fr: 'French',
}

for (const locale of ['ar', 'fr'] as const) {
  const mode = requestedModes[locale]
  const label = localeLabels[locale]

  if (!['off', 'preview', 'published'].includes(mode)) {
    throw new Error(
      `PUBLIC_I18N_${label.toUpperCase()}_MODE must be one of: off, preview, published.`,
    )
  }

  if (mode === 'preview' && !isWebsiteReviewMode) {
    throw new Error(
      `${label} preview routes require PUBLIC_SITE_REVIEW_MODE=true so draft translations cannot be indexed or submitted.`,
    )
  }

  if (mode === 'published' && translationStatuses[locale] !== 'published') {
    throw new Error(
      `${label} cannot be published until the translation status is changed to published after language and scientific review.`,
    )
  }
}

export const enabledLocales = supportedLocales.filter((locale) => (
  locale === 'en-US'
  || requestedModes[locale] === 'published'
  || (requestedModes[locale] === 'preview' && isWebsiteReviewMode)
))

export const isArabicEnabled = enabledLocales.includes('ar')
export const isFrenchEnabled = enabledLocales.includes('fr')

export function isLocaleEnabled(locale: SupportedLocale) {
  return enabledLocales.includes(locale)
}

export function getLocaleDefinition(locale: SupportedLocale) {
  return locales[locale]
}

export function getEnabledAlternateLocales(locale: SupportedLocale) {
  return enabledLocales.filter((candidate) => candidate !== locale)
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
  if (normalized === 'fr' || normalized.startsWith('fr-')) return 'fr'
  return 'en-US'
}
