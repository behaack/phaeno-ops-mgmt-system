# Auth and User System Plan

## 2026-08-29 PSeq order-to-cash implementation update

`PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md` is now authoritative for PSeq
invitation delivery and internal business roles. Invitations retain access
state separately from durable Mailgun delivery attempts; delivery and
permanent-failure webhooks are HMAC-verified and deduplicated, and a hard bounce requires
revoke/reissue to a corrected address. Production must reject missing sender,
Portal URL, provider, or webhook-secret configuration. Logging-only invitation
delivery remains Development/Test only.

Internal Phaeno access now includes additive `CommercialOperator`,
`ResultReleaseManager`, `BillingOperator`, `CashOperator`, and
`CashReconciler` roles. The invitation intent, accepted assignment, user
administration update, session capability, and backend authorization use the
same role set. Platform administrator is configuration and role-management
authority, not an automatic business-action role after enforcement. Dual
control begins audit-only and becomes authoritative only after adequate
staffing is evidenced.

Keep this file updated as authentication, authorization, user lifecycle, and invitation decisions change.

Do not execute this plan unless explicitly requested.

## Status

- The local 2026-09-04 department-access slice adds a default General
  Department to every Organization, explicit Department memberships and invite
  intent, selected-department session context, and department-scoped customer
  operational roots. Organization administrators retain all-department access;
  Department administrators and members remain limited to assigned active
  Departments. See `PEOPLE-DEPARTMENTS-ACCESS-PLAN.md`.

- The backend account, session, organization, invitation, membership, user
  lifecycle, audit, and Clerk-linking workflows are implemented.
- Account domain entities, pure authorization policy, invitation-token logic,
  and the invitation-delivery port now live in `PSeq.Operations.Commercial`.
  The API retains HTTP contracts/endpoints, authenticated-actor lookup,
  persistence orchestration, Clerk/Mailgun adapters, and bootstrap composition.
- The frontend session shell and invitation acceptance/decline route are
  connected to the API.
- The invitation review page identifies the current Clerk email, displays the
  API's actionable failure reason, and preserves the captured token while a user
  signs out to switch to the invited email. Clerk sign-in and development
  account creation return to `/accept-invite` so the authenticated user can
  complete the explicit Portal acceptance step before entering the application.
  If authentication nevertheless reaches the access gate first, a saved pending
  invitation provides a direct **Continue invitation** recovery action. A
  successful acceptance refreshes the Portal session before the user continues,
  making the new organization membership available immediately.
- Local development can rotate a pending invitation token through an audited,
  authorized API action and show the resulting sign-in link to the administrator.
  The development invitation page permits first-time Clerk account creation;
  neither capability is exposed by a production build or production API.
- The signed-out shell applies the Phaeno logo, Portal name, invitation-only
  access language, and Portal design tokens around Clerk's prebuilt sign-in
  flow. It omits authenticated application navigation and Clerk's embedded
  vendor footer. The paid-plan Clerk Dashboard setting that removes
  **Secured by Clerk** branding remains an environment setting to activate and
  verify in each Clerk instance.
- The user menu no longer exposes an organization-context search or act-as
  switcher. Phaeno administrators manage external organizations through the
  CRM Company workspace; the authenticated session still supplies the internal
  organization scope required for tenant authorization.
- The POMS dashboard groups the existing mock organization, user, invitation,
  readiness, and activity summaries under a Phaeno-only **Customer access** panel
  alongside Order Operations and Lab Operations. This is a layout mock-up, not
  a connected account queue or authorization change.
- Prospect, Customer, and Partner dashboards do not reuse that internal mock
  Customer access panel. They show only capability-eligible, organization-scoped
  workflow cards backed by the existing tenant APIs: Customer laboratory work
  and sample shipping, Prospect sample shipping, Partner reagent and data-
  assembly work, assigned Data Library packages, and durable User management
  for organization administrators.
- The Phaeno Accounts list/detail, request, entitlement, invitation,
  membership, conversion, readiness, lifecycle, and User management workspaces
  are connected to durable APIs. Phaeno User management lists active and
  disabled internal users plus pending invitations as one card list, edits
  names, consolidates Platform administrator and additive Laboratory roles on
  the user record, and exposes audited global deactivation/reactivation.
  Pending invitations persist the invited first name, last name, and intended
  Phaeno roles. Laboratory roles activate atomically only after acceptance
  creates or reactivates an eligible Phaeno membership. The unsupported
  mock-only Operations admin and Customer manager labels were removed rather
  than represented as effective authorization.
- CRM Company is the canonical external customer record. Its detail workspace
  owns People, Departments, invitations, readiness, services, retention, and lifecycle
  operations after Portal access is approved. CRM's **Departments & services** section is
  the shared review surface; there is no separate Portal Accounts directory.
- Organization create and edit actions use modal forms, and selecting an
  organization opens a dedicated, view-first detail route.
- Production identity configuration is being separated from development. The
  deployment path now rejects Clerk Development credentials for the production
  API and provides an explicit one-time command that can relink only the sole
  bootstrap administrator. The command requires the exact previous Clerk
  subject, a matching verified primary email in Clerk Production, and no other
  linked Portal users; it records an audit event and is not part of normal API
  startup.

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
- Keep the sign-in experience visibly Phaeno-owned while retaining Clerk's
  prebuilt authentication flow. Omit the embedded vendor footer through Clerk's
  supported appearance configuration, and also enable the paid-plan Dashboard
  setting so any other Clerk-managed surface follows the same policy.
- Show the application header only after authentication. The signed-out and
  pending-authentication states place the centered Phaeno authentication
  lockup inside the sign-in container without duplicate global navigation.
- Disable or hide public Clerk sign-up in production. Account creation is reached
  through the Phaeno invitation flow only. Local development may expose Clerk
  sign-up from a captured invitation link so fake invitees can complete the real
  acceptance workflow without manual Clerk Dashboard provisioning.
- Local development uses a real Clerk development instance. Automated tests may use auth fakes/test handlers.
- Preview and local-development frontend builds use the Clerk development
  instance. The production frontend and API use the same Clerk production
  instance. Production deployment rejects `sk_test_` credentials and
  `*.clerk.accounts.dev` issuers.

### MFA Policy Decision

- Clerk supports authenticator-app codes, SMS codes, and backup codes, and its
  prebuilt sign-in component handles required MFA setup before a session becomes
  active.
- Approved 2026-08-06: require MFA for every invited Portal user; enable
  authenticator-app codes and one-time backup codes; leave SMS disabled. This
  avoids collecting phone numbers and reduces SMS delivery, cost, and SIM-swap
  risk.
- If a user loses both the authenticator and all backup codes, Phaeno owns the
  recovery decision. An authorized Phaeno administrator verifies the person's
  identity and organization, resets the user's Clerk MFA enrollments, revokes
  active sessions, and requires fresh authenticator enrollment at the next
  sign-in. Email may initiate the support request but does not automatically
  bypass MFA.
- The Portal hosts Clerk's `setup-mfa` task in the branded authentication shell.
  A pending task is not an active sign-in and cannot reach Portal application
  data or navigation.

## Data Model Direction

- Users can belong to multiple organizations.
- Replace single-organization user assumptions with an organization membership model.
- A user has identity, profile, and global lifecycle fields.
- An organization has tenant metadata, kind, and active/inactive status.
- Portal Prospect is an approved evaluation tenant, not every CRM Company,
  Contact, Lead, or Opportunity. A Portal Prospect can later convert in place
  to Customer or Partner while preserving organization identity and history.
- A company already approved to buy may be onboarded directly as a Customer or
  Partner after the pending CRM-to-Portal review; it does not need to pass
  through Portal Prospect.
- A membership links a user to an organization and stores per-organization capability, initially org-admin or member.
- Selected organization context is required for tenant-scoped requests.
- Phaeno/platform admin access is based on an active admin membership in an active organization with kind `Phaeno`.
- Phaeno admins manage external organizations through platform admin screens,
  not by freely switching into external organization context.
- The Accounts directory lists only Prospect, Customer, and Partner
  organizations. The internal Phaeno organization is authorization
  infrastructure and is not an account-directory record.
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
- Invitations are pending organization memberships for a named person and email.
- Admins enter first name, last name, email, organization, and intended
  member/admin capability. Phaeno invitations also carry zero or more intended
  Laboratory roles.
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
- Send the raw token only in the invitation email link, except for the
  authenticated and authorized local-development sign-in-link action.
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
- After Clerk authentication, backend validates token and email match before returning organization or role details. Clerk's default session token does not include email-verification claims, so the API uses a matching verified claim when configured and otherwise resolves the authenticated subject's verified primary email through Clerk's Backend API before acceptance or decline.
- Acceptance requires explicit user action after authentication.
- Decline requires Clerk authentication with the invited verified email.
- Clerk primary email must be verified.
- Normalized Clerk primary email must match the normalized invite email.
- Acceptance runs in a transaction:
  - validate invite
  - create or link local user if needed
  - create, reactivate, or update the organization membership
  - activate any intended Phaeno Laboratory roles
  - mark invite accepted
  - write audit events
  - commit

## Invitation Email

- Phaeno backend sends invitation emails.
- Reuse the existing production Mailgun account for transactional email.
- Implement email sending behind an abstraction, with a development/test no-op or logging sender.
- Invite creation and resend enqueue durable delivery; the attempt becomes
  `Accepted` only after Mailgun returns its message identifier.
- Structure email sending so an outbox can replace direct sending later.
- Store basic send metadata:
  - `LastSentAt`
  - `LastSentByUserId`
  - `SendCount`
  - `LastEmailProviderMessageId`
  - optional `LastSendError`
- Enforce a 5-minute resend cooldown per pending invite.
- Pending and effectively expired invites can be resent, subject to cooldown.
- Local development also provides **Create sign-in link** for pending invitations.
  It rotates the token and expiry without recording an email send or applying the
  resend cooldown, returns the raw link only in that response, and records an
  audit event without the token or URL.

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
- Do not expose organization switching in the user menu. Phaeno users manage
  external organizations through explicit platform administration screens,
  and external users remain in their authenticated organization context.
- Persist a valid session-selected organization locally when the session
  supplies one.
- If the persisted organization is no longer valid, fall back to another active membership or show the no-access state.
- Frontend generally hides actions when capability booleans are false.
- Backend still enforces all authorization checks.

## Admin Permissions

- Phaeno admins can invite users to any organization.
- Prospect and customer organization admins can invite users only to their own
  organization.
- Organization admins cannot invite users into Phaeno/internal organizations.
- Organization admins cannot grant Phaeno-level access.
- Organization admins can mark another user's membership inactive for their
  own organization. Administrative membership deactivation cannot target the
  acting user's own membership.
- Organization admins cannot globally disable or reactivate users.
- Phaeno admins can globally disable and reactivate other users. An
  administrator cannot globally disable their own account.
- Organization admins can promote or demote users within their own organization with last-admin protection.
- Users can leave an organization themselves unless they are the last active org admin.
- Reactivating an inactive membership requires fresh invite acceptance.
- Phaeno admins can mark an organization inactive even if it has active users or memberships.
- Only an authorized Phaeno user can convert a Prospect organization to Customer
  or Partner or reclassify an existing Customer as Partner or Partner as
  Customer. The first-party CRM supplies the approved commercial context; the
  Portal applies the change only after operational and access review.
- A Trial Project's CRM commercial outcome never converts the Prospect
  automatically.
  `Converted to Customer` or `Converted to Partner` supports a separate audited
  POMS action; `Closed without conversion` leaves the organization a Prospect,
  and `Follow-up scheduled` remains nonterminal until Sales records a final
  outcome.
- Prospect conversion preserves the organization, users, memberships, and audit
  history rather than creating a new tenant.
- Prospect conversion also preserves every curated-package grant and pinned
  version without automatic additions, replacements, upgrades, or revocations.
- Prospect memberships never grant ordering capabilities.
- An active Prospect organization administrator may submit samples only through
  an approved, accepted, active Trial Project owned by the selected
  organization and only within its frozen limits and submission window. This
  project-specific authorization never grants an organization-wide ordering
  capability. See `PROSPECT-TRIAL-PROJECT-PLAN.md`.
- Active Prospect organization members may view their own organization's Trial
  Projects, tenant-safe progress, and released results but cannot submit samples
  in the initial release.
- Customer capabilities may allow lab service ordering, sample-progress
  tracking, and access to released laboratory data.
- Partner capabilities may allow reagent ordering, data assembly submission,
  entitled specimen processing, and download of completed assembly or specimen
  outputs. Partner services are enabled independently; Partner kind alone does
  not grant every Partner service.
- CRM Contacts and Portal memberships are separate. Only the designated initial
  Portal administrator is explicitly linked during onboarding; users invited
  later in the Portal do not automatically become CRM Contacts.
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
- Prospect Trial Project samples and results are confidential,
  organization-scoped operational data. They do not inherit the
  organization-wide curated Prospect-package rule and remain scoped to the same
  organization after conversion.
- For released-deliverable retention, one successful download by any member
  currently authorized for the owning external organization satisfies the file
  for that organization. It is not a per-user completion requirement, internal
  Phaeno access does not count, and later membership changes do not erase a
  valid historical organization download event.
- Released-package download authorization closes at the exact snapshotted
  standard or final deadline independently of asynchronous storage cleanup.
  Remaining storage bytes never grant access after that instant.
- A request that passed current membership, tenant, and package authorization
  and started streaming before that cutoff may finish only under its bounded,
  server-bound lease. The lease cannot authorize a new request, retry, range
  resume, user, organization, file, or archive scope at or after the cutoff;
  only successful completion of the original stream counts as a download.
- The retention-cutoff allowance does not survive a higher-priority access
  change. Emergency quarantine, withdrawal/correction, membership deactivation,
  or organization deactivation immediately revokes matching active leases,
  stops their response streams, and records a non-counting `Revoked` outcome.
  Bytes already delivered before enforcement cannot be recalled.
- Durable server order resolves a concurrent terminal transition: a successful
  completion committed before revocation remains successful, while revocation
  committed first wins. Client timestamps do not decide the race. Reactivation
  never resumes the old stream; it permits a fresh request only if current
  authorization succeeds and the package cutoff is still in the future.
- An active external organization administrator may view and export the
  permanent tenant-safe receipt for its organization's released package,
  including downloader member names and timestamps. Ordinary active members see
  package availability/deletion status but not member-level download audit.
  External receipt views reduce a revoked outcome to `Access ended`; authorized
  Phaeno users retain the full reason and operational audit. No role can use a
  receipt to recover deleted bytes.
- Converting a Prospect organization to Customer or Partner does not reset or
  extend a released Trial package's snapshotted standard or final deletion
  deadline. The package continues under the released-deliverable policy values
  resolved from the global defaults and the Prospect organization's active
  override at release, including its conditional grace period. A later
  organization-kind or override change does not rewrite that snapshot, and
  there is no project-amendment extension path. Package metadata, result records,
  and audit history remain preserved after file bytes are deleted.
- Trial package-byte deletion does not automatically deactivate a non-
  converting Prospect organization. After commercial closeout, an authorized
  Phaeno user may deactivate it only after confirming there is no other active
  Trial Project, curated-data grant, or commercial relationship. The action and
  reason are audited and do not delete retained operational history.
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
- [x] Add Mailgun email sender implementation with locale-named embedded HTML
  and plain-text templates.
- [x] Add bootstrap seed and one-time bootstrap Clerk linking.
- [x] Add the guarded one-time bootstrap-administrator identity cutover used
      when moving an otherwise empty production Portal from Clerk Development
      to Clerk Production.
- [x] Replace hard-delete account actions with inactive/status transitions.
- [x] Add explicit audit events for access-changing actions.
- [x] Remove direct user creation from normal API workflows so membership access is invite-only.
- [x] Update frontend Clerk auth integration.
- [x] Apply Phaeno-owned branding and Portal design tokens to the signed-out
      Clerk surface, omit its vendor footer, and hide authenticated application
      navigation until sign-in completes.
- [ ] Enable Clerk's paid-plan **Remove "Secured by Clerk" branding** setting
      in each intended instance and verify the resulting sign-in surface.
- [x] Approve the MFA strategy, enforcement, and recovery policy: required
      authenticator-app MFA, backup codes, no SMS, and Phaeno-admin reset after
      identity verification when both recovery methods are lost.
- [x] Add the Phaeno-branded `setup-mfa` session-task route and keep pending
      sessions outside authenticated Portal navigation and API access.
- [x] Activate the approved MFA methods and enforcement in the Clerk development
      instance: authenticator application, backup codes, required MFA, and no
      SMS.
- [ ] Repeat the approved MFA policy in each intended production instance and
      verify new-user setup, existing-user transition, backup codes,
      second-factor sign-in, session revocation, and administrator reset.
- [x] Add `/accept-invite` frontend route and token scrubbing.
- [x] Add frontend access states and selected-organization validation without
      exposing an act-as switcher in the user menu.
- [x] Add capability-driven action visibility.
- [x] Add backend tests for auth gates, invite lifecycle, membership lifecycle, and bootstrap.
- [ ] Add frontend tests for auth states, invite flow, org selection, and hidden/visible actions.
- [x] Add Prospect organization kind/phase, member-management authorization,
      and audited in-place conversion to Customer or Partner.
- [x] Add tests proving Prospect administrators can manage their own
      organization. Ordering capabilities are absent from the current session
      contract and no order endpoint is exposed to Prospect users.
- [x] Replace the mock Phaeno organization directory/detail with the durable
      organization, invitation, and membership APIs.
- [x] Replace mock User management with durable Phaeno/external member lists,
      invitation lifecycle actions, global user lifecycle actions, and
      consolidated Phaeno platform/Laboratory role editing.
- [x] Persist invited names and intended Phaeno Laboratory roles, display them
      on the pending user card, and activate the roles only during accepted
      Phaeno membership creation/reactivation.
- [x] Add operational Portal readiness without treating readiness as access or
      service authorization.
- [x] Add the Phaeno relationship-request queue and dated service-entitlement
      administration foundation.

## Deferred

- Clerk Organizations as primary tenant model.
- Clerk roles or metadata as app authorization source.
- Production public self-signup.
- Domain-based auto-provisioning or approved-domain invite restrictions.
- Clerk authorization-critical webhooks.
- Additional Mailgun event types beyond delivery and permanent failure.
- Full RBAC or permission taxonomy.
- Full audit timeline UI.
- Direct membership assignment without invite.
- Support/impersonation workflow for Phaeno admins.
- Partner assignment and partner-managed customer invitations.
- Self-service email change.
- Runtime local auth bypass outside automated tests.
