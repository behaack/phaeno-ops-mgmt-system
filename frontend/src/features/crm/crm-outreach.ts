import type { CrmContact } from '#/api/crm';

export const outreachSources = {
  DirectRequest: 'Direct request',
  RecordedConsent: 'Recorded consent',
  ReviewedRelationship: 'Reviewed business relationship',
  StaffReview: 'Staff review',
} as const;

export const suppressionReasons = {
  Unsubscribed: 'Unsubscribed',
  DirectRequest: 'Requested no outreach',
  InternalRestriction: 'Internal restriction',
} as const;

export const outreachBoundary = 'Recorded for staff reference; does not automatically block messages sent through other tools. Portal invitations, order updates, results and security messages are managed separately. CRM does not send sales or marketing outreach.';

export function outreachStatus(contact?: CrmContact | null): 'NotEstablished' | 'Allowed' | 'Suppressed' {
  if (contact?.outreachStatus) return contact.outreachStatus;
  return contact?.communicationPreference === 'OptedOut' || contact?.communicationPreference === 'DoNotContact'
    || contact?.communicationPreference === 'Suppressed' ? 'Suppressed' : 'NotEstablished';
}

export function outreachLabel(contact?: CrmContact | null) {
  const status = outreachStatus(contact);
  return status === 'NotEstablished' ? 'Not established' : status;
}

export function outreachSourceLabel(value?: string | null) {
  return value && value in outreachSources ? outreachSources[value as keyof typeof outreachSources] : 'Not recorded';
}

export function suppressionLabel(contact: CrmContact) {
  if (contact.outreachSuppressionReason && contact.outreachSuppressionReason in suppressionReasons)
    return suppressionReasons[contact.outreachSuppressionReason as keyof typeof suppressionReasons];
  return contact.communicationPreference === 'OptedOut' ? 'Opted out (legacy)'
    : contact.communicationPreference === 'DoNotContact' ? 'Do not contact (legacy)' : 'Not recorded';
}
