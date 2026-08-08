import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const routes = [
  { enUS: '/', ar: '/ar/', fr: '/fr/' },
  { enUS: '/technology/pseq-platform/', ar: '/ar/technology/pseq-platform/', fr: '/fr/technology/pseq-platform/' },
  { enUS: '/technology/multi-omics/', ar: '/ar/technology/multi-omics/', fr: '/fr/technology/multi-omics/' },
  { enUS: '/technology/why-isoforms-matter/', ar: '/ar/technology/why-isoforms-matter/', fr: '/fr/technology/why-isoforms-matter/' },
  { enUS: '/about/about-us/', ar: '/ar/about/about-us/', fr: '/fr/about/about-us/' },
  { enUS: '/about/job-openings/', ar: '/ar/about/job-openings/', fr: '/fr/about/job-openings/' },
  { enUS: '/media/blog/', ar: '/ar/media/blog/', fr: '/fr/media/blog/' },
  { enUS: '/media/white-papers/', ar: '/ar/media/white-papers/', fr: '/fr/media/white-papers/' },
  { enUS: '/contact/', ar: '/ar/contact/', fr: '/fr/contact/' },
  { enUS: '/investors/', ar: '/ar/investors/', fr: '/fr/investors/' },
  { enUS: '/privacy/', ar: '/ar/privacy/', fr: '/fr/privacy/' },
  { enUS: '/data-policies/', ar: '/ar/data-policies/', fr: '/fr/data-policies/' },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-1-platform-overview/',
    ar: '/ar/media/white-papers/التسلسل-المرحلي-للرنا-على-منصات-ngs/',
    fr: '/fr/media/white-papers/sequencage-phase-de-l-arn-sur-plateformes-ngs/',
  },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging/',
    ar: '/ar/media/white-papers/الوسم-الجزيئي-وبنية-المكتبة/',
    fr: '/fr/media/white-papers/marquage-moleculaire-et-architecture-de-bibliotheque/',
  },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-3-data-pipeline/',
    ar: '/ar/media/white-papers/مسار-معالجة-بيانات-pseq/',
    fr: '/fr/media/white-papers/pipeline-de-donnees-pseq/',
  },
  {
    enUS: '/media/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation/',
    ar: '/ar/media/white-papers/التحقق-التقني-الأولي-لمنصة-pseq/',
    fr: '/fr/media/white-papers/validation-technique-initiale-de-la-plateforme-pseq/',
  },
]

const localeDefinitions = [
  { code: 'ar', direction: 'rtl' },
  { code: 'fr', direction: 'ltr' },
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
    if (localizedLength < englishLength * 0.45) {
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

if (errors.length > 0) {
  console.error(`Localized parity check failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log(`Localized parity check passed for ${enabledLocales.length} locale set(s) and ${routes.length} route pairs per locale.`)
