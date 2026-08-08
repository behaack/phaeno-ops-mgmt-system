import type { LocalizedLocale, SupportedLocale } from './locales'

export interface LocalizedRoutePair {
  translationKey: string
  enUS: string
  ar: string
  fr: string
}

export const localizedRoutePairs = [
  { translationKey: 'page.home', enUS: '/', ar: '/ar', fr: '/fr' },
  { translationKey: 'page.pseq-platform', enUS: '/technology/pseq-platform', ar: '/ar/technology/pseq-platform', fr: '/fr/technology/pseq-platform' },
  { translationKey: 'page.multi-omics', enUS: '/technology/multi-omics', ar: '/ar/technology/multi-omics', fr: '/fr/technology/multi-omics' },
  { translationKey: 'page.why-isoforms-matter', enUS: '/technology/why-isoforms-matter', ar: '/ar/technology/why-isoforms-matter', fr: '/fr/technology/why-isoforms-matter' },
  { translationKey: 'page.about-us', enUS: '/about/about-us', ar: '/ar/about/about-us', fr: '/fr/about/about-us' },
  { translationKey: 'page.job-openings', enUS: '/about/job-openings', ar: '/ar/about/job-openings', fr: '/fr/about/job-openings' },
  { translationKey: 'page.blog', enUS: '/media/blog', ar: '/ar/media/blog', fr: '/fr/media/blog' },
  { translationKey: 'page.white-papers', enUS: '/media/white-papers', ar: '/ar/media/white-papers', fr: '/fr/media/white-papers' },
  { translationKey: 'page.contact', enUS: '/contact', ar: '/ar/contact', fr: '/fr/contact' },
  { translationKey: 'page.investors', enUS: '/investors', ar: '/ar/investors', fr: '/fr/investors' },
  { translationKey: 'page.privacy', enUS: '/privacy', ar: '/ar/privacy', fr: '/fr/privacy' },
  { translationKey: 'page.data-policies', enUS: '/data-policies', ar: '/ar/data-policies', fr: '/fr/data-policies' },
  {
    translationKey: 'white-paper.platform-overview',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-1-platform-overview',
    ar: '/ar/media/white-papers/التسلسل-المرحلي-للرنا-على-منصات-ngs',
    fr: '/fr/media/white-papers/sequencage-phase-de-l-arn-sur-plateformes-ngs',
  },
  {
    translationKey: 'white-paper.molecular-tagging',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging',
    ar: '/ar/media/white-papers/الوسم-الجزيئي-وبنية-المكتبة',
    fr: '/fr/media/white-papers/marquage-moleculaire-et-architecture-de-bibliotheque',
  },
  {
    translationKey: 'white-paper.data-pipeline',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-3-data-pipeline',
    ar: '/ar/media/white-papers/مسار-معالجة-بيانات-pseq',
    fr: '/fr/media/white-papers/pipeline-de-donnees-pseq',
  },
  {
    translationKey: 'white-paper.initial-validation',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation',
    ar: '/ar/media/white-papers/التحقق-التقني-الأولي-لمنصة-pseq',
    fr: '/fr/media/white-papers/validation-technique-initiale-de-la-plateforme-pseq',
  },
] as const satisfies readonly LocalizedRoutePair[]

const routeKeys: Record<SupportedLocale, 'enUS' | LocalizedLocale> = {
  'en-US': 'enUS',
  ar: 'ar',
  fr: 'fr',
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  const normalized = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '')
  return normalized || '/'
}

export function getRoutePair(pathname: string): LocalizedRoutePair | undefined {
  const normalized = normalizePath(decodeURIComponent(pathname))
  return localizedRoutePairs.find((pair) => (
    pair.enUS === normalized || pair.ar === normalized || pair.fr === normalized
  ))
}

export function getLocalizedPath(
  pathname: string,
  locale: SupportedLocale,
): string | undefined {
  const pair = getRoutePair(pathname)
  return pair?.[routeKeys[locale]]
}

export function getRouteLocale(pathname: string): SupportedLocale {
  const normalized = normalizePath(pathname)
  if (normalized === '/ar' || normalized.startsWith('/ar/')) return 'ar'
  if (normalized === '/fr' || normalized.startsWith('/fr/')) return 'fr'
  return 'en-US'
}

export function getStaticLocalizedRoutePath(
  pathname: string,
  locale: LocalizedLocale,
) {
  const normalized = normalizePath(pathname)
  const prefix = `/${locale}`
  if (normalized === prefix) return undefined
  return decodeURIComponent(normalized.replace(new RegExp(`^/${locale}/?`), ''))
}
