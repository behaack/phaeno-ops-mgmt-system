import { useCustomerText } from '#/features/customer-i18n/customer-text'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { PaginationFooter } from './ui/pagination-footer'

export type RecordListSearch = { listPage?: number; listSearch?: string; listStatus?: string }
export function parseRecordListSearch(search: Record<string, unknown>): RecordListSearch {
  return { listPage: Number.isSafeInteger(Number(search.listPage)) && Number(search.listPage) > 0 ? Math.min(Number(search.listPage), 100000) : 1,
    listSearch: typeof search.listSearch === 'string' ? search.listSearch.slice(0, 255) : '', listStatus: typeof search.listStatus === 'string' ? search.listStatus : '' }
}
export function useRecordListState(prefix = 'list') {
  const state = useRouterState({ select: router => {
    const search = router.location.search as Record<string, unknown>
    return parseRecordListSearch({ listPage: search[`${prefix}Page`], listSearch: search[`${prefix}Search`], listStatus: search[`${prefix}Status`] })
  } })
  const navigate = useNavigate()
  const change = (values: RecordListSearch) => void navigate({ to: '.', search: previous => ({ ...previous,
    ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace(/^list/, prefix), value])),
  }), replace: true, resetScroll: false })
  return { page: state.listPage ?? 1, search: state.listSearch ?? '', status: state.listStatus ?? '', change }
}
export function RecordPagination({ data, busy, onPage, label }: { data?: { totalCount: number; page: number; pageSize: number }; busy: boolean; onPage: (page: number) => void; label?: string }) {
  const __customerText = useCustomerText()

  if (!data) return null
  const pages = Math.max(1, Math.ceil(data.totalCount / data.pageSize))
  return <PaginationFooter label={label ?? __customerText('m_7ba552e96e1d')}
    summary={__customerText(data.totalCount === 1 ? 'pagination_one' : 'pagination_many', { p0: data.totalCount, p1: data.page, p2: pages })}
    busy={busy} hasPrevious={data.page > 1} hasNext={data.page < pages}
    onFirst={data.page > pages ? ()=>onPage(1) : undefined} onPrevious={()=>onPage(data.page-1)} onNext={()=>onPage(data.page+1)} />
}
