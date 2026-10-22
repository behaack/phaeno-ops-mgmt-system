import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { RecordPagination, useRecordListState } from '#/components/RecordPagination'
import { useSearch } from '@tanstack/react-router'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

import { assignOperationalAttention, listAttentionPage, resolveOperationalAttention } from '#/api/pseq-order-to-cash'
export { FinanceOperationsPanel } from './FinanceOperationsPanel'
import { getOrderErrorMessage, isOrderFeatureDisabled } from '#/api/order-management'
import { OrderFeatureNotEnabled } from './OrderFeatureNotEnabled'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'


export function OperationalAttentionPanel({
  apiEnabled,
  userId,
  canBill = false,
  canManageCash = false,
  canReconcile = false,
}: {
  apiEnabled: boolean
  userId: string | null
  canBill?: boolean
  canManageCash?: boolean
  canReconcile?: boolean
}) {
  const list = useRecordListState()
  const search = useSearch({ strict: false })
  const client = useQueryClient()
  const [category, setCategory] = useState('')
  const [resolveId, setResolveId] = useState<string | null>(null)
  const form = useForm<{ resolution: string }>({ resolver: zodResolver(z.object({ resolution: z.string().trim().min(1, 'Enter the resolution.').max(4000) })), defaultValues: { resolution: '' } })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting)

  const opener = useRef<HTMLButtonElement | null>(null)
  const pageQuery = useQuery({
    queryKey: ['operational-attention', category, list.page, search.attentionId, search.attentionSource, search.sourceId],
    queryFn: () => listAttentionPage(category, list.page, search.attentionId, search.attentionSource, search.sourceId),
    enabled: apiEnabled,
  })
  const query = { ...pageQuery, data: pageQuery.data?.items }
  const refresh = () => client.invalidateQueries({ queryKey: ['operational-attention'] })
  const assign = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      assignOperationalAttention(id, userId, version),
    onSuccess: refresh,
  })
  const resolve = useMutation({
    mutationFn: ({ id, version, resolution }: { id: string; version: number; resolution: string }) =>
      resolveOperationalAttention(id, resolution, version),
    onSuccess: async () => {
      setResolveId(null)
      form.reset()
      await refresh()
    },
  })
  const error = query.error ?? assign.error
  const selected = query.data?.find(item => item.id === resolveId)
  if (isOrderFeatureDisabled(query.error, 'attention_operations_disabled')) {
    return <Card><CardHeader><CardTitle><CustomerSourceText source={"Owned attention queues"} /></CardTitle></CardHeader><CardContent><OrderFeatureNotEnabled feature="Attention queues" /></CardContent></Card>
  }
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle><CustomerSourceText source={"Owned attention queues"} /></CardTitle>
        <CardDescription>
          <CustomerSourceText source={"Failures and blockers stay visible until an operator owns and resolves them."} />
        </CardDescription>
        <PortalField className="max-w-sm pt-2">
          <Label htmlFor="attention-category"><CustomerSourceText source={"Queue"} /></Label>
          <NativeSelect id="attention-category" className="w-full" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value=""><CustomerSourceText source={"All attention"} /></option>
            <option value="InvitationFailure"><CustomerSourceText source={"Invitation failures"} /></option>
            <option value="ReadinessBlocker"><CustomerSourceText source={"Readiness blockers"} /></option>
            <option value="StagedOrderAwaitingAdminOrApproval"><CustomerSourceText source={"Pricing and held orders"} /></option>
            <option value="ProjectionOrScanningFailure"><CustomerSourceText source={"Projection and scanning failures"} /></option>
            <option value="ScientificallyApprovedUnreleased"><CustomerSourceText source={"Approved, unreleased results"} /></option>
            <option value="OverdueInvoice"><CustomerSourceText source={"Overdue invoices"} /></option>
            <option value="UnappliedCash"><CustomerSourceText source={"Unapplied cash"} /></option>
            <option value="ReconciliationDifference"><CustomerSourceText source={"Reconciliation differences"} /></option>
            <option value="RetentionNoticeFailure"><CustomerSourceText source={"Retention notices"} /></option>
          </NativeSelect>
        </PortalField>
      </CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Attention queue could not be updated"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(error, 'Refresh and try again.')} />}</AlertDescription></Alert> : null}
        {query.isLoading || query.isFetching ? <p role="status" className="py-4 text-sm text-muted-foreground"><CustomerSourceText source={"Checking attention queues…"} /></p> : null}
        <div className="divide-y">
          {query.data?.map((item) => (
            <article key={item.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant={item.ownerUserId ? 'secondary' : 'outline'}>{item.ownerUserId === userId ? <CustomerSourceText source={"Owned by you"} /> : item.ownerUserId ? 'Owned' : 'Unassigned'}</Badge>
                  </div>
                  <h3 className="mt-2 font-medium">{item.summary}</h3>
                  <p className="mt-1 text-sm text-muted-foreground"><CustomerSourceText source={"Age"} /> {item.ageDays} <CustomerSourceText source={"day(s) · Attempts"} /> {item.attemptCount} <CustomerSourceText source={"· Status"} /> {item.status}</p>
                  <p className="mt-2 text-sm"><strong><CustomerSourceText source={"Next action:"} /></strong> {item.nextAction}</p>
                </div>
                <ActionMenu><DropdownMenuTrigger asChild><Button id={`attention-${item.id}`} variant="outline" size="sm"><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                  {item.sourceType === 'Invoice' && canBill ? <DropdownMenuItem asChild><Link to="/finance/$kind/$recordId" params={{ kind: 'invoice', recordId: item.sourceId }} search={previous => ({ ...previous, financeSection: 'invoices' })}><CustomerSourceText source={"Open invoice"} /></Link></DropdownMenuItem> : null}
                  {item.sourceType === 'PaymentReceipt' && canManageCash ? <DropdownMenuItem asChild><Link to="/finance/$kind/$recordId" params={{ kind: 'receipt', recordId: item.sourceId }} search={previous => ({ ...previous, financeSection: 'receipts' })}><CustomerSourceText source={"Open receipt"} /></Link></DropdownMenuItem> : null}
                  {item.sourceType === 'ReconciliationBatch' && (canManageCash || canReconcile) ? <DropdownMenuItem asChild><Link to="/finance/$kind/$recordId" params={{ kind: 'reconciliation', recordId: item.sourceId }} search={previous => ({ ...previous, financeSection: 'reconciliation' })}><CustomerSourceText source={"Open reconciliation"} /></Link></DropdownMenuItem> : null}
                  {item.ownerUserId !== userId ? <DropdownMenuItem disabled={!userId || assign.isPending} onSelect={() => assign.mutate({ id: item.id, version: item.version })}><CustomerSourceText source={"Assign to me"} /></DropdownMenuItem> : null}
                  <DropdownMenuItem disabled={resolve.isPending} onSelect={() => { opener.current = document.getElementById(`attention-${item.id}`) as HTMLButtonElement; form.reset(); resolve.reset(); setResolveId(item.id) }}><CustomerSourceText source={"Resolve"} /></DropdownMenuItem>
                </DropdownMenuContent></ActionMenu>
              </div>
            </article>
          ))}
        </div>
        {!query.isLoading && !query.isError && !query.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground"><CustomerSourceText source={"No unresolved items in this queue."} /></p> : null}
<RecordPagination data={pageQuery.data} busy={pageQuery.isFetching} onPage={page => list.change({ listPage: page })} />
      </CardContent>
    </Card>
    <Dialog open={Boolean(resolveId)} onOpenChange={open => { if (open) (open => { if (!open && !resolve.isPending) setResolveId(null) })(open); else void __modalGuard.close(() => (open => { if (!open && !resolve.isPending) setResolveId(null) })(false)) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}><DialogHeader><DialogTitle><CustomerSourceText source={"Resolve attention item"} /></DialogTitle><DialogDescription>{selected?.summary ?? 'Review and describe how the underlying issue was resolved.'}</DialogDescription></DialogHeader>{resolve.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Resolution was not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(resolve.error, 'Review the current item and try again.')} />}</AlertDescription></Alert> : null}<form id="resolve-attention" onSubmit={form.handleSubmit(values => { if (selected) resolve.mutate({ id: selected.id, version: selected.version, ...values }) })}><Label htmlFor="attention-resolution"><RequiredFieldName><CustomerSourceText source={"Resolution"} /></RequiredFieldName></Label><Input id="attention-resolution" className="mt-2" aria-invalid={Boolean(form.formState.errors.resolution)} aria-describedby="attention-resolution-error" {...form.register('resolution')} />{form.formState.errors.resolution ? <p id="attention-resolution-error" role="alert" className="mt-2 text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.resolution.message} />}</p> : null}</form><RequiredDialogFooter><DialogClose asChild><Button variant="outline" disabled={resolve.isPending}><CustomerSourceText source={"Cancel"} /></Button></DialogClose><Button type="submit" form="resolve-attention" disabled={!selected || resolve.isPending}><CustomerSourceText source={"Save resolution"} /></Button></RequiredDialogFooter></DialogContent></Dialog>
    </>
  )
}
