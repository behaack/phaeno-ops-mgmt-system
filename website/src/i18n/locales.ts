import { isWebsiteReviewMode } from '@/lib/reviewMode'

export const localizedLocales = ['ar', 'fr', 'es', 'zh-Hans', 'ja', 'de-DE', 'it'] as const
export const supportedLocales = ['en-US', ...localizedLocales] as const

export type SupportedLocale = (typeof supportedLocales)[number]
export type LocalizedLocale = (typeof localizedLocales)[number]
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
  prefix: string
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
    administrativeName: 'Arabic',
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
  es: {
    code: 'es',
    prefix: '/es',
    direction: 'ltr',
    nativeName: 'Español',
    shortName: 'ES',
    administrativeName: 'Spanish',
    formattingLocale: 'es',
    openGraphLocale: 'es_ES',
    sourceLocale: 'en-US',
  },
  'zh-Hans': {
    code: 'zh-Hans',
    prefix: '/zh-hans',
    direction: 'ltr',
    nativeName: '简体中文',
    shortName: 'ZH',
    administrativeName: 'Chinese',
    formattingLocale: 'zh-Hans',
    openGraphLocale: 'zh_CN',
    sourceLocale: 'en-US',
  },
  ja: {
    code: 'ja',
    prefix: '/ja',
    direction: 'ltr',
    nativeName: '日本語',
    shortName: 'JA',
    administrativeName: 'Japanese',
    formattingLocale: 'ja-JP',
    openGraphLocale: 'ja_JP',
    sourceLocale: 'en-US',
  },
  'de-DE': {
    code: 'de-DE',
    prefix: '/de-de',
    direction: 'ltr',
    nativeName: 'Deutsch',
    shortName: 'DE',
    administrativeName: 'German',
    formattingLocale: 'de-DE',
    openGraphLocale: 'de_DE',
    sourceLocale: 'en-US',
  },
  it: {
    code: 'it',
    prefix: '/it',
    direction: 'ltr',
    nativeName: 'Italiano',
    shortName: 'IT',
    administrativeName: 'Italian',
    formattingLocale: 'it-IT',
    openGraphLocale: 'it_IT',
    sourceLocale: 'en-US',
  },
}

export const translationStatuses: Record<LocalizedLocale, TranslationStatus> = {
  ar: 'draft',
  fr: 'draft',
  es: 'draft',
  'zh-Hans': 'draft',
  ja: 'draft',
  'de-DE': 'draft',
  it: 'draft',
}

const requestedModes: Record<LocalizedLocale, string> = {
  ar: import.meta.env.PUBLIC_I18N_ARABIC_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  fr: import.meta.env.PUBLIC_I18N_FRENCH_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  es: import.meta.env.PUBLIC_I18N_SPANISH_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  'zh-Hans': import.meta.env.PUBLIC_I18N_SIMPLIFIED_CHINESE_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  ja: import.meta.env.PUBLIC_I18N_JAPANESE_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  'de-DE': import.meta.env.PUBLIC_I18N_GERMAN_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
  it: import.meta.env.PUBLIC_I18N_ITALIAN_MODE?.trim().toLowerCase()
    ?? (isWebsiteReviewMode ? 'preview' : 'off'),
}

const localeConfig: Record<LocalizedLocale, { label: string; environmentName: string }> = {
  ar: { label: 'Arabic', environmentName: 'PUBLIC_I18N_ARABIC_MODE' },
  fr: { label: 'French', environmentName: 'PUBLIC_I18N_FRENCH_MODE' },
  es: { label: 'Spanish', environmentName: 'PUBLIC_I18N_SPANISH_MODE' },
  'zh-Hans': { label: 'Simplified Chinese', environmentName: 'PUBLIC_I18N_SIMPLIFIED_CHINESE_MODE' },
  ja: { label: 'Japanese', environmentName: 'PUBLIC_I18N_JAPANESE_MODE' },
  'de-DE': { label: 'German', environmentName: 'PUBLIC_I18N_GERMAN_MODE' },
  it: { label: 'Italian', environmentName: 'PUBLIC_I18N_ITALIAN_MODE' },
}

for (const locale of localizedLocales) {
  const mode = requestedModes[locale]
  const { label, environmentName } = localeConfig[locale]

  if (!['off', 'preview', 'published'].includes(mode)) {
    throw new Error(
      `${environmentName} must be one of: off, preview, published.`,
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
export const isSpanishEnabled = enabledLocales.includes('es')
export const isSimplifiedChineseEnabled = enabledLocales.includes('zh-Hans')
export const isJapaneseEnabled = enabledLocales.includes('ja')
export const isGermanEnabled = enabledLocales.includes('de-DE')
export const isItalianEnabled = enabledLocales.includes('it')

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
  if (normalized === 'es' || normalized.startsWith('es-')) return 'es'
  if (normalized === 'zh'
    || normalized === 'zh-cn'
    || normalized === 'zh-sg'
    || normalized === 'zh-hans'
    || normalized.startsWith('zh-hans-')) return 'zh-Hans'
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja'
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de-DE'
  if (normalized === 'it' || normalized.startsWith('it-')) return 'it'
  return 'en-US'
}
