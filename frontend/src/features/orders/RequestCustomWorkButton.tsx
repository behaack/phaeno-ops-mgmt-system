import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { requestCustomWork, type CustomWorkInput } from '#/api/order-bundles'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useOrderDraftGuard } from './use-order-draft-guard'

const schema = z.object({
  subject: z.string().trim().min(1, 'Enter a subject.').max(255),
  description: z
    .string()
    .trim()
    .min(1, 'Describe the work you need.')
    .max(1500),
})
export function RequestCustomWorkButton({
  service,
  sourceOrderId,
  defaultSubject = '',
}: {
  service: CustomWorkInput['service']
  sourceOrderId?: string
  defaultSubject?: string
}) {
  const __customerText = useCustomerText()

  const { authProvider, session } = usePhaenoSession()
  const selectedOrganizationId = session?.selectedOrganization?.organizationId
  const mayRequest = session?.memberships?.some(item =>
    item.organizationId === selectedOrganizationId && item.isOrganizationAdmin) === true
    || (session?.selectedDepartment?.organizationId === selectedOrganizationId
      && session?.selectedDepartment?.isAvailable === true
      && session?.selectedDepartment?.isDepartmentAdmin === true)
  const [open, setOpen] = useState(false)
  const key = useRef('')
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { subject: defaultSubject, description: '' },
  })
  const { isDirty: __formDraftDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      requestCustomWork({ service, sourceOrderId, ...values }, key.current),
    onSuccess: () => form.reset(form.getValues()),
  })
  useOrderDraftGuard(open && __formDraftDirty, mutation.isPending)
  async function close() {
    if (
      !mutation.isPending &&
      (!__formDraftDirty ||
        (await confirmPortal('Discard the unsaved custom-work request?')))
    )
      setOpen(false)
  }
  if (!mayRequest) return null
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          key.current = crypto.randomUUID()
          mutation.reset()
          form.reset({ subject: defaultSubject, description: '' })
          setOpen(true)
        }}
      >
        <CustomerText message="m_82c0e6e65ccc" /></Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close()
        }}
      >
        <DialogContent
          showCloseButton={!mutation.isPending}
          aria-busy={mutation.isPending}
        >
          <DialogHeader>
            <DialogTitle>
              <CustomerText message="m_f51b32f59dba" />{' '}
              {service === 'PSeqKit' ? <CustomerSourceText source={"PSeq Kit"} /> : __customerText('m_562143624095')} <CustomerText message="m_00e13ed7af55" /></DialogTitle>
            <DialogDescription>
              <CustomerText message="m_f43fbe48a79d" /></DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle><CustomerText message="m_805cf65c13e8" /></AlertTitle>
              <AlertDescription>
                {<CustomerSourceText source={getOrderErrorMessage(
                  mutation.error,
                  'Try the same submission again. Your entries are retained.',
                )} />}
              </AlertDescription>
            </Alert>
          ) : null}
          {mutation.data ? (
            <>
              <Alert>
                <AlertTitle><CustomerText message="m_8be4df8e5217" /></AlertTitle>
                <AlertDescription>
                  <CustomerText message="m_71bf90935fc2" />{mutation.data.opportunityNumber}<CustomerText message="m_25becc1cb2c8" />{' '}
                  {sourceOrderId
                    ? <CustomerSourceText source={"Your original order or Job remains unchanged."} />
                    : ''}
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="button" onClick={close}>
                  <CustomerText message="m_11a6767d5674" /></Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <form
                id="custom-work-form"
                noValidate
                onSubmit={form.handleSubmit((values) =>
                  mutation.mutate(values),
                )}
              >
                <fieldset disabled={mutation.isPending} className="space-y-4">
                  <PortalField>
                    <Label htmlFor="custom-work-subject">
                      <RequiredFieldName><CustomerText message="m_68971283841a" /></RequiredFieldName>
                    </Label>
                    <Input
                      id="custom-work-subject"

                      {...form.register('subject')}
                    />
                    {form.formState.errors.subject ? (
                      <p role="alert" className="mt-1 text-sm text-destructive">
                        {<CustomerSourceText source={form.formState.errors.subject.message} />}
                      </p>
                    ) : null}
                  </PortalField>
                  <PortalField>
                    <Label htmlFor="custom-work-description">
                      <RequiredFieldName><CustomerText message="m_a53a0c0ce5ac" /></RequiredFieldName>
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <CustomerText message="m_373390d9352c" /></p>
                    <Textarea
                      id="custom-work-description"

                      rows={6}
                      maxLength={1500}
                      {...form.register('description')}
                    />
                    {form.formState.errors.description ? (
                      <p role="alert" className="mt-1 text-sm text-destructive">
                        {<CustomerSourceText source={form.formState.errors.description.message} />}
                      </p>
                    ) : null}
                  </PortalField>
                </fieldset>
              </form>
              <RequiredDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={close}
                >
                  <CustomerText message="m_19766ed6ccb2" /></Button>
                <Button
                  type="submit"
                  form="custom-work-form"
                  disabled={mutation.isPending || authProvider === 'mock'}
                >
                  {mutation.isPending
                    ? <CustomerSourceText source={"Submitting…"} />
                    : __customerText('m_c52cfef4f155')}
                </Button>
              </RequiredDialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
