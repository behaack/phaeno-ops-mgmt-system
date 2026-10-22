import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { readResearch, writeResearch, useResearchMutation, type Project, type ExperimentDetail } from './research-api'
import { ResearchFeedback, ResearchProjectSelect, today } from './ResearchCommon'

const schema = z.object({ name: z.string().trim().min(1, 'Enter a name or title.').max(255), description: z.string().max(10000), projectId: z.string(), date: z.string() })
type Values = z.infer<typeof schema>
type Props = { kind: 'project' | 'experiment' | 'copy'; project?: Project; detail?: ExperimentDetail; projectId?: string; onClose: () => void; onSaved?: (id: string) => void }

export function ResearchRecordDialog(props: Props) {
  const { kind, project, detail, onClose, onSaved } = props
  const editing = kind === 'project' ? Boolean(project) : kind === 'experiment' && Boolean(detail)
  const heading = kind === 'copy' ? 'Copy experiment setup' : `${editing ? 'Edit' : 'Create'} ${kind}`
  const initialVersion = kind === 'project' ? project?.version ?? 0 : detail?.experiment.version ?? 0
  const [version, setVersion] = useState(initialVersion)
  const [conflict, setConflict] = useState<{ version: number; text: string } | null>(null)
  const [reloadError, setReloadError] = useState<unknown>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { name: project?.name ?? (kind === 'copy' ? `${detail?.experiment.title ?? ''} — repeat` : detail?.experiment.title ?? ''),
    description: project?.description ?? '', projectId: props.projectId ?? detail?.project.id ?? '', date: kind === 'copy' ? '' : detail?.experiment.experimentDate ?? '' } })
  const mutation = useResearchMutation(async (values: Values) => {
    if (kind === 'project') return await writeResearch<Project>(editing ? `projects/${project!.id}` : 'projects', { name: values.name, description: values.description || null, version }, editing ? 'put' : 'post')
    const path = kind === 'copy' ? `experiments/${detail!.experiment.id}/copy` : editing ? `experiments/${detail!.experiment.id}` : 'experiments'
    const result = await writeResearch<ExperimentDetail>(path, { title: values.name, projectId: values.projectId, experimentDate: values.date || null, initialEntryDate: values.date || today(), version }, editing ? 'put' : 'post')
    return { id: result.experiment.id }
  })
  const guard = useModalDraftGuard(form.formState.isDirty, mutation.isPending, true, heading)
  const save = form.handleSubmit(async values => {
    if (kind !== 'project' && !values.projectId) { form.setError('projectId', { message: 'Choose a project.' }); document.getElementById('research-project')?.focus(); return }
    try { const saved = await mutation.mutateAsync(values); form.reset(values); guard.allowNavigation(); onClose(); onSaved?.(saved.id) }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409 && (editing || kind === 'copy')) {
        try {
          const latest = kind === 'project' ? await readResearch<Project>(`projects/${project!.id}`) : (await readResearch<ExperimentDetail>(`experiments/${detail!.experiment.id}`)).experiment
          setConflict({ version: latest.version, text: 'name' in latest ? `${latest.name}\n${latest.description ?? ''}` : `${latest.title}\n${latest.experimentDate ?? 'No experiment date'}\n${latest.status}` })
        } catch (reloadError) { setReloadError(reloadError) }
      }
    }
  })
  return <DialogReturnFocus target={null} fallbackId={editing ? kind === 'project' ? 'research-project-actions' : 'research-experiment-actions' : kind === 'copy' ? 'research-experiment-actions' : kind === 'project' ? 'research-create-project' : 'research-create-experiment'}><Dialog open onOpenChange={open => { if (!open) void guard.close(onClose) }}><DialogContent>
    <DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>Save the details for this research record. Cancel discards changes made in this dialog.</DialogDescription><ResearchFeedback error={reloadError || mutation.error} /></DialogHeader>
    <form id="research-record-form" className="space-y-4" onSubmit={e => void save(e)} noValidate><fieldset disabled={mutation.isPending} className="space-y-4"><legend className="sr-only">{heading}</legend>
      {conflict ? <div className="space-y-2 rounded-lg border p-3"><p>Latest saved values:</p><p className="whitespace-pre-wrap text-sm">{conflict.text}</p><Button type="button" variant="outline" onClick={() => { setVersion(conflict.version); setConflict(null); mutation.reset() }}>I reviewed these values; keep my edits</Button></div> : null}
      <Field><Label htmlFor="research-name"><RequiredFieldName>{kind === 'project' ? 'Project name' : 'Experiment title'}</RequiredFieldName></Label><Input id="research-name" aria-invalid={Boolean(form.formState.errors.name)} aria-describedby="research-name-error" {...form.register('name')} /><FieldError id="research-name-error">{form.formState.errors.name?.message}</FieldError></Field>
      {kind === 'project' ? <Field><Label htmlFor="research-description">Description (optional)</Label><Textarea id="research-description" aria-invalid={Boolean(form.formState.errors.description)} aria-describedby="research-description-error" {...form.register('description')} /><FieldError id="research-description-error">{form.formState.errors.description?.message}</FieldError></Field> : <>
        {!editing ? <Field><Label htmlFor="research-project"><RequiredFieldName>Project</RequiredFieldName></Label><Controller name="projectId" control={form.control} render={({ field }) => <ResearchProjectSelect required value={field.value} onChange={field.onChange} invalid={Boolean(form.formState.errors.projectId)} describedBy="research-project-error" />} /><FieldError id="research-project-error">{form.formState.errors.projectId?.message}</FieldError></Field> : null}
        <Field><Label htmlFor="research-date">Experiment date (optional)</Label><Input id="research-date" type="date" {...form.register('date')} /></Field>
        {kind === 'copy' ? <p className="text-sm text-muted-foreground">Copy section layout, Purpose and Method text, and empty table structures. Prior observations, results, files, and history are cleared.</p> : null}
      </>}
    </fieldset></form>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void guard.close(onClose)}>Cancel</Button><Button form="research-record-form" type="submit" disabled={mutation.isPending || Boolean(conflict) || editing && !form.formState.isDirty}>{mutation.isPending ? 'Saving…' : editing ? 'Save changes' : kind === 'copy' ? 'Copy setup' : heading}</Button></RequiredDialogFooter>
  </DialogContent></Dialog></DialogReturnFocus>
}
