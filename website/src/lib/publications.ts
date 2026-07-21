import { existsSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import type { CollectionEntry } from 'astro:content'

const publicRoot = resolve(process.cwd(), 'public')
const supportedImageExtensions = new Set(['.jpeg', '.jpg', '.png', '.svg', '.webp'])

export interface WhitePaperPublication {
  slug: string
  landingPath: string
  pdfPath: string
  imagePath: string
  landingUrl: string
  pdfUrl: string
  imageUrl: string
  topics: string[]
  searchKeywords: string[]
}

export function getWhitePaperPublication(
  paper: CollectionEntry<'white_papers'>,
  site: URL | undefined,
): WhitePaperPublication {
  if (!site) {
    throw new Error(
      `White paper "${paper.id}" cannot be built because Astro.site is not configured.`,
    )
  }

  const slug = paper.id
  const landingPath = `/media/white-papers/${slug}`
  const pdfPath = `/white-papers/${slug}.pdf`
  const expectedImagePrefix = `/images/media/white-papers/${slug}.`

  if (!paper.data.image.startsWith(expectedImagePrefix)) {
    throw new Error(
      `White paper "${slug}" image must follow ${expectedImagePrefix}{extension}.`,
    )
  }

  if (!supportedImageExtensions.has(extname(paper.data.image).toLowerCase())) {
    throw new Error(
      `White paper "${slug}" image must be a local JPEG, PNG, SVG, or WebP asset.`,
    )
  }

  assertPublicAsset(slug, pdfPath, 'PDF')
  assertPublicAsset(slug, paper.data.image, 'image')

  return {
    slug,
    landingPath,
    pdfPath,
    imagePath: paper.data.image,
    landingUrl: new URL(landingPath, site).href,
    pdfUrl: new URL(pdfPath, site).href,
    imageUrl: new URL(paper.data.image, site).href,
    topics: normalizeTerms(paper.data.topics),
    searchKeywords: normalizeTerms(paper.data.searchKeywords),
  }
}

function assertPublicAsset(entryId: string, publicPath: string, label: string) {
  if (!publicPath.startsWith('/') || publicPath.startsWith('//')) {
    throw new Error(`White paper "${entryId}" ${label} must use a local Website path.`)
  }

  const assetPath = resolve(publicRoot, publicPath.slice(1))
  const publicRootPrefix = `${publicRoot}${sep}`
  if (!assetPath.startsWith(publicRootPrefix) || !existsSync(assetPath)) {
    throw new Error(
      `White paper "${entryId}" ${label} is missing at website/public${publicPath}.`,
    )
  }
}

function normalizeTerms(values: string[]) {
  const seen = new Set<string>()

  return values
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => {
      const normalized = value.toLocaleLowerCase('en-US')
      if (!normalized || seen.has(normalized)) {
        return false
      }

      seen.add(normalized)
      return true
    })
}
