import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderConfiguration, getOrderErrorMessage, updateOrderSystemConfiguration, type OrderConfiguration } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'

const schema = z.object({
  sampleSubmissionInstructions: z.string().trim().min(1, 'Enter default submission instructions.').max(8000),
})
type Values = z.infer<typeof schema>

export function SubmissionInstructionsPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })
  if (!apiEnabled) return null
  if (configuration.error) return <Alert variant="destructive"><AlertTitle>Instructions could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Try refreshing this page.')}</AlertDescription></Alert>
  if (!configuration.data) return <p role="status">Loading default submission instructions…</p>
  return <SubmissionInstructionsEditor configuration={configuration.data} />
}

export function SubmissionInstructionsEditor({ configuration }: { configuration: OrderConfiguration }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const system = configuration.system
  const editSnapshot = useRef(system)
  const opener = useRef<HTMLButtonElement>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { sampleSubmissionInstructions: system.sampleSubmissionInstructions } })
  const mutation = useMutation({
    mutationFn: (values: Values) => updateOrderSystemConfiguration({
      id: editSnapshot.current.id,
      version: editSnapshot.current.version,
      quoteValidityDays: editSnapshot.current.quoteValidityDays,
      shippingConfigurationJson: editSnapshot.current.shippingConfigurationJson,
      sampleSubmissionInstructions: values.sampleSubmissionInstructions,
    }),
    onSuccess: async (_saved, values) => {
      form.reset(values)
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
    if (mutation.isPending || (form.formState.isDirty && !window.confirm('Discard unsaved submission instructions?'))) return
    setOpen(false)
  }
  function edit() {
    editSnapshot.current = system
    form.reset({ sampleSubmissionInstructions: system.sampleSubmissionInstructions })
    mutation.reset()
    setOpen(true)
  }
  return <>
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-3"><CardTitle>Default submission instructions</CardTitle><Button ref={opener} onClick={edit}>Edit instructions</Button></div>
        <CardDescription>General guidance copied to new lab orders when customer-specific instructions are not configured.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className="whitespace-pre-wrap text-sm">{system.sampleSubmissionInstructions || 'Not yet configured.'}</p>
        <p className="text-sm text-muted-foreground">These instructions are required for order readiness. Existing orders keep their saved instructions. Maintain detailed packing and destination requirements in <Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'instructions' }}>Sample shipping instructions</Link>.</p>
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={value => { if (!value) requestClose() }}>
      <DialogContent className="sm:max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}>
        <DialogHeader><DialogTitle>Edit default submission instructions</DialogTitle><DialogDescription>Changes apply to new lab orders that use the default guidance.</DialogDescription></DialogHeader>
        {mutation.error ? <Alert variant="destructive"><AlertTitle>Instructions were not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the instructions and try again.')}</AlertDescription></Alert> : null}
        <form id="submission-instructions" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
          <Label htmlFor="sampleSubmissionInstructions"><RequiredFieldName>Default submission instructions</RequiredFieldName></Label>
          <Textarea id="sampleSubmissionInstructions" required disabled={mutation.isPending} maxLength={8000} aria-invalid={Boolean(form.formState.errors.sampleSubmissionInstructions)} aria-describedby={form.formState.errors.sampleSubmissionInstructions ? 'sampleSubmissionInstructions-error' : undefined} className="mt-2 min-h-40" {...form.register('sampleSubmissionInstructions', { onChange: () => { if (form.formState.errors.sampleSubmissionInstructions) void form.trigger('sampleSubmissionInstructions') } })} />
          <FieldError id="sampleSubmissionInstructions-error">{form.formState.errors.sampleSubmissionInstructions?.message}</FieldError>
        </form>
        <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={requestClose}>Cancel</Button><Button type="submit" form="submission-instructions" disabled={mutation.isPending || !form.formState.isDirty}>{mutation.isPending ? 'Saving…' : 'Save changes'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
