export type ResearchSearch = { projectSearch: string; projectPage: number; experimentSearch: string; experimentPage: number; status: string; projectId: string; fromProjectId?: string; entryPage?: number }
const page = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Math.min(Number(value), 1000000) : 1
export function parseResearchSearch(search: Record<string, unknown>): ResearchSearch {
  return { projectSearch: typeof search.projectSearch === 'string' ? search.projectSearch.slice(0, 255) : '', projectPage: page(search.projectPage),
    experimentSearch: typeof search.experimentSearch === 'string' ? search.experimentSearch.slice(0, 255) : '', experimentPage: page(search.experimentPage),
    status: search.status === 'Active' || search.status === 'Completed' ? search.status : '',
    projectId: typeof search.projectId === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(search.projectId) ? search.projectId : '',
    ...(typeof search.fromProjectId === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(search.fromProjectId) ? { fromProjectId: search.fromProjectId } : {}),
    ...(search.entryPage !== undefined ? { entryPage: page(search.entryPage) } : {}) }
}
