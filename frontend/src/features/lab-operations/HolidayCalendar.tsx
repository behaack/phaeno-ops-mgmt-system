import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { getForecastConfiguration, saveForecastCalendar, type ForecastCalendar } from '#/api/lab-forecasts'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationField, PreparationPanel, prepRowClass } from './preparation-ui'
import { parseJobDate } from './job-deadlines'
import { formatCalendarDate } from './calendar-date'

function Failure({ error }: { error: unknown }) { return error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(error, 'The request could not be completed. Reload and try again.')}</p> : null }

export function HolidayCalendar() {
  const query = useQuery({ queryKey: ['lab-forecast-configuration'], queryFn: getForecastConfiguration })
  const [editing, setEditing] = useState(false)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  if (query.isPending) return <p role="status">Loading holiday calendar…</p>
  if (query.isError) return <><Failure error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Reload</Button></>
  const { calendars, canConfigure } = query.data
  const calendar = calendars[0]
  const holidays = calendar?.holidays.filter(h => h.date.startsWith(year)).sort((a, b) => a.date.localeCompare(b.date)) ?? []
  return <>
    <PreparationPanel title="Holiday calendar" description="Business days are Monday–Friday, excluding these observed holidays and closure dates. Calendar-day stages count every day. Laboratory timezone: America/Los Angeles." actions={canConfigure ? <Button onClick={() => setEditing(true)}>{calendar ? 'Edit calendar' : <><Plus data-icon="inline-start" /> New calendar</>}</Button> : undefined} headerContent={calendar ? <>
      <p className="text-sm">Revision {calendar.revision} · Confirmed coverage: {formatCalendarDate(calendar.coverageFrom)} through {formatCalendarDate(calendar.coverageTo)}</p>
      {calendar.coverageTo < new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) ? <p role="status" className="text-sm text-destructive">Calendar coverage is expiring or has expired. Extend it and apply the updated timing policy to affected jobs.</p> : null}
      <div className="space-y-1"><Label htmlFor="holiday-year">Year</Label><Input id="holiday-year" type="number" min="1900" max="9998" value={year} onChange={e => setYear(e.target.value)} /></div>
    </> : undefined}>
      {calendar ? <>
        <ul className="space-y-2">{holidays.map(h => <li key={h.date} className={`${prepRowClass} flex flex-wrap justify-between gap-3`}><span>{h.name}</span><span className="whitespace-nowrap">{formatCalendarDate(h.date)}</span></li>)}</ul>
        {!holidays.length ? <p className="text-sm text-muted-foreground">No excluded dates recorded for this year. Only dates within confirmed coverage may be used for forecasts.</p> : null}
      </> : <p className="text-sm">No calendar is configured. Record observed holidays and confirm the coverage period, even if it has no holidays.</p>}
    </PreparationPanel>
    {editing ? <CalendarDialog calendar={calendar} onClose={() => setEditing(false)} /> : null}
  </>
}

const dateSchema = z.string().refine(v => Boolean(parseJobDate(v)), 'Enter a complete date.')
const calendarSchema = z.object({ coverageFrom: dateSchema, coverageTo: dateSchema, reason: z.string().trim().min(1, 'Enter a reason.').max(2000), holidays: z.array(z.object({ date: dateSchema, name: z.string().trim().min(1, 'Enter a holiday name.').max(255) })).max(1000) })
  .superRefine((v, ctx) => {
    if (v.coverageFrom > v.coverageTo) ctx.addIssue({ code: 'custom', path: ['coverageTo'], message: 'Coverage must end on or after it begins.' })
    const dates = new Set<string>()
    v.holidays.forEach((h, i) => { if (dates.has(h.date) || h.date < v.coverageFrom || h.date > v.coverageTo) ctx.addIssue({ code: 'custom', path: ['holidays', i, 'date'], message: 'Use a unique date within coverage.' }); dates.add(h.date) })
  })
function CalendarDialog({ calendar, onClose }: { calendar?: ForecastCalendar; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<z.infer<typeof calendarSchema>>({ resolver: zodResolver(calendarSchema), defaultValues: { coverageFrom: calendar?.coverageFrom ?? `${new Date().getFullYear()}-01-01`, coverageTo: calendar?.coverageTo ?? `${new Date().getFullYear() + 1}-12-31`, reason: '', holidays: [...(calendar?.holidays ?? [])].sort((a, b) => a.date.localeCompare(b.date)) } })
  const rows = useFieldArray({ control: form.control, name: 'holidays' })
  const save = useMutation({ mutationFn: (v: z.infer<typeof calendarSchema>) => saveForecastCalendar({ ...v, previousId: calendar?.id ?? null }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['lab-forecast-configuration'] }); onClose() } })
  return <Dialog open onOpenChange={v => { if (!v && !save.isPending) onClose() }}><DialogContent className="sm:max-w-2xl"><form className="contents" noValidate onSubmit={form.handleSubmit(v => save.mutate(v))}>
    <DialogHeader><DialogTitle>{calendar ? 'Edit holiday calendar' : 'New holiday calendar'}</DialogTitle><DialogDescription>Confirm all observed closure dates within coverage. Saving creates a revision; update a workflow’s calendar and preview its application to change existing jobs.</DialogDescription></DialogHeader>
    <div className="max-h-[60vh] space-y-4 overflow-y-auto p-1"><Failure error={save.error} />
      <div className="grid gap-3 sm:grid-cols-2"><PreparationField id="coverage-from" label="Coverage from" required error={form.formState.errors.coverageFrom?.message}><Input id="coverage-from" type="date" {...form.register('coverageFrom')} /></PreparationField><PreparationField id="coverage-to" label="Coverage through" required error={form.formState.errors.coverageTo?.message}><Input id="coverage-to" type="date" {...form.register('coverageTo')} /></PreparationField></div>
      {rows.fields.map((row, i) => <div key={row.id} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"><PreparationField id={`holiday-name-${i}`} label="Holiday / closure" required error={form.formState.errors.holidays?.[i]?.name?.message}><Input id={`holiday-name-${i}`} {...form.register(`holidays.${i}.name`)} /></PreparationField><PreparationField id={`holiday-date-${i}`} label="Observed date" required error={form.formState.errors.holidays?.[i]?.date?.message}><Input id={`holiday-date-${i}`} type="date" {...form.register(`holidays.${i}.date`)} /></PreparationField><Button type="button" variant="outline" aria-label={`Remove holiday ${i + 1}`} onClick={() => rows.remove(i)}>Remove</Button></div>)}
      <Button type="button" variant="outline" onClick={() => rows.append({ date: '', name: '' })}><Plus data-icon="inline-start" /> Add holiday</Button>
      <PreparationField id="calendar-reason" label="Reason for this revision" required error={form.formState.errors.reason?.message}><Input id="calendar-reason" {...form.register('reason')} /></PreparationField>
    </div><RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button disabled={save.isPending}>Save calendar</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
