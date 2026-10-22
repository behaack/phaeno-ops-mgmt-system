import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
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
  sampleSubmissionInstructions: z.string().trim().min(1, 'Enter order submission guidance.').max(8000),
})
type Values = z.infer<typeof schema>

export function SubmissionInstructionsPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })
  if (!apiEnabled) return null
  if (configuration.error) return <Alert variant="destructive"><AlertTitle><CustomerText message="m_980623077e60" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(configuration.error, 'Try refreshing this page.')} />}</AlertDescription></Alert>
  if (!configuration.data) return <p role="status"><CustomerText message="m_0d54723bf4bd" /></p>
  return <SubmissionInstructionsEditor configuration={configuration.data} />
}

export function SubmissionInstructionsEditor({ configuration }: { configuration: OrderConfiguration }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const system = configuration.system
  const editSnapshot = useRef(system)
  const opener = useRef<HTMLButtonElement>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { sampleSubmissionInstructions: system.sampleSubmissionInstructions } })
  const { isDirty: __formDraftDirty } = form.formState

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
  useOrderDraftGuard(open && __formDraftDirty, open && mutation.isPending)
  async function requestClose() {
    if (mutation.isPending || (__formDraftDirty && !(await confirmPortal('Discard unsaved submission instructions?')))) return
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
      <CardHeader >
        <div className="flex items-start justify-between gap-3"><CardTitle><CustomerText message="m_81dc291430fc" /></CardTitle><Button ref={opener} onClick={edit}><CustomerText message="m_23e275114309" /></Button></div>
        <CardDescription><CustomerText message="m_cf1896986d42" /></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className="whitespace-pre-wrap text-sm">{system.sampleSubmissionInstructions || 'Not yet configured.'}</p>
        <p className="text-sm text-muted-foreground"><CustomerText message="m_7eed60c0a3ce" /><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: "procedures" }}><CustomerText message="m_818f11904b30" /></Link> <CustomerText message="m_0ad73e77c1a7" /><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: "containers" }}><CustomerText message="m_6f2979e4d104" /></Link>.</p>
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={value => { if (!value) requestClose() }}>
      <DialogContent className="sm:max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}>
        <DialogHeader><DialogTitle><CustomerText message="m_7623960189e6" /></DialogTitle><DialogDescription><CustomerText message="m_d42fcb9b5cb0" /></DialogDescription></DialogHeader>
        {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_38b098d5c9b3" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Review the instructions and try again.')} />}</AlertDescription></Alert> : null}
        <form id="submission-instructions" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
          <Label htmlFor="sampleSubmissionInstructions"><RequiredFieldName><CustomerText message="m_81dc291430fc" /></RequiredFieldName></Label>
          <Textarea id="sampleSubmissionInstructions" required disabled={mutation.isPending} maxLength={8000} aria-invalid={Boolean(form.formState.errors.sampleSubmissionInstructions)} aria-describedby={form.formState.errors.sampleSubmissionInstructions ? "sampleSubmissionInstructions-error" : undefined} className="mt-2 min-h-40" {...form.register('sampleSubmissionInstructions', { onChange: () => { if (form.formState.errors.sampleSubmissionInstructions) void form.trigger('sampleSubmissionInstructions') } })} />
          <FieldError id="sampleSubmissionInstructions-error">{form.formState.errors.sampleSubmissionInstructions?.message}</FieldError>
        </form>
        <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={requestClose}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" form="submission-instructions" disabled={mutation.isPending || !__formDraftDirty}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : __customerText('m_dd0ae7a5cbcf')}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
