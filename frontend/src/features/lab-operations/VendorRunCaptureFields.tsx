import { useEffect } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Input } from '#/components/ui/input'
import { PreparationField } from './preparation-ui'
import type { VendorResultsValues } from './VendorResultsWorkspacePage'
import { runCaptureValues } from './vendor-run-capture'

export type VendorRunGroup = { setId: string; groupNumber: number; label: string }
export function VendorRunCaptureFields({ form, groups, failed, disabled }: { form: UseFormReturn<VendorResultsValues>; groups: VendorRunGroup[]; failed: boolean; disabled: boolean }) {
  const { fields, append } = useFieldArray({ control: form.control, name: 'runCaptures' })
  const groupKey = JSON.stringify(groups.map(g => [g.setId, g.groupNumber]))
  const { getValues } = form
  const error = form.formState.errors.runCaptures?.root?.message ?? form.formState.errors.runCaptures?.message
  useEffect(() => {
    const expected = failed ? [[null, null]] : JSON.parse(groupKey) as [string | null, number | null][]
    const current = getValues('runCaptures')
    const missing = expected.filter(([set, group]) => !current.some(r => r.setId === set && r.groupNumber === group))
    if (missing.length) append(missing.map(([set, group]) => runCaptureValues(set, group)), { shouldFocus: false })
  }, [groupKey, failed, getValues, append])
  return <section className="space-y-3" aria-label="Actual sequencing runs">
    <h2 className="font-medium">Actual sequencing runs</h2>
    <p className="text-sm text-muted-foreground">Use the instrument acquisition reference for each file group. The vendor job and purchased run number remain separate. Enter run times in UTC. Leave optional facts blank when the vendor did not supply them; scientific review still checks required evidence.</p>
    {!groups.length && !failed ? <p className="text-sm">Select verified file sets to map their actual sequencing runs.</p> : null}
    {fields.map((row, index) => {
      const group = groups.find(g => g.setId === row.setId && g.groupNumber === row.groupNumber)
      if (failed ? row.setId !== null : !group) return null
      const field = (key: 'runReference' | 'start' | 'end' | 'instrument' | 'flowcell' | 'lane' | 'pool' | 'indexMapping' | 'softwareName' | 'softwareVersion' | 'softwareSha256' | 'parameters' | 'documentReference' | 'documentSha256' | 'documentBytes', label: string, required = false, type = 'text') => {
        const id = `actual-run-${index}-${key}`
        return <PreparationField id={id} label={label} required={required} error={form.formState.errors.runCaptures?.[index]?.[key]?.message}><Input id={id} type={type} step={type === 'datetime-local' ? '1' : undefined} disabled={disabled} {...form.register(`runCaptures.${index}.${key}`)} /></PreparationField>
      }
      return <fieldset key={row.id} className="min-w-0 space-y-3 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">{group?.label ?? 'Failed run · optional vendor evidence'}</legend>
        {field('runReference', 'Actual sequencing run reference', !failed)}
        <div className="grid gap-3 sm:grid-cols-2">{field('start', 'Actual run started (UTC)', !failed, 'datetime-local')}{field('end', 'Actual run completed (UTC)', !failed, 'datetime-local')}</div>
        <details><summary className="cursor-pointer text-sm font-medium">Instrument, sample mapping and supporting evidence</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
          {field('instrument', 'Instrument')}{field('flowcell', 'Flowcell')}{field('lane', 'Lane')}{field('pool', 'Pool')}{field('indexMapping', 'Index / demultiplexing mapping')}
          {field('softwareName', 'Demultiplexing software')}{field('softwareVersion', 'Demultiplexing software version')}{field('softwareSha256', 'Demultiplexing software SHA-256')}{field('parameters', 'Demultiplexing settings SHA-256')}
          {field('documentReference', 'Vendor evidence file reference')}{field('documentSha256', 'Vendor evidence SHA-256')}{field('documentBytes', 'Vendor evidence size (bytes)')}
        </div><p className="mt-2 text-xs text-muted-foreground">A file reference and checksum declare vendor evidence; they do not prove availability or retrieve external files.</p></details>
      </fieldset>
    })}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </section>
}
