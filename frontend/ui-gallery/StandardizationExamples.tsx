import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { NativeSelect } from '#/components/ui/native-select'
import { Input } from '#/components/ui/input'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { Button } from '#/components/ui/button'
import { DetailField, DetailHeading, DetailSummary } from '#/components/ui/detail-summary'
import { StatusBadge } from '#/components/ui/status-badge'
import { OrderStatusBadge } from '#/features/orders/OrderStatusBadge'
import { GovernanceStatusBadge, ProvisioningStatusBadge } from '#/features/data-provisioning/DataStatusBadge'
import { RecordPagination } from '#/components/RecordPagination'
import { CountFreePagination } from '#/components/ui/pagination-footer'
import { formatByteSize, formatDisplayCurrency, formatDisplayDate, formatDisplayNumber, formatDisplayTimestamp } from '#/lib/display-format'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogReturnFocus, DialogTitle } from '#/components/ui/dialog'

export function StandardizationExamples() {
  const form=useForm({defaultValues:{reference:'EXAMPLE-001',kind:'research',verified:false},mode:'onTouched'})
  const [saved,setSaved]=useState('No example saved.'),[page,setPage]=useState(1),[feedPage,setFeedPage]=useState(1)
  const [confirm,setConfirm]=useState(false)
  return <div className="space-y-6">
    <form onSubmit={form.handleSubmit(v=>setSaved(`${v.reference} · ${v.kind} · verified: ${v.verified}`))} noValidate className="space-y-4" aria-label="Native registered form example">
      <RequiredLegend />
      <div className="grid gap-4 @min-[40rem]:grid-cols-2">
        <Field><Label htmlFor="native-reference"><RequiredFieldName>Registered reference</RequiredFieldName></Label><Input id="native-reference" required {...form.register('reference',{required:'Enter a reference.'})} aria-invalid={Boolean(form.formState.errors.reference)} aria-describedby={form.formState.errors.reference?'native-reference-error':undefined} /><FieldError reserveSpace id="native-reference-error">{form.formState.errors.reference?.message}</FieldError></Field>
        <Field><Label htmlFor="native-kind">Registered category</Label><NativeSelect id="native-kind" {...form.register('kind')}><option value="research">Research</option><option value="laboratory">Laboratory</option></NativeSelect></Field>
      </div>
      <Label><NativeCheckbox {...form.register('verified')} />I reviewed this fictional record and its retained evidence.</Label>
      <Button type="submit">Save registered example</Button><p role="status" className="text-sm">{saved}</p>
    </form>
    <Field><Label htmlFor="touch-input-example">Touch input example</Label><Input id="touch-input-example" controlSize="touch" placeholder="44 px authentication-sized control" /></Field>
    <div><Button id="conditional-dialog-trigger" variant="outline" onClick={()=>setConfirm(true)}>Open conditional confirmation</Button>
      {confirm?<DialogReturnFocus target={null} fallbackId="conditional-dialog-trigger"><Dialog open onOpenChange={setConfirm}><DialogContent onOpenAutoFocus={event=>{event.preventDefault();document.getElementById('conditional-dialog-cancel')?.focus()}}>
        <DialogHeader><DialogTitle>Conditional confirmation example</DialogTitle></DialogHeader><div><DialogDescription>This fictional dialog is removed when closed. Focus must return to the surviving invoking button.</DialogDescription></div>
        <DialogFooter><Button id="conditional-dialog-cancel" variant="outline" onClick={()=>setConfirm(false)}>Cancel</Button><Button onClick={()=>setConfirm(false)}>Confirm example</Button></DialogFooter>
      </DialogContent></Dialog></DialogReturnFocus>:null}
    </div>
    <div className="space-y-3"><DetailHeading>Data display and missing values</DetailHeading><DetailSummary>
      <DetailField label="Binary file size" value={formatByteSize(1536)} />
      <DetailField label="Large file size" value={formatByteSize(1024**4)} />
      <DetailField label="Recorded calendar day" value={formatDisplayDate('2026-10-22',{timeZone:'America/Los_Angeles'})} />
      <DetailField label="UTC timestamp" value={formatDisplayTimestamp('2026-10-22T00:05:07Z',{timeZone:'UTC',seconds:true})} />
      <DetailField label="Pacific timestamp" value={formatDisplayTimestamp('2026-10-22T00:05:07Z',{timeZone:'America/Los_Angeles',seconds:true})} />
      <DetailField label="Scientific quantity (µg)" value={formatDisplayNumber(0.000125)} />
      <DetailField label="Zero amount" value={formatDisplayCurrency(0,'USD')} />
      <DetailField label="Recorded count" value={0} /><DetailField label="Recall flagged" value={false} /><DetailField label="Unrecorded value" value={null} />
      <DetailField label="Long identifier" value={`EXAMPLE-${'ABCDEFGHIJKLMNOPQRSTUVWXYZ-'.repeat(4)}`} mono />
    </DetailSummary></div>
    <div className="space-y-3"><DetailHeading>Explicit status meanings</DetailHeading><div className="flex flex-wrap items-center gap-3" role="group" aria-label="Semantic status examples">
      <OrderStatusBadge status="Cancelled" /><OrderStatusBadge status="Failed" /><OrderStatusBadge status="OutputReview" /><OrderStatusBadge status="Released" />
      <ProvisioningStatusBadge status="Quarantined" /><ProvisioningStatusBadge status="Succeeded" /><GovernanceStatusBadge status="Open" /><GovernanceStatusBadge status="ConfirmedUnsafe" />
      <StatusBadge tone="info">Simulation completed · scientific review and release remain separate</StatusBadge>
    </div></div>
    <div><DetailHeading>Counted pages</DetailHeading><RecordPagination label="Counted standardization pages" data={{page,pageSize:10,totalCount:25}} busy={false} onPage={setPage} /></div>
    <div><DetailHeading>Pages without a supplied total</DetailHeading><CountFreePagination label="Count-free standardization pages" page={feedPage} hasNext={feedPage<3} busy={false} onPage={setFeedPage} /></div>
  </div>
}
