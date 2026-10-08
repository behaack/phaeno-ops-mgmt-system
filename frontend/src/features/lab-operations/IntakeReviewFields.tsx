import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { getLabIntakeReasons } from '#/api/lab-operations'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'

export type IntakeReviewValues = { disposition: string; reasonCode: string; notes: string }
export const defaultIntakeReview: IntakeReviewValues = { disposition: 'Accepted', reasonCode: '', notes: '' }

export function IntakeReviewFields({ value, onChange, previousDisposition, disabled = false, correction = false, exceptionsOnly = false }: {
  value: IntakeReviewValues
  onChange: (value: IntakeReviewValues) => void
  previousDisposition?: string | null
  disabled?: boolean
  correction?: boolean
  exceptionsOnly?: boolean
}) {
  const id = useId()
  const reasons = useQuery({ queryKey: ['lab-intake-reasons'], queryFn: getLabIntakeReasons })
  const exception = value.disposition !== 'Accepted'
  const resolving = !exception && ['OnHold', 'Rejected'].includes(previousDisposition ?? '')
  const notesRequired = correction || resolving || (exception && value.reasonCode === 'other')
  const control = 'mt-2 h-9 w-full cursor-pointer rounded-lg border bg-background px-3 text-sm'
  return <div className="space-y-4 sm:col-span-2">
    <div>
      <Label htmlFor={`${id}-decision`}><RequiredFieldName>Tube intake</RequiredFieldName></Label>
      <select id={`${id}-decision`} className={control} value={value.disposition} disabled={disabled} required onChange={event => onChange({ ...value, disposition: event.target.value, reasonCode: '', notes: '' })}>
        {!exceptionsOnly ? <option value="Accepted">Accepted</option> : null}<option value="OnHold">On hold</option><option value="Rejected">Rejected</option>
      </select>
      <p className="mt-2 text-xs text-muted-foreground">{exceptionsOnly ? 'On hold is for a retained tube awaiting an internal intake decision. Rejected tubes cannot be used for processing.' : 'Accepted means this tube passed receipt checks and is eligible for processing. Laboratory QC is recorded separately.'}</p>
    </div>
    {exception ? <div>
      <Label htmlFor={`${id}-reason`}><RequiredFieldName>Intake reason</RequiredFieldName></Label>
      <select id={`${id}-reason`} className={control} required disabled={disabled} value={value.reasonCode} onChange={event => onChange({ ...value, reasonCode: event.target.value })}>
        <option value="">Choose a reason</option>{reasons.data?.map(reason => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
      </select>
      {reasons.isPending ? <p role="status">Loading reasons…</p> : null}
      {reasons.error ? <p role="alert">Reasons could not be loaded. <button type="button" className="cursor-pointer underline" onClick={() => void reasons.refetch()}>Try again</button></p> : null}
    </div> : null}
    <div>
      <Label htmlFor={`${id}-notes`}>{notesRequired ? <RequiredFieldName>{resolving ? 'Resolution note' : 'Explanation'}</RequiredFieldName> : 'Notes (optional)'}</Label>
      <textarea id={`${id}-notes`} className="mt-2 min-h-20 w-full rounded-lg border bg-background p-3 text-sm" required={notesRequired} maxLength={2000} disabled={disabled} value={value.notes} onChange={event => onChange({ ...value, notes: event.target.value })} />
    </div>
  </div>
}
