# Auth and User System Plan

Keep this file updated as authentication, authorization, user lifecycle, and invitation decisions change.

Do not execute this plan unless explicitly requested.

## Status

- The backend account, session, organization, invitation, membership, user
  lifecycle, audit, and Clerk-linking workflows are implemented.
- The frontend session shell and invitation acceptance/decline route are
  connected to the API.
- The current organization and user administration screens remain mock-backed
  session previews. Durable create/list/update, invitation resend/revoke,
  membership role/deactivation, organization conversion, and global-user
  lifecycle operations still require connected frontend work and coverage.

## Core Decisions

- Use Clerk in a limited role for authentication only:
  - sign in and sign out
  - sessions
  - password reset
  - email verification
  - MFA
  - future SSO
- Phaeno Portal remains the source of truth for:
  - organizations
  - users
  - memberships
  - roles and capabilities
  - invite lifecycle
  - active/inactive status
  - audit events
  - tenant access decisions
- Do not use Clerk Organizations as the primary tenant model.
- Do not use Clerk roles, permissions, or metadata for application authorization.
- Use Clerk prebuilt or hosted authentication UI for v1.
- Disable or hide public Clerk sign-up. Account creation is reached through Phaeno invitation flow only.
- Local development uses a real Clerk development instance. Automated tests may use auth fakes/test handlers.

## Data Model Direction

- Users can belong to multiple organizations.
- Replace single-organization user assumptions with an organization membership model.
- A user has identity, profile, and global lifecycle fields.
- An organization has tenant metadata, kind, and active/inactive status.
- Prospect is a portal tenant phase that can later convert in place to Customer
  or Partner while preserving organization identity and history.
- A membership links a user to an organization and stores per-organization capability, initially org-admin or member.
- Selected organization context is required for tenant-scoped requests.
- Phaeno/platform admin access is based on an active admin membership in an active organization with kind `Phaeno`.
- Phaeno admins manage external organizations through platform admin screens,
  not by freely switching into external organization context.
- Prospect, Customer, and Partner organization administrators can see only users
  and memberships in their own selected organization, with the same
  tenant-isolation baseline.

## Identity Fields

- Store both normalized email and external identity data locally.
- `NormalizedEmail` is required and unique.
- `Email` stores the display/original email value.
- `ExternalIdentityProvider` is nullable before invite acceptance and should be `clerk` once linked.
- `ExternalSubjectId` is nullable before invite acceptance and stores the Clerk user id once linked.
- `(ExternalIdentityProvider, ExternalSubjectId)` must be unique when present.
- Local email is admin-controlled in v1.
- Phaeno does not support self-service email changes in v1.
- Clerk email changes do not automatically overwrite local authorization data.
- Phaeno owns first and last name locally. Users can edit their own first and last name in Phaeno.

## Lifecycle Rules

- No hard deletes in normal auth/admin workflows.
- Users are disabled/inactive, not deleted.
- Organizations are marked inactive, not deleted.
- Memberships are marked inactive, not deleted.
- Invitations are status-driven records, not deleted.
- Hard deletion is reserved for exceptional maintenance or privacy procedures outside normal v1 workflows.
- Invited users have `IsActive = false` until invite acceptance.
- Active users can have no active memberships; they remain globally active but have no app access until invited again.
- Organization inactivity blocks access through that organization but does not change user or membership statuses.
- Reactivating an organization restores access only for globally active users with active memberships.

## Invitation Model

- v1 is admin-created invite only.
- Invitations are pending organization memberships for an email.
- Invite flow is email-first only. Admins enter email, organization, and intended member/admin capability.
- Backend resolves existing users by normalized email.
- One invite token accepts exactly one organization membership.
- A user needs separate invites for separate organization memberships.
- Require an invite for every new organization membership, including existing users.
- New invite creation is allowed after historical declined, revoked, or expired invites.
- New invite creation is rejected when the user already has an active membership in that organization.
- Existing inactive memberships may be reactivated only through fresh invite acceptance.
- Invites to globally disabled users are blocked until a Phaeno admin reactivates the user.
- Prospect and customer organization admins can invite any email address to
  their own organization in v1. Approved-domain restrictions are deferred.

## Invite Token Rules

- Invitation tokens expire after 7 days.
- Store only a cryptographic hash of invite tokens.
- Send the raw token only in the invitation email link.
- Resend rotates the raw token, stored hash, and expiry.
- Invite tokens are strictly single-use after successful acceptance.
- Accept and decline requests submit tokens in the POST request body, not URL path or query.
- The frontend removes invite tokens from the visible URL after capture and uses temporary memory/session storage only as needed for auth redirect.
- Do not create unauthenticated pre-auth invite lookup endpoints.

## Invite Statuses

- Stored invite statuses:
  - `Pending`
  - `Accepted`
  - `Revoked`
  - `Declined`
- `Expired` is an effective/display state derived from `Status == Pending` and `ExpiresAt < now`.
- Revoked invitations record revoked-at and revoked-by.
- Declined invitations record declined-at and authenticated decline context.
- Declined, revoked, and accepted invites cannot be resent or reopened.
- Admins create a new invite if access is desired after decline or revocation.

## Invite Acceptance and Decline

- Invitation emails link to a Phaeno `/accept-invite` page first.
- Before Clerk authentication, the invite page shows only generic Phaeno invitation information.
- After Clerk authentication, backend validates token and email match before returning organization or role details.
- Acceptance requires explicit user action after authentication.
- Decline requires Clerk authentication with the invited verified email.
- Clerk primary email must be verified.
- Normalized Clerk primary email must match the normalized invite email.
- Acceptance runs in a transaction:
  - validate invite
  - create or link local user if needed
  - create, reactivate, or update the organization membership
  - mark invite accepted
  - write audit events
  - commit

## Invitation Email

- Phaeno backend sends invitation emails.
- Target Postmark first for production transactional email.
- Implement email sending behind an abstraction, with a development/test no-op or logging sender.
- Invite creation and resend return success only after Postmark accepts the email.
- Structure email sending so an outbox can replace direct sending later.
- Store basic send metadata:
  - `LastSentAt`
  - `LastSentByUserId`
  - `SendCount`
  - `LastEmailProviderMessageId`
  - optional `LastSendError`
- Enforce a 5-minute resend cooldown per pending invite.
- Pending and effectively expired invites can be resent, subject to cooldown.

## Backend Authentication

- Frontend sends `Authorization: Bearer <Clerk JWT>`.
- Backend validates Clerk token signature, issuer, audience, and expiration on API requests.
- Backend extracts the Clerk subject id and loads the local user by `ExternalIdentityProvider = clerk` and `ExternalSubjectId`.
- Unknown valid Clerk users are rejected and not auto-provisioned.
- Clerk webhooks are not required for authorization-critical v1 behavior.
- When a user or organization is marked inactive, backend access is blocked immediately. Clerk sessions may remain active.

## Authorization Semantics

- Use `401 Unauthorized` for missing, invalid, expired, or malformed Clerk authentication.
- Use `403 Forbidden` for valid Clerk identity without local app access or required capability.
- Tenant-scoped requests include selected organization context, likely `X-Organization-Id`.
- Backend validates selected organization context on every tenant-scoped request.
- Required access gates:
  - valid Clerk authentication
  - linked local user
  - global user is active and status is active
  - selected organization is active
  - active membership exists in selected organization
  - membership has the required capability
- Multiple active memberships are allowed.
- Each tenant-scoped request operates under one selected organization context.
- Cross-organization views must be explicit platform/admin views.

## Session Bootstrap Endpoint

- Add a backend session/bootstrap endpoint, for example `GET /api/session`.
- `/api/session` returns `401` only when Clerk authentication is missing or invalid.
- For valid Clerk identity, `/api/session` returns `200` with an explicit access state.
- Expected states:
  - `unauthorized`
  - `disabled`
  - `no_active_memberships`
  - `organization_unavailable`
  - `ready`
- Response includes minimal active user, membership, and capability data:
  - user id
  - email
  - first name
  - last name
  - status
  - active memberships
  - organization summaries
  - platform admin flag
  - selected organization validation result when a selected org header is supplied
- Do not include inactive/history records in the bootstrap response.
- Expose coarse capability booleans computed by the backend.

## Frontend Auth and Access States

- Use separate frontend states:
  - unauthenticated
  - unauthorized
  - no active memberships
  - organization unavailable
  - ready
- Avoid login loops for valid Clerk users who lack local access.
- Auto-select the only active membership.
- Show an organization switcher only when multiple active memberships exist.
- Persist the last selected organization locally.
- If the persisted organization is no longer valid, fall back to another active membership or show the no-access state.
- Frontend generally hides actions when capability booleans are false.
- Backend still enforces all authorization checks.

## Admin Permissions

- Phaeno admins can invite users to any organization.
- Prospect and customer organization admins can invite users only to their own
  organization.
- Organization admins cannot invite users into Phaeno/internal organizations.
- Organization admins cannot grant Phaeno-level access.
- Organization admins can mark memberships inactive for their own organization.
- Organization admins cannot globally disable or reactivate users.
- Phaeno admins can globally disable and reactivate users.
- Organization admins can promote or demote users within their own organization with last-admin protection.
- Users can leave an organization themselves unless they are the last active org admin.
- Reactivating an inactive membership requires fresh invite acceptance.
- Phaeno admins can mark an organization inactive even if it has active users or memberships.
- Only an authorized Phaeno user can convert a Prospect organization to Customer
  or Partner.
- Prospect conversion preserves the organization, users, memberships, and audit
  history rather than creating a new tenant.
- Prospect conversion also preserves every curated-package grant and pinned
  version without automatic additions, replacements, upgrades, or revocations.
- Prospect memberships never grant ordering capabilities.
- Customer capabilities may allow lab service ordering, sample-progress
  tracking, and access to released laboratory data.
- Partner capabilities may allow reagent ordering, data assembly submission,
  and download of completed assembly outputs.
- Prospect organization administrators manage their users but cannot assign
  sample-data access. Only an authorized Phaeno user can manage the eligible
  Prospect sample-data catalog or grant sample data to a Prospect organization.
- Prospect users may view and download sample data actively granted to their
  selected organization. Download access never follows from catalog eligibility
  alone.
- Revoking a curated Prospect package grant immediately blocks portal viewing
  and downloading for every organization member.
- Organization deactivation suspends access to curated packages without
  revoking their grants. Reactivation restores access to still-active,
  non-revoked grants for eligible active members.
- Curated sample-package grants do not expire and remain authorized until
  Phaeno explicitly revokes them.
- An authorized Phaeno user removing a package from the eligible catalog may
  optionally revoke that package for every Customer, Prospect, and Partner
  organization. Bulk revocation is audited and blocks access immediately.
- Every active organization member can access Phaeno-owned curated Prospect
  packages granted to that organization, including after conversion.
- Customer- or Partner-owned operational data follows Customer/Partner access
  rules and must not inherit the organization-wide Prospect-data rule.
- Backend authorization derives the access policy from the data's ownership and
  classification, not merely the organization's current phase.
- Customer and Partner organization administrators manage member access to
  their organization-owned operational data. Authorized Phaeno administrators
  may assist, with every access change audited.
- Organization administrators can view curated package download history only
  for their own organization. Authorized Phaeno users may review it across
  organizations.

## Bootstrap

- Use an idempotent environment-configured bootstrap seed for the first Phaeno organization and first Phaeno admin.
- Seed creates:
  - active Phaeno organization
  - local bootstrap admin user
  - active admin membership in the Phaeno organization
- First bootstrap admin links to Clerk on first verified Clerk login by configured email.
- Bootstrap link applies only when:
  - configured bootstrap user exists
  - local bootstrap user has no external subject
  - Clerk primary email is verified
  - normalized Clerk email matches configured bootstrap admin email
- Bootstrap Clerk-link path is one-time only and effectively disabled after the bootstrap user is linked.
- Write an audit event for bootstrap identity linking.

## Audit

- Write explicit audit events for access-changing auth/admin actions.
- Defer polished audit UI until after the core auth/admin flow works.
- Events should cover:
  - invite created
  - invite resent
  - invite revoked
  - invite declined
  - invite accepted
  - user globally disabled
  - user globally reactivated
  - organization marked inactive
  - organization reactivated
  - Prospect converted to Customer or Partner
  - membership created or reactivated by invite acceptance
  - membership marked inactive
  - membership admin capability changed
  - Customer/Partner operational-data access granted or revoked
  - user leaves organization
  - bootstrap identity linked

## List and Admin UI Defaults

- Admin lists default to active/current records.
- APIs return active/current records by default.
- Inactive/history records require explicit filters.
- Invitation lists can default to pending/effective pending.
- Filters should expose inactive, disabled, accepted, revoked, declined, expired, and history records where relevant.

## Implementation Checklist

- [x] Add limited Clerk authentication integration and backend JWT validation.
- [x] Add external identity fields and normalized email uniqueness to users.
- [x] Refactor account model for multi-organization memberships.
- [x] Add membership lifecycle and authorization helpers.
- [x] Add selected organization request-context validation.
- [x] Add session/bootstrap endpoint.
- [x] Add invitation entity/model with hashed token support.
- [x] Add invitation create, resend, accept, and decline workflows.
- [x] Add invitation revoke workflow.
- [x] Add email sender behind an abstraction.
- [x] Add Postmark email sender implementation.
- [x] Add bootstrap seed and one-time bootstrap Clerk linking.
- [x] Replace hard-delete account actions with inactive/status transitions.
- [x] Add explicit audit events for access-changing actions.
- [x] Remove direct user creation from normal API workflows so membership access is invite-only.
- [x] Update frontend Clerk auth integration.
- [x] Add `/accept-invite` frontend route and token scrubbing.
- [x] Add frontend access states and organization switcher behavior.
- [x] Add capability-driven action visibility.
- [x] Add backend tests for auth gates, invite lifecycle, membership lifecycle, and bootstrap.
- [ ] Add frontend tests for auth states, invite flow, org selection, and hidden/visible actions.
- [x] Add Prospect organization kind/phase, member-management authorization,
      and audited in-place conversion to Customer or Partner.
- [x] Add tests proving Prospect administrators can manage their own
      organization. Ordering capabilities are absent from the current session
      contract and no order endpoint is exposed to Prospect users.

## Deferred

- Clerk Organizations as primary tenant model.
- Clerk roles or metadata as app authorization source.
- Public self-signup.
- Domain-based auto-provisioning or approved-domain invite restrictions.
- Clerk authorization-critical webhooks.
- Postmark delivery/bounce webhooks.
- Full RBAC or permission taxonomy.
- Full audit timeline UI.
- Direct membership assignment without invite.
- Support/impersonation workflow for Phaeno admins.
- Partner assignment and partner-managed customer invitations.
- Self-service email change.
- Runtime local auth bypass outside automated tests.
