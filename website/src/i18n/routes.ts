import type { LocalizedLocale, SupportedLocale } from './locales'

type RouteLocaleKey = 'enUS' | LocalizedLocale

export type LocalizedRoutePair = {
  translationKey: string
} & Record<RouteLocaleKey, string>

export const localizedRoutePairs = [
  { translationKey: 'page.home', enUS: '/', ar: '/ar', fr: '/fr', es: '/es', 'zh-Hans': '/zh-hans', ja: '/ja', 'de-DE': '/de-de', it: '/it' },
  { translationKey: 'page.pseq-platform', enUS: '/technology/pseq-platform', ar: '/ar/technology/pseq-platform', fr: '/fr/technology/pseq-platform', es: '/es/technology/pseq-platform', 'zh-Hans': '/zh-hans/technology/pseq-platform', ja: '/ja/technology/pseq-platform', 'de-DE': '/de-de/technology/pseq-platform', it: '/it/technology/pseq-platform' },
  { translationKey: 'page.multi-omics', enUS: '/technology/multi-omics', ar: '/ar/technology/multi-omics', fr: '/fr/technology/multi-omics', es: '/es/technology/multi-omics', 'zh-Hans': '/zh-hans/technology/multi-omics', ja: '/ja/technology/multi-omics', 'de-DE': '/de-de/technology/multi-omics', it: '/it/technology/multi-omics' },
  { translationKey: 'page.why-isoforms-matter', enUS: '/technology/why-isoforms-matter', ar: '/ar/technology/why-isoforms-matter', fr: '/fr/technology/why-isoforms-matter', es: '/es/technology/why-isoforms-matter', 'zh-Hans': '/zh-hans/technology/why-isoforms-matter', ja: '/ja/technology/why-isoforms-matter', 'de-DE': '/de-de/technology/why-isoforms-matter', it: '/it/technology/why-isoforms-matter' },
  { translationKey: 'page.about-us', enUS: '/about/about-us', ar: '/ar/about/about-us', fr: '/fr/about/about-us', es: '/es/about/about-us', 'zh-Hans': '/zh-hans/about/about-us', ja: '/ja/about/about-us', 'de-DE': '/de-de/about/about-us', it: '/it/about/about-us' },
  { translationKey: 'page.job-openings', enUS: '/about/job-openings', ar: '/ar/about/job-openings', fr: '/fr/about/job-openings', es: '/es/about/job-openings', 'zh-Hans': '/zh-hans/about/job-openings', ja: '/ja/about/job-openings', 'de-DE': '/de-de/about/job-openings', it: '/it/about/job-openings' },
  { translationKey: 'page.blog', enUS: '/media/blog', ar: '/ar/media/blog', fr: '/fr/media/blog', es: '/es/media/blog', 'zh-Hans': '/zh-hans/media/blog', ja: '/ja/media/blog', 'de-DE': '/de-de/media/blog', it: '/it/media/blog' },
  { translationKey: 'page.white-papers', enUS: '/media/white-papers', ar: '/ar/media/white-papers', fr: '/fr/media/white-papers', es: '/es/media/white-papers', 'zh-Hans': '/zh-hans/media/white-papers', ja: '/ja/media/white-papers', 'de-DE': '/de-de/media/white-papers', it: '/it/media/white-papers' },
  { translationKey: 'page.contact', enUS: '/contact', ar: '/ar/contact', fr: '/fr/contact', es: '/es/contact', 'zh-Hans': '/zh-hans/contact', ja: '/ja/contact', 'de-DE': '/de-de/contact', it: '/it/contact' },
  { translationKey: 'page.investors', enUS: '/investors', ar: '/ar/investors', fr: '/fr/investors', es: '/es/investors', 'zh-Hans': '/zh-hans/investors', ja: '/ja/investors', 'de-DE': '/de-de/investors', it: '/it/investors' },
  { translationKey: 'page.privacy', enUS: '/privacy', ar: '/ar/privacy', fr: '/fr/privacy', es: '/es/privacy', 'zh-Hans': '/zh-hans/privacy', ja: '/ja/privacy', 'de-DE': '/de-de/privacy', it: '/it/privacy' },
  { translationKey: 'page.data-policies', enUS: '/data-policies', ar: '/ar/data-policies', fr: '/fr/data-policies', es: '/es/data-policies', 'zh-Hans': '/zh-hans/data-policies', ja: '/ja/data-policies', 'de-DE': '/de-de/data-policies', it: '/it/data-policies' },
  {
    translationKey: 'white-paper.platform-overview',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-1-platform-overview',
    ar: '/ar/media/white-papers/التسلسل-المرحلي-للرنا-على-منصات-ngs',
    fr: '/fr/media/white-papers/sequencage-phase-de-l-arn-sur-plateformes-ngs',
    es: '/es/media/white-papers/secuenciacion-fasica-de-arn-en-plataformas-ngs',
    'zh-Hans': '/zh-hans/media/white-papers/ngs平台上的rna分阶段测序',
    ja: '/ja/media/white-papers/ngsプラットフォームでのrnaフェーズドシーケンシング',
    'de-DE': '/de-de/media/white-papers/phasensequenzierung-von-rna-auf-ngs-plattformen',
    it: '/it/media/white-papers/sequenziamento-fasico-rna-su-piattaforme-ngs',
  },
  {
    translationKey: 'white-paper.molecular-tagging',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging',
    ar: '/ar/media/white-papers/الوسم-الجزيئي-وبنية-المكتبة',
    fr: '/fr/media/white-papers/marquage-moleculaire-et-architecture-de-bibliotheque',
    es: '/es/media/white-papers/marcado-molecular-y-arquitectura-de-bibliotecas',
    'zh-Hans': '/zh-hans/media/white-papers/分子标记与文库架构',
    ja: '/ja/media/white-papers/分子タグとライブラリー設計',
    'de-DE': '/de-de/media/white-papers/molekulare-markierung-und-bibliotheksarchitektur',
    it: '/it/media/white-papers/marcatura-molecolare-e-architettura-della-libreria',
  },
  {
    translationKey: 'white-paper.data-pipeline',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-3-data-pipeline',
    ar: '/ar/media/white-papers/مسار-معالجة-بيانات-pseq',
    fr: '/fr/media/white-papers/pipeline-de-donnees-pseq',
    es: '/es/media/white-papers/canalizacion-de-datos-pseq',
    'zh-Hans': '/zh-hans/media/white-papers/pseq数据处理流程',
    ja: '/ja/media/white-papers/pseqデータパイプライン',
    'de-DE': '/de-de/media/white-papers/pseq-datenpipeline',
    it: '/it/media/white-papers/pipeline-di-dati-pseq',
  },
  {
    translationKey: 'white-paper.initial-validation',
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation',
    ar: '/ar/media/white-papers/التحقق-التقني-الأولي-لمنصة-pseq',
    fr: '/fr/media/white-papers/validation-technique-initiale-de-la-plateforme-pseq',
    es: '/es/media/white-papers/validacion-tecnica-inicial-de-la-plataforma-pseq',
    'zh-Hans': '/zh-hans/media/white-papers/pseq平台初步技术验证',
    ja: '/ja/media/white-papers/pseqプラットフォームの初期技術検証',
    'de-DE': '/de-de/media/white-papers/erste-technische-validierung-der-pseq-plattform',
    it: '/it/media/white-papers/validazione-tecnica-iniziale-della-piattaforma-pseq',
  },
] as const satisfies readonly LocalizedRoutePair[]

const routeKeys: Record<SupportedLocale, 'enUS' | LocalizedLocale> = {
  'en-US': 'enUS',
  ar: 'ar',
  fr: 'fr',
  es: 'es',
  'zh-Hans': 'zh-Hans',
  ja: 'ja',
  'de-DE': 'de-DE',
  it: 'it',
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  const normalized = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '')
  return normalized || '/'
}

export function getRoutePair(pathname: string): LocalizedRoutePair | undefined {
  const normalized = normalizePath(decodeURIComponent(pathname))
  return localizedRoutePairs.find((pair) => (
    Object.values(routeKeys).some((key) => pair[key] === normalized)
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
  for (const locale of Object.keys(routeKeys) as SupportedLocale[]) {
    if (locale === 'en-US') continue
    const prefix = localizedRoutePairs[0][routeKeys[locale]]
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) return locale
  }
  return 'en-US'
}

export function getStaticLocalizedRoutePath(
  pathname: string,
  locale: LocalizedLocale,
) {
  const normalized = normalizePath(pathname)
  const prefix = localizedRoutePairs[0][routeKeys[locale]]
  if (normalized === prefix) return undefined
  return decodeURIComponent(normalized.slice(prefix.length).replace(/^\//, ''))
}
