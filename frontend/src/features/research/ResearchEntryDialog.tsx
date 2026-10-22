import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { useResearchMutation, writeResearch, type EntryDetail, type ExperimentDetail } from './research-api'
import { ResearchFeedback, today } from './ResearchCommon'

const schema = z.object({ title: z.string().trim().min(1, 'Enter an entry title.').max(255), entryDate: z.iso.date('Choose a valid entry date.') })

export function ResearchEntryDialog({ detail, onClose, onSaved, refresh }: {
  detail: ExperimentDetail; onClose: () => void; onSaved: (id: string) => void; refresh: () => Promise<unknown>
}) {
  const form = useForm({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { title: `Entry ${detail.entryCount + 1}`, entryDate: today() } })
  const mutation = useResearchMutation((values: z.infer<typeof schema>) => writeResearch<EntryDetail>(`experiments/${detail.experiment.id}/entries`,
    { ...values, blocks: [], version: 0, experimentVersion: detail.experiment.version }))
  const guard = useModalDraftGuard(form.formState.isDirty, mutation.isPending, true, 'new notebook entry')
  const completed = detail.experiment.status === 'Completed'
  const save = form.handleSubmit(async values => {
    try {
      const saved = await mutation.mutateAsync(values)
      form.reset(values); guard.allowNavigation(); onClose(); onSaved(saved.entry.id)
    } catch { await refresh() }
  })
  return <DialogReturnFocus target={null} fallbackId="research-add-entry"><Dialog open onOpenChange={open => { if (!open) void guard.close(onClose) }}><DialogContent>
    <DialogHeader><DialogTitle>Add notebook entry</DialogTitle><DialogDescription>Create a dated notebook entry in this experiment, then record its observations and results.</DialogDescription><ResearchFeedback error={mutation.error} /></DialogHeader>
    <form id="research-entry-create" className="space-y-4" onSubmit={e => void save(e)} noValidate>
      <p className="text-sm">Create entry permanently records its title and date in this experiment. You can then edit its notebook sections. Cancel leaves the experiment unchanged.</p>
      {completed ? <p role="status">This experiment was completed. Reopen it before creating an entry.</p> : null}
      <fieldset disabled={mutation.isPending || completed} className="space-y-4"><legend className="sr-only">New entry details</legend>
        <Field><Label htmlFor="new-entry-title"><RequiredFieldName>Entry title</RequiredFieldName></Label><Input id="new-entry-title" required maxLength={255} aria-invalid={Boolean(form.formState.errors.title)} aria-describedby="new-entry-title-error" {...form.register('title')} /><FieldError id="new-entry-title-error">{form.formState.errors.title?.message}</FieldError></Field>
        <Field><Label htmlFor="new-entry-date"><RequiredFieldName>Entry date</RequiredFieldName></Label><Input id="new-entry-date" type="date" required aria-invalid={Boolean(form.formState.errors.entryDate)} aria-describedby="new-entry-date-error" {...form.register('entryDate')} /><FieldError id="new-entry-date-error">{form.formState.errors.entryDate?.message}</FieldError></Field>
      </fieldset>
    </form>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void guard.close(onClose)}>Cancel</Button><Button type="submit" form="research-entry-create" disabled={mutation.isPending || completed}>{mutation.isPending ? 'Creating…' : 'Create entry'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog></DialogReturnFocus>
}
