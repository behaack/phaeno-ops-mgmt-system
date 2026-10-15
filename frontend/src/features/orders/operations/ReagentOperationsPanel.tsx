import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { runLabManufacturingAction, type LabPSeqKitOffering } from '#/api/lab-operations'
import { getOrderErrorMessage, type ReagentOrder } from '#/api/order-management'
import { confirmPortal } from '#/components/PortalConfirmation'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { PSeqKitShipmentDialog } from './PSeqKitShipmentDialog'

export function ReagentOperationsPanel({ order, offerings, onSaved }: { order: ReagentOrder; offerings: LabPSeqKitOffering[]; onSaved: () => Promise<void> }) {
  const [dialog, setDialog] = useState<'adjustment' | 'shipment' | null>(null)
  const partnerOfferings = offerings.filter(offering => offering.partnerOrganizationId === order.organizationId)
  const mayPropose = ['Accepted', 'Processing', 'PartiallyShipped'].includes(order.status) && partnerOfferings.length > 0
    && order.lines.some(line => line.shippedQuantity === 0 && line.cancelledQuantity === 0)
  const mayShip = ['Processing', 'PartiallyShipped'].includes(order.status) && order.lines.some(line => line.remainingQuantity > 0)
  return <div className="mt-5 space-y-5"><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>PSeq kit fulfillment</CardTitle><CardDescription>Prepare and ship physical PSeq kits using registered lots.</CardDescription></div>
    <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
      {mayPropose ? <DropdownMenuItem onSelect={() => setDialog('adjustment')}>Propose substitution</DropdownMenuItem> : null}
      {mayShip ? <DropdownMenuItem onSelect={() => setDialog('shipment')}>Record shipment</DropdownMenuItem> : null}
    </DropdownMenuContent></ActionMenu></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-2 pr-3">Item</th><th className="px-3 py-2">Ordered</th><th className="px-3 py-2">Shipped</th><th className="px-3 py-2">Cancelled</th><th className="py-2 pl-3">Remaining</th></tr></thead><tbody>{order.lines.map(line => <tr key={line.id} className="border-b last:border-0"><td className="py-3 pr-3">{line.description}</td><td className="px-3 py-3">{line.quantity}</td><td className="px-3 py-3">{line.shippedQuantity}</td><td className="px-3 py-3">{line.cancelledQuantity}</td><td className="py-2 pl-3">{line.remainingQuantity}</td></tr>)}</tbody></table></div></CardContent></Card>
    {dialog === 'shipment' ? <PSeqKitShipmentDialog order={order} onSaved={onSaved} onClose={() => setDialog(null)} /> : null}
    {dialog === 'adjustment' ? <SubstitutionDialog order={order} offerings={partnerOfferings} onSaved={onSaved} onClose={() => setDialog(null)} /> : null}
  </div>
}
const schema = z.object({ originalLineId: z.string().uuid('Choose the original line.'), proposedOfferingId: z.string().uuid('Choose a substitute kit.'), reason: z.string().trim().min(1, 'Explain the substitution.').max(2000) })
function SubstitutionDialog({ order, offerings, onSaved, onClose }: { order: ReagentOrder; offerings: LabPSeqKitOffering[]; onSaved: () => Promise<void>; onClose: () => void }) {
  const lines = order.lines.filter(line => line.shippedQuantity === 0 && line.cancelledQuantity === 0)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { originalLineId: lines[0]?.id ?? '', proposedOfferingId: '', reason: '' } })
  const selected = lines.find(line => line.id === form.watch('originalLineId'))
  const mutation = useMutation({ mutationFn: (values: z.infer<typeof schema>) => runLabManufacturingAction<ReagentOrder>('reagent', `${order.id}/adjustments`, { version: order.version, ...values, quantity: selected?.remainingQuantity }),
    onSuccess: async () => { form.reset(); allowNavigation(); await onSaved(); onClose() } })
  const allowNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  async function close() { if (!mutation.isPending && (!form.formState.isDirty || await confirmPortal('Discard the unsaved substitution proposal?'))) { allowNavigation(); onClose() } }
  return <Dialog open onOpenChange={open => { if (!open) void close() }}><DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}><DialogHeader><DialogTitle>Propose PSeq kit substitution</DialogTitle><DialogDescription>Commercial review and Partner approval occur before the substitute may ship.</DialogDescription></DialogHeader>
    <form id="kit-substitution" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="grid gap-4">
      <Field><Label htmlFor="kit-substitution-original"><RequiredFieldName>Original line</RequiredFieldName></Label><NativeSelect id="kit-substitution-original" {...form.register('originalLineId')}>{lines.map(line => <option key={line.id} value={line.id}>{line.description}</option>)}</NativeSelect></Field>
      <Field><Label htmlFor="kit-substitution-product"><RequiredFieldName>Proposed PSeq kit</RequiredFieldName></Label><NativeSelect id="kit-substitution-product" aria-invalid={Boolean(form.formState.errors.proposedOfferingId)} aria-describedby="kit-substitution-product-error" {...form.register('proposedOfferingId')}><option value="">Select PSeq kit</option>{offerings.map(offering => <option key={offering.id} value={offering.id}>{offering.itemName}</option>)}</NativeSelect><FieldError id="kit-substitution-product-error">{form.formState.errors.proposedOfferingId?.message}</FieldError></Field>
      <Field><Label htmlFor="kit-substitution-quantity">Substituted quantity</Label><Input id="kit-substitution-quantity" type="number" value={selected?.remainingQuantity ?? ''} readOnly /></Field>
      <Field><Label htmlFor="kit-substitution-reason"><RequiredFieldName>Partner-visible reason</RequiredFieldName></Label><Textarea id="kit-substitution-reason" aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="kit-substitution-reason-error" {...form.register('reason')} /><FieldError id="kit-substitution-reason-error">{form.formState.errors.reason?.message}</FieldError></Field>
    </fieldset></form>{mutation.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'The proposal was not saved. Review your entries.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void close()}>Cancel</Button><Button type="submit" form="kit-substitution" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Send for commercial review'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
