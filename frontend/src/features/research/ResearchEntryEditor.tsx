import { LoadingState } from '#/components/ui/content-state'
import { SectionPanel } from '#/components/ui/section-panel'
import { RecordTableHeader } from '#/components/ui/record-list'
import { BackLink } from '#/components/ui/back-link'
import { useState, useRef } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { Field, FieldError } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogReturnFocus } from '#/components/ui/dialog'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { useResearchQuery, useResearchMutation, writeResearch, uploadResearchAttachment, newBlock, type EntryDetail, type ExperimentDetail, type ResearchBlock, type Attachment } from './research-api'
import { ResearchHeader, ResearchFeedback, ResearchLoading, useResearchSearch } from './ResearchCommon'
import { ResearchNotebook, ResearchAttachmentView } from './ResearchNotebook'
import { researchEntrySchema, type ResearchEntryValues as Values } from './research-entry-schema'

export function ResearchEntryEditor({ experimentId, entryId }: { experimentId: string; entryId: string }) {
  const query = useResearchQuery<EntryDetail>(`experiments/${experimentId}/entries/${entryId}`)
  const { search } = useResearchSearch()
  return <main className="page-wrap space-y-5 px-4 py-8"><BackLink asChild><Link to="/research/experiments/$experimentId/entries/$entryId" params={{ experimentId, entryId }} search={search}>Back to entry</Link></BackLink>
    <ResearchFeedback error={query.error} /><ResearchLoading loading={query.isLoading} />{query.isError ? <Button variant="outline" onClick={() => void query.refetch()}>Retry entry</Button> : null}
    {query.data ? <EntryForm key={`${experimentId}:${entryId}`} detail={query.data} refresh={() => query.refetch({ throwOnError: true }).then(r => r.data!)} /> : null}
  </main>
}

function EntryForm({ detail, refresh }: { detail: EntryDetail; refresh: () => Promise<EntryDetail> }) {
  const navigate = useNavigate()
  const { search } = useResearchSearch()
  const { entry, experiment } = detail
  const experimentId = experiment.id
  const [base, setBase] = useState({ entry: entry.version, experiment: experiment.version })
  const [conflict, setConflict] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [localError, setLocalError] = useState<unknown>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const uploadInput = useRef<HTMLInputElement>(null)
  const options = useResearchQuery<{ maximumBytes: number }>('attachments/options')
  const files = useResearchQuery<Attachment[]>(`experiments/${experimentId}/entries/${entry.id}/attachments`)
  const form = useForm<Values>({ resolver: zodResolver(researchEntrySchema), mode: 'onBlur', defaultValues: { title: entry.title, entryDate: entry.entryDate, blocks: entry.blocks as Values['blocks'] } })
  const blocks = form.watch('blocks')
  const mutation = useResearchMutation((values: Values) => writeResearch<EntryDetail>(`experiments/${experimentId}/entries/${entry.id}`,
    { ...values, version: base.entry, experimentVersion: base.experiment }, 'put'))
  const reopen = useResearchMutation(() => writeResearch<ExperimentDetail>(`experiments/${experimentId}/transition`, { action: 'reopen', version: experiment.version }))
  const busy = mutation.isPending || reopen.isPending || uploading
  const guard = useModalDraftGuard(form.formState.isDirty, busy, true, `notebook entry “${entry.title}”`)
  const completed = experiment.status === 'Completed'
  const setBlocks = (next: ResearchBlock[]) => form.setValue('blocks', next as Values['blocks'], { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
  function updateBlock(id: string, update: Partial<ResearchBlock>) { setBlocks(form.getValues('blocks').map(b => b.id === id ? { ...b, ...update } : b)) }
  function reorder(index: number, delta: number) {
    const next = [...form.getValues('blocks')]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; setBlocks(next)
    requestAnimationFrame(() => document.getElementById(`block-${next[index + delta].id}`)?.focus())
  }
  async function reviewLatest() {
    setLocalError(null)
    try { await refresh(); setConflict(true) } catch (error) { setLocalError(error) }
  }
  async function reopenExperiment() {
    setLocalError(null)
    try {
      await reopen.mutateAsync(undefined); await refresh(); setConflict(true); setReopening(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        try { const latest = await refresh(); setConflict(true); if (latest.experiment.status === 'Active') setReopening(false) } catch (error) { setLocalError(error) }
      } else { setLocalError(error) }
    }
  }
  async function save(values: Values) {
    setLocalError(null)
    try {
      const saved = await mutation.mutateAsync(values)
      form.reset({ title: saved.entry.title, entryDate: saved.entry.entryDate, blocks: saved.entry.blocks as Values['blocks'] }); guard.allowNavigation()
      await navigate({ to: '/research/experiments/$experimentId/entries/$entryId', params: { experimentId, entryId: entry.id }, search })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) { setConflict(true); await reviewLatest() }
    }
  }
  async function upload(file: File) {
    setLocalError(null)
    if (!options.data || file.size < 1 || file.size > options.data.maximumBytes) { setLocalError(new Error('Choose a nonempty file within the displayed upload limit.')); return }
    setUploading(true); setProgress(0)
    try {
      const uploaded = await uploadResearchAttachment(experimentId, entry.id, file, setProgress)
      setBlocks([...form.getValues('blocks'), { id: crypto.randomUUID(), kind: 'file', section: 'custom', label: file.name, text: null, columns: null, rows: null, attachmentId: uploaded.id }])
      await files.refetch()
    } catch (error) { setLocalError(error) } finally { setUploading(false); if (uploadInput.current) uploadInput.current.value = '' }
  }
  return <><div id="research-editor-focus" tabIndex={-1}><ResearchHeader title={`Edit: ${entry.title}`} description={experiment.title} /></div><ResearchFeedback error={mutation.error || localError || options.error || files.error} />
    {files.isError ? <Button type="button" variant="outline" onClick={() => void files.refetch()}>Retry attachment metadata</Button> : null}
    {completed ? <section className="space-y-3 rounded-lg border p-4"><p role="status">This experiment is completed. Your edits are retained here. Reopen it to continue, then review the latest saved entry before saving.</p><Button id="research-editor-reopen" type="button" variant="outline" disabled={busy} onClick={() => setReopening(true)}>Reopen experiment</Button></section> : null}
    {conflict ? <SectionPanel heading={<h2 id="research-editor-review" tabIndex={-1} >Review the latest saved notebook</h2>}><p className="text-sm">Your edits are still in the form below. Latest experiment status: {experiment.status}.</p>
      <details><summary className="cursor-pointer text-primary">Show latest entry: {entry.title} · {entry.entryDate}</summary><ResearchNotebook blocks={entry.blocks} experimentId={experimentId} entryId={entry.id} /></details>
      <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={busy}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => void reviewLatest()}>Refresh latest saved entry</DropdownMenuItem>
        {!completed ? <><DropdownMenuItem onSelect={() => { setBase({ entry: entry.version, experiment: experiment.version }); setConflict(false); mutation.reset(); requestAnimationFrame(() => document.getElementById('entry-title')?.focus()) }}>I reviewed the latest entry; keep my edits</DropdownMenuItem><DropdownMenuItem onSelect={() => { form.reset({ title: entry.title, entryDate: entry.entryDate, blocks: entry.blocks as Values['blocks'] }); setBase({ entry: entry.version, experiment: experiment.version }); setConflict(false); mutation.reset(); requestAnimationFrame(() => document.getElementById('entry-title')?.focus()) }}>Use latest saved entry</DropdownMenuItem></> : null}
      </DropdownMenuContent></ActionMenu>
    </SectionPanel> : null}
    <form className="min-w-0 space-y-5" onSubmit={e => void form.handleSubmit(save, errors => { if (errors.blocks?.message) requestAnimationFrame(()=>document.getElementById('entry-sections-error')?.focus()) })(e)} noValidate>
      <fieldset disabled={busy || completed} className="min-w-0 grid gap-4 sm:grid-cols-2"><legend className="sr-only">Entry details</legend>
        <Field><Label htmlFor="entry-title"><RequiredFieldName>Entry title</RequiredFieldName></Label><Input id="entry-title" required maxLength={255} aria-invalid={Boolean(form.formState.errors.title)} aria-describedby="entry-title-error" {...form.register('title')} /><FieldError reserveSpace id="entry-title-error">{form.formState.errors.title?.message}</FieldError></Field>
        <Field><Label htmlFor="entry-date"><RequiredFieldName>Entry date</RequiredFieldName></Label><Input id="entry-date" type="date" required aria-invalid={Boolean(form.formState.errors.entryDate)} aria-describedby="entry-date-error" {...form.register('entryDate')} /><FieldError reserveSpace id="entry-date-error">{form.formState.errors.entryDate?.message}</FieldError></Field>
      </fieldset>
      {form.formState.isSubmitted && form.formState.errors.blocks ? <p id="entry-sections-error" tabIndex={-1} role="alert" className="text-sm text-destructive">Correct the marked section fields. Up to 200 sections, 30 columns and 1,000 rows are supported.</p> : null}
      <fieldset disabled={busy || completed} className="min-w-0 space-y-5"><legend className="sr-only">Notebook sections</legend>
        {blocks.map((block, index) => <SectionPanel key={block.id} aria-label={`Section ${index + 1}`} className="min-w-0" heading={<h2 id={`block-${block.id}`} tabIndex={-1} className="rounded focus-visible:outline-2 focus-visible:outline-ring">Section {index + 1}</h2>} actions={<><ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={index === 0} onSelect={() => reorder(index, -1)}>Move up</DropdownMenuItem><DropdownMenuItem disabled={index === blocks.length - 1} onSelect={() => reorder(index, 1)}>Move down</DropdownMenuItem><DropdownMenuItem onSelect={() => { setBlocks(form.getValues('blocks').filter(b => b.id !== block.id)); requestAnimationFrame(() => document.getElementById('add-notebook-section')?.focus()) }}>Remove section from this draft</DropdownMenuItem></DropdownMenuContent></ActionMenu></>}>
          <div className="grid gap-4 sm:grid-cols-2"><Field><Label htmlFor={`label-${block.id}`}><RequiredFieldName>Section label</RequiredFieldName></Label><Input id={`label-${block.id}`} value={block.label} required maxLength={255} aria-invalid={Boolean(form.formState.errors.blocks?.[index]?.label)} aria-describedby={`label-${block.id}-error`} {...form.register(`blocks.${index}.label`)} /><FieldError reserveSpace id={`label-${block.id}-error`}>{form.formState.errors.blocks?.[index]?.label?.message}</FieldError></Field>
            <Field><Label htmlFor={`section-${block.id}`}>Scientific section</Label><NativeSelect id={`section-${block.id}`} value={block.section} {...form.register(`blocks.${index}.section`)}><option value="custom">Custom</option>{['purpose', 'method', 'observations', 'results', 'conclusions'].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</NativeSelect></Field></div>
          {block.kind === 'text' ? <Field><Label htmlFor={`text-${block.id}`}>Notes</Label><Textarea id={`text-${block.id}`} value={block.text ?? ''} maxLength={100000} rows={6} aria-invalid={Boolean(form.formState.errors.blocks?.[index]?.text)} aria-describedby={`text-${block.id}-error`} {...form.register(`blocks.${index}.text`)} /><FieldError id={`text-${block.id}-error`}>{form.formState.errors.blocks?.[index]?.text?.message}</FieldError></Field>
            : block.kind === 'table' ? <ResearchTableEditor block={block} index={index} form={form} onChange={update => updateBlock(block.id, update)} />
            : files.data?.find(f => f.id === block.attachmentId) ? <ResearchAttachmentView file={files.data.find(f => f.id === block.attachmentId)!} /> : <LoadingState  label={<>{files.isLoading ? 'Loading file metadata…' : 'Attachment metadata unavailable. Retry above.'}</>} />}
        </SectionPanel>)}
        <div className="flex flex-wrap gap-2"><Button id="add-notebook-section" type="button" variant="outline" disabled={blocks.length >= 200} onClick={() => setBlocks([...blocks, newBlock('text')])}>Add text section</Button><Button type="button" variant="outline" disabled={blocks.length >= 200} onClick={() => setBlocks([...blocks, newBlock('table', 'results')])}>Add table</Button></div>
        <Field><Label htmlFor="entry-file">Attach a file (optional)</Label><Input ref={uploadInput} id="entry-file" type="file" disabled={!options.data || blocks.length >= 200} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file) }} aria-describedby="entry-file-help" /><p id="entry-file-help" className="text-xs text-muted-foreground">{options.data ? `Maximum ${(options.data.maximumBytes / (1024 * 1024)).toLocaleString('en-US')} MiB per file. Files must pass scanning. Save the entry to record the attachment in its notebook.` : 'Loading upload limit…'}</p></Field>
      </fieldset>
      {uploading ? <p role="status">{progress === 100 ? 'Upload received; verifying and scanning…' : `Uploading: ${progress}%`}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><RequiredLegend /><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void guard.close(() => { guard.allowNavigation(); void navigate({ to: '/research/experiments/$experimentId/entries/$entryId', params: { experimentId, entryId: entry.id }, search }) })}>Cancel</Button><Button type="submit" disabled={busy || completed || conflict || !form.formState.isDirty}>{mutation.isPending ? 'Saving…' : 'Save changes'}</Button></div></div>
    </form>
    {reopening ? <DialogReturnFocus target={null} fallbackId="research-editor-focus"><Dialog open onOpenChange={open => { if (!open && !reopen.isPending) setReopening(false) }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('research-editor-reopen-cancel')?.focus() }}>
      <DialogHeader><DialogTitle>Reopen experiment?</DialogTitle><ResearchFeedback error={reopen.error} /></DialogHeader><div><DialogDescription>Reopen “{experiment.title}” so the research team can edit it again. Your unsaved entry remains in this editor. Review the latest saved entry before saving your changes.</DialogDescription></div>
      <DialogFooter><Button id="research-editor-reopen-cancel" variant="outline" disabled={reopen.isPending} onClick={() => setReopening(false)}>Cancel</Button><Button disabled={reopen.isPending} onClick={() => void reopenExperiment()}>{reopen.isPending ? 'Reopening…' : 'Reopen experiment'}</Button></DialogFooter>
    </DialogContent></Dialog></DialogReturnFocus> : null}
  </>
}

function ResearchTableEditor({ block, index, form, onChange }: { block: ResearchBlock; index: number; form: UseFormReturn<Values>; onChange: (update: Partial<ResearchBlock>) => void }) {
  const columns = block.columns ?? []; const rows = block.rows ?? []
  const errors = form.formState.errors.blocks?.[index]
  const focusActions = () => requestAnimationFrame(() => document.getElementById(`table-actions-${block.id}`)?.focus())
  return <div className="min-w-0 space-y-3"><div className="max-w-full overflow-x-auto rounded-md border"><table className="w-full text-sm"><caption className="sr-only">Edit {block.label}</caption><RecordTableHeader><tr>{columns.map((_, ci) => <th key={ci} className="min-w-40 p-2 align-top" scope="col"><Input aria-label={`Column ${ci + 1} heading, include units if needed`} value={columns[ci]} maxLength={255} aria-invalid={Boolean(errors?.columns?.[ci])} aria-describedby={`column-${block.id}-${ci}-error`} {...form.register(`blocks.${index}.columns.${ci}`)} /><FieldError id={`column-${block.id}-${ci}-error`}>{errors?.columns?.[ci]?.message}</FieldError><Button type="button" variant="ghost" size="sm" disabled={columns.length <= 1} onClick={() => { onChange({ columns: columns.filter((_, i) => i !== ci), rows: rows.map(row => row.filter((_, i) => i !== ci)) }); focusActions() }}>Remove column {ci + 1}</Button></th>)}<th scope="col" className="sr-only">Row actions</th></tr></RecordTableHeader><tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((_, ci) => <td className="p-2" key={ci}><Input aria-label={`Row ${ri + 1}, ${columns[ci] || `column ${ci + 1}`}`} value={row[ci]} maxLength={4000} aria-invalid={Boolean(errors?.rows?.[ri]?.[ci])} aria-describedby={`cell-${block.id}-${ri}-${ci}-error`} {...form.register(`blocks.${index}.rows.${ri}.${ci}`)} /><FieldError id={`cell-${block.id}-${ri}-${ci}-error`}>{errors?.rows?.[ri]?.[ci]?.message}</FieldError></td>)}<td className="p-2"><Button variant="ghost" type="button" onClick={() => { onChange({ rows: rows.filter((_, i) => i !== ri) }); focusActions() }}>Remove row {ri + 1}</Button></td></tr>)}</tbody></table></div>
    <ActionMenu><DropdownMenuTrigger asChild><Button id={`table-actions-${block.id}`} type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={rows.length >= 1000} onSelect={() => onChange({ rows: [...rows, columns.map(() => '')] })}>Add row</DropdownMenuItem><DropdownMenuItem disabled={columns.length >= 30} onSelect={() => onChange({ columns: [...columns, ''], rows: rows.map(r => [...r, '']) })}>Add column</DropdownMenuItem></DropdownMenuContent></ActionMenu><p className="text-xs text-muted-foreground">Up to 1,000 rows and 30 columns. Include units in column headings where appropriate.</p></div>
}
