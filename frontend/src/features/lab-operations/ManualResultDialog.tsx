import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { uploadPlatformLabResult } from '#/api/order-management'
import type { ScientificWorkspace } from '#/api/lab-scientific-evidence'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { EvidenceError } from './InvestigationEvidence'

const schema = z.object({ file: z.custom<FileList>(v => v instanceof FileList && v.length === 1, 'Choose one result file.'), analysisProfile: z.string().trim().min(1), pipelineVersion: z.string().trim().min(1), provenance: z.string().trim().min(1), qcStatus: z.string().trim().min(1), wholeFile: z.boolean(), locator: z.string().trim().max(1000) }).superRefine((v, ctx) => { if (!v.wholeFile && (!v.locator || v.locator === '*')) ctx.addIssue({ code: 'custom', path: ['locator'], message: 'Identify the exact row, entry or range for this sample, or select Entire file.' }) })
export function ManualResultDialog({ data, analysisId, close }: { data: ScientificWorkspace; analysisId: string; close: () => void }) {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { analysisProfile: '', pipelineVersion: '', provenance: '', qcStatus: '', wholeFile: false, locator: '' } })
  const client = useQueryClient()
  const mutation = useMutation({ retry: false, mutationFn: (v: z.infer<typeof schema>) => uploadPlatformLabResult(data.orderId, data.submittedSampleId, { file: v.file[0], analysisProfile: v.analysisProfile, pipelineVersion: v.pipelineVersion, provenance: v.provenance, qcStatus: v.qcStatus, labAnalysisRunId: analysisId, resultLocator: v.wholeFile ? '*' : v.locator }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-investigation', data.workOrderId, data.specimenId] }); close() } })
  const dismiss = () => { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard the unsaved result upload?'))) close() }
  useBlocker({ shouldBlockFn: () => mutation.isPending || form.formState.isDirty && !window.confirm('Discard the unsaved result upload?'), enableBeforeUnload: () => form.formState.isDirty || mutation.isPending })
  return <Dialog open onOpenChange={open => { if (!open) dismiss() }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Upload result</DialogTitle><DialogDescription>This file will be linked to the selected analysis run and sample. Uploading does not release or approve it.</DialogDescription></DialogHeader>
    <form id="manual-result" noValidate onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-3"><fieldset disabled={mutation.isPending} className="space-y-3"><div><Label htmlFor="manual-file"><RequiredFieldName>Result file</RequiredFieldName></Label><Input id="manual-file" type="file" {...form.register('file')} aria-describedby="manual-file-error" /><FieldError id="manual-file-error">{form.formState.errors.file?.message}</FieldError></div>
      {(['analysisProfile', 'pipelineVersion', 'provenance', 'qcStatus'] as const).map((name, index) => <div key={name}><Label htmlFor={`manual-${name}`}><RequiredFieldName>{['Analysis profile', 'Pipeline version', 'Provenance', 'QC status'][index]}</RequiredFieldName></Label><Input id={`manual-${name}`} required {...form.register(name)} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={`manual-${name}-error`} /><FieldError id={`manual-${name}-error`}>{form.formState.errors[name]?.message}</FieldError></div>)}
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register('wholeFile')} />Entire file belongs to this sample</label>{!form.watch('wholeFile') ? <div><Label htmlFor="manual-locator"><RequiredFieldName>Sample row, entry or range</RequiredFieldName></Label><Input id="manual-locator" required {...form.register('locator')} aria-invalid={Boolean(form.formState.errors.locator)} aria-describedby="manual-locator-error" /><FieldError id="manual-locator-error">{form.formState.errors.locator?.message}</FieldError></div> : null}</fieldset>{mutation.isError ? <EvidenceError error={mutation.error} /> : null}</form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={dismiss}>Cancel</Button><Button form="manual-result" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Uploading…' : 'Upload result'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
