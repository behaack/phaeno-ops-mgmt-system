import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { textareaClass } from './OrganizationFormDialog'

export type LifecycleAction =
  | {
      kind: 'deactivate-organization'
      organizationName: string
    }
  | {
      kind: 'deactivate-member'
      memberEmail: string
      organizationName: string
    }
  | {
      kind: 'end-entitlement'
      organizationName: string
      serviceName: string
    }

const schema = z.object({
  reason: z.string().trim().max(1000),
})

type Values = z.infer<typeof schema>

export function LifecycleActionDialog({
  action,
  error,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  action: LifecycleAction | null
  error?: string
  isPending: boolean
  onConfirm: (reason?: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const open = action !== null
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)
  const form = useForm<Values>({
    defaultValues: { reason: '' },
    mode: 'onBlur',
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) form.reset({ reason: '' })
  }, [form, open])

  useEffect(() => {
    if (!open && wasOpenRef.current) {
      requestAnimationFrame(() => returnFocusRef.current?.focus())
    }
    wasOpenRef.current = open
  }, [open])

  if (!action) return null

  const content = actionContent(action)
  const requiresReason = action.kind === 'end-entitlement'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={() => {
          if (document.activeElement instanceof HTMLElement) {
            returnFocusRef.current = document.activeElement
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="lifecycle-action-form"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            if (requiresReason && !values.reason) {
              form.setError('reason', {
                message: 'Record why the entitlement is ending.',
              })
              return
            }

            onConfirm(values.reason || undefined)
          })}
        >
          {requiresReason ? (
            <div className="grid gap-1.5">
              <Label htmlFor="lifecycle-action-reason">
                End reason
                <span
                  className="ml-1 text-[var(--ruby-red,#b4233c)]"
                  aria-hidden="true"
                >
                  *
                </span>
              </Label>
              <textarea
                id="lifecycle-action-reason"
                className={textareaClass}
                rows={4}
                aria-invalid={Boolean(form.formState.errors.reason)}
                {...form.register('reason')}
              />
              {form.formState.errors.reason ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.reason.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {content.cancelLabel}
          </Button>
          <Button
            type="submit"
            form="lifecycle-action-form"
            variant="destructive"
            disabled={isPending}
          >
            {isPending ? 'Saving…' : content.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function actionContent(action: LifecycleAction) {
  switch (action.kind) {
    case 'deactivate-organization':
      return {
        title: 'Deactivate organization',
        description: `Deactivate ${action.organizationName}? Existing memberships will stop granting access until the organization is reactivated. Historical records remain available to Phaeno.`,
        cancelLabel: 'Keep active',
        submitLabel: 'Deactivate organization',
      }
    case 'deactivate-member':
      return {
        title: 'Deactivate membership',
        description: `Remove ${action.memberEmail}'s access to ${action.organizationName}? Their user account and historical activity remain unchanged.`,
        cancelLabel: 'Keep membership',
        submitLabel: 'Deactivate membership',
      }
    case 'end-entitlement':
      return {
        title: 'End service entitlement',
        description: `End ${action.serviceName} for ${action.organizationName} now? New work requiring this entitlement will no longer be available. The entitlement history remains recorded.`,
        cancelLabel: 'Keep entitlement',
        submitLabel: 'End entitlement',
      }
  }
}
