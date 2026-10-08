import catalog from './documentation-catalog.json'
import type { DocumentationAudience } from './documentation-registry'
import type { ExternalDocumentationLocale } from './documentation-localization'

export type DocumentationMetadata = {
  audience: DocumentationAudience
  locale: ExternalDocumentationLocale | null
  slug: string
  title: string
  summary: string
  parentSlug?: string
  overviewTitle?: string
  navigationGroup: string
  order: number
  reviewedAt: string
  contentType: string
  topicIds: string[]
  workflowIds: string[]
  taskKeywords: string[]
  aliases: string[]
  applicableRoles: string[]
  relatedGuideIds: string[]
  publicationStatus: 'published' | 'draft'
  sourcePath: string
}

export type DocumentationTaxonomy = Record<
  'topics' | 'workflows' | 'navigationGroups' | 'contentTypes' | 'roles',
  Record<string, Record<ExternalDocumentationLocale, string>>
>

// The build validates this data-only catalog before producing either application.
export const documentationCatalog = catalog as {
  schemaVersion: number
  taxonomy: DocumentationTaxonomy
  guides: DocumentationMetadata[]
}
