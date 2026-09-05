import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOrganizationConfiguration, updateOrganizationConfiguration, type OrganizationConfiguration } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { departmentErrorMessage, departmentMessages as m } from './department-localization'

const email = z.string().trim().max(255, m.tooLong(255)).refine((value) => !value || z.email().safeParse(value).success, m.validEmail)
const schema = z.object({
  purchaseOrderRequired: z.enum(['inherit', 'required', 'optional']),
  billingContactEmail: email, notificationEmail: email,
  shippingInstructions: z.string().trim().max(2000, m.tooLong(2000)),
  resultDeliveryInstructions: z.string().trim().max(2000, m.tooLong(2000)),
})
type Values = z.infer<typeof schema>
const textFields = ['billingContactEmail', 'notificationEmail', 'shippingInstructions', 'resultDeliveryInstructions'] as const

export function OrganizationDefaultsPanel({ organizationId }: { organizationId: string }) {
  const client = useQueryClient()
  const [target, setTarget] = useState<OrganizationConfiguration | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const query = useQuery({ queryKey: ['organization-configuration', organizationId], queryFn: () => getOrganizationConfiguration(organizationId) })
  const save = useMutation({
    mutationFn: updateOrganizationConfiguration,
    onSuccess: async (data) => {
      client.setQueryData(['organization-configuration', organizationId], data)
      setTarget(null)
      await client.invalidateQueries({ queryKey: ['session'] })
    },
    onError: async (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        const result = await query.refetch()
        if (result.data && !result.error) { setTarget(result.data); setConflict(m.defaultsConflict) }
        else setConflict(m.conflictLoadFailed)
      }
    },
  })
  return <>
    <Card>
      <CardHeader>
        <CardTitle>{m.organizationDefaults}</CardTitle><CardDescription>{m.defaultsDescription}</CardDescription>
        <CardAction><Button id="edit-organization-defaults" variant="outline" size="sm" disabled={!query.data || Boolean(query.error)} onClick={() => { save.reset(); setConflict(null); setTarget(query.data!) }}>{m.editDefaults}</Button></CardAction>
      </CardHeader>
      <CardContent>
        {query.isPending ? <p role="status">{m.loadingDefaults}</p> : null}
        {query.error ? <Alert variant="destructive"><AlertDescription>{departmentErrorMessage(query.error)} <Button variant="link" onClick={() => void query.refetch()}>{m.retry}</Button></AlertDescription></Alert> : null}
        {query.data ? <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-medium">{m.purchaseOrderRule}</dt><dd>{query.data.purchaseOrderRequired == null ? m.systemDefault : query.data.purchaseOrderRequired ? m.required : m.optional}</dd></div>
          {textFields.map((field) => <div key={field} className="min-w-0 break-words"><dt className="font-medium">{m[field]}</dt><dd className="whitespace-pre-wrap text-muted-foreground">{query.data?.[field] || m.systemDefault}</dd></div>)}
        </dl> : null}
      </CardContent>
    </Card>
    {target ? <OrganizationDefaultsDialog target={target} pending={save.isPending} error={conflict ? new Error(conflict) : save.error}
      onClose={() => setTarget(null)} onSubmit={(values) => { setConflict(null); save.mutate({ ...values, organizationId, version: target.version }) }} /> : null}
  </>
}

function OrganizationDefaultsDialog({ target, pending, error, onClose, onSubmit }: {
  target: OrganizationConfiguration
  pending: boolean
  error: unknown
  onClose: () => void
  onSubmit: (values: Omit<OrganizationConfiguration, 'organizationId' | 'version'>) => void
}) {
  const [discard, setDiscard] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: {
    purchaseOrderRequired: target.purchaseOrderRequired == null ? 'inherit' : target.purchaseOrderRequired ? 'required' : 'optional',
    billingContactEmail: target.billingContactEmail ?? '', notificationEmail: target.notificationEmail ?? '',
    shippingInstructions: target.shippingInstructions ?? '', resultDeliveryInstructions: target.resultDeliveryInstructions ?? '',
  } })
  const { isDirty } = form.formState
  const close = () => { if (!pending) { if (isDirty) setDiscard(true); else onClose() } }
  return <Dialog open onOpenChange={(open) => { if (!open) close() }}>
    <DialogContent className="max-w-2xl" onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById('edit-organization-defaults')?.focus() }}>
      <form noValidate onSubmit={form.handleSubmit((values) => onSubmit({
        purchaseOrderRequired: values.purchaseOrderRequired === 'inherit' ? null : values.purchaseOrderRequired === 'required',
        billingContactEmail: values.billingContactEmail || null, notificationEmail: values.notificationEmail || null,
        shippingInstructions: values.shippingInstructions || null, resultDeliveryInstructions: values.resultDeliveryInstructions || null,
      }))}>
        <DialogHeader><DialogTitle>{m.editDefaults}</DialogTitle><DialogDescription>{m.defaultsEditDescription}</DialogDescription></DialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{departmentErrorMessage(error)}</AlertDescription></Alert> : null}
        {discard ? <section role="alert" className="space-y-3"><p>{m.discardDefaults}</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setDiscard(false)}>{m.keepEditing}</Button><Button type="button" variant="destructive" onClick={onClose}>{m.discard}</Button></div></section> : null}
        <fieldset disabled={pending} className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="defaults-po">{m.purchaseOrderRule}</Label>
            <select id="defaults-po" className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" {...form.register('purchaseOrderRequired')}>
              <option value="inherit">{m.systemPoDefault}</option><option value="required">{m.required}</option><option value="optional">{m.optional}</option>
            </select></div>
          {textFields.map((field) => {
            const fieldError = form.formState.errors[field]?.message
            const props = { id: `defaults-${field}`, maxLength: field.endsWith('Email') ? 255 : 2000, 'aria-invalid': Boolean(fieldError), 'aria-describedby': fieldError ? `defaults-${field}-error` : undefined, ...form.register(field) }
            return <div key={field} className="grid gap-1.5"><Label htmlFor={props.id}>{m[field]}</Label>
              {field.endsWith('Email') ? <Input {...props} type="email" /> : <Textarea {...props} rows={2} />}
              {fieldError ? <p id={`defaults-${field}-error`} role="alert" className="text-xs text-destructive">{fieldError}</p> : null}
            </div>
          })}
        </fieldset>
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={close}>{m.cancel}</Button><Button type="submit" disabled={pending || !isDirty}>{pending ? m.saving : m.save}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
