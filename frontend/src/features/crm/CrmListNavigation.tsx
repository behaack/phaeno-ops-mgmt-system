import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { RecordPagination } from '#/components/RecordPagination'
import { BackLink } from '#/components/ui/back-link'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export type CrmNavigationSearch = { search?: string; requestId?: string; taskId?: string; page?: number; includeInactive?: boolean; status?: string; pipelineId?: string; stageId?: string; board?: boolean; overdue?: boolean; dueSoon?: boolean; needsNextAction?: boolean; stale?: boolean; section?: string; returnTo?: 'data-provisioning' }
export function validateCrmNavigationSearch(input: Record<string, unknown>): CrmNavigationSearch {
  const result: CrmNavigationSearch = {}
  for (const key of ['search', 'status', 'pipelineId', 'stageId', 'section', 'requestId', 'taskId'] as const) if (typeof input[key] === 'string' && input[key]) result[key] = input[key]
  for (const key of ['includeInactive', 'board', 'overdue', 'dueSoon', 'needsNextAction', 'stale'] as const) if (typeof input[key] === 'boolean') result[key] = input[key]
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
          ...(key === 'overdue' && resolved === true ? { dueSoon: false } : {}),
          ...(key === 'dueSoon' && resolved === true ? { overdue: false } : {}),
          ...(key === 'section' ? { requestId: undefined } : {}),
          ...(['search', 'status', 'includeInactive', 'pipelineId', 'stageId', 'overdue', 'dueSoon', 'needsNextAction', 'stale'].includes(key) ? { page: 1 } : {}),
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

export function CrmListPagination({ result, page, onPageChange, busy }: { result?: { totalCount: number; pageSize: number }; page: number; onPageChange: (page: number) => void; busy?: boolean }) { return <RecordPagination data={{totalCount:result?.totalCount ?? 0,page,pageSize:result?.pageSize ?? 25}} busy={Boolean(busy)} onPage={onPageChange} label="CRM record pages" /> }

export function CrmClearFilters({ ignoreStageSelection = false, label = "Clear all", keepVisible = false }: { ignoreStageSelection?: boolean; label?: string; keepVisible?: boolean }) {
  const search = useRouterState({ select: state => state.location.search }) as CrmNavigationSearch
  const navigate = useNavigate()
  const hasFilters = Boolean(search.search || search.requestId || search.taskId || search.status || search.includeInactive || (!ignoreStageSelection && search.stageId) || search.overdue || search.dueSoon || search.needsNextAction || search.stale || (search.page && search.page > 1))
  if (!hasFilters && !keepVisible) return null
  return <ClearFiltersButton label={label === "Clear all" ? undefined : label} disabled={!hasFilters} onClick={() => void navigate({ to: '.', search: { pipelineId: search.pipelineId, board: search.board, section: search.section, returnTo: search.returnTo }, replace: true, resetScroll: false })} />
}

export function CrmProvisioningReturn() {
  const [returnTo] = useCrmState<string>('returnTo', '')
  return returnTo === 'data-provisioning' ? <BackLink asChild><Link to="/data-provisioning" search={{ section: 'grants' }}>Return to pending data assignment</Link></BackLink> : null
}
