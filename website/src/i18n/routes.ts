import type { SupportedLocale } from './locales'

export interface LocalizedRoutePair {
  translationKey: string
  enUS: string
  ar: string
}

export const localizedRoutePairs = [
  { translationKey: 'page.home', enUS: '/', ar: '/ar' },
  { translationKey: 'page.pseq-platform', enUS: '/technology/pseq-platform', ar: '/ar/technology/pseq-platform' },
  { translationKey: 'page.multi-omics', enUS: '/technology/multi-omics', ar: '/ar/technology/multi-omics' },
  { translationKey: 'page.why-isoforms-matter', enUS: '/technology/why-isoforms-matter', ar: '/ar/technology/why-isoforms-matter' },
  { translationKey: 'page.about-us', enUS: '/about/about-us', ar: '/ar/about/about-us' },
  { translationKey: 'page.job-openings', enUS: '/about/job-openings', ar: '/ar/about/job-openings' },
  { translationKey: 'page.blog', enUS: '/media/blog', ar: '/ar/media/blog' },
  { translationKey: 'page.white-papers', enUS: '/media/white-papers', ar: '/ar/media/white-papers' },
  { translationKey: 'page.contact', enUS: '/contact', ar: '/ar/contact' },
  { translationKey: 'page.investors', enUS: '/investors', ar: '/ar/investors' },
  { translationKey: 'page.privacy', enUS: '/privacy', ar: '/ar/privacy' },
  { translationKey: 'page.data-policies', enUS: '/data-policies', ar: '/ar/data-policies' },
  {
    translationKey: 'white-paper.platform-overview',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-1-platform-overview',
    ar: '/ar/media/white-papers/التسلسل-المرحلي-للرنا-على-منصات-ngs',
  },
  {
    translationKey: 'white-paper.molecular-tagging',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging',
    ar: '/ar/media/white-papers/الوسم-الجزيئي-وبنية-المكتبة',
  },
  {
    translationKey: 'white-paper.data-pipeline',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-3-data-pipeline',
    ar: '/ar/media/white-papers/مسار-معالجة-بيانات-pseq',
  },
  {
    translationKey: 'white-paper.initial-validation',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation',
    ar: '/ar/media/white-papers/التحقق-التقني-الأولي-لمنصة-pseq',
  },
] as const satisfies readonly LocalizedRoutePair[]

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  const normalized = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '')
  return normalized || '/'
}

export function getRoutePair(pathname: string): LocalizedRoutePair | undefined {
  const normalized = normalizePath(decodeURIComponent(pathname))
  return localizedRoutePairs.find(
    (pair) => pair.enUS === normalized || pair.ar === normalized,
  )
}

export function getLocalizedPath(
  pathname: string,
  locale: SupportedLocale,
): string | undefined {
  const pair = getRoutePair(pathname)
  if (!pair) return undefined
  const routeKeys: Record<SupportedLocale, 'enUS' | 'ar'> = {
    'en-US': 'enUS',
    ar: 'ar',
  }
  return pair[routeKeys[locale]]
}

export function getRouteLocale(pathname: string): SupportedLocale {
  return normalizePath(pathname).startsWith('/ar') ? 'ar' : 'en-US'
}

export function getStaticArabicRoutePath(pathname: string) {
  const normalized = normalizePath(pathname)
  if (normalized === '/ar') return undefined
  return decodeURIComponent(normalized.replace(/^\/ar\/?/, ''))
}
