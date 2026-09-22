import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getAssemblyInputs, startAssembly, type AssemblyAvailability, type AssemblyJob } from '#/api/lab-assembly'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'

const schema = z.object({ selection: z.string().min(1, 'Choose a sample and sequencing run.'), recipeKey: z.string().min(1, 'Choose a recipe.'),
  inputIds: z.array(z.string().uuid()).min(1, 'Select at least one input.'), reason: z.string().trim().max(2000) })
type Values = z.infer<typeof schema>
const selectStyle = 'h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring'

export function AssemblyStartDialog({ availability, previous, workOrderId, specimenId, onClose }: {
  availability: AssemblyAvailability; previous?: AssemblyJob; workOrderId?: string; specimenId?: string; onClose: () => void
}) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const inputs = useQuery({ queryKey: ['assembly-inputs', workOrderId, specimenId], queryFn: () => getAssemblyInputs(workOrderId, specimenId) })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { selection: '', recipeKey: availability.recipes[0]?.key ?? '', inputIds: [], reason: '' } })
  const selection = form.watch('selection')
  const selectedIds = form.watch('inputIds')
  const candidates = (inputs.data ?? []).filter(i => !previous || i.labSpecimenId === previous.labSpecimenId && i.sequencingRunNumber === previous.sequencingRunNumber)
  const keyOf = (input: typeof candidates[number]) => `${input.labSpecimenId}:${input.sequencingRunNumber}:${input.labSpecimenAttemptId}`
  const groups = [...new Map(candidates.map(i => [keyOf(i), i])).entries()]
  const selected = candidates.filter(i => keyOf(i) === selection)
  const mutation = useMutation({ mutationFn: async (value: Values) => {
    if (previous && !value.reason) { form.setError('reason', { message: 'Explain why another attempt is needed.' }); throw new Error('A retry reason is required.') }
    const sample = selected[0]
    if (!sample || value.inputIds.some(id => !selected.some(i => i.id === id))) throw new Error('Choose inputs from the selected sample and run.')
    return startAssembly(sample.labWorkOrderId, { id: requestId, labSpecimenId: sample.labSpecimenId, sequencingRunNumber: sample.sequencingRunNumber,
      recipeKey: value.recipeKey, sequencingOutputIds: value.inputIds, previousJobId: previous?.id, reason: previous ? value.reason : undefined })
  }, onSuccess: async job => {
    await client.invalidateQueries({ queryKey: ['assembly-jobs'] })
    onClose()
    await navigate({ to: '/lab-operations/assembly-jobs/$jobId', params: { jobId: job.id }, search: p => ({ ...p, section: 'assembly', assemblyTab: 'runs' }) })
  } })
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>{previous ? 'Repeat assembly' : 'Start assembly'}</DialogTitle><DialogDescription>Choose registered inputs for one sample and sequencing run. Processing continues after you leave this page.</DialogDescription>
      {mutation.error || inputs.error ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(mutation.error ?? inputs.error, 'Assembly could not be requested.')}</AlertDescription></Alert> : null}
    </DialogHeader>
    <form id="assembly-start" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))} className="space-y-4">
      <div className="space-y-1"><Label htmlFor="assembly-run"><RequiredFieldName>Sample and run</RequiredFieldName></Label>
        <select id="assembly-run" className={selectStyle} {...form.register('selection', { onChange: () => form.setValue('inputIds', []) })} aria-invalid={Boolean(form.formState.errors.selection)} aria-describedby="assembly-run-error">
          <option value="">{inputs.isPending ? 'Loading sequencing inputs…' : 'Choose a sequencing run'}</option>
          {groups.map(([key, input]) => <option key={key} value={key}>{input.sampleName ?? 'Unaccessioned sample'} · Run {input.sequencingRunNumber} · {input.providerRunReference}</option>)}
        </select><p id="assembly-run-error" className="text-sm text-destructive">{form.formState.errors.selection?.message}</p>
        {!inputs.isPending && !groups.length ? <p className="text-sm text-muted-foreground">Register sequencing output in the sample's Scientific evidence before requesting assembly.</p> : null}
      </div>
      <div className="space-y-1"><Label htmlFor="assembly-recipe"><RequiredFieldName>Processing recipe</RequiredFieldName></Label>
        <select id="assembly-recipe" className={selectStyle} {...form.register('recipeKey')} aria-invalid={Boolean(form.formState.errors.recipeKey)} aria-describedby="assembly-recipe-error">
          <option value="">Choose a recipe</option>{availability.recipes.map(r => <option key={r.key} value={r.key}>{r.name} · {r.version}</option>)}
        </select><p id="assembly-recipe-error" className="text-sm text-destructive">{form.formState.errors.recipeKey?.message}</p>
      </div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium"><RequiredFieldName>Sequencing inputs</RequiredFieldName></legend>
        {selected.map(input => <Label key={input.id} className="flex cursor-pointer items-start gap-2 rounded border p-3">
          <Checkbox checked={selectedIds.includes(input.id)} onCheckedChange={checked => form.setValue('inputIds', checked ? [...selectedIds, input.id] : selectedIds.filter(id => id !== input.id), { shouldValidate: true })} />
          <span className="min-w-0 break-words">{input.sampleMappingReference}<span className="block text-xs text-muted-foreground">{input.providerRunReference} · {input.sizeBytes.toLocaleString()} bytes</span></span>
        </Label>)}<p className="text-sm text-destructive" role="alert">{form.formState.errors.inputIds?.message}</p>
      </fieldset>
      {previous ? <div className="space-y-1"><Label htmlFor="assembly-reason"><RequiredFieldName>Reason for another attempt</RequiredFieldName></Label><Textarea id="assembly-reason" {...form.register('reason')} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="assembly-reason-error" /><p id="assembly-reason-error" className="text-sm text-destructive">{form.formState.errors.reason?.message}</p></div> : null}
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</Button><Button type="submit" form="assembly-start" disabled={mutation.isPending || !availability.available}>{mutation.isPending ? 'Requesting…' : 'Start assembly'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
