import { useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import type { VendorResultsValues } from './VendorResultsWorkspacePage'
import { beginFastqSet, uploadFastqFile, type FastqIntake, type FastqSet } from '#/api/lab-fastq'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredMark } from '#/components/ui/required-field'
import { PreparationField } from './preparation-ui'

export function FastqLibraryUpload({ form, index, disabled, intake, memberId, sendoutId, selected, getDraft, onSelected, refresh, onBusy }: {
  form: UseFormReturn<VendorResultsValues>; index: number; disabled: boolean; intake: FastqIntake; memberId: string; sendoutId: string; selected?: FastqSet;
  getDraft: () => Promise<string>; onSelected: (id: string) => void; refresh: () => Promise<unknown>; onBusy: (value: boolean) => void
}) {
  const member = intake.members.find(m => m.id === memberId)!
  const prefix = `fastq-${memberId}`
  const path = `files.${index}` as const
  const mapping = form.watch(path)
  const layout = selected?.readLayout ?? mapping.layout
  const run = selected ? String(selected.sequencingRunNumber) : mapping.run
  const preparation = selected?.libraryPreparationChoice ?? mapping.preparation
  const fields = (key: 'layout' | 'run' | 'preparation' | 'group' | 'part' | 'read' | 'description') => form.register(`${path}.${key}`)
  const fieldError = (key: 'layout' | 'run' | 'preparation' | 'group' | 'part' | 'read' | 'description') => form.formState.errors.files?.[index]?.[key]?.message
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const newId = useRef(crypto.randomUUID())
  const active = selected
  async function select(files: FileList | null) {
    if (!files?.length || busy || disabled) return
    setError('')
    const values = Array.from(files)
    if (values.some(file => file.size <= 0 || file.size > intake.effectiveMaximumFileBytes)) { setError('Choose nonempty files within the displayed effective limit.'); return }
    // Bulk selection is bounded to one confirmed read group and part. Each mate remains explicit.
    if (values.length > 2 || values.length === 2 && (active?.readLayout ?? layout) !== 'PairedEnd') { setError('Select one file, or its R1/R2 pair for this group and part.'); return }
    const roles = values.map(file => /(?:^|[_\-.])R([12])(?:[_\-.]|$)/i.exec(file.name)?.[1])
    if (values.length === 2 && (roles.some(role => !role) || new Set(roles).size !== 2)) { setError('The selected pair needs recognizable R1/R2 names. Upload files individually with an explicit read role otherwise.'); return }
    const positive = z.string().refine(v => /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 2_147_483_647, 'Enter a positive whole number.')
    const schema = z.object({ layout: z.enum(['PairedEnd', 'SingleEnd']), run: positive, preparation: z.enum(['NewPreparation', 'ExistingLibrary']), group: positive, part: positive, read: z.enum(['1', '2']), description: z.string().trim().min(1, 'Describe the actual flowcell/lane or merged group.').max(255) })
    const checked = schema.safeParse({ ...mapping, layout, run, preparation, read: values.length === 2 || layout === 'SingleEnd' ? '1' : mapping.read })
    if (!checked.success) {
      for (const issue of checked.error.issues) form.setError(`${path}.${issue.path[0] as keyof typeof mapping}`, { message: issue.message })
      form.setFocus(`${path}.${checked.error.issues[0].path[0] as keyof typeof mapping}`)
      setError('Review the required file mapping before uploading.'); return
    }
    const verifiedMapping = checked.data
    setBusy(true); onBusy(true)
    try {
      let id = active?.id
      if (!id) {
        const draftId = await getDraft()
        const created = await beginFastqSet(sendoutId, { id: newId.current, draftId, memberId, sequencingRunNumber: Number(run), libraryPreparationChoice: preparation, readLayout: layout })
        id = created.id; onSelected(id)
      }
      for (const [i, file] of values.entries()) {
        const role = values.length === 2 ? Number(roles[i]) : Number(verifiedMapping.read)
        setStatus(`Preparing ${file.name}`)
        await uploadFastqFile(id, file, { groupNumber: Number(verifiedMapping.group), partNumber: Number(verifiedMapping.part), readNumber: role, groupDescription: verifiedMapping.description }, message => setStatus(`${file.name}: ${message}`))
        await refresh()
      }
    } catch (failure) { setError(getLabOperationsError(failure, failure instanceof Error ? failure.message : 'Upload failed. Select the same file and mapping to resume.')) }
    finally { setBusy(false); onBusy(false); await refresh() }
  }
  return <section className="min-w-0 space-y-3 border-t pt-4" aria-labelledby={`${prefix}-title`}>
    <h3 id={`${prefix}-title`} className="break-words font-medium">{member.libraryKey}<RequiredMark /></h3>
    <p className="text-xs text-muted-foreground">{member.sampleName} · {member.purchasedRuns} purchased run{member.purchasedRuns === 1 ? '' : 's'} · Confirm the actual vendor file mapping before saving.</p>
    {active ? <p className="text-sm">File set v{active.setVersion} · Run {active.sequencingRunNumber} · {active.readLayout === 'PairedEnd' ? 'Paired-end' : 'Single-end'}</p> : <div className="grid gap-3 sm:grid-cols-3">
      <PreparationField id={`${prefix}-layout`} label="Read layout" required error={fieldError('layout')}><NativeSelect id={`${prefix}-layout`} {...fields('layout')} disabled={busy || disabled}><option value="">Choose actual layout</option>{intake.policy.allowedReadLayouts.map(value => <option key={value} value={value}>{value === 'PairedEnd' ? 'Paired-end · R1 and R2' : 'Single-end · R1'}</option>)}</NativeSelect></PreparationField>
      <PreparationField id={`${prefix}-run`} label="Purchased run" required error={fieldError('run')}><NativeSelect id={`${prefix}-run`} {...fields('run')} disabled={busy || disabled}><option value="">Choose run</option>{Array.from({ length: member.purchasedRuns }, (_, i) => <option key={i} value={i + 1}>Run {i + 1}</option>)}</NativeSelect></PreparationField>
      <PreparationField id={`${prefix}-prep`} label="Library preparation" required error={fieldError('preparation')}><NativeSelect id={`${prefix}-prep`} {...fields('preparation')} disabled={busy || disabled}><option value="">Choose preparation</option><option value="NewPreparation">New for this run</option><option value="ExistingLibrary">Existing library</option></NativeSelect></PreparationField>
    </div>}
    {active?.files.length ? <ol className="divide-y text-sm">{active.files.map(file => <li key={file.id} className="min-w-0 py-2"><p className="break-all">{file.originalFileName} · G{file.groupNumber} / R{file.readNumber} / P{file.partNumber}</p><p className="text-xs text-muted-foreground">{file.fileId ? `Verified · ${file.readCount?.toLocaleString()} reads` : `${Math.round(file.receivedBytes / file.sizeBytes * 100)}% uploaded · verification pending`}</p><details><summary className="cursor-pointer text-xs">POMS filename</summary><p className="break-all text-xs">{file.fileName}</p></details></li>)}</ol> : null}
    {active ? <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => { newId.current = crypto.randomUUID(); form.setValue(`${path}.layout`, '', { shouldDirty: true }); form.setValue(`${path}.run`, '', { shouldDirty: true }); form.setValue(`${path}.preparation`, '', { shouldDirty: true }); onSelected('') }}>Start a new file set</Button> : null}
    {active?.sealedSet ? <p className="text-xs text-muted-foreground">Retained verified files satisfy upload coverage. Replacing them creates a new file set.</p> : <>
      <div className="grid gap-3 sm:grid-cols-3"><PreparationField id={`${prefix}-group`} label="Group" required error={fieldError('group')}><Input id={`${prefix}-group`} type="number" min="1" max={intake.policy.allowMultipleGroups ? undefined : 1} disabled={busy || disabled} {...fields('group')} /></PreparationField><PreparationField id={`${prefix}-part`} label="Part" required error={fieldError('part')}><Input id={`${prefix}-part`} type="number" min="1" max={intake.policy.allowSplitParts ? undefined : 1} disabled={busy || disabled} {...fields('part')} /></PreparationField>{layout === 'SingleEnd' ? <p className="self-end text-sm">Read · R1</p> : <PreparationField id={`${prefix}-read`} label="Read for single-file selection" required error={fieldError('read')}><NativeSelect id={`${prefix}-read`} disabled={busy || disabled} {...fields('read')}><option value="">Choose read</option><option value="1">R1</option>{(active?.readLayout ?? layout) === 'PairedEnd' ? <option value="2">R2</option> : null}</NativeSelect></PreparationField>}</div>
      <PreparationField id={`${prefix}-description`} label="Flowcell / lane or merged group" required error={fieldError('description')}><Input id={`${prefix}-description`} disabled={busy || disabled} maxLength={255} {...fields('description')} placeholder="Use vendor evidence; describe merged lanes explicitly" /></PreparationField>
      <PreparationField id={`${prefix}-files`} label="FASTQ file or R1/R2 pair" required><Input id={`${prefix}-files`} type="file" multiple accept=".fastq,.fq,.fastq.gz,.fq.gz" disabled={busy || disabled} aria-describedby={`${prefix}-help`} onChange={e => { void select(e.target.files); e.target.value = '' }} /></PreparationField>
      <p id={`${prefix}-help`} className="text-xs text-muted-foreground">Up to {(intake.effectiveMaximumFileBytes / 1024 / 1024).toLocaleString()} MiB per file. Select the same file and mapping to resume an interrupted upload.</p>
    </>}
    {status ? <p role="status" className="break-words text-sm">{status}</p> : null}{error ? <p role="alert" className="break-words text-sm text-destructive">{error}</p> : null}
  </section>
}
