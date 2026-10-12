import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Button } from './ui/button'

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
  return <nav aria-label={label ?? __customerText('m_7ba552e96e1d')} className="flex flex-wrap items-center justify-between gap-3 py-3">
    <p className="text-sm text-muted-foreground">{__customerText(data.totalCount === 1 ? 'pagination_one' : 'pagination_many', { p0: data.totalCount, p1: data.page, p2: pages })}</p>
    <div className="flex gap-2">{data.page > pages ? <Button variant="outline" disabled={busy} onClick={() => onPage(1)}><CustomerText message="m_0bdbb750609c" /></Button> : null}
      <Button variant="outline" disabled={busy || data.page <= 1} onClick={() => onPage(data.page - 1)}><CustomerText message="m_a57b08a480b8" /></Button>
      <Button variant="outline" disabled={busy || data.page >= pages} onClick={() => onPage(data.page + 1)}><CustomerText message="m_1ff57a29d7c9" /></Button>
    </div>
  </nav>
}
