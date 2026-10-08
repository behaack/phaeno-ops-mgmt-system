import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CrmContact, CrmContactInput } from '#/api/crm';
import { Alert, AlertDescription } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog';
import { FieldDescription, FieldError } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard';
import { CrmOwnerSelect } from './CrmOwnerSelect';
import { outreachBoundary, outreachLabel, outreachSources, outreachStatus, suppressionReasons } from './crm-outreach';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter the first name.').max(100),
  lastName: z.string().trim().min(1, 'Enter the last name.').max(100),
  email: z.string().trim().refine(value => !value || z.email().safeParse(value).success, 'Enter a valid email address.'),
  phone: z.string().trim().max(50), ownerUserId: z.string(), tags: z.string(),
  recordDecision: z.boolean(), preference: z.enum(['Unknown', 'Permitted', 'Suppressed']),
  permissionSource: z.string(), recordedOn: z.string(), suppressionReason: z.string(), explanation: z.string().trim().max(1000),
}).superRefine((values, context) => {
  if (!values.recordDecision) return;
  const issue = (path: string, message: string) => context.addIssue({ code: 'custom', path: [path], message });
  if (!(values.permissionSource in outreachSources)) issue('permissionSource', 'Select the source supporting this decision.');
  const date = new Date(`${values.recordedOn}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.recordedOn) || Number.isNaN(date.valueOf())
    || date.toISOString().slice(0, 10) !== values.recordedOn || values.recordedOn > new Date().toISOString().slice(0, 10))
    issue('recordedOn', 'Enter a valid evidence date, no later than today (UTC).');
  if (!values.explanation) issue('explanation', 'Explain the decision and the outreach it covers.');
  if (values.preference === 'Permitted' && !values.email) issue('email', 'Record the email before allowing outreach.');
  if (values.preference === 'Suppressed' && !(values.suppressionReason in suppressionReasons)) issue('suppressionReason', 'Select why outreach is suppressed.');
});
type Values = z.infer<typeof schema>;
type Props = { open: boolean; contact?: CrmContact | null; pending: boolean; error?: string;
  onOpenChange: (open: boolean) => void; onSubmit: (input: CrmContactInput) => void };

export function CrmContactEditor(props: Props) {
  return props.open ? <ContactEditor {...props} /> : null;
}

function ContactEditor({ contact, pending, error, onOpenChange, onSubmit }: Props) {
  const reviewed = useRef(contact).current;
  const initialStatus = outreachStatus(reviewed);
  const form = useForm<Values>({
    resolver: zodResolver(schema), mode: 'onTouched', reValidateMode: 'onChange',
    defaultValues: {
      firstName: reviewed?.firstName ?? '', lastName: reviewed?.lastName ?? '', email: reviewed?.email ?? '', phone: reviewed?.phone ?? '',
      ownerUserId: reviewed?.ownerUserId ?? '', tags: reviewed?.tags.join(', ') ?? '', recordDecision: false,
      preference: initialStatus === 'Allowed' ? 'Permitted' : initialStatus === 'Suppressed' ? 'Suppressed' : 'Unknown',
      permissionSource: reviewed?.outreachPermissionSource ?? '', recordedOn: reviewed?.outreachRecordedOn ?? '',
      suppressionReason: reviewed?.outreachSuppressionReason ?? '', explanation: reviewed?.communicationNotes ?? '',
    },
  });
  const recordDecision = form.watch('recordDecision');
  const preference = form.watch('preference');
  const email = form.watch('email');
  const { errors, isDirty } = form.formState;
  useOrderDraftGuard(isDirty, pending);
  const close = (nextOpen: boolean) => {
    if (pending || (!nextOpen && isDirty && !window.confirm('Discard unsaved contact changes?'))) return;
    onOpenChange(nextOpen);
  };
  const field = (name: keyof Values, label: string, control: React.ReactNode, description?: string) => <div className="grid gap-1.5">
    <Label htmlFor={`contact-${name}`}>{label}</Label>
    {description ? <FieldDescription id={`contact-${name}-help`}>{description}</FieldDescription> : null}
    {control}<FieldError id={`contact-${name}-error`}>{errors[name]?.message}</FieldError>
  </div>;
  const attributes = (name: keyof Values, described = false) => ({ id: `contact-${name}`, 'aria-invalid': Boolean(errors[name]),
    'aria-describedby': [described ? `contact-${name}-help` : '', errors[name] ? `contact-${name}-error` : ''].filter(Boolean).join(' ') || undefined });
  const selectClass = 'h-9 w-full min-w-0 rounded-md border bg-background px-3 text-sm';
  return <Dialog open onOpenChange={close}>
    <DialogContent className="max-w-2xl" showCloseButton={!pending}>
      <form noValidate onSubmit={form.handleSubmit(values => onSubmit({
        firstName: values.firstName, lastName: values.lastName, email: values.email || null, phone: values.phone || null,
        ownerUserId: values.ownerUserId || null, communicationPreference: reviewed?.communicationPreference ?? 'Unknown',
        lawfulContactBasis: reviewed?.lawfulContactBasis ?? null, communicationNotes: reviewed?.communicationNotes ?? null,
        tags: values.tags.split(',').map(value => value.trim()).filter(Boolean),
        ...(values.recordDecision ? { outreachDecision: { preference: values.preference, permissionSource: values.permissionSource,
          recordedOn: values.recordedOn, suppressionReason: values.preference === 'Suppressed' ? values.suppressionReason : null,
          explanation: values.explanation } } : {}),
      }))}>
        <DialogHeader>
          <DialogTitle>{reviewed ? 'Edit contact' : 'New contact'}</DialogTitle>
          <DialogDescription>Keep identity and outreach decisions together. Company-specific titles belong to relationships.</DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <fieldset disabled={pending} className="grid min-w-0 gap-4" onChange={event => {
          const target = event.target;
          if ((target instanceof HTMLSelectElement || target instanceof HTMLInputElement) && target.name === 'ownerUserId')
            form.setValue('ownerUserId', target.value, { shouldDirty: true });
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('firstName', 'First name *', <Input {...attributes('firstName')} {...form.register('firstName')} required maxLength={100} />)}
            {field('lastName', 'Last name *', <Input {...attributes('lastName')} {...form.register('lastName')} required maxLength={100} />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('email', 'Email', <Input {...attributes('email')} {...form.register('email')} type="email" maxLength={255} />)}
            {field('phone', 'Phone', <Input {...attributes('phone')} {...form.register('phone')} maxLength={50} />)}
          </div>
          {field('ownerUserId', 'Owner', <CrmOwnerSelect id="contact-ownerUserId" currentOwnerId={reviewed?.ownerUserId} currentOwnerName={reviewed?.ownerName}
            defaultLabel={reviewed ? 'Keep current owner' : 'Assign to me'} />)}
          <section className="grid gap-3 rounded-md border p-3" aria-labelledby="contact-outreach-title">
            <div><h3 id="contact-outreach-title" className="text-sm font-semibold">Sales and marketing outreach</h3>
              <p className="mt-1 text-sm">Current status: {outreachLabel(reviewed)}</p>
              <p id="contact-outreach-boundary" className="mt-2 text-xs text-muted-foreground">{outreachBoundary}</p></div>
            {reviewed?.communicationPreference === 'Permitted' && !reviewed.outreachPermissionSource
              ? <p className="text-xs text-muted-foreground">Legacy “Permitted” is retained, but permission evidence needs review before outreach is allowed.</p> : null}
            {reviewed?.lawfulContactBasis ? <p className="text-xs text-muted-foreground">Legacy contact basis (retained): {reviewed.lawfulContactBasis}</p> : null}
            {reviewed?.outreachStatus === 'Allowed' && email.trim().toLowerCase() !== reviewed.email?.toLowerCase()
              ? <p role="status" className="text-sm">Changing this email resets outreach to Not established unless you record a new decision for the new address.</p> : null}
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register('recordDecision')}
              aria-describedby="contact-outreach-boundary" className="size-4" />Record or update outreach decision</label>
            {recordDecision ? <div className="grid gap-4">
              {field('preference', 'Outreach status *', <select {...attributes('preference')} {...form.register('preference')} className={selectClass}>
                <option value="Unknown">Not established</option><option value="Permitted">Allowed</option><option value="Suppressed">Suppressed</option></select>)}
              {field('permissionSource', 'Permission source *', <select {...attributes('permissionSource', true)} {...form.register('permissionSource')} className={selectClass}>
                <option value="">Select source</option>{Object.entries(outreachSources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>,
                'Record what supports this decision. A requested Portal invitation does not establish permission for sales or marketing.')}
              {field('recordedOn', 'Evidence date *', <Input {...attributes('recordedOn', true)} {...form.register('recordedOn')} type="date" max={new Date().toISOString().slice(0, 10)} />,
                'When the request, consent or review occurred. No later than today (UTC). Saved history also records who entered it and when.')}
              {preference === 'Suppressed' ? field('suppressionReason', 'Suppression reason *', <select {...attributes('suppressionReason')} {...form.register('suppressionReason')} className={selectClass}>
                <option value="">Select reason</option>{Object.entries(suppressionReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>) : null}
              {field('explanation', 'Decision explanation and scope *', <Textarea {...attributes('explanation', true)} {...form.register('explanation')} rows={3} maxLength={1000} />,
                'Describe the evidence and exactly which outreach it covers. Do not include sensitive personal or scientific information.')}
            </div> : null}
          </section>
          {field('tags', 'Tags', <Input {...attributes('tags')} {...form.register('tags')} placeholder="Comma-separated" />)}
        </fieldset>
        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">* Required</span>
          <Button type="button" variant="outline" disabled={pending} onClick={() => close(false)}>Cancel</Button>
          <Button type="submit" disabled={pending || (Boolean(reviewed) && !isDirty)}>{pending ? 'Saving…' : reviewed ? 'Save changes' : 'Create contact'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
