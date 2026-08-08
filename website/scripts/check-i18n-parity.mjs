import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const routes = [
  ['/', '/ar/'],
  ['/technology/pseq-platform/', '/ar/technology/pseq-platform/'],
  ['/technology/multi-omics/', '/ar/technology/multi-omics/'],
  ['/technology/why-isoforms-matter/', '/ar/technology/why-isoforms-matter/'],
  ['/about/about-us/', '/ar/about/about-us/'],
  ['/about/job-openings/', '/ar/about/job-openings/'],
  ['/media/blog/', '/ar/media/blog/'],
  ['/media/white-papers/', '/ar/media/white-papers/'],
  ['/contact/', '/ar/contact/'],
  ['/investors/', '/ar/investors/'],
  ['/privacy/', '/ar/privacy/'],
  ['/data-policies/', '/ar/data-policies/'],
  ['/media/white-papers/pseq-technical-whitepaper-part-1-platform-overview/', '/ar/media/white-papers/التسلسل-المرحلي-للرنا-على-منصات-ngs/'],
  ['/media/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging/', '/ar/media/white-papers/الوسم-الجزيئي-وبنية-المكتبة/'],
  ['/media/white-papers/pseq-technical-whitepaper-part-3-data-pipeline/', '/ar/media/white-papers/مسار-معالجة-بيانات-pseq/'],
  ['/media/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation/', '/ar/media/white-papers/التحقق-التقني-الأولي-لمنصة-pseq/'],
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

for (const [englishRoute, arabicRoute] of routes) {
  const english = readFileSync(htmlPath(englishRoute), 'utf8')
  const arabic = readFileSync(htmlPath(arabicRoute), 'utf8')

  const htmlTag = arabic.match(/<html[^>]+>/i)?.[0] ?? ''
  if (!/\blang=(?:"ar"|ar)\b/i.test(htmlTag) || !/\bdir=(?:"rtl"|rtl)\b/i.test(htmlTag)) {
    errors.push(`${arabicRoute}: missing lang="ar" and dir="rtl"`)
  }

  for (const tag of structuralTags) {
    const englishCount = count(english, tag)
    const arabicCount = count(arabic, tag)
    if (englishCount !== arabicCount) {
      errors.push(`${arabicRoute}: <${tag}> count ${arabicCount}; English has ${englishCount}`)
    }
  }

  const englishLength = visibleText(english).length
  const arabicLength = visibleText(arabic).length
  if (arabicLength < englishLength * 0.45) {
    errors.push(`${arabicRoute}: visible content is only ${Math.round(arabicLength / englishLength * 100)}% of English`)
  }
}

const arabicHome = readFileSync(htmlPath('/ar/'), 'utf8')
if (arabicHome.includes('قراءة الرنا بطوله الكامل، جزيئًا بعد جزيء')) {
  errors.push('/ar/: obsolete condensed-home headline is still present')
}
if (!arabicHome.includes('تحويل الرنا إلى رؤى كاملة الطول ومحلولة حسب الشكل الإسوي—على نطاق واسع')) {
  errors.push('/ar/: faithful translation of the English home headline is missing')
}

if (errors.length > 0) {
  console.error(`Arabic parity check failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log(`Arabic parity check passed for ${routes.length} route pairs.`)
