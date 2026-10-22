export const accessTones = { Active: 'info', Inactive: 'neutral', Invited: 'pending', Pending: 'pending', PendingAcceptance: 'pending', Accepted: 'success', Expired: 'warning', Revoked: 'neutral', Suspended: 'warning', Disabled: 'neutral', Blocked: 'error', Ready: 'info', NotReviewed: 'neutral' } as const
export const portalAccessTones = { Enabled: 'info', NotEnabled: 'neutral', Suspended: 'warning', Active: 'info', NotInvited: 'neutral', InvitationPending: 'pending', InvitationExpired: 'warning', MembershipInactive: 'neutral', Inactive: 'neutral' } as const
// Provider acceptance does not establish recipient acceptance or active Portal access.
export const invitationDeliveryTones = { Queued: 'pending', Sending: 'info', Accepted: 'info', Delivered: 'success', Bounced: 'error', Failed: 'error', NeedsAttention: 'warning', NotQueued: 'neutral' } as const
export const serviceConfigurationTones = { Pending: 'pending', Ready: 'info', Blocked: 'warning', Ended: 'neutral' } as const
