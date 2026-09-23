import { useId } from 'react'
import type { FieldErrors } from 'react-hook-form'
import { FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { localTimeOccurrences, type StepTimingValues } from './step-performance'
import { PerformerPicker } from './PerformerPicker'

const selectClass = 'h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring'
export function StepTimingFields({ value, onChange, onBlur, inputRef, errors, shared = false, preview = false, allowOnBehalf = true }: {
  value: StepTimingValues; onChange: (value: StepTimingValues) => void; onBlur: () => void
  inputRef: (element: HTMLSelectElement | null) => void; errors?: FieldErrors<StepTimingValues>; shared?: boolean; preview?: boolean; allowOnBehalf?: boolean
}) {
  const id = useId()
  const choices = value.mode === 'earlier' ? localTimeOccurrences(value.localTime) : []
  return <fieldset className="space-y-3 rounded-lg border p-3">
    <legend className="px-1 text-sm font-medium">When the work happened</legend>
    <div className="space-y-1.5"><Label htmlFor={`${id}-who`}>Performed by</Label><select id={`${id}-who`} className={selectClass} value={value.otherPerformer ? 'other' : 'self'} onChange={e => onChange({ ...value, otherPerformer: e.target.value === 'other', performerId: '' })}><option value="self">Me — personally performed</option>{allowOnBehalf ? <option value="other">Another staff member — requires supervisor review</option> : null}</select></div>
    {value.otherPerformer ? <>{preview ? <div className="space-y-1.5"><Label htmlFor={`${id}-performer`}><RequiredFieldName>Actual performer</RequiredFieldName></Label><select id={`${id}-performer`} className={selectClass} value={value.performerId ?? ''} onChange={event => onChange({ ...value, performerId: event.target.value })}><option value="">Choose a fictional performer</option><option value="preview-performer">Example operator (preview only)</option></select><FieldError>{errors?.performerId?.message}</FieldError></div> : <PerformerPicker id={`${id}-performer`} value={value.performerId ?? ''} onChange={performerId => onChange({ ...value, performerId })} error={errors?.performerId?.message} />}<p className="text-xs text-muted-foreground">The named performer and time remain unverified until a different supervisor approves this entry.</p></> : null}
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-mode`}><RequiredFieldName>Performed time</RequiredFieldName></Label>
      <FieldDescription id={`${id}-help`}>Choose Earlier if the work was completed before this entry. {shared ? 'The selected performer and time apply to every included tube.' : value.otherPerformer ? 'You remain identified as the person recording this entry.' : 'Your personal confirmation identifies you as the performer.'}</FieldDescription>
      <select id={`${id}-mode`} ref={inputRef} className={selectClass} value={value.mode} onBlur={onBlur} aria-describedby={`${id}-help`} onChange={e => onChange({ ...value, mode: e.target.value as StepTimingValues['mode'] })}>
        <option value="now">Now — use the time this record is saved</option><option value="earlier">Earlier — enter the actual time</option>
      </select>
    </div>
    {value.mode === 'earlier' ? <>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-time`}><RequiredFieldName>Actual date and time</RequiredFieldName></Label>
        <FieldDescription id={`${id}-time-help`}>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}. Recorded to the minute.</FieldDescription>
        <Input id={`${id}-time`} type="datetime-local" step={60} required defaultValue={value.localTime} onBlur={onBlur} onChange={e => onChange({ ...value, localTime: e.target.value, occurrence: '' })} aria-invalid={Boolean(errors?.localTime)} aria-describedby={`${id}-time-help ${id}-time-error`} />
        <FieldError id={`${id}-time-error`}>{errors?.localTime?.message}</FieldError>
      </div>
      {choices.length > 1 ? <div className="space-y-1.5">
        <Label htmlFor={`${id}-occurrence`}><RequiredFieldName>Which occurrence?</RequiredFieldName></Label>
        <FieldDescription id={`${id}-occurrence-help`}>The clock change repeats this time. Select the occurrence when the work happened.</FieldDescription>
        <select id={`${id}-occurrence`} className={selectClass} required value={value.occurrence} onBlur={onBlur} onChange={e => onChange({ ...value, occurrence: e.target.value })} aria-invalid={Boolean(errors?.occurrence)} aria-describedby={`${id}-occurrence-help ${id}-occurrence-error`}><option value="">Choose an occurrence</option>{choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <FieldError id={`${id}-occurrence-error`}>{errors?.occurrence?.message}</FieldError>
      </div> : null}
    </> : null}
    {value.mode === 'earlier' || value.otherPerformer ? <div className="space-y-1.5"><Label htmlFor={`${id}-reason`}><RequiredFieldName>{value.otherPerformer ? 'Entry reason' : 'Late-entry reason'}</RequiredFieldName></Label><Textarea id={`${id}-reason`} required maxLength={4000} value={value.reason} onBlur={onBlur} onChange={e => onChange({ ...value, reason: e.target.value })} aria-invalid={Boolean(errors?.reason)} aria-describedby={`${id}-reason-error`} /><FieldError id={`${id}-reason-error`}>{errors?.reason?.message}</FieldError></div> : null}
  </fieldset>
}
