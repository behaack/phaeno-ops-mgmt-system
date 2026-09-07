import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Button } from '#/components/ui/button'

export type CrmNavigationSearch = { search?: string; requestId?: string; page?: number; includeInactive?: boolean; status?: string; pipelineId?: string; stageId?: string; board?: boolean; overdue?: boolean; section?: string; returnTo?: 'data-provisioning' }
export function validateCrmNavigationSearch(input: Record<string, unknown>): CrmNavigationSearch {
  const result: CrmNavigationSearch = {}
  for (const key of ['search', 'status', 'pipelineId', 'stageId', 'section', 'requestId'] as const) if (typeof input[key] === 'string' && input[key]) result[key] = input[key]
  for (const key of ['includeInactive', 'board', 'overdue'] as const) if (typeof input[key] === 'boolean') result[key] = input[key]
  if (Number.isSafeInteger(Number(input.page)) && Number(input.page) > 0) result.page = Number(input.page)
  if (input.returnTo === 'data-provisioning') result.returnTo = input.returnTo
  return result
}

export function useCrmState<T extends string | number | boolean>(key: keyof CrmNavigationSearch, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const search = useRouterState({ select: state => state.location.search }) as CrmNavigationSearch
  const navigate = useNavigate()
  const value = (search[key] ?? initial) as T
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(next => {
    void navigate({
      to: '.',
      search: previous => {
        const current = ((previous as CrmNavigationSearch)[key] ?? initial) as T
        const resolved = typeof next === 'function' ? next(current) : next
        return {
          ...previous,
          [key]: resolved,
          ...(key === 'section' ? { requestId: undefined } : {}),
          ...(['search', 'status', 'includeInactive', 'pipelineId', 'stageId', 'overdue'].includes(key) ? { page: 1 } : {}),
        }
      },
      replace: true,
      resetScroll: false,
    })
  }, [initial, key, navigate])
  return [value, setValue]
}

export function useCrmSearch(): [string, (value: string) => void, string, (value: string) => void] {
  const [search, setSearch] = useCrmState<string>('search', '')
  const [draft, setDraft] = useState(search)
  useEffect(() => { setDraft(search) }, [search])
  useEffect(() => {
    if (draft.trim() === search) return
    const timer = setTimeout(() => setSearch(draft.trim()), 250)
    return () => clearTimeout(timer)
  }, [draft, search, setSearch])
  return [draft, setDraft, search, setSearch]
}

export function CrmListPagination({ result, page, onPageChange, busy }: { result?: { totalCount: number; pageSize: number }; page: number; onPageChange: (page: number) => void; busy?: boolean }) {
  const pages = Math.max(1, Math.ceil((result?.totalCount ?? 0) / (result?.pageSize ?? 25)))
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p>{result?.totalCount ?? 0} records · Page {page} of {pages}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={busy || page >= pages} onClick={() => onPageChange(page + 1)}>Next</Button></div></div>
}

export function CrmClearFilters() {
  const search = useRouterState({ select: state => state.location.search }) as CrmNavigationSearch
  const navigate = useNavigate()
  if (!search.search && !search.requestId && !search.status && !search.includeInactive && !search.stageId && !search.overdue && !(search.page && search.page > 1)) return null
  return <Button type="button" size="sm" variant="ghost" onClick={() => void navigate({ to: '.', search: { pipelineId: search.pipelineId, board: search.board, section: search.section, returnTo: search.returnTo }, replace: true, resetScroll: false })}>Clear all</Button>
}

export function CrmProvisioningReturn() {
  const [returnTo] = useCrmState<string>('returnTo', '')
  return returnTo === 'data-provisioning' ? <Button asChild variant="outline"><Link to="/data-provisioning" search={{ section: 'grants' }}>Return to pending data assignment</Link></Button> : null
}
