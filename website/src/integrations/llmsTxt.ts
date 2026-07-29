import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

interface PublicPage {
  title: string
  description: string
  url: URL
}

interface LlmSection {
  heading: string
  includes: (pathname: string) => boolean
}

const sitemapFilePattern = /^sitemap-\d+\.xml$/
const sections: LlmSection[] = [
  {
    heading: 'Core Website',
    includes: (pathname) => pathname === '/',
  },
  {
    heading: 'Technology and Scientific Context',
    includes: (pathname) => pathname.startsWith('/technology/'),
  },
  {
    heading: 'Scientific Articles',
    includes: (pathname) => pathname.startsWith('/media/blog'),
  },
  {
    heading: 'White Papers',
    includes: (pathname) => pathname.startsWith('/media/white-papers'),
  },
  {
    heading: 'Company',
    includes: (pathname) =>
      pathname.startsWith('/about/') || pathname === '/contact' || pathname === '/investors',
  },
  {
    heading: 'Policies',
    includes: (pathname) => pathname === '/privacy' || pathname === '/data-policies',
  },
]

export function llmsTxt(): AstroIntegration {
  return {
    name: 'phaeno-llms-txt',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        await generateLlmsTxt(dir)
      },
    },
  }
}

export async function generateLlmsTxt(outputDirectory: URL) {
  const outputPath = fileURLToPath(outputDirectory)
  const sitemapFiles = (await readdir(outputPath))
    .filter((fileName) => sitemapFilePattern.test(fileName))
    .sort()

  if (!sitemapFiles.length) {
    throw new Error('Cannot generate llms.txt because no generated sitemap files were found.')
  }

  const sitemapUrls = new Set<string>()
  for (const sitemapFile of sitemapFiles) {
    const sitemap = await readFile(join(outputPath, sitemapFile), 'utf8')
    for (const location of sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
      sitemapUrls.add(decodeMarkup(location[1]))
    }
  }

  const pages = (
    await Promise.all(
      [...sitemapUrls].map((location) => readPublicPage(outputPath, new URL(location))),
    )
  )
    .filter((page): page is PublicPage => page !== null)
    .sort((left, right) => left.url.pathname.localeCompare(right.url.pathname, 'en-US'))

  const homePage = pages.find((page) => page.url.pathname === '/')
  if (!homePage) {
    throw new Error('Cannot generate llms.txt because the public sitemap has no home page.')
  }

  await writeFile(join(outputPath, 'llms.txt'), renderLlmsTxt(homePage, pages), 'utf8')
}

async function readPublicPage(outputPath: string, url: URL): Promise<PublicPage | null> {
  if (url.pathname.endsWith('.xml') || url.pathname.endsWith('.txt')) {
    return null
  }

  const pathSegments = url.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))

  if (
    pathSegments.some(
      (segment) =>
        segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\'),
    )
  ) {
    throw new Error(`Cannot generate llms.txt for unsafe sitemap URL ${url.href}.`)
  }

  const routePath = pathSegments.length ? join(...pathSegments) : ''
  const candidates = pathSegments.length
    ? [join(outputPath, routePath, 'index.html'), join(outputPath, `${routePath}.html`)]
    : [join(outputPath, 'index.html')]

  let html: string | undefined
  for (const candidate of candidates) {
    try {
      html = await readFile(candidate, 'utf8')
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  if (!html) {
    throw new Error(`Cannot generate llms.txt because ${url.href} has no generated HTML file.`)
  }

  const robots = findMetaContent(html, 'robots').toLowerCase()
  if (robots.split(',').some((directive) => directive.trim() === 'noindex') || hasMetaRefresh(html)) {
    return null
  }

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i)
  const title = cleanText(titleMatch?.[1] ?? '')
  const description = cleanText(findMetaContent(html, 'description'))

  if (!title || !description) {
    throw new Error(
      `Cannot generate llms.txt because ${url.href} is missing a title or meta description.`,
    )
  }

  return { title, description, url }
}

function renderLlmsTxt(homePage: PublicPage, pages: PublicPage[]) {
  const lines = [
    '# Phaeno',
    '',
    `> ${escapeMarkdown(homePage.description)}`,
    '',
    'Official public information about Phaeno, PSeq phased RNA sequencing, RNA isoforms, and company resources. Product and performance information is for research use only and is not validated for clinical diagnostics.',
    '',
  ]

  const assignedUrls = new Set<string>()
  for (const section of sections) {
    const matchingPages = pages.filter((page) => section.includes(page.url.pathname))
    if (!matchingPages.length) {
      continue
    }

    lines.push(`## ${section.heading}`, '')
    for (const page of matchingPages) {
      assignedUrls.add(page.url.href)
      lines.push(renderPageLink(page))
    }
    lines.push('')
  }

  const otherPages = pages.filter((page) => !assignedUrls.has(page.url.href))
  if (otherPages.length) {
    lines.push('## Other Public Pages', '')
    for (const page of otherPages) {
      lines.push(renderPageLink(page))
    }
    lines.push('')
  }

  return `${lines.join('\n').trim()}\n`
}

function renderPageLink(page: PublicPage) {
  const label = page.url.pathname === '/'
    ? 'Phaeno Home'
    : page.title.replace(/\s+\|\s+Phaeno$/i, '')

  return `- [${escapeMarkdown(label)}](${page.url.href}): ${escapeMarkdown(page.description)}`
}

function findMetaContent(html: string, name: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag)
    if (attributes.get('name')?.toLowerCase() === name.toLowerCase()) {
      return attributes.get('content') ?? ''
    }
  }

  return ''
}

function hasMetaRefresh(html: string) {
  return (html.match(/<meta\b[^>]*>/gi) ?? []).some((tag) => {
    const attributes = parseAttributes(tag)
    return attributes.get('http-equiv')?.toLowerCase() === 'refresh'
  })
}

function parseAttributes(tag: string) {
  const attributes = new Map<string, string>()
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

  for (const match of tag.matchAll(attributePattern)) {
    attributes.set(match[1].toLowerCase(), decodeMarkup(match[2] ?? match[3] ?? match[4] ?? ''))
  }

  return attributes
}

function cleanText(value: string) {
  return decodeMarkup(value).replace(/\s+/g, ' ').trim()
}

function escapeMarkdown(value: string) {
  return value.replace(/([\[\]\\])/g, '\\$1')
}

function decodeMarkup(value: string) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
}
