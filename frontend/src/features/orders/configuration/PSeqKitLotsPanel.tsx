import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage, type OrderConfiguration } from '#/api/order-management'
import { createPSeqKitLot, getPSeqKitLot, listPSeqKitLots, setPSeqKitRecall, type PSeqKitLot } from '#/api/pseq-kit-lots'
import { confirmPortal } from '#/components/PortalConfirmation'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'

export function PSeqKitLotsPanel({ configuration, lotId, enabled }: { configuration: OrderConfiguration; lotId?: string; enabled: boolean }) {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const term = search.kitLotSearch ?? ''
  const page = search.kitLotPage ?? 1
  const [searchText, setSearchText] = useState(term)
  const [dialog, setDialog] = useState<'create' | 'recall' | null>(null)
  useEffect(() => { setSearchText(term) }, [term])
  useEffect(() => {
    if (searchText === term || lotId) return
    const timer = setTimeout(() => { void navigate({ to: '/order-configuration', replace: true,
      search: previous => ({ ...previous, configurationSection: 'kit-lots', kitLotSearch: searchText.trim() || undefined, kitLotPage: 1 }) }) }, 250)
    return () => clearTimeout(timer)
  }, [searchText, term, lotId, navigate])
  const list = useQuery({ queryKey: ['pseq-kit-lots', { search: term, page }], queryFn: () => listPSeqKitLots({ search: term, page }), enabled: enabled && !lotId, placeholderData: keepPreviousData })
  const detail = useQuery({ queryKey: ['pseq-kit-lot', lotId], queryFn: () => getPSeqKitLot(lotId!), enabled: enabled && Boolean(lotId) })
  const products = configuration.catalogItems.filter(product => product.isActive && configuration.reagentOfferings.some(offering => offering.qboCatalogItemId === product.id))
  const error = lotId ? detail.error : list.error
  return <>
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{lotId ? `Kit lot ${detail.data?.lotNumber ?? ''}` : 'PSeq kit lots'}</CardTitle><CardDescription>Registered lots provide shared recall and expiration information across Partner kit orders.</CardDescription></div>
      {lotId ? <Button asChild variant="outline"><Link to="/order-configuration" search={previous => ({ ...previous, configurationSection: 'kit-lots' })}>Back to kit lots</Link></Button> : <Button disabled={!enabled || !products.length} onClick={() => setDialog('create')}>Create kit lot</Button>}</div></CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert variant="destructive"><AlertTitle>Kit lots could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Try again.')} <Button variant="outline" onClick={() => void (lotId ? detail.refetch() : list.refetch())}>Retry</Button></AlertDescription></Alert> : null}
        {(lotId ? detail.isLoading : list.isLoading) ? <p role="status">Loading kit lots…</p> : null}
        {lotId && detail.data ? <><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Product</dt><dd>{detail.data.productName}</dd></div><div><dt className="text-muted-foreground">Lot number</dt><dd>{detail.data.lotNumber}</dd></div><div><dt className="text-muted-foreground">Labeled expiration</dt><dd>{detail.data.expirationDate ?? 'Unknown'}</dd></div><div><dt className="text-muted-foreground">Recall status</dt><dd>{detail.data.isRecalled ? 'Recalled' : 'No current recall'}</dd></div></dl>
          {detail.data.recallReason ? <p className="whitespace-pre-wrap text-sm">Last recall decision: {detail.data.recallReason}</p> : null}
          <Button variant={detail.data.isRecalled ? 'outline' : 'destructive'} onClick={() => setDialog('recall')}>{detail.data.isRecalled ? 'Lift recall' : 'Recall lot'}</Button>
        </> : null}
        {!lotId ? <>
          <Field><Label htmlFor="kit-lot-search">Search lot number</Label><Input id="kit-lot-search" value={searchText} onChange={event => setSearchText(event.target.value)} /></Field>
          {!products.length ? <p className="text-sm text-muted-foreground">Configure a Partner kit offering for an active catalog product before registering its lots.</p> : null}
          {list.data ? <><div className="overflow-x-auto" aria-busy={list.isFetching}><table className="w-full text-left text-sm"><thead className="border-b"><tr><th className="p-2">Lot</th><th className="p-2">Product</th><th className="p-2">Expiration</th><th className="p-2">Recall</th></tr></thead><tbody>{list.data.items.map(lot => <tr key={lot.id} className="border-b"><td className="p-2"><Link className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring" to="/order-configuration/pseq-kit-lots/$lotId" params={{ lotId: lot.id }} search={previous => ({ ...previous, configurationSection: 'kit-lots' })}>{lot.lotNumber}</Link></td><td className="p-2">{lot.productName}</td><td className="p-2">{lot.expirationDate ?? 'Unknown'}</td><td className="p-2">{lot.isRecalled ? 'Recalled' : 'No current recall'}</td></tr>)}</tbody></table></div>
            {!list.data.items.length ? <p>{term ? 'No lots match this search.' : 'No kit lots registered.'}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{list.data.totalCount} lots · Page {page}</p><div className="flex gap-2">{[-1, 1].map(offset => <Button key={offset} variant="outline" disabled={list.isPlaceholderData || (offset < 0 ? page <= 1 : page * 25 >= list.data!.totalCount)} onClick={() => void navigate({ to: '/order-configuration', search: previous => ({ ...previous, configurationSection: 'kit-lots', kitLotPage: page + offset }) })}>{offset < 0 ? 'Previous' : 'Next'}</Button>)}</div></div>
          </> : null}
        </> : null}
      </CardContent></Card>
    {dialog === 'create' ? <CreateLotDialog products={products} onClose={() => setDialog(null)} /> : null}
    {dialog === 'recall' && detail.data ? <RecallLotDialog lot={detail.data} onClose={() => setDialog(null)} /> : null}
  </>
}

const createSchema = z.object({ catalogItemId: z.string().uuid('Choose a kit product.'), lotNumber: z.string().trim().min(1, 'Enter the printed lot number.').max(255), expirationDate: z.union([z.literal(''), z.iso.date('Enter a valid expiration date.')]) })
function CreateLotDialog({ products, onClose }: { products: OrderConfiguration['catalogItems']; onClose: () => void }) {
  const cache = useQueryClient()
  const key = useRef<string | null>(null)
  const form = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { catalogItemId: '', lotNumber: '', expirationDate: '' } })
  const mutation = useMutation({ mutationFn: (values: z.infer<typeof createSchema>) => createPSeqKitLot({ ...values, expirationDate: values.expirationDate || null }, key.current ??= crypto.randomUUID()),
    onSuccess: async () => { form.reset(); await cache.invalidateQueries({ queryKey: ['pseq-kit-lots'] }); onClose() } })
  const allowNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  async function close() { if (!mutation.isPending && (!form.formState.isDirty || await confirmPortal('Discard the unsaved kit lot?'))) { allowNavigation(); onClose() } }
  return <Dialog open onOpenChange={open => { if (!open) void close() }}><DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}><DialogHeader><DialogTitle>Create PSeq kit lot</DialogTitle><DialogDescription>Use the printed lot number and labeled expiration. Lot identity and expiration are fixed when registered; recall decisions remain audited.</DialogDescription></DialogHeader>
    <form id="create-kit-lot" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="grid gap-4">
      <Field><Label htmlFor="kit-lot-product"><RequiredFieldName>Kit product</RequiredFieldName></Label><NativeSelect id="kit-lot-product" aria-invalid={Boolean(form.formState.errors.catalogItemId)} aria-describedby="kit-lot-product-error" {...form.register('catalogItemId')}><option value="">Select product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</NativeSelect><FieldError id="kit-lot-product-error">{form.formState.errors.catalogItemId?.message}</FieldError></Field>
      <Field><Label htmlFor="kit-lot-number"><RequiredFieldName>Lot number</RequiredFieldName></Label><Input id="kit-lot-number" aria-invalid={Boolean(form.formState.errors.lotNumber)} aria-describedby="kit-lot-number-error" {...form.register('lotNumber')} /><FieldError id="kit-lot-number-error">{form.formState.errors.lotNumber?.message}</FieldError></Field>
      <Field><Label htmlFor="kit-lot-expiration">Labeled expiration (optional)</Label><Input id="kit-lot-expiration" type="date" aria-invalid={Boolean(form.formState.errors.expirationDate)} aria-describedby="kit-lot-expiration-error" {...form.register('expirationDate')} /><FieldError id="kit-lot-expiration-error">{form.formState.errors.expirationDate?.message}</FieldError></Field>
    </fieldset></form>{mutation.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'The lot was not created. Review the entries.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void close()}>Cancel</Button><Button type="submit" form="create-kit-lot" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Create lot'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
function RecallLotDialog({ lot, onClose }: { lot: PSeqKitLot; onClose: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  const cache = useQueryClient()
  const key = useRef<string | null>(null)
  const form = useForm<{ reason: string }>({ resolver: zodResolver(z.object({ reason: z.string().trim().min(1, 'Explain the recall decision.').max(2000) })), defaultValues: { reason: '' } })
  const mutation = useMutation({ mutationFn: ({ reason }: { reason: string }) => setPSeqKitRecall(lot.id, { version: lot.version, isRecalled: !lot.isRecalled, reason }, key.current ??= crypto.randomUUID()),
    onSuccess: async () => { form.reset(); await Promise.all(['pseq-kit-lot', 'pseq-kit-lots', 'reagent-order', 'platform-order', 'lab-reagent-order', 'assembly-request'].map(name => cache.invalidateQueries({ queryKey: [name] }))); onClose() } })
  const allowNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  async function close() { if (!mutation.isPending && (!form.formState.isDirty || await confirmPortal('Discard the unsaved recall decision?'))) { allowNavigation(); onClose() } }
  return <Dialog open onOpenChange={open => { if (!open) void close() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }} showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}><DialogHeader><DialogTitle>{lot.isRecalled ? 'Lift recall' : 'Recall lot'} {lot.lotNumber}?</DialogTitle></DialogHeader>
    <div><DialogDescription>{lot.isRecalled ? 'This removes the current recall warning for every kit supplied from this product lot. Earlier assessments and recall history stay recorded.' : 'This lot will show recall warnings to Partners and Phaeno, and cannot be used for new kit shipments. Earlier assembly evidence stays recorded.'} No automatic emails are sent.</DialogDescription></div>
    <form id="recall-kit-lot" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><Field><Label htmlFor="kit-recall-reason"><RequiredFieldName>Partner-visible reason</RequiredFieldName></Label><Textarea id="kit-recall-reason" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="kit-recall-reason-error" {...form.register('reason')} /><FieldError id="kit-recall-reason-error">{form.formState.errors.reason?.message}</FieldError></Field></form>
    {mutation.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'The recall decision was not saved. Refresh the lot if its status changed.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button ref={cancel} type="button" variant="outline" disabled={mutation.isPending} onClick={() => void close()}>Keep current status</Button><Button type="submit" form="recall-kit-lot" variant={lot.isRecalled ? 'default' : 'destructive'} disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : lot.isRecalled ? 'Lift recall' : 'Recall lot'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
