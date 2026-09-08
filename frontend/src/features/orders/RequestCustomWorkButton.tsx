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
  const { authProvider, session } = usePhaenoSession()
  const mayRequest =
    session?.memberships?.find(
      (item) =>
        item.organizationId === session.selectedOrganization?.organizationId,
    )?.isOrganizationAdmin === true
  const [open, setOpen] = useState(false)
  const key = useRef('')
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { subject: defaultSubject, description: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      requestCustomWork({ service, sourceOrderId, ...values }, key.current),
    onSuccess: () => form.reset(form.getValues()),
  })
  useOrderDraftGuard(open && form.formState.isDirty, mutation.isPending)
  function close() {
    if (
      !mutation.isPending &&
      (!form.formState.isDirty ||
        window.confirm('Discard the unsaved custom-work request?'))
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
        Request custom work
      </Button>
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
              Request custom{' '}
              {service === 'PSeqKit' ? 'PSeq Kit' : 'Lab Service'} work
            </DialogTitle>
            <DialogDescription>
              Phaeno Sales reviews work outside the configured scope. This sends
              a request for review; it does not place an order or accept a
              price.
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Custom-work request was not confirmed</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  mutation.error,
                  'Try the same submission again. Your entries are retained.',
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          {mutation.data ? (
            <>
              <Alert>
                <AlertTitle>Custom-work request submitted</AlertTitle>
                <AlertDescription>
                  Reference {mutation.data.opportunityNumber}. Phaeno Sales will
                  review the requested scope.{' '}
                  {sourceOrderId
                    ? 'Your original order or Job remains unchanged.'
                    : ''}
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="button" onClick={close}>
                  Done
                </Button>
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
                  <div>
                    <Label htmlFor="custom-work-subject">
                      <RequiredFieldName>Subject</RequiredFieldName>
                    </Label>
                    <Input
                      id="custom-work-subject"
                      className="mt-2"
                      {...form.register('subject')}
                    />
                    {form.formState.errors.subject ? (
                      <p role="alert" className="mt-1 text-sm text-destructive">
                        {form.formState.errors.subject.message}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="custom-work-description">
                      <RequiredFieldName>Requested work</RequiredFieldName>
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Explain the sources, quantity, outputs or timing you need.
                      Do not include patient identifiers, PHI, sensitive files
                      or a downstream customer’s identity.
                    </p>
                    <Textarea
                      id="custom-work-description"
                      className="mt-2"
                      rows={6}
                      maxLength={1500}
                      {...form.register('description')}
                    />
                    {form.formState.errors.description ? (
                      <p role="alert" className="mt-1 text-sm text-destructive">
                        {form.formState.errors.description.message}
                      </p>
                    ) : null}
                  </div>
                </fieldset>
              </form>
              <RequiredDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={close}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="custom-work-form"
                  disabled={mutation.isPending || authProvider === 'mock'}
                >
                  {mutation.isPending
                    ? 'Submitting…'
                    : 'Submit custom-work request'}
                </Button>
              </RequiredDialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
