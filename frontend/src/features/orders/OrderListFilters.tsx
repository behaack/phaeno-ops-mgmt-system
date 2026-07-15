import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export type OrderListFilterState = {
  status: string
  createdFrom: string
  createdTo: string
  submittedByMe: boolean
}

export function OrderListFilters({ idPrefix, value, statuses, onChange }: {
  idPrefix: string
  value: OrderListFilterState
  statuses: Array<{ value: string; label: string }>
  onChange: (value: OrderListFilterState) => void
}) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div><Label htmlFor={`${idPrefix}-status`}>Status</Label><select id={`${idPrefix}-status`} value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">All statuses</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>
    <div><Label htmlFor={`${idPrefix}-from`}>Created from</Label><Input id={`${idPrefix}-from`} type="date" className="mt-2" value={value.createdFrom} onChange={(event) => onChange({ ...value, createdFrom: event.target.value })} /></div>
    <div><Label htmlFor={`${idPrefix}-to`}>Created through</Label><Input id={`${idPrefix}-to`} type="date" className="mt-2" value={value.createdTo} onChange={(event) => onChange({ ...value, createdTo: event.target.value })} /></div>
    <label className="mt-7 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={value.submittedByMe} onChange={(event) => onChange({ ...value, submittedByMe: event.target.checked })} className="size-4 accent-primary" />Submitted by me</label>
  </div>
}

export function orderFilterParams(filter: OrderListFilterState, userId?: string | null) {
  return {
    status: filter.status || undefined,
    createdFrom: filter.createdFrom ? `${filter.createdFrom}T00:00:00.000Z` : undefined,
    createdTo: filter.createdTo ? `${nextDate(filter.createdTo)}T00:00:00.000Z` : undefined,
    submitterId: filter.submittedByMe ? userId ?? undefined : undefined,
  }
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
