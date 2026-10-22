import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage, updateOrderSystemConfiguration, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from '../use-order-draft-guard'

const schema = z.object({
  quoteValidityDays: z.coerce.number({ error: 'Enter a whole number of days from 1 to 365.' }).int('Enter a whole number of days.').min(1, 'Quote validity must be at least 1 day.').max(365, 'Quote validity must be 365 days or fewer.'),
})
type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>
function hasExactSetting(json: string, key: string, expected: string): boolean {
  try {
    const value: unknown = JSON.parse(json)
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      // JSON.parse collapses duplicate keys; also require one raw string property.
      && /^\s*\{\s*"(?:[^"\\]|\\.)*"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}\s*$/.test(json)
      && Object.keys(value).length === 1
      && Object.hasOwn(value, key) && (value as Record<string, unknown>)[key] === expected
  } catch { return false }
}

export function SystemConfigurationPanel({ configuration }: { configuration: OrderConfiguration }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const system = configuration.system
  const samplesReady = hasExactSetting(system.sampleConfigurationJson, 'mode', 'ExactSampleRoster')
  const destinationReady = hasExactSetting(system.resultDestinationConfigurationJson, 'destination', 'GovernedPortal')
  const editSnapshot = useRef(system)
  const opener = useRef<HTMLButtonElement>(null)
  const [conversionRequired, setConversionRequired] = useState(false)
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: {
    quoteValidityDays: system.quoteValidityDays,
  } })
  const { isDirty: __formDraftDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: Values) => updateOrderSystemConfiguration({
      ...editSnapshot.current, quoteValidityDays: values.quoteValidityDays,
      sampleConfigurationJson: JSON.stringify({ mode: 'ExactSampleRoster' }),
      resultDestinationConfigurationJson: JSON.stringify({ destination: 'GovernedPortal' }),
    }),
    onSuccess: async (_saved, values) => {
      form.reset(values)
      setConversionRequired(false)
      setOpen(false)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['order-configuration'] }),
        client.invalidateQueries({ queryKey: ['organization-operational-readiness'] }),
        client.invalidateQueries({ queryKey: ['customer-order-readiness'] }),
      ])
    },
  })
  useOrderDraftGuard(open && __formDraftDirty, open && mutation.isPending)
  async function requestClose() {
    if (mutation.isPending || (__formDraftDirty && !(await confirmPortal('Discard unsaved quote and workflow settings?')))) return
    setOpen(false)
  }
  function edit() {
    editSnapshot.current = system
    setConversionRequired(!samplesReady || !destinationReady)
    form.reset({ quoteValidityDays: system.quoteValidityDays })
    mutation.reset()
    setOpen(true)
  }
  return <>
    <Card className="gap-0 py-0">
      <CardHeader ><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle><CustomerSourceText source={"Quote & workflow"} /></CardTitle><CardDescription className="mt-2"><CustomerSourceText source={"Set quote validity and review the supported sample and result workflows."} /></CardDescription></div><Button ref={opener} onClick={edit}><CustomerSourceText source={"Edit settings"} /></Button></div></CardHeader>
      <CardContent className="space-y-5 p-4">
        <dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground"><CustomerSourceText source={"Quote validity"} /></dt><dd>{system.quoteValidityDays} <CustomerSourceText source={"calendar days"} /></dd></div><div><dt className="text-sm text-muted-foreground"><CustomerSourceText source={"Sample workflow"} /></dt><dd>{samplesReady ? <CustomerSourceText source={"Exact sample roster"} /> : <CustomerSourceText source={"Review and save settings"} />}</dd></div><div><dt className="text-sm text-muted-foreground"><CustomerSourceText source={"Result destination"} /></dt><dd>{destinationReady ? <CustomerSourceText source={"Governed Portal delivery"} /> : <CustomerSourceText source={"Review and save settings"} />}</dd></div></dl>
        <p className="text-sm text-muted-foreground"><CustomerSourceText source={"Maintain accepted materials in"} /> <Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'sample-types' }}><CustomerSourceText source={"Sample types"} /></Link> <CustomerSourceText source={"and destinations and packaging rules in"} /> <Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'destinations' }}><CustomerSourceText source={"Sample Shipping Settings"} /></Link><CustomerSourceText source={". Readiness checks the currently effective definitions. Each shipment also validates its particular samples and destination."} /></p>
        {!samplesReady || !destinationReady ? <Alert><AlertTitle><CustomerSourceText source={"Review the supported workflow"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Earlier free-form settings do not establish readiness. Review and save the sample and result workflow below. Existing orders and historical configuration are preserved until you save."} /></AlertDescription></Alert> : null}
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={value => { if (!value) requestClose() }}><DialogContent className="max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}><DialogHeader><DialogTitle><CustomerSourceText source={"Edit quote and workflow settings"} /></DialogTitle><DialogDescription><CustomerSourceText source={"Sample validation, scientific approval and result release remain enforced throughout the order."} /></DialogDescription></DialogHeader>
      {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Settings were not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Review the values and try again.')} />}</AlertDescription></Alert> : null}
      <form id="order-defaults" noValidate className="space-y-5" onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
        <fieldset className="space-y-5" disabled={mutation.isPending}>
          <PortalField><Label htmlFor="quoteValidityDays"><RequiredFieldName><CustomerSourceText source={"Default quote validity (days)"} /></RequiredFieldName></Label><Input id="quoteValidityDays" required type="number" min="1" max="365" step="1" aria-invalid={Boolean(form.formState.errors.quoteValidityDays)} aria-describedby={form.formState.errors.quoteValidityDays ? 'quoteValidityDays-error' : undefined} className="max-w-40" {...form.register('quoteValidityDays', { valueAsNumber: true, onChange: () => { if (form.formState.errors.quoteValidityDays) void form.trigger('quoteValidityDays') } })} /><FieldError id="quoteValidityDays-error">{form.formState.errors.quoteValidityDays?.message}</FieldError></PortalField>
          <div><h3 className="text-sm font-medium"><CustomerSourceText source={"Sample workflow: Exact sample roster"} /></h3><FieldDescription><CustomerSourceText source={"Customers enter the exact specimens after accepting the quote, then finalize the roster before preparing a shipment. Shipping setup defines the accepted material and packaging requirements."} /></FieldDescription></div>
          <div><h3 className="text-sm font-medium"><CustomerSourceText source={"Result destination: Governed Portal delivery"} /></h3><FieldDescription><CustomerSourceText source={"Scientifically approved files are released through the Portal with download and retention tracking."} /></FieldDescription></div>
          {conversionRequired ? <p role="status" className="text-sm text-muted-foreground"><CustomerSourceText source={"Saving applies these supported sample and result workflows to replace the earlier settings."} /></p> : null}
        </fieldset>
      </form>
      <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={requestClose}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="order-defaults" disabled={mutation.isPending || (!__formDraftDirty && !conversionRequired)}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Save changes"} />}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </>
}
