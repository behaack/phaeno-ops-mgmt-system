import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText } from '#/features/customer-i18n/customer-text'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Field } from '#/components/ui/field'
import { Checkbox } from '#/components/ui/checkbox'
import { ListToolbar } from '#/components/ui/record-list'

export type OrderListFilterState = {
  status: string
  createdFrom: string
  createdTo: string
  submittedByMe: boolean
}

export function OrderListFilters({ idPrefix, value, statuses, onChange, statusLabel = 'Status' }: {
  statusLabel?: string
  idPrefix: string
  value: OrderListFilterState
  statuses: Array<{ value: string; label: string }>
  onChange: (value: OrderListFilterState) => void
}) {


  return <ListToolbar className="mt-4">
    <Field><Label htmlFor={`${idPrefix}-status`}>{statusLabel}</Label><NativeSelect id={`${idPrefix}-status`} value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })}><option value=""><CustomerText message="m_8ee57323a6f2" /></option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</NativeSelect></Field>
    <Field><Label htmlFor={`${idPrefix}-from`}><CustomerText message="m_afe7b2f591f1" /></Label><Input id={`${idPrefix}-from`} type="date" value={value.createdFrom} onChange={(event) => onChange({ ...value, createdFrom: event.target.value })} /></Field>
    <Field><Label htmlFor={`${idPrefix}-to`}><CustomerText message="m_fa46c51d5c1a" /></Label><Input id={`${idPrefix}-to`} type="date" value={value.createdTo} onChange={(event) => onChange({ ...value, createdTo: event.target.value })} /></Field>
    <Label className="min-h-8"><Checkbox checked={value.submittedByMe} onCheckedChange={checked => onChange({ ...value, submittedByMe: checked === true })} /><CustomerText message="m_70113cebd4b1" /></Label>
  </ListToolbar>
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
