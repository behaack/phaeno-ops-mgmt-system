import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { Search } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { documentationCatalog } from './documentation-metadata'
import { getDocumentationEntries, getDocumentationSearchIdentity, type DocumentationAudience, type DocumentationEntry } from './documentation-registry'
import { getDocumentationMessages } from './documentation-localization'
import { documentationSearchParams, useDocumentationSearch, type DocumentationSearchParams } from './documentation-search'

const messages = getDocumentationMessages().search
const linkClass = 'cursor-pointer rounded-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const selectClass = 'h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function useSearchLocation() {
  return useRouterState({ select: state => ({ pathname: state.location.pathname, params: documentationSearchParams(state.location.search) }) })
}

export function DocumentationSearchBar({ audience }: { audience: DocumentationAudience }) {
  const { pathname, params } = useSearchLocation()
  const navigate = useNavigate()
  const [input, setInput] = useState(params.q)
  const [interactive, setInteractive] = useState(false)
  useEffect(() => { setInteractive(true) }, [])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [openFilters, setOpenFilters] = useState(Boolean(params.topic || params.workflow || params.contentType))
  useEffect(() => { clearTimeout(timer.current); setInput(params.q) }, [params.q, pathname])
  useEffect(() => () => clearTimeout(timer.current), [])
  const entries = getDocumentationEntries(audience)
  const facets = useDocumentationSearch(audience, params).data?.metadata
  const go = (patch: Partial<DocumentationSearchParams>, replace = true) => {
    clearTimeout(timer.current)
    void navigate({ to: '/docs/search', search: { ...params, q: input, ...patch }, replace: replace && pathname === '/docs/search', resetScroll: false })
  }
  const activeFilters = Boolean(params.topic || params.workflow || params.contentType)
  return (
    <section aria-label={messages.label} className="mb-7 border-b pb-5">
      <form role="search" onSubmit={event => { event.preventDefault(); go({ q: input, page: 1 }) }}>
        <Label htmlFor="documentation-query" className="mb-2 block pl-10 lg:pl-0">{messages.label}</Label>
        <div className="flex items-center gap-2">
          <Input id="documentation-query" type="search" disabled={!interactive} maxLength={200} value={input} placeholder={messages.placeholder}
            onChange={event => {
              const value = event.target.value
              setInput(value)
              clearTimeout(timer.current)
              timer.current = setTimeout(() => go({ q: value, page: 1 }), 300)
            }} aria-describedby="documentation-search-hint" />
          <Button type="submit" size="icon" aria-label={messages.submit} className="cursor-pointer shrink-0"><Search aria-hidden="true" className="size-4" /></Button>
          <Button type="button" variant="outline" className="cursor-pointer shrink-0" aria-expanded={openFilters} aria-controls="documentation-search-filters" onClick={() => setOpenFilters(!openFilters)}>{messages.filters}</Button>
        </div>
        <p id="documentation-search-hint" className="mt-2 text-xs text-muted-foreground">{messages.hint}</p>
        {openFilters ? <div id="documentation-search-filters" className="mt-4 grid gap-3 sm:grid-cols-3">
          {([
            ['topic', messages.topic, 'topics', [...new Set(entries.flatMap(entry => entry.topicIds))]],
            ['workflow', messages.workflow, 'workflows', [...new Set(entries.flatMap(entry => entry.workflowIds))]],
            ['contentType', messages.contentType, 'contentTypes', [...new Set(entries.map(entry => entry.contentType))]],
          ] as const).map(([field, label, taxonomy, ids]) => <div key={field}>
            <Label htmlFor={`documentation-${field}`} className="mb-2 block">{label}</Label>
            <select id={`documentation-${field}`} className={selectClass} value={params[field] ?? ''} onChange={event => go({ [field]: event.target.value || undefined, page: 1 })}>
              <option value="">{messages.all}</option>
              {[...ids].sort().map(id => {
                const count = facets?.[taxonomy].find(facet => facet.id === id)?.count ?? 0
                return <option key={id} value={id}>{documentationCatalog.taxonomy[taxonomy][id]['en-US']}{facets ? ` (${count})` : ''}</option>
              })}
            </select>
          </div>)}
        </div> : null}
        {activeFilters ? <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {[['topic', 'topics'], ['workflow', 'workflows'], ['contentType', 'contentTypes']].map(([field, group]) => {
            const value = params[field as keyof DocumentationSearchParams]
            return typeof value === 'string' && value ? <span key={field} className="rounded bg-muted px-2 py-1">{documentationCatalog.taxonomy[group as 'topics'][value]?.['en-US'] ?? messages.unknownFilter}</span> : null
          })}
          <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => go({ topic: undefined, workflow: undefined, contentType: undefined, page: 1 })}>{messages.clearFilters}</Button>
        </div> : null}
      </form>
    </section>
  )
}

export function DocumentationSearchPage() {
  const { session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const kind = getSelectedMembership(session, selectedOrganizationId)?.organizationKind
  const audience = kind?.toLowerCase() as DocumentationAudience | undefined
  if (!audience || !['customer', 'prospect', 'partner', 'phaeno'].includes(audience)) return null
  return <DocumentationSearchResults key={`${selectedOrganizationId}:${selectedDepartmentId}:${audience}`} audience={audience} />
}

function DocumentationSearchResults({ audience }: { audience: DocumentationAudience }) {
  const { params } = useSearchLocation()
  const query = useDocumentationSearch(audience, params)
  const navigate = useNavigate()
  const code = isAxiosError(query.error) ? query.error.response?.data?.error?.code : query.error?.message
  const mismatch = code === 'documentation_corpus_changed'
  const invalid = code === 'documentation_query_invalid'
  const denied = ['active_actor_required', 'documentation_scope_unavailable', 'selected_organization_required'].includes(code)
  const results = mismatch || denied ? undefined : query.data
  const searchStarted = params.q.trim().length >= 2 || (!params.q.trim().length && Boolean(params.topic || params.workflow || params.contentType))
  return (
    <section aria-labelledby="documentation-results-title" className="max-w-4xl">
      <h1 id="documentation-results-title" className="text-2xl font-semibold">{messages.results}</h1>
      <p role="status" aria-live="polite" className="my-4 text-sm text-muted-foreground">
        {query.isFetching ? messages.loading : results ? messages.count(results.metadata.total) : !searchStarted ? messages.initial : ''}
      </p>
      {query.isError ? <Alert className="mb-5" variant="destructive"><AlertDescription>
        <p>{mismatch ? messages.changed : invalid ? messages.invalid : denied ? messages.denied : messages.unavailable}</p>
        {!invalid && !denied ? <Button type="button" variant="outline" className="mt-3 cursor-pointer" onClick={() => mismatch ? window.location.reload() : void query.refetch()}>{mismatch ? messages.refresh : messages.retry}</Button> : null}
      </AlertDescription></Alert> : null}
      {results?.metadata.total === 0 ? <p className="py-4">{messages.noMatches}</p> : null}
      {results && results.metadata.total > 0 ? <>
        <ul className="m-0 divide-y p-0">
          {results.items.map(item => <li key={item.id} className="list-none py-5">
            <div className="mb-1 text-xs text-muted-foreground">{item.contentType} · {item.topics.join(', ')}</div>
            <h2 className="text-lg font-medium"><Link className={linkClass} to="/docs/$audience/$slug" params={{ audience, slug: item.slug }} hash={item.anchor}>{item.title}</Link></h2>
            {item.heading && item.heading !== item.title ? <p className="mt-1 text-sm font-medium">{item.heading}</p> : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.excerpt.map((part, i) => part.match ? <mark key={i} className="rounded bg-primary/15 text-foreground">{part.text}</mark> : <span key={i}>{part.text}</span>)}</p>
          </li>)}
        </ul>
        <nav aria-label={messages.pagination} className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" className="cursor-pointer" disabled={params.page <= 1} onClick={() => void navigate({ to: '/docs/search', search: { ...params, page: params.page - 1 }, resetScroll: false })}>{messages.previous}</Button>
          <span className="text-sm">{messages.page(params.page, Math.max(1, Math.ceil(results.metadata.total / results.metadata.pageSize)))}</span>
          <Button variant="outline" className="cursor-pointer" disabled={params.page * results.metadata.pageSize >= results.metadata.total} onClick={() => void navigate({ to: '/docs/search', search: { ...params, page: params.page + 1 }, resetScroll: false })}>{messages.next}</Button>
        </nav>
      </> : null}
      <Link to="/docs" className={`${linkClass} mt-6 inline-block`}>{messages.browseAll}</Link>
    </section>
  )
}

export function DocumentationTopics({ audience }: { audience: DocumentationAudience }) {
  const entries = getDocumentationEntries(audience)
  return <section aria-labelledby="documentation-browse-title" className="mb-7">
    <h2 id="documentation-browse-title" className="mb-3 text-lg font-semibold">{messages.browse}</h2>
    <div className="flex flex-wrap gap-x-5 gap-y-3">
      {[...new Set(entries.flatMap(entry => entry.topicIds))].map(id => <Link className={linkClass} key={id} to="/docs/search" search={{ q: '', topic: id, page: 1 }}>{documentationCatalog.taxonomy.topics[id]['en-US']}</Link>)}
    </div>
  </section>
}

export function DocumentationRelatedGuides({ entry }: { entry: DocumentationEntry }) {
  const related = getDocumentationEntries(entry.audience).filter(candidate => entry.relatedGuideIds.includes(getDocumentationSearchIdentity(candidate)))
  return <section className="mt-7 border-t pt-5" aria-label={messages.related}>
    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {entry.workflowIds.map(id => <Link className={linkClass} key={id} to="/docs/search" search={{ q: '', workflow: id, page: 1 }}>{documentationCatalog.taxonomy.workflows[id]['en-US']}</Link>)}
    </div>
    {related.length ? <><h2 className="text-lg font-semibold">{messages.related}</h2><ul className="mt-3 space-y-2">
      {related.map(guide => <li key={guide.slug}><Link className={linkClass} to="/docs/$audience/$slug" params={{ audience: guide.audience, slug: guide.slug }}>{guide.title}</Link></li>)}
    </ul></> : null}
  </section>
}
