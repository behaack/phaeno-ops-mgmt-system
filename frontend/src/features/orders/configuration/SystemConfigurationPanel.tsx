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
  sampleSubmissionInstructions: z.string().trim().min(1, 'Enter sample submission instructions.').max(8000),
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
    quoteValidityDays: system.quoteValidityDays, sampleSubmissionInstructions: system.sampleSubmissionInstructions,
  } })
  const mutation = useMutation({
    mutationFn: (values: Values) => updateOrderSystemConfiguration({
      ...editSnapshot.current, quoteValidityDays: values.quoteValidityDays, sampleSubmissionInstructions: values.sampleSubmissionInstructions,
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
  useOrderDraftGuard(open && form.formState.isDirty, open && mutation.isPending)
  function requestClose() {
    if (mutation.isPending || (form.formState.isDirty && !window.confirm('Discard unsaved order defaults?'))) return
    setOpen(false)
  }
  function edit() {
    editSnapshot.current = system
    setConversionRequired(!samplesReady || !destinationReady)
    form.reset({ quoteValidityDays: system.quoteValidityDays, sampleSubmissionInstructions: system.sampleSubmissionInstructions })
    mutation.reset()
    setOpen(true)
  }
  return <>
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Order defaults</CardTitle><CardDescription className="mt-2">Maintain these once. Each order uses the active service and shipping setup when it reaches that step.</CardDescription></div><Button ref={opener} onClick={edit}>Edit defaults</Button></div></CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Quote validity</dt><dd>{system.quoteValidityDays} calendar days</dd></div><div><dt className="text-sm text-muted-foreground">Sample workflow</dt><dd>{samplesReady ? 'Exact sample roster' : 'Review and save defaults'}</dd></div><div><dt className="text-sm text-muted-foreground">Result destination</dt><dd>{destinationReady ? 'Governed Portal delivery' : 'Review and save defaults'}</dd></div></dl>
        <div><h3 className="text-sm font-medium">Sample submission instructions</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{system.sampleSubmissionInstructions || 'Not yet configured.'}</p></div>
        <p className="text-sm text-muted-foreground">Accepted sample types, destinations and packaging rules are maintained in <Link className="underline" to="/order-configuration" search={{ configurationSection: 'shipping' }}>Sample shipping</Link>. Readiness checks the currently effective definitions. Each shipment also validates its particular samples and destination.</p>
        {!samplesReady || !destinationReady ? <Alert><AlertTitle>Review the supported workflow</AlertTitle><AlertDescription>Earlier free-form settings do not establish readiness. Review and save the sample and result workflow below. Existing orders and historical configuration are preserved until you save.</AlertDescription></Alert> : null}
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={value => { if (!value) requestClose() }}><DialogContent className="max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}><DialogHeader><DialogTitle>Edit order defaults</DialogTitle><DialogDescription>Sample validation, scientific approval and result release remain enforced throughout the order.</DialogDescription></DialogHeader>
      {mutation.error ? <Alert variant="destructive"><AlertTitle>Defaults were not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the values and try again.')}</AlertDescription></Alert> : null}
      <form id="order-defaults" noValidate className="space-y-5" onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
        <fieldset className="space-y-5" disabled={mutation.isPending}>
          <div><Label htmlFor="quoteValidityDays"><RequiredFieldName>Default quote validity (days)</RequiredFieldName></Label><Input id="quoteValidityDays" required type="number" min="1" max="365" step="1" aria-invalid={Boolean(form.formState.errors.quoteValidityDays)} aria-describedby={form.formState.errors.quoteValidityDays ? 'quoteValidityDays-error' : undefined} className="mt-2 max-w-40" {...form.register('quoteValidityDays', { valueAsNumber: true, onChange: () => { if (form.formState.errors.quoteValidityDays) void form.trigger('quoteValidityDays') } })} /><FieldError id="quoteValidityDays-error">{form.formState.errors.quoteValidityDays?.message}</FieldError></div>
          <div><h3 className="text-sm font-medium">Sample workflow: Exact sample roster</h3><FieldDescription>Customers enter the exact specimens after accepting the quote, then finalize the roster before preparing a shipment. Shipping setup defines the accepted material and packaging requirements.</FieldDescription></div>
          <div><h3 className="text-sm font-medium">Result destination: Governed Portal delivery</h3><FieldDescription>Scientifically approved files are released through the Portal with download and retention tracking.</FieldDescription></div>
          {conversionRequired ? <p role="status" className="text-sm text-muted-foreground">Saving applies these supported sample and result workflows to replace the earlier settings.</p> : null}
          <div><Label htmlFor="sampleSubmissionInstructions"><RequiredFieldName>Sample submission instructions</RequiredFieldName></Label><textarea id="sampleSubmissionInstructions" required maxLength={8000} aria-invalid={Boolean(form.formState.errors.sampleSubmissionInstructions)} aria-describedby={form.formState.errors.sampleSubmissionInstructions ? 'sampleSubmissionInstructions-error' : undefined} {...form.register('sampleSubmissionInstructions', { onChange: () => { if (form.formState.errors.sampleSubmissionInstructions) void form.trigger('sampleSubmissionInstructions') } })} className="mt-2 min-h-40 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /><FieldError id="sampleSubmissionInstructions-error">{form.formState.errors.sampleSubmissionInstructions?.message}</FieldError></div>
        </fieldset>
      </form>
      <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={requestClose}>Cancel</Button><Button type="submit" form="order-defaults" disabled={mutation.isPending || (!form.formState.isDirty && !conversionRequired)}>{mutation.isPending ? 'Saving…' : 'Save changes'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </>
}
