import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const localizedCodes = ['ar', 'fr', 'es', 'zh-Hans', 'ja', 'de-DE', 'it']
const prefixes = { ar: 'ar', fr: 'fr', es: 'es', 'zh-Hans': 'zh-hans', ja: 'ja', 'de-DE': 'de-de', it: 'it' }
const localizedRoute = (enUS) => Object.fromEntries([
  ['enUS', enUS],
  ...localizedCodes.map((locale) => [locale, `/${prefixes[locale]}${enUS}`]),
])
const routes = [
  localizedRoute('/'),
  localizedRoute('/technology/pseq-platform/'),
  localizedRoute('/technology/multi-omics/'),
  localizedRoute('/technology/why-isoforms-matter/'),
  localizedRoute('/about/about-us/'),
  localizedRoute('/about/job-openings/'),
  localizedRoute('/media/blog/'),
  localizedRoute('/media/blog/an-introduction-to-phased-sequencing-part-1/'),
  localizedRoute('/media/blog/an-introduction-to-phased-sequencing-part-2/'),
  localizedRoute('/media/blog/an-introduction-to-phased-sequencing-part-3/'),
  localizedRoute('/media/white-papers/'),
  localizedRoute('/contact/'),
  localizedRoute('/investors/'),
  localizedRoute('/privacy/'),
  localizedRoute('/data-policies/'),
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-1-platform-overview/',
    ar: '/ar/media/white-papers/التسلسل-المرحلي-للرنا-على-منصات-ngs/',
    fr: '/fr/media/white-papers/sequencage-phase-de-l-arn-sur-plateformes-ngs/',
    es: '/es/media/white-papers/secuenciacion-fasica-de-arn-en-plataformas-ngs/',
    'zh-Hans': '/zh-hans/media/white-papers/ngs平台上的rna分阶段测序/',
    ja: '/ja/media/white-papers/ngsプラットフォームでのrnaフェーズドシーケンシング/',
    'de-DE': '/de-de/media/white-papers/phasensequenzierung-von-rna-auf-ngs-plattformen/',
    it: '/it/media/white-papers/sequenziamento-fasico-rna-su-piattaforme-ngs/',
  },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging/',
    ar: '/ar/media/white-papers/الوسم-الجزيئي-وبنية-المكتبة/',
    fr: '/fr/media/white-papers/marquage-moleculaire-et-architecture-de-bibliotheque/',
    es: '/es/media/white-papers/marcado-molecular-y-arquitectura-de-bibliotecas/',
    'zh-Hans': '/zh-hans/media/white-papers/分子标记与文库架构/',
    ja: '/ja/media/white-papers/分子タグとライブラリー設計/',
    'de-DE': '/de-de/media/white-papers/molekulare-markierung-und-bibliotheksarchitektur/',
    it: '/it/media/white-papers/marcatura-molecolare-e-architettura-della-libreria/',
  },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-3-data-pipeline/',
    ar: '/ar/media/white-papers/مسار-معالجة-بيانات-pseq/',
    fr: '/fr/media/white-papers/pipeline-de-donnees-pseq/',
    es: '/es/media/white-papers/canalizacion-de-datos-pseq/',
    'zh-Hans': '/zh-hans/media/white-papers/pseq数据处理流程/',
    ja: '/ja/media/white-papers/pseqデータパイプライン/',
    'de-DE': '/de-de/media/white-papers/pseq-datenpipeline/',
    it: '/it/media/white-papers/pipeline-di-dati-pseq/',
  },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation/',
    ar: '/ar/media/white-papers/التحقق-التقني-الأولي-لمنصة-pseq/',
    fr: '/fr/media/white-papers/validation-technique-initiale-de-la-plateforme-pseq/',
    es: '/es/media/white-papers/validacion-tecnica-inicial-de-la-plataforma-pseq/',
    'zh-Hans': '/zh-hans/media/white-papers/pseq平台初步技术验证/',
    ja: '/ja/media/white-papers/pseqプラットフォームの初期技術検証/',
    'de-DE': '/de-de/media/white-papers/erste-technische-validierung-der-pseq-plattform/',
    it: '/it/media/white-papers/validazione-tecnica-iniziale-della-piattaforma-pseq/',
  },
]

const localeDefinitions = [
  { code: 'ar', direction: 'rtl' },
  { code: 'fr', direction: 'ltr' },
  { code: 'es', direction: 'ltr' },
  { code: 'zh-Hans', direction: 'ltr' },
  { code: 'ja', direction: 'ltr' },
  { code: 'de-DE', direction: 'ltr' },
  { code: 'it', direction: 'ltr' },
]
const structuralTags = ['main', 'h1', 'form', 'table', 'tr']
const errors = []

function htmlPath(route) {
  return route === '/'
    ? join(root, 'dist', 'index.html')
    : join(root, 'dist', route, 'index.html')
}

function count(html, tag) {
  return (html.match(new RegExp(`<${tag}(?:\\s|>)`, 'gi')) ?? []).length
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function assertHeaderFocusOrder(html, route) {
  const markers = [
    ['logo', 'class=logo-link'],
    ['main menu', 'id=main-menu'],
    ['language selector', 'class=locale-switcher'],
    ['search', 'class=web-search-button'],
    ['demo CTA', '#request-demo'],
  ]
  const positions = markers.map(([label, marker]) => [label, html.indexOf(marker)])
  const missing = positions.filter(([, position]) => position < 0).map(([label]) => label)

  if (missing.length > 0) {
    errors.push(`${route}: header focus-order markers missing: ${missing.join(', ')}`)
    return
  }

  if (positions.some(([, position], index) => index > 0 && position <= positions[index - 1][1])) {
    errors.push(`${route}: header source order must be logo, main menu, language selector, search, demo CTA`)
  }
}

const enabledLocales = localeDefinitions.filter((locale) => (
  existsSync(htmlPath(`/${locale.code}/`))
))

if (enabledLocales.length === 0) {
  console.error('Localized parity check failed: no localized route sets were generated.')
  process.exit(1)
}

for (const locale of enabledLocales) {
  for (const route of routes) {
    const english = readFileSync(htmlPath(route.enUS), 'utf8')
    const localizedRoute = route[locale.code]
    const localized = readFileSync(htmlPath(localizedRoute), 'utf8')

    const htmlTag = localized.match(/<html[^>]+>/i)?.[0] ?? ''
    const langPattern = new RegExp(`\\blang=(?:"${locale.code}"|${locale.code})\\b`, 'i')
    const directionPattern = new RegExp(`\\bdir=(?:"${locale.direction}"|${locale.direction})\\b`, 'i')
    if (!langPattern.test(htmlTag) || !directionPattern.test(htmlTag)) {
      errors.push(`${localizedRoute}: missing lang="${locale.code}" and dir="${locale.direction}"`)
    }

    for (const tag of structuralTags) {
      const englishCount = count(english, tag)
      const localizedCount = count(localized, tag)
      if (englishCount !== localizedCount) {
        errors.push(`${localizedRoute}: <${tag}> count ${localizedCount}; English has ${englishCount}`)
      }
    }

    const englishLength = visibleText(english).length
    const localizedLength = visibleText(localized).length
    const minimumCoverage = locale.code === 'zh-Hans'
      ? 0.25
      : locale.code === 'ja'
        ? 0.35
        : 0.45
    if (localizedLength < englishLength * minimumCoverage) {
      errors.push(`${localizedRoute}: visible content is only ${Math.round(localizedLength / englishLength * 100)}% of English`)
    }
  }
}

const homeRoutes = ['/', ...enabledLocales.map((locale) => `/${locale.code}/`)]
for (const route of homeRoutes) {
  assertHeaderFocusOrder(readFileSync(htmlPath(route), 'utf8'), route)
}

if (enabledLocales.some((locale) => locale.code === 'ar')) {
  const arabicHome = readFileSync(htmlPath('/ar/'), 'utf8')
  if (arabicHome.includes('قراءة الرنا بطوله الكامل، جزيئًا بعد جزيء')) {
    errors.push('/ar/: obsolete condensed-home headline is still present')
  }
  if (!arabicHome.includes('تحويل الرنا إلى رؤى كاملة الطول ومحلولة حسب الشكل الإسوي—على نطاق واسع')) {
    errors.push('/ar/: faithful translation of the English home headline is missing')
  }
}

if (enabledLocales.some((locale) => locale.code === 'fr')) {
  const frenchHome = readFileSync(htmlPath('/fr/'), 'utf8')
  if (!frenchHome.includes('Résoudre l’ARN en isoformes complètes, à grande échelle')) {
    errors.push('/fr/: French translation of the English home headline is missing')
  }
}

const expectedHomeHeadlines = {
  es: 'Resolver el ARN en isoformas completas, a escala',
  'zh-Hans': '大规模解析全长 RNA 异构体',
  ja: '全長 RNA アイソフォームを大規模に解析',
  'de-DE': 'RNA vollständig und isoformaufgelöst – im großen Maßstab',
  it: 'Risolvere l’RNA in isoforme complete, su larga scala',
}
for (const [locale, headline] of Object.entries(expectedHomeHeadlines)) {
  if (!enabledLocales.some((candidate) => candidate.code === locale)) continue
  const home = readFileSync(htmlPath(`/${locale}/`), 'utf8')
  if (!home.includes(headline)) {
    errors.push(`/${locale}/: expected localized home headline is missing`)
  }
}

if (errors.length > 0) {
  console.error(`Localized parity check failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log(`Localized parity check passed for ${enabledLocales.length} locale set(s) and ${routes.length} route pairs per locale.`)
