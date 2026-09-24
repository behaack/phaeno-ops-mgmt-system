import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import { ChevronDown } from 'lucide-react'
import { getLabSteps } from '#/api/lab-steps'
import { getKitAssemblyWorkflows, saveKitAssemblyWorkflow, approveKitAssemblyWorkflow, kitAssemblyWorkflowsKey, type KitAssemblyWorkflow } from '#/api/lab-kit-assembly'
import { transportationKitProductTypeId, useSupplierCatalog } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

const schema = z.object({
  finishedKitProductId: z.string().uuid('Choose the finished Phaeno kit product.'),
  stepVersionIds: z.array(z.string().uuid('Choose an approved Lab step.')).min(1, 'Add at least one Lab step.'),
  components: z.array(z.object({ supplierProductId: z.string().uuid('Choose a component product.'), quantity: z.number().int().min(1, 'Use a positive whole-number quantity.') })).min(2, 'Add the tube and outer shipper.'),
}).superRefine((value, context) => {
  if (new Set(value.stepVersionIds).size !== value.stepVersionIds.length) context.addIssue({ code: 'custom', path: ['stepVersionIds'], message: 'List each Lab step version once.' })
  if (new Set(value.components.map(item => item.supplierProductId)).size !== value.components.length) context.addIssue({ code: 'custom', path: ['components'], message: 'List each component once.' })
})
type Values = z.infer<typeof schema>

export function KitAssemblyWorkflowSettings({ canManage, actorId, isPlatformAdmin }: { canManage: boolean; actorId?: string; isPlatformAdmin: boolean }) {
  const query = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows })
  const client = useQueryClient()
  const [editor, setEditor] = useState<'new' | KitAssemblyWorkflow | null>(null)
  const [approval, setApproval] = useState<KitAssemblyWorkflow | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const approve = useMutation({ mutationFn: async () => approveKitAssemblyWorkflow(approval!.id, approval!.revisions[0].id, approval!.version, overrideReason || undefined), onSuccess: async () => { setApproval(null); setOverrideReason(''); await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }) } })
  return <>
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Transportation kit assembly workflows</CardTitle><CardDescription>One controlled workflow per finished Phaeno kit product. Each approved revision fixes ordered Lab steps and the exact component bill of materials.</CardDescription></div>{canManage ? <Button onClick={() => setEditor('new')}>New workflow</Button> : null}</div></CardHeader><CardContent className="space-y-3">
      {query.isPending ? <p role="status">Loading kit workflows…</p> : null}
      {query.error ? <Alert variant="destructive"><AlertTitle>Kit workflows unavailable</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh and try again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {query.data?.length ? <ul className="divide-y">{query.data.map(workflow => { const latest = workflow.revisions[0]; return <li key={workflow.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div><p className="font-medium">{workflow.productSku} · {workflow.productName}</p><p className="mt-1 text-sm text-muted-foreground">Revision {latest.revision} · {latest.steps.length} steps · {latest.components.length} components</p><details className="mt-2 text-sm"><summary className="cursor-pointer">Revision history and BOM</summary><ul className="mt-2 space-y-2">{workflow.revisions.map(revision => <li key={revision.id}>Revision {revision.revision} · {revision.status}<ul className="ml-5 list-disc">{revision.components.map(component => <li key={component.supplierProductId}>{component.quantity} × {component.supplierName} · {component.productNumber}</li>)}</ul></li>)}</ul></details></div><div className="flex items-center gap-2"><Badge variant="secondary">{latest.status}</Badge>{canManage && latest.status === 'Draft' ? <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={'Actions for ' + workflow.productName}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditor(workflow)}>Edit draft</DropdownMenuItem><DropdownMenuItem onSelect={() => setApproval(workflow)}>Approve</DropdownMenuItem></DropdownMenuContent></ActionMenu> : canManage ? <Button type="button" variant="outline" onClick={() => setEditor(workflow)}>New revision</Button> : null}</div></li> })}</ul> : !query.isPending && !query.error ? <p className="text-sm text-muted-foreground">No kit assembly workflows yet. Add a finished product under Phaeno, then define its approved steps and components here.</p> : null}
    </CardContent></Card>
    {editor ? <WorkflowEditor workflow={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} /> : null}
    {approval ? <Dialog open onOpenChange={open => { if (!open && !approve.isPending) setApproval(null) }}><DialogContent><DialogHeader><DialogTitle>Approve kit workflow revision {approval.revisions[0].revision}?</DialogTitle><DialogDescription>Approval fixes these Lab steps and component quantities for new kit assemblies. Existing kits retain their pinned revision.</DialogDescription></DialogHeader>{approval.revisions[0].authoredByUserId === actorId && isPlatformAdmin ? <div><Label htmlFor="kit-approval-reason"><RequiredFieldName>Administrator override reason</RequiredFieldName></Label><Input id="kit-approval-reason" className="mt-2" value={overrideReason} onChange={event => setOverrideReason(event.target.value)} maxLength={2000} /></div> : null}{approval.revisions[0].authoredByUserId === actorId && !isPlatformAdmin ? <p className="text-sm text-muted-foreground">A different administrator must approve this revision.</p> : null}{approve.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(approve.error, 'Approval failed.')}</p> : null}<RequiredDialogFooter><Button variant="outline" onClick={() => setApproval(null)}>Cancel</Button><Button disabled={approve.isPending || approval.revisions[0].authoredByUserId === actorId && (!isPlatformAdmin || !overrideReason.trim())} onClick={() => approve.mutate()}>{approve.isPending ? 'Approving…' : 'Approve revision'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
  </>
}

function WorkflowEditor({ workflow, onClose }: { workflow?: KitAssemblyWorkflow; onClose: () => void }) {
  const client = useQueryClient()
  const catalog = useSupplierCatalog()
  const labSteps = useQuery({ queryKey: ['lab-steps'], queryFn: getLabSteps })
  const finishedProducts = (catalog.data ?? []).filter(supplier => supplier.isInternalProducer).flatMap(supplier => supplier.products.filter(product => product.isActive && product.productTypeId === transportationKitProductTypeId))
  const componentProducts = (catalog.data ?? []).filter(supplier => supplier.isActive && !supplier.isInternalProducer).flatMap(supplier => supplier.products.filter(product => product.isActive && product.productTypeIsActive && (product.kind === 'Other' || product.defaultQuantityUnit?.toLowerCase() === 'each')).map(product => ({ ...product, supplierName: supplier.name })))
  const eligibleSteps = (labSteps.data ?? []).flatMap(step => step.versions.filter(version => version.status === 'Active' && plainKitStep(version.definitionJson)).map(version => ({ id: version.id, label: `${step.name} · version ${version.stepVersion}` })))
  const latest = workflow?.revisions[0]
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { finishedKitProductId: workflow?.finishedKitProductId ?? '', stepVersionIds: latest?.steps.map(step => step.labStepVersionId) ?? [''], components: latest?.components.map(item => ({ supplierProductId: item.supplierProductId, quantity: item.quantity })) ?? [{ supplierProductId: '', quantity: 1 }, { supplierProductId: '', quantity: 1 }] } })
  const components = useFieldArray({ control: form.control, name: 'components' })
  const save = useMutation({ mutationFn: (value: Values) => saveKitAssemblyWorkflow({ ...value, workflowVersion: workflow?.version }), onSuccess: async () => { await client.invalidateQueries({ queryKey: kitAssemblyWorkflowsKey }); onClose() } })
  const values = form.watch()
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{workflow ? latest?.status === 'Draft' ? 'Edit kit workflow draft' : 'Create kit workflow revision' : 'New kit assembly workflow'}</DialogTitle><DialogDescription>Choose instruction-only approved Lab steps. The structured component list is the bill of materials for one physical kit. A different administrator approves this revision.</DialogDescription></DialogHeader>
    {save.error ? <Alert variant="destructive"><AlertTitle>Workflow was not saved</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Review the entries and try again.')}</AlertDescription></Alert> : null}
    <form id="kit-workflow-editor" className="space-y-5" noValidate onSubmit={form.handleSubmit(value => save.mutate(value))}>
      <div><Label htmlFor="kit-workflow-product"><RequiredFieldName>Finished Phaeno kit product</RequiredFieldName></Label><select id="kit-workflow-product" className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={Boolean(workflow) || save.isPending} {...form.register('finishedKitProductId')}><option value="">Select product</option>{finishedProducts.map(product => <option key={product.id} value={product.id}>{product.productNumber} · {product.description}</option>)}</select>{errors.finishedKitProductId ? <p role="alert" className="text-sm text-destructive">{errors.finishedKitProductId.message}</p> : null}</div>
      <fieldset className="space-y-2"><legend className="font-medium"><RequiredFieldName>Ordered Lab steps</RequiredFieldName></legend><p className="text-xs text-muted-foreground">Only active instruction-only steps can be used here; sample and preparation-batch captures are excluded.</p>{values.stepVersionIds.map((id, index) => <div key={`${index}-${id}`} className="flex gap-2"><select aria-label={`Assembly step ${index + 1}`} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={id} onChange={event => form.setValue(`stepVersionIds.${index}`, event.target.value, { shouldDirty: true, shouldValidate: true })}><option value="">Select approved step</option>{eligibleSteps.map(step => <option key={step.id} value={step.id}>{step.label}</option>)}</select><Button type="button" variant="outline" disabled={index === 0} onClick={() => { const next = [...values.stepVersionIds]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; form.setValue('stepVersionIds', next, { shouldDirty: true }) }}>↑</Button><Button type="button" variant="outline" disabled={values.stepVersionIds.length <= 1} onClick={() => form.setValue('stepVersionIds', values.stepVersionIds.filter((_, i) => i !== index), { shouldDirty: true })}>Remove</Button></div>)}<Button type="button" variant="outline" onClick={() => form.setValue('stepVersionIds', [...values.stepVersionIds, ''], { shouldDirty: true })}>Add step</Button>{errors.stepVersionIds ? <p role="alert" className="text-sm text-destructive">{errors.stepVersionIds.message}</p> : null}</fieldset>
      <fieldset className="space-y-2"><legend className="font-medium"><RequiredFieldName>Components for one kit</RequiredFieldName></legend>{components.fields.map((field, index) => <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_6rem_auto]"><select aria-label={`Component ${index + 1}`} className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm" {...form.register(`components.${index}.supplierProductId`)}><option value="">Select component</option>{componentProducts.map(product => <option key={product.id} value={product.id}>{product.supplierName} · {product.productNumber} ({product.productTypeName})</option>)}</select><Input type="number" min={1} step={1} aria-label={`Component ${index + 1} quantity`} {...form.register(`components.${index}.quantity`, { valueAsNumber: true })} /><Button type="button" variant="outline" disabled={components.fields.length <= 2} onClick={() => components.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" onClick={() => components.append({ supplierProductId: '', quantity: 1 })}>Add component</Button>{errors.components ? <p role="alert" className="text-sm text-destructive">{errors.components.message}</p> : null}<p className="text-xs text-muted-foreground">Include one tube product with the number of physical tubes, one outer shipper, and any other required products. Quantities must match the shipping specification before it can be active.</p></fieldset>
    </form><RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" form="kit-workflow-editor" disabled={save.isPending || catalog.isPending || labSteps.isPending}>{save.isPending ? 'Saving…' : 'Save draft'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function plainKitStep(json: string) {
  try { const definition = JSON.parse(json); const step = definition.steps?.[0]; return step && !step.captures?.length && !step.inputMaterials?.length && !step.preparedOutputs?.length && !step.equipmentTypes?.length && !step.qcGate && !step.attachmentRequired } catch { return false }
}
