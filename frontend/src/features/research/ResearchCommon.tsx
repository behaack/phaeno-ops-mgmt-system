import { formatDisplayTimestamp } from '#/lib/display-format'
import { PageHeader } from '#/components/ui/page-header'
import { ErrorState, LoadingState } from '#/components/ui/content-state'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouterState, useNavigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Field } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { parseResearchSearch, type ResearchSearch } from './research-search'
import { researchError, useResearchQuery } from './research-api'
import { usePhaenoSession } from '#/features/auth/session-context'

export function ResearchFeedback({ error }: { error: unknown }) {
  return error ? <ErrorState title="R&D request failed">{researchError(error)}</ErrorState> : null
}
export function ResearchLoading({ loading }: { loading: boolean }) { return loading ? <LoadingState label="Loading research records…" /> : null }
export function ResearchHeader({ title, description, status, children }: { title: string; description?: string; status?: ReactNode; children?: ReactNode }) {
  return <PageHeader title={title} description={description} status={status} actions={children} />
}
export function useResearchSearch() {
  const search = useRouterState({ select: s => parseResearchSearch(s.location.search) })
  const navigate = useNavigate()
  return { search, change: (values: Partial<ResearchSearch>) => void navigate({ to: '.', search: { ...search, ...values }, replace: true, resetScroll: false }) }
}
export function useResearchListScroll(list: string, filters: object, ready: boolean) {
  const { selectedOrganizationId } = usePhaenoSession()
  const key = `phaeno:research-scroll:${selectedOrganizationId}:${list}:${JSON.stringify(filters)}`
  const restored = useRef('')
  useEffect(() => {
    if (!ready || restored.current === key) return
    restored.current = key
    let position: number
    try { const value = sessionStorage.getItem(key); if (value === null) return; position = Number(value) } catch { return }
    if (!Number.isFinite(position) || position < 0) return
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => window.scrollTo({ top: position, behavior: 'instant' })) })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [key, ready])
  return () => { try { sessionStorage.setItem(key, String(window.scrollY)) } catch { /* Presentation persistence is optional. */ } }
}
export function ResearchSearchInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])
  useEffect(() => { if (text === value) return; const timer = setTimeout(() => onChange(text), 300); return () => clearTimeout(timer) }, [text, value, onChange])
  return <Field><Label htmlFor="research-search">{label}</Label><Input id="research-search" type="search" maxLength={255} value={text} onChange={e => setText(e.target.value)} /></Field>
}
export function ResearchProjectSelect({ value, onChange, required = false, disabled = false, id = 'research-project', invalid, describedBy }: { value: string; onChange: (id: string) => void; required?: boolean; disabled?: boolean; id?: string; invalid?: boolean; describedBy?: string }) {
  const query = useResearchQuery<{ id: string; name: string }[]>('projects/choices')
  return <div className="space-y-2"><SearchableSelect id={id} aria-invalid={invalid} aria-describedby={describedBy} options={(query.data ?? []).map(p => ({ value: p.id, label: p.name }))}
    value={value} onValueChange={onChange} placeholder="Find a project" emptyMessage={query.isLoading ? 'Loading projects…' : 'Create a project first.'}
    resultsLabel="Research projects" selectionMessage="Choose a research project." noMatchMessage="No matching research projects."
    narrowMessage={count => `Keep typing to narrow ${count} projects.`} required={required} disabled={disabled || query.isLoading}
    clearable={!required} clearLabel="Clear project filter" portal /><ResearchFeedback error={query.error} />
    {query.isError ? <Button variant="outline" type="button" onClick={() => void query.refetch()}>Retry projects</Button> : null}</div>
}
export function formatResearchTime(value: string) { return formatDisplayTimestamp(value, { seconds: true }) }
export const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
