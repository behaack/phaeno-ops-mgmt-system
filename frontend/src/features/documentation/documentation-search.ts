import { useQuery } from '@tanstack/react-query'
import { api } from '#/api/client'
import { usePhaenoSession } from '#/features/auth/session-context'
import type { DocumentationAudience } from './documentation-registry'
import version from './documentation-version.json'

export type DocumentationSearchParams = {
  q: string
  topic?: string
  workflow?: string
  contentType?: string
  page: number
}
export type DocumentationFacet = { id: string; label: string; count: number }
export type DocumentationSearchResponse = {
  items: Array<{
    id: string; slug: string; route: string; title: string; heading: string; anchor: string
    excerpt: Array<{ text: string; match: boolean }>
    contentType: string; topics: string[]; workflows: string[]; reviewedAt: string
  }>
  metadata: {
    corpusHash: string; total: number; page: number; pageSize: number
    topics: DocumentationFacet[]; workflows: DocumentationFacet[]; contentTypes: DocumentationFacet[]
  }
}

export function documentationSearchParams(raw: Record<string, unknown>): DocumentationSearchParams {
  const filter = (value: unknown) => typeof value === 'string' && value.length <= 80 && /^[a-z0-9-]+$/.test(value) ? value : undefined
  const page = Number(raw.page)
  return {
    q: typeof raw.q === 'string' ? raw.q.slice(0, 200) : '',
    topic: filter(raw.topic), workflow: filter(raw.workflow), contentType: filter(raw.contentType),
    page: Number.isInteger(page) && page >= 1 && page <= 10000 ? page : 1,
  }
}

export function useDocumentationSearch(audience: DocumentationAudience, params: DocumentationSearchParams) {
  const { selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const q = params.q.trim()
  return useQuery({
    queryKey: ['documentation-search', selectedOrganizationId, selectedDepartmentId, audience, 'en-US', version.corpusHash, params],
    enabled: Boolean(selectedOrganizationId) && (q.length >= 2 || (!q.length && Boolean(params.topic || params.workflow || params.contentType))),
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await api.get<{ success: boolean; data: DocumentationSearchResponse }>('/documentation/search', {
        signal,
        params: { ...params, q, locale: 'en-US', pageSize: 10, corpusVersion: version.corpusHash },
        headers: { 'X-Organization-Id': selectedOrganizationId!, ...(selectedDepartmentId ? { 'X-Department-Id': selectedDepartmentId } : {}) },
      })
      if (!response.data.success || response.data.data.metadata.corpusHash !== version.corpusHash) throw new Error('documentation_corpus_changed')
      return response.data.data
    },
  })
}
