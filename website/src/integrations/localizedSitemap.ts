import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'
import type { LocalizedLocale, SupportedLocale } from '../i18n/locales'
import { allLocalizedRoutePairs } from '../i18n/routes'

const sitemapFilePattern = /^sitemap-\d+\.xml$/

interface Options {
  enabledLocales: LocalizedLocale[]
}

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

export function localizedSitemap({ enabledLocales }: Options): AstroIntegration {
  return {
    name: 'phaeno-localized-sitemap',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (enabledLocales.length === 0) return
        await addLocalizedAlternates(dir, enabledLocales)
      },
    },
  }
}

export async function addLocalizedAlternates(
  outputDirectory: URL,
  enabledLocales: LocalizedLocale[],
) {
  const outputPath = fileURLToPath(outputDirectory)
  const sitemapFiles = (await readdir(outputPath))
    .filter((fileName) => sitemapFilePattern.test(fileName))
    .sort()

  if (!sitemapFiles.length) {
    throw new Error('Cannot add localized sitemap alternates because no sitemap files were generated.')
  }

  for (const sitemapFile of sitemapFiles) {
    const sitemapPath = join(outputPath, sitemapFile)
    const original = await readFile(sitemapPath, 'utf8')
    const locations = new Set(
      [...original.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeXml(match[1])),
    )

    let sitemap = original.includes('xmlns:xhtml=')
      ? original
      : original.replace('<urlset ', '<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml" ')

    sitemap = sitemap.replace(/<url>([\s\S]*?)<\/url>/gi, (urlBlock) => {
      const locationMatch = urlBlock.match(/<loc>([\s\S]*?)<\/loc>/i)
      if (!locationMatch) return urlBlock

      const location = decodeXml(locationMatch[1])
      const url = new URL(location)
      const decodedPath = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/'
      const activeLocales: SupportedLocale[] = ['en-US', ...enabledLocales]
      const pair = allLocalizedRoutePairs.find((candidate) => (
        activeLocales.some((locale) => candidate[routeKeys[locale]] === decodedPath)
      ))
      if (!pair) return urlBlock

      const englishUrl = absoluteRouteUrl(pair.enUS, url.origin)
      const localizedUrls = activeLocales.map((locale) => ({
        locale,
        url: absoluteRouteUrl(pair[routeKeys[locale]], url.origin),
      }))
      if (localizedUrls.some((item) => !locations.has(item.url))) {
        throw new Error(`Sitemap alternate pair is incomplete for ${pair.translationKey}.`)
      }

      const withoutAlternates = urlBlock.replace(/<xhtml:link\b[^>]*\/>/gi, '')
      const alternates = [
        ...localizedUrls.map((item) => (
          `<xhtml:link rel="alternate" hreflang="${item.locale}" href="${escapeXml(item.url)}"/>`
        )),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(englishUrl)}"/>`,
      ].join('')

      return withoutAlternates.replace(locationMatch[0], `${locationMatch[0]}${alternates}`)
    })

    await writeFile(sitemapPath, sitemap, 'utf8')
  }
}

function absoluteRouteUrl(pathname: string, origin: string) {
  const url = new URL(pathname, origin)
  return pathname === '/' ? url.origin : url.href
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
}
