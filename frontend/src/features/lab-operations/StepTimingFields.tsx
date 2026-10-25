import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { useId } from 'react'
import type { FieldErrors } from 'react-hook-form'
import { FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { localTimeOccurrences, type StepTimingValues } from './step-performance'
import { PerformerPicker } from './PerformerPicker'

const selectClass = "w-full"
export function StepTimingFields({ value, onChange, onBlur, inputRef, errors, shared = false, preview = false, allowOnBehalf = true, requirements }: {
  requirements?: { timingRequired?: boolean; minimumParticipants?: number }; value: StepTimingValues; onChange: (value: StepTimingValues) => void; onBlur: () => void
  inputRef: (element: HTMLSelectElement | null) => void; errors?: FieldErrors<StepTimingValues>; shared?: boolean; preview?: boolean; allowOnBehalf?: boolean
}) {
  const id = useId()
  const choices = value.mode === 'earlier' ? localTimeOccurrences(value.localTime) : []
  return <fieldset className="space-y-3 rounded-lg border p-3">
    <legend className="px-1 text-sm font-medium">When the work happened</legend>
    <PortalField ><Label htmlFor={`${id}-who`}>Performed by</Label><NativeSelect id={`${id}-who`} className={selectClass} value={value.otherPerformer ? 'other' : 'self'} onChange={e => onChange({ ...value, otherPerformer: e.target.value === 'other', performerId: '' })}><option value="self">Me — personally performed</option>{allowOnBehalf ? <option value="other">Another staff member — requires supervisor review</option> : null}</NativeSelect></PortalField>
    {value.otherPerformer ? <>{preview ? <PortalField ><Label htmlFor={`${id}-performer`}><RequiredFieldName>Actual performer</RequiredFieldName></Label><NativeSelect id={`${id}-performer`} className={selectClass} value={value.performerId ?? ''} onChange={event => onChange({ ...value, performerId: event.target.value })}><option value="">Choose a fictional performer</option><option value="preview-performer">Example operator (preview only)</option></NativeSelect><FieldError>{errors?.performerId?.message}</FieldError></PortalField> : <PerformerPicker id={`${id}-performer`} value={value.performerId ?? ''} onChange={performerId => onChange({ ...value, performerId })} error={errors?.performerId?.message} />}<p className="text-xs text-muted-foreground">The named performer and time remain unverified until a different supervisor approves this entry.</p></> : null}
    <PortalField >
      <Label htmlFor={`${id}-mode`}><RequiredFieldName>Performed time</RequiredFieldName></Label>
      <FieldDescription id={`${id}-help`}>Choose Earlier if the work was completed before this entry. {shared ? 'The selected performer and time apply to every included tube.' : value.otherPerformer ? 'You remain identified as the person recording this entry.' : 'Your personal confirmation identifies you as the performer.'}</FieldDescription>
      <NativeSelect id={`${id}-mode`} ref={inputRef} className={selectClass} value={value.mode} onBlur={onBlur} aria-describedby={`${id}-help`} onChange={e => onChange({ ...value, mode: e.target.value as StepTimingValues['mode'] })}>
        <option value="now">Now — use the time this record is saved</option><option value="earlier">Earlier — enter the actual time</option>
      </NativeSelect>
    </PortalField>
    {value.mode === 'earlier' ? <>
      <PortalField >
        <Label htmlFor={`${id}-time`}><RequiredFieldName>Actual date and time</RequiredFieldName></Label>
        <FieldDescription id={`${id}-time-help`}>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}. Recorded to the minute.</FieldDescription>
        <Input id={`${id}-time`} type="datetime-local" step={60} required defaultValue={value.localTime} onBlur={onBlur} onChange={e => onChange({ ...value, localTime: e.target.value, occurrence: '' })} aria-invalid={Boolean(errors?.localTime)} aria-describedby={`${id}-time-help ${id}-time-error`} />
        <FieldError id={`${id}-time-error`}>{errors?.localTime?.message}</FieldError>
      </PortalField>
      {choices.length > 1 ? <PortalField >
        <Label htmlFor={`${id}-occurrence`}><RequiredFieldName>Which occurrence?</RequiredFieldName></Label>
        <FieldDescription id={`${id}-occurrence-help`}>The clock change repeats this time. Select the occurrence when the work happened.</FieldDescription>
        <NativeSelect id={`${id}-occurrence`} className={selectClass} required value={value.occurrence} onBlur={onBlur} onChange={e => onChange({ ...value, occurrence: e.target.value })} aria-invalid={Boolean(errors?.occurrence)} aria-describedby={`${id}-occurrence-help ${id}-occurrence-error`}><option value="">Choose an occurrence</option>{choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</NativeSelect>
        <FieldError id={`${id}-occurrence-error`}>{errors?.occurrence?.message}</FieldError>
      </PortalField> : null}
    </> : null}
    <StepPerformanceExtras value={value} onChange={onChange} onBlur={onBlur} errors={errors} allowOnBehalf={allowOnBehalf} requirements={requirements} />
    {value.mode === 'earlier' || value.otherPerformer || value.participants?.length ? <PortalField ><Label htmlFor={`${id}-reason`}><RequiredFieldName>Entry / participant attribution reason</RequiredFieldName></Label><Textarea id={`${id}-reason`} required maxLength={4000} value={value.reason} onBlur={onBlur} onChange={e => onChange({ ...value, reason: e.target.value })} aria-invalid={Boolean(errors?.reason)} aria-describedby={`${id}-reason-error`} /><FieldError id={`${id}-reason-error`}>{errors?.reason?.message}</FieldError></PortalField> : null}
  </fieldset>
}

export function StepPerformanceExtras({ value, onChange, onBlur = () => {}, errors, allowOnBehalf = true, requirements }: { requirements?: { timingRequired?: boolean; minimumParticipants?: number }; value: StepTimingValues; onChange: (value: StepTimingValues) => void; onBlur?: () => void; errors?: FieldErrors<StepTimingValues>; allowOnBehalf?: boolean }) {
  const id = useId()
  return <details open={Boolean(value.intervalStart || value.intervalEnd || value.participants?.length || errors?.intervalStart || errors?.participants || requirements?.timingRequired || (requirements?.minimumParticipants ?? 1) > 1)}><summary className="cursor-pointer">Actual duration and additional participants</summary><div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">{requirements?.timingRequired ? 'This procedure requires start and end times. ' : ''}{(requirements?.minimumParticipants ?? 1) > 1 ? `At least ${requirements!.minimumParticipants} named people, including the primary performer, are required. ` : ''}Record only actual observations required by the approved procedure. Times use minute precision and explicit UTC offsets, for example 2026-10-24T09:15-07:00. Additional participants require independent supervisor review.</p>
      {(['intervalStart', 'intervalEnd'] as const).map(key => <PortalField key={key}><Label htmlFor={`${id}-${key}`}>{key === 'intervalStart' ? 'Actual step start' : 'Actual step end'}</Label><Input id={`${id}-${key}`} value={value[key] ?? ''} onBlur={onBlur} onChange={e => onChange({ ...value, [key]: e.target.value })} aria-invalid={Boolean(errors?.[key])} /><FieldError>{errors?.[key]?.message}</FieldError></PortalField>)}
      {(value.participants ?? []).map((person, index) => <div key={index} className="space-y-2 rounded border p-3">
        <PerformerPicker id={`${id}-participant-${index}`} value={person.userId} onChange={userId => onChange({ ...value, participants: value.participants!.map((p, i) => i === index ? { ...p, userId } : p) })} />
        <PortalField><Label htmlFor={`${id}-role-${index}`}><RequiredFieldName>Participant role in this step</RequiredFieldName></Label><Input id={`${id}-role-${index}`} maxLength={100} value={person.role} onChange={e => onChange({ ...value, participants: value.participants!.map((p, i) => i === index ? { ...p, role: e.target.value } : p) })} /></PortalField>
        <Button type="button" variant="outline" onClick={() => onChange({ ...value, participants: value.participants!.filter((_, i) => i !== index) })}>Remove participant</Button>
      </div>)}
      <FieldError>{errors?.participants?.message}</FieldError>
      {allowOnBehalf ? <Button type="button" variant="outline" disabled={(value.participants?.length ?? 0) >= 19} onClick={() => onChange({ ...value, participants: [...value.participants ?? [], { userId: '', role: '' }] })}>Add participant</Button> : null}
    </div></details>
}
