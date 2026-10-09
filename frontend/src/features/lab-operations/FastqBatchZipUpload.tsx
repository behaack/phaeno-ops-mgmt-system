import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { beginFastqSet, importFastqArchiveEntry, uploadFastqArchive, type FastqIntake, type ResultsDraft } from '#/api/lab-fastq'
import { getLabOperationsError, type LabBatchDetail } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { PreparationField } from './preparation-ui'
import type { VendorResultsValues } from './VendorResultsWorkspacePage'
import { restoreZipMappings } from './fastq-zip-mapping'
import { FileUploadProgress } from '#/components/ui/file-upload-progress'
import type { FileUploadProgress as UploadState } from '#/api/file-upload-progress'

export function FastqBatchZipUpload({ form, intake, sendoutId, tubes, getDraft, saveDraft, refresh, disabled, onBusy }: {
  form: UseFormReturn<VendorResultsValues>; intake: FastqIntake; sendoutId: string; tubes: LabBatchDetail['tubes']['members'];
  getDraft: () => Promise<string>; saveDraft: () => Promise<ResultsDraft>; refresh: () => Promise<unknown>; disabled: boolean; onBusy: (value: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [transfer, setTransfer] = useState<UploadState>()
  const [error, setError] = useState('')
  const archiveId = form.watch('zipArchiveId')
  const rows = form.watch('zipRows')
  const failed = form.watch('exceptions').map(e => e.memberId)
  const members = intake.members.filter(m => !failed.includes(m.id))
  const archive = intake.archives?.find(a => a.id === archiveId)
  function mapArchive(inspected: NonNullable<FastqIntake['archives']>[number]) {
    const restored = restoreZipMappings(inspected, form.getValues('zipArchiveId'), form.getValues('zipRows'), intake.sets, tubes)
    form.setValue('zipArchiveId', inspected.id, { shouldDirty: true }); form.setValue('zipConfirmed', false, { shouldDirty: true })
    form.setValue('zipRows', restored, { shouldDirty: true })
    for (const set of intake.sets.filter(s => !s.sealedSet && s.files.some(f => f.archiveId === inspected.id))) {
      const index = form.getValues('files').findIndex(f => f.memberId === set.memberId)
      if (index >= 0 && restored.some(r => r.memberId === set.memberId && set.files.some(f => f.id === r.uploadId))) {
        form.setValue(`files.${index}.setId`, set.id, { shouldDirty: true }); form.setValue(`files.${index}.layout`, set.readLayout, { shouldDirty: true })
        form.setValue(`files.${index}.run`, String(set.sequencingRunNumber), { shouldDirty: true }); form.setValue(`files.${index}.preparation`, set.libraryPreparationChoice, { shouldDirty: true })
      }
    }
  }
  async function choose(file?: File) {
    if (!file || busy || disabled) return
    setError('')
    if (!file.name.toLowerCase().endsWith('.zip') || file.size <= 0 || file.size > intake.effectiveMaximumArchiveBytes) { setError('Choose a ZIP within the displayed effective archive limit.'); return }
    setBusy(true); onBusy(true)
    try {
      const id = await getDraft()
      const inspected = await uploadFastqArchive(id, file, setStatus, setTransfer)
      mapArchive(inspected)
      await saveDraft(); await refresh(); setStatus('ZIP inspected. Review every FASTQ library/read mapping before importing.')
    } catch (failure) { setError(getLabOperationsError(failure, failure instanceof Error ? failure.message : 'The ZIP could not be inspected. Select the same ZIP to resume.')) }
    finally { setBusy(false); onBusy(false) }
  }
  async function importFiles() {
    if (!archive || busy || disabled) return
    setError('')
    const values = form.getValues()
    if (!values.zipConfirmed) { form.setError('zipConfirmed', { message: 'Review and confirm the ZIP mappings first.' }); form.setFocus('zipConfirmed'); return }
    const positive = z.string().refine(v => /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 2_147_483_647, 'Enter a positive whole number.')
    const entrySchema = z.object({ memberId: z.string().min(1), read: z.enum(['1', '2']), group: positive, part: positive, description: z.string().trim().min(1).max(255) })
    const chosen = values.zipRows.filter(row => !row.excluded)
    if (!chosen.length || values.zipRows.some(row => row.excluded && !row.exclusionReason.trim())) { setError('Import at least one FASTQ and explain each excluded file.'); return }
    if (chosen.some(row => !entrySchema.safeParse(row).success || !members.some(m => m.id === row.memberId))) { setError('Every included FASTQ needs a successful library, read, group, part and actual group description.'); return }
    const used = [...new Set(chosen.map(row => row.memberId))]
    for (const memberId of used) {
      const mapping = values.files.find(f => f.memberId === memberId)!
      if (!intake.policy.allowedReadLayouts.includes(mapping.layout) || !positive.safeParse(mapping.run).success || !['NewPreparation', 'ExistingLibrary'].includes(mapping.preparation)) { setError('Choose the actual layout, purchased run and preparation for each imported library.'); return }
    }
    setBusy(true); onBusy(true)
    try {
      const draftId = await getDraft()
      const sets = new Map<string, string>()
      for (const memberId of used) {
        const index = values.files.findIndex(f => f.memberId === memberId); const mapping = values.files[index]
        const existing = intake.sets.find(s => s.id === mapping.setId)
        const resumable = existing && !existing.sealedSet && existing.readLayout === mapping.layout && existing.sequencingRunNumber === Number(mapping.run)
          && existing.libraryPreparationChoice === mapping.preparation && existing.files.every(f => f.archiveId === archive.id)
        const setId = resumable ? existing.id : crypto.randomUUID()
        if (!resumable) for (const row of chosen.filter(r => r.memberId === memberId)) {
          // New attribution requires fresh command identities; completed receipts remain immutable.
          if (intake.sets.some(s => s.files.some(f => f.id === row.uploadId))) {
            row.uploadId = crypto.randomUUID()
            const rowIndex = values.zipRows.findIndex(r => r.index === row.index)
            form.setValue(`zipRows.${rowIndex}.uploadId`, row.uploadId, { shouldDirty: true })
          }
        }
        await beginFastqSet(sendoutId, { id: setId, draftId, memberId, sequencingRunNumber: Number(mapping.run), libraryPreparationChoice: mapping.preparation, readLayout: mapping.layout })
        sets.set(memberId, setId); form.setValue(`files.${index}.setId`, setId, { shouldDirty: true })
      }
      await saveDraft(); await refresh()
      for (const [index, row] of chosen.entries()) {
        const entry = archive.entries?.find(e => e.index === row.index)
        setStatus(`Importing ${index + 1} of ${chosen.length}: ${entry?.fileName}`)
        setTransfer({ fileName: archive.fileName, phase: 'extracting', transferredBytes: archive.sizeBytes, totalBytes: archive.sizeBytes,
          percentage: index / chosen.length * 100, completedItems: index, totalItems: chosen.length, message: `Extracting and verifying ${entry?.fileName ?? 'FASTQ entry'}` })
        await importFastqArchiveEntry(archive.id, { uploadId: row.uploadId, setId: sets.get(row.memberId)!, entryIndex: row.index,
          groupNumber: Number(row.group), readNumber: Number(row.read), partNumber: Number(row.part), groupDescription: row.description.trim() })
        await refresh()
        setTransfer({ fileName: archive.fileName, phase: 'extracting', transferredBytes: archive.sizeBytes, totalBytes: archive.sizeBytes,
          percentage: (index + 1) / chosen.length * 100, completedItems: index + 1, totalItems: chosen.length, message: 'Extracting and verifying reviewed files' })
      }
      setStatus('Selected FASTQ files imported and verified. Review file-set completeness before saving results.')
    } catch (failure) { setError(getLabOperationsError(failure, failure instanceof Error ? failure.message : 'Import failed. Completed files are retained; review the mapping and retry.')) }
    finally { setBusy(false); onBusy(false); await refresh() }
  }
  return <section className="space-y-4" aria-labelledby="batch-zip-title"><h3 id="batch-zip-title" className="font-medium">Upload one ZIP for the batch</h3>
    <PreparationField id="batch-zip-file" label="Batch ZIP" required><Input id="batch-zip-file" type="file" accept=".zip" disabled={busy || disabled} onChange={e => { void choose(e.target.files?.[0]); e.target.value = '' }} /></PreparationField>
    <p className="text-xs text-muted-foreground">Tentative effective archive limit: {((intake.effectiveMaximumArchiveBytes ?? 0) / 1024 / 1024).toLocaleString()} MiB. A ZIP may include FASTQ files in folders. Every FASTQ is verified separately; original names are retained.</p>
    {intake.archives?.length ? <PreparationField id="batch-zip-archive" label="Inspected ZIP"><NativeSelect id="batch-zip-archive" disabled={busy || disabled} value={archiveId} onChange={e => { const selected = intake.archives.find(a => a.id === e.target.value); if (selected) mapArchive(selected); else { form.setValue('zipArchiveId', '', { shouldDirty: true }); form.setValue('zipRows', [], { shouldDirty: true }) } }}><option value="">Choose inspected ZIP</option>{intake.archives.map(a => <option key={a.id} value={a.id}>{a.fileName} · {a.inspected ? 'Inspected' : 'Transfer pending'}</option>)}</NativeSelect></PreparationField> : null}
    {archive?.inspected ? <>
      {!rows.length ? <p className="text-sm">Select the same ZIP again to restore its proposed mappings, or reopen its saved draft.</p> : <>
        <p className="text-sm">Review all proposed matches. Unmatched filenames need an explicit library selection. Folder/report entries are not automatically treated as scientific results.</p>
        <div className="space-y-3"><h4 className="text-sm font-medium">Library run configuration</h4>{members.map(m => { const index = form.getValues('files').findIndex(f => f.memberId === m.id); return <div key={m.id} className="grid gap-3 border-t pt-3 sm:grid-cols-4"><p className="break-words text-sm font-medium">{m.libraryKey}</p><PreparationField id={`zip-layout-${m.id}`} label="Actual layout" required><NativeSelect id={`zip-layout-${m.id}`} disabled={busy || disabled} {...form.register(`files.${index}.layout`)}><option value="">Choose layout</option>{intake.policy.allowedReadLayouts.map(v => <option key={v} value={v}>{v === 'PairedEnd' ? 'Paired-end' : 'Single-end'}</option>)}</NativeSelect></PreparationField><PreparationField id={`zip-run-${m.id}`} label="Purchased run" required><NativeSelect id={`zip-run-${m.id}`} disabled={busy || disabled} {...form.register(`files.${index}.run`)}><option value="">Choose run</option>{Array.from({ length: m.purchasedRuns }, (_, i) => <option key={i} value={i + 1}>Run {i + 1}</option>)}</NativeSelect></PreparationField><PreparationField id={`zip-prep-${m.id}`} label="Preparation" required><NativeSelect id={`zip-prep-${m.id}`} disabled={busy || disabled} {...form.register(`files.${index}.preparation`)}><option value="">Choose preparation</option><option value="NewPreparation">New for this run</option><option value="ExistingLibrary">Existing library</option></NativeSelect></PreparationField></div> })}</div>
        <ol className="space-y-3">{rows.map((row, i) => { const entry = archive.entries?.find(e => e.index === row.index); const completed = intake.sets.flatMap(s => s.files).find(f => f.id === row.uploadId); return <li key={row.uploadId} className="space-y-3 rounded-md border p-3"><p className="break-all text-sm font-medium">{entry?.fullName}</p>{completed?.fileId ? <p className="text-xs text-muted-foreground">Imported and verified · {completed.readCount?.toLocaleString()} reads</p> : null}<label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={busy || disabled || Boolean(completed?.fileId)} {...form.register(`zipRows.${i}.excluded`)} />Exclude this file</label>
          {row.excluded ? <PreparationField id={`zip-exclude-${i}`} label="Exclusion reason" required><Input id={`zip-exclude-${i}`} disabled={busy || disabled} {...form.register(`zipRows.${i}.exclusionReason`)} /></PreparationField> : <><div className="grid gap-3 sm:grid-cols-4"><PreparationField id={`zip-library-${i}`} label="Library" required><NativeSelect id={`zip-library-${i}`} disabled={busy || disabled || Boolean(completed?.fileId)} {...form.register(`zipRows.${i}.memberId`)}><option value="">Not matched · choose library</option>{members.map(m => <option key={m.id} value={m.id}>{m.libraryKey}</option>)}</NativeSelect></PreparationField><PreparationField id={`zip-read-${i}`} label="Read" required><NativeSelect id={`zip-read-${i}`} disabled={busy || disabled || Boolean(completed?.fileId)} {...form.register(`zipRows.${i}.read`)}><option value="">Choose read</option><option value="1">R1</option><option value="2">R2</option></NativeSelect></PreparationField><PreparationField id={`zip-group-${i}`} label="Group" required><Input id={`zip-group-${i}`} type="number" min="1" disabled={busy || disabled || Boolean(completed?.fileId)} {...form.register(`zipRows.${i}.group`)} /></PreparationField><PreparationField id={`zip-part-${i}`} label="Part" required><Input id={`zip-part-${i}`} type="number" min="1" disabled={busy || disabled || Boolean(completed?.fileId)} {...form.register(`zipRows.${i}.part`)} /></PreparationField></div><PreparationField id={`zip-description-${i}`} label="Actual flowcell / lane or merged group" required><Input id={`zip-description-${i}`} disabled={busy || disabled || Boolean(completed?.fileId)} maxLength={255} {...form.register(`zipRows.${i}.description`)} /></PreparationField></>}
        </li> })}</ol>
        {(archive.entries ?? []).some(e => !e.isFastq) ? <details><summary className="cursor-pointer text-sm">Other ZIP files · not imported</summary><ul className="mt-2 text-xs">{archive.entries?.filter(e => !e.isFastq).map(e => <li className="break-all" key={e.index}>{e.fullName}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Upload scientific QC reports through Record QC with their exact sample/package scope.</p></details> : null}
        <PreparationField id="zip-confirm" label="ZIP mapping review" required error={form.formState.errors.zipConfirmed?.message}><label className="flex cursor-pointer items-start gap-2 text-sm"><input id="zip-confirm" type="checkbox" disabled={busy || disabled} {...form.register('zipConfirmed')} />I reviewed the included files and their exact library, run, read, group and part mappings.</label></PreparationField>
        <Button type="button" disabled={busy || disabled} onClick={() => void importFiles()}>Import reviewed FASTQ files</Button>
      </>}
    </> : null}
    {transfer ? <FileUploadProgress progress={transfer} /> : null}
    {status ? <p role="status" className="break-words text-sm">{status}</p> : null}{error ? <p role="alert" className="break-words text-sm text-destructive">{error}</p> : null}
    {intake.sets.some(s => form.getValues('files').some(f => f.setId === s.id)) ? <ul className="space-y-2 text-sm">{intake.sets.filter(s => form.getValues('files').some(f => f.setId === s.id)).map(s => <li key={s.id} className="break-words">{intake.members.find(m => m.id === s.memberId)?.libraryKey} · File set v{s.setVersion} · {s.files.filter(f => f.fileId).length}/{s.files.length} files verified</li>)}</ul> : null}
  </section>
}
