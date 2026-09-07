import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

import { assignOperationalAttention, listOperationalAttention, resolveOperationalAttention } from '#/api/pseq-order-to-cash'
export { FinanceOperationsPanel } from './FinanceOperationsPanel'
import { getOrderErrorMessage } from '#/api/order-management'
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
}: {
  apiEnabled: boolean
  userId: string | null
}) {
  const client = useQueryClient()
  const [category, setCategory] = useState('')
  const [resolveId, setResolveId] = useState<string | null>(null)
  const form = useForm<{ resolution: string }>({ resolver: zodResolver(z.object({ resolution: z.string().trim().min(1, 'Enter the resolution.').max(4000) })), defaultValues: { resolution: '' } })
  const opener = useRef<HTMLButtonElement | null>(null)
  const query = useQuery({
    queryKey: ['operational-attention', category],
    queryFn: () => listOperationalAttention(category),
    enabled: apiEnabled,
  })
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
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Owned attention queues</CardTitle>
        <CardDescription>
          Failures and blockers stay visible until an operator owns and resolves them.
        </CardDescription>
        <div className="max-w-sm pt-2">
          <Label htmlFor="attention-category">Queue</Label>
          <select id="attention-category" className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All attention</option>
            <option value="InvitationFailure">Invitation failures</option>
            <option value="ReadinessBlocker">Readiness blockers</option>
            <option value="StagedOrderAwaitingAdminOrApproval">Pricing and held orders</option>
            <option value="ProjectionOrScanningFailure">Projection and scanning failures</option>
            <option value="ScientificallyApprovedUnreleased">Approved, unreleased results</option>
            <option value="OverdueInvoice">Overdue invoices</option>
            <option value="UnappliedCash">Unapplied cash</option>
            <option value="ReconciliationDifference">Reconciliation differences</option>
            <option value="RetentionNoticeFailure">Retention notices</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive"><AlertTitle>Attention queue could not be updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Refresh and try again.')}</AlertDescription></Alert> : null}
        {query.isLoading || query.isFetching ? <p role="status" className="py-4 text-sm text-muted-foreground">Checking attention queues…</p> : null}
        <div className="divide-y">
          {query.data?.map((item) => (
            <article key={item.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant={item.ownerUserId ? 'secondary' : 'outline'}>{item.ownerUserId === userId ? 'Owned by you' : item.ownerUserId ? 'Owned' : 'Unassigned'}</Badge>
                  </div>
                  <h3 className="mt-2 font-medium">{item.summary}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Age {item.ageDays} day(s) · Attempts {item.attemptCount} · Status {item.status}</p>
                  <p className="mt-2 text-sm"><strong>Next action:</strong> {item.nextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.ownerUserId !== userId ? <Button type="button" size="sm" variant="outline" disabled={!userId || assign.isPending} onClick={() => assign.mutate({ id: item.id, version: item.version })}>Assign to me</Button> : null}
                  <Button type="button" size="sm" disabled={resolve.isPending} onClick={event => { opener.current = event.currentTarget; form.reset(); resolve.reset(); setResolveId(item.id) }}>Resolve</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!query.isLoading && !query.isError && !query.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No unresolved items in this queue.</p> : null}
      </CardContent>
    </Card>
    <Dialog open={Boolean(resolveId)} onOpenChange={open => { if (!open && !resolve.isPending) setResolveId(null) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}><DialogHeader><DialogTitle>Resolve attention item</DialogTitle><DialogDescription>{selected?.summary ?? 'Review and describe how the underlying issue was resolved.'}</DialogDescription></DialogHeader>{resolve.error ? <Alert variant="destructive"><AlertTitle>Resolution was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(resolve.error, 'Review the current item and try again.')}</AlertDescription></Alert> : null}<form id="resolve-attention" onSubmit={form.handleSubmit(values => { if (selected) resolve.mutate({ id: selected.id, version: selected.version, ...values }) })}><Label htmlFor="attention-resolution"><RequiredFieldName>Resolution</RequiredFieldName></Label><Input id="attention-resolution" className="mt-2" aria-invalid={Boolean(form.formState.errors.resolution)} aria-describedby="attention-resolution-error" {...form.register('resolution')} />{form.formState.errors.resolution ? <p id="attention-resolution-error" role="alert" className="mt-2 text-sm text-destructive">{form.formState.errors.resolution.message}</p> : null}</form><RequiredDialogFooter><DialogClose asChild><Button variant="outline" disabled={resolve.isPending}>Cancel</Button></DialogClose><Button type="submit" form="resolve-attention" disabled={!selected || resolve.isPending}>Save resolution</Button></RequiredDialogFooter></DialogContent></Dialog>
    </>
  )
}
