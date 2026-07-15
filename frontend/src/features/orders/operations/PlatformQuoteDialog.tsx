import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage, issuePlatformQuote, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const schema = z.object({
  purpose: z.enum(['Initial', 'Change']),
  currency: z.string().trim().length(3),
  tax: z.coerce.number().nonnegative(),
  expiresAt: z.string(),
  lines: z.array(z.object({
    catalogItemId: z.string().uuid('Select a synchronized QuickBooks item.'),
    description: z.string().trim().min(1).max(500),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().nonnegative(),
  })).min(1).max(100),
})
type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>

export function PlatformQuoteDialog({
  open,
  workflow,
  recordId,
  version,
  catalogItems,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  workflow: 'lab' | 'assembly'
  recordId: string
  version: number
  catalogItems: OrderConfiguration['catalogItems']
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
}) {
  const form = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: 'Initial', currency: 'USD', tax: 0, expiresAt: '', lines: [{ catalogItemId: '', description: '', quantity: 1, unitPrice: 0 }] },
  })
  const lines = useFieldArray({ control: form.control, name: 'lines' })
  const mutation = useMutation({
    mutationFn: (values: Values) => issuePlatformQuote(workflow, recordId, { ...values, version, expiresAt: values.expiresAt || null }),
    onSuccess: async () => { await onSaved(); close() },
  })

  function selectCatalogItem(index: number, id: string) {
    form.setValue(`lines.${index}.catalogItemId`, id, { shouldDirty: true, shouldValidate: true })
    const item = catalogItems.find((candidate) => candidate.id === id)
    if (!item) return
    form.setValue(`lines.${index}.description`, item.name, { shouldDirty: true })
    form.setValue(`lines.${index}.unitPrice`, item.basePrice, { shouldDirty: true })
    form.setValue('currency', item.currency, { shouldDirty: true })
  }

  function close() {
    mutation.reset()
    form.reset()
    onOpenChange(false)
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Issue {workflow === 'lab' ? 'laboratory' : 'data-assembly'} quote</DialogTitle><DialogDescription>Use synchronized QuickBooks items, then set the job-specific quantities and prices. Issuance is pending until the QuickBooks estimate succeeds.</DialogDescription></DialogHeader><form id="platform-quote-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="max-h-[65vh] space-y-5 overflow-y-auto px-1"><div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="quotePurpose">Purpose *</Label><select id="quotePurpose" {...form.register('purpose')} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="Initial">Initial</option><option value="Change">Scope change</option></select></div><div><Label htmlFor="quoteCurrency">Currency *</Label><Input id="quoteCurrency" maxLength={3} className="mt-2 uppercase" {...form.register('currency')} /></div><div><Label htmlFor="quoteTax">Tax</Label><Input id="quoteTax" type="number" min="0" step="0.01" className="mt-2" {...form.register('tax')} /></div></div><div><Label htmlFor="quoteExpiresAt">Expiration override</Label><Input id="quoteExpiresAt" type="date" className="mt-2 max-w-56" {...form.register('expiresAt')} /><p className="mt-1 text-xs text-muted-foreground">Leave blank to use the configured default validity.</p></div><fieldset><legend className="text-sm font-medium">Itemized quote *</legend><div className="mt-3 space-y-3">{lines.fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1.2fr)_7rem_8rem_auto]"><div><Label htmlFor={`quoteItem-${index}`}>QuickBooks item</Label><select id={`quoteItem-${index}`} value={String(form.watch(`lines.${index}.catalogItemId`) ?? '')} onChange={(event) => selectCatalogItem(index, event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select item</option>{catalogItems.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><Label htmlFor={`quoteDescription-${index}`}>Description</Label><Input id={`quoteDescription-${index}`} className="mt-2" {...form.register(`lines.${index}.description`)} /></div><div><Label htmlFor={`quoteQuantity-${index}`}>Quantity</Label><Input id={`quoteQuantity-${index}`} type="number" step="any" className="mt-2" {...form.register(`lines.${index}.quantity`)} /></div><div><Label htmlFor={`quotePrice-${index}`}>Unit price</Label><Input id={`quotePrice-${index}`} type="number" min="0" step="0.01" className="mt-2" {...form.register(`lines.${index}.unitPrice`)} /></div><Button type="button" variant="ghost" size="icon" className="mt-7" aria-label={`Remove quote line ${index + 1}`} disabled={lines.fields.length === 1} onClick={() => lines.remove(index)}><Trash2 /></Button></div>)}</div><Button type="button" variant="outline" className="mt-3" onClick={() => lines.append({ catalogItemId: '', description: '', quantity: 1, unitPrice: 0 })}><Plus data-icon="inline-start" />Add quote line</Button></fieldset>{mutation.error ? <Alert variant="destructive"><AlertTitle>Quote was not issued</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the quote and try again.')}</AlertDescription></Alert> : null}</form><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="platform-quote-form" disabled={mutation.isPending}>{mutation.isPending ? 'Issuing…' : 'Issue quote'}</Button></DialogFooter></DialogContent></Dialog>
}
