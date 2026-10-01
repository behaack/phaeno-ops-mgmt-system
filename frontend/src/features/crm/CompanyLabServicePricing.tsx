import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getCompanyLabPricing, saveCompanyLabPrice, type NegotiatedLabPrice } from '#/api/company-lab-pricing'
import { getOrderErrorMessage, isOrderConcurrencyError } from '#/api/order-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const schema = z.object({ catalogItemId: z.string().uuid('Select a service.'), departmentId: z.string(),
  unitPrice: z.coerce.number().positive('Enter a positive price.').refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001, 'Use at most two decimal places.'),
  effectiveFrom: z.string().min(1, 'Enter the start date.'), effectiveTo: z.string(), isActive: z.boolean(),
}).superRefine((v, ctx) => { if (v.effectiveTo && v.effectiveTo <= v.effectiveFrom) ctx.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'End after the start date.' }) })
type Values = z.output<typeof schema>
const dateInput = (iso: string) => iso.slice(0, 10)
const defaults = (): Values => ({ catalogItemId: '', departmentId: '', unitPrice: 0, effectiveFrom: dateInput(new Date().toISOString()), effectiveTo: '', isActive: true })

export function CompanyLabServicePricing({ companyId, canManage }: { companyId: string; canManage: boolean }) {
  const client = useQueryClient()
  const pricing = useQuery({ queryKey: ['company-lab-pricing', companyId], queryFn: () => getCompanyLabPricing(companyId) })
  const [target, setTarget] = useState<NegotiatedLabPrice | null | undefined>(undefined)
  const [discard, setDiscard] = useState(false)
  useEffect(() => { if (discard) document.getElementById('company-price-keep-editing')?.focus() }, [discard])
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const form = useForm<z.input<typeof schema>, unknown, Values>({ resolver: zodResolver(schema), defaultValues: defaults() })
  const mutation = useMutation({ mutationFn: (v: Values) => saveCompanyLabPrice(companyId, target?.id ?? null, { ...v,
    departmentId: v.departmentId || null, effectiveFrom: `${v.effectiveFrom}T00:00:00Z`, effectiveTo: v.effectiveTo ? `${v.effectiveTo}T00:00:00Z` : null, version: target?.version }),
    onSuccess: async () => { setTarget(undefined); await client.invalidateQueries({ queryKey: ['company-lab-pricing', companyId] }); await client.invalidateQueries({ queryKey: ['lab-service-offerings'] }) },
    onError: error => { if (isOrderConcurrencyError(error)) setNeedsRefresh(true) },
  })
  function edit(p: NegotiatedLabPrice | null) { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setTarget(p); setNeedsRefresh(false); setDiscard(false); mutation.reset(); form.reset(p ? { ...p, departmentId: p.departmentId ?? '', effectiveFrom: dateInput(p.effectiveFrom), effectiveTo: p.effectiveTo ? dateInput(p.effectiveTo) : '' } : defaults()) }
  function close() { if (mutation.isPending) return; if (discard) { setDiscard(false); return } if (form.formState.isDirty) setDiscard(true); else setTarget(undefined) }
  async function refresh() {
    const result = await pricing.refetch()
    const latest = result.data?.prices.find(p => p.id === target?.id)
    if (latest) { setTarget(latest); setNeedsRefresh(false); mutation.reset(); form.reset({ ...latest, departmentId: latest.departmentId ?? '', effectiveFrom: dateInput(latest.effectiveFrom), effectiveTo: latest.effectiveTo ? dateInput(latest.effectiveTo) : '' }, { keepDirtyValues: true }) }
  }
  const selectableServices = pricing.data?.services.filter(service => service.isActive || service.id === target?.catalogItemId) ?? []
  return <>
    <Card><CardHeader><CardTitle>Lab service pricing</CardTitle><CardDescription>Organization and Department negotiated prices override the standard service price. When both apply, the lower negotiated price wins. Prices do not grant service access or bypass the Customer sample limit.</CardDescription>{canManage ? <CardAction><Button disabled={!pricing.data} onClick={() => edit(null)}>Add price</Button></CardAction> : null}</CardHeader>
      <CardContent>{pricing.isPending ? <p role="status">Loading service prices…</p> : pricing.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(pricing.error, 'Set up this Company’s Customer scope to configure service prices.')} <Button variant="outline" onClick={() => void pricing.refetch()}>Retry</Button></AlertDescription></Alert> : pricing.data?.prices.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Negotiated Lab service prices in USD</caption><thead><tr className="border-b text-left"><th className="p-2">Service / scope</th><th className="p-2">Price per sample</th><th className="p-2">Effective window (UTC)</th><th className="p-2">Status</th><th className="p-2"><span className="sr-only">Action</span></th></tr></thead><tbody>{pricing.data.prices.map(p => <tr key={p.id} className="border-b"><td className="p-2">{pricing.data.services.find(s => s.id === p.catalogItemId)?.name}<div className="text-xs text-muted-foreground">{p.departmentId ? pricing.data.departments.find(d => d.id === p.departmentId)?.name ?? 'Retained Department' : 'Organization'}</div></td><td className="p-2">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.unitPrice)}</td><td className="p-2">{dateInput(p.effectiveFrom)} → {p.effectiveTo ? dateInput(p.effectiveTo) : 'No end date'}</td><td className="p-2">{p.isActive ? 'Active' : 'Inactive'}</td><td className="p-2">{canManage ? <Button variant="outline" aria-label={`Edit ${pricing.data.services.find(s => s.id === p.catalogItemId)?.name} price for ${p.departmentId ? 'Department' : 'Organization'}`} onClick={() => edit(p)}>Edit</Button> : null}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No negotiated Lab service prices. Standard catalog prices apply.</p>}</CardContent>
    </Card>
    <Dialog open={target !== undefined} onOpenChange={v => { if (!v) close() }}><DialogContent showCloseButton={!mutation.isPending} onCloseAutoFocus={e => { if (trigger.current?.isConnected) { e.preventDefault(); trigger.current.focus() } }}>
      <DialogHeader><DialogTitle>{discard ? 'Discard pricing changes?' : target ? 'Edit negotiated price' : 'Add negotiated price'}</DialogTitle><DialogDescription>{discard ? 'The saved price remains in effect.' : 'Set the USD sample price for one service and scope. End dates are exclusive, at midnight UTC. Accepted orders keep their saved price.'}</DialogDescription></DialogHeader>
      {mutation.error ? <DialogFeedback><Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the retained entries and retry.')}{needsRefresh ? <Button variant="outline" onClick={() => void refresh()}>Load latest price</Button> : null}</AlertDescription></Alert></DialogFeedback> : null}
      {discard ? <><div><DialogDescription>Discard your edits to the service price, status and effective window?</DialogDescription></div><DialogFooter><Button id="company-price-keep-editing" variant="outline" onClick={() => setDiscard(false)}>Keep editing</Button><Button variant="destructive" onClick={() => setTarget(undefined)}>Discard changes</Button></DialogFooter></> : <>
        <form id="company-service-price" noValidate onSubmit={form.handleSubmit(v => mutation.mutate(v))}><fieldset disabled={mutation.isPending} className="space-y-4">
          <Field><Label htmlFor="company-price-service"><RequiredFieldName>Service</RequiredFieldName></Label>{!target && !selectableServices.length ? <FieldDescription>No active Lab services are available. Activate a service in Order settings before adding a negotiated price.</FieldDescription> : null}<NativeSelect id="company-price-service" disabled={Boolean(target)} {...form.register('catalogItemId')}><option value="">Select service</option>{selectableServices.map(s => <option key={s.id} value={s.id}>{s.name}{s.isActive ? '' : ' (Inactive)'}</option>)}</NativeSelect><FieldError>{form.formState.errors.catalogItemId?.message}</FieldError></Field>
          <Field><Label htmlFor="company-price-scope"><RequiredFieldName>Scope</RequiredFieldName></Label><NativeSelect id="company-price-scope" disabled={Boolean(target)} {...form.register('departmentId')}><option value="">Organization</option>{pricing.data?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</NativeSelect></Field>
          <Field><Label htmlFor="company-price-unit"><RequiredFieldName>Price per sample (USD)</RequiredFieldName></Label><FieldDescription>One library preparation, one run and data assembly. Additional runs are priced by Sales.</FieldDescription><Input id="company-price-unit" type="number" min="0.01" step="0.01" {...form.register('unitPrice')} aria-invalid={Boolean(form.formState.errors.unitPrice)} /><FieldError>{form.formState.errors.unitPrice?.message}</FieldError></Field>
          <Field><Label htmlFor="company-price-from"><RequiredFieldName>Effective from (UTC)</RequiredFieldName></Label><Input id="company-price-from" type="date" {...form.register('effectiveFrom')} /><FieldError>{form.formState.errors.effectiveFrom?.message}</FieldError></Field>
          <Field><Label htmlFor="company-price-to">Effective until (UTC, optional)</Label><Input id="company-price-to" type="date" {...form.register('effectiveTo')} /><FieldError>{form.formState.errors.effectiveTo?.message}</FieldError></Field>
          <Field><Label htmlFor="company-price-status"><RequiredFieldName>Status</RequiredFieldName></Label><NativeSelect id="company-price-status" value={form.watch('isActive') ? 'active' : 'inactive'} onChange={e => form.setValue('isActive', e.target.value === 'active', { shouldDirty: true })}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></Field>
        </fieldset></form><RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="company-service-price" disabled={mutation.isPending || needsRefresh || !canManage}>{mutation.isPending ? 'Saving…' : 'Save price'}</Button></RequiredDialogFooter>
      </>}
    </DialogContent></Dialog>
  </>
}
