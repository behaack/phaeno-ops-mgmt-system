import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage, type CrmOpportunityContact } from '#/api/crm'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { FieldError } from '#/components/ui/field'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { CrmAssociationRecordCombobox } from './CrmAssociationRecordCombobox'

const schema = z.object({ contactId: z.string().min(1, 'Select a Contact from the search results.'), role: z.string().trim().max(150, 'Use 150 characters or fewer.'), isPrimary: z.boolean() })
type Values = z.infer<typeof schema>
export type OpportunityContactInput = { contactId: string; role: string | null; isPrimary: boolean }

export function CrmOpportunityContactDialog({ association, excludedIds, pending, error, onClose, onSubmit, onRemove }: {
  association?: CrmOpportunityContact
  excludedIds?: string[]
  pending: boolean
  error: unknown
  onClose: () => void
  onSubmit: (input: OpportunityContactInput) => void
  onRemove?: () => void
}) {
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const keepButtonRef = useRef<HTMLButtonElement>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onSubmit', reValidateMode: 'onChange', defaultValues: { contactId: association?.contactId ?? '', role: association?.role ?? '', isPrimary: association?.isPrimary ?? false } })
  useOrderDraftGuard(form.formState.isDirty, pending)
  function close() { if (!pending && (!form.formState.isDirty || window.confirm('Discard unsaved Opportunity contact changes?'))) onClose() }
  const contactError = form.formState.errors.contactId?.message
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent><DialogHeader><DialogTitle>{association ? `Manage ${association.contactName}` : 'Associate Opportunity contact'}</DialogTitle><DialogDescription>{association ? "Update this person's role or remove them from the Opportunity. The Contact and prior relationship history are retained." : 'Search the Contact directory to add a buying-team member. Existing active associations are excluded.'}</DialogDescription></DialogHeader>
    {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
    <form id="opportunity-contact-form" noValidate onSubmit={form.handleSubmit(values => { if (!pending && !confirmRemoval) onSubmit({ ...values, role: values.role || null }) }, errors => { if (errors.contactId) document.getElementById('opportunity-contact')?.focus() })}>
      <fieldset disabled={pending || confirmRemoval} className="space-y-4">
        {!association ? <div className="space-y-1.5"><Label htmlFor="opportunity-contact"><RequiredFieldName>Contact</RequiredFieldName></Label><CrmAssociationRecordCombobox id="opportunity-contact" name="contactId" kind="contact" required excludedIds={excludedIds} invalid={Boolean(contactError)} describedBy={contactError ? 'opportunity-contact-error' : undefined} onValueChange={id => form.setValue('contactId', id, { shouldDirty: true, shouldValidate: Boolean(contactError) })} /><FieldError id="opportunity-contact-error">{contactError}</FieldError></div> : null}
        <div className="space-y-1.5"><Label htmlFor="opportunity-contact-role">Role (optional)</Label><Input id="opportunity-contact-role" maxLength={150} aria-invalid={Boolean(form.formState.errors.role)} aria-describedby={form.formState.errors.role ? 'opportunity-contact-role-error' : undefined} {...form.register('role')} placeholder="Decision maker, scientific lead, procurement…" /><FieldError id="opportunity-contact-role-error">{form.formState.errors.role?.message}</FieldError></div>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register('isPrimary')} />Primary contact for this Opportunity</label>
      </fieldset>
    </form>
    {confirmRemoval ? <Alert><AlertDescription>Remove {association?.contactName} from this Opportunity? The saved association will remain in history. Unsaved role changes will be discarded.</AlertDescription></Alert> : null}
    <RequiredDialogFooter showLegend={!association}>
      {confirmRemoval ? <><Button ref={keepButtonRef} type="button" variant="outline" disabled={pending} onClick={() => { setConfirmRemoval(false); requestAnimationFrame(() => removeButtonRef.current?.focus()) }}>Keep association</Button><Button type="button" variant="destructive" disabled={pending} onClick={onRemove}>{pending ? 'Removing…' : 'Confirm removal'}</Button></> : <>{association && onRemove ? <Button ref={removeButtonRef} type="button" variant="destructive" disabled={pending} onClick={() => { setConfirmRemoval(true); requestAnimationFrame(() => keepButtonRef.current?.focus()) }}>Remove association</Button> : null}<Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" form="opportunity-contact-form" disabled={pending || (Boolean(association) && !form.formState.isDirty)}>{pending ? 'Saving…' : association ? 'Save changes' : 'Associate contact'}</Button></>}
    </RequiredDialogFooter>
  </DialogContent></Dialog>
}
