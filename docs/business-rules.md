# Business rules

## Accounts and tenants

- A Clerk identity must resolve to an active internal `User` before it can act in the product.
- Users receive access through active `OrganizationMembership` records.
- A platform administrator is an active user with a membership that grants platform-admin capability.
- Platform administrators can manage organizations broadly.
- An active organization administrator can manage members and invitations for that active non-Phaeno organization.
- Non-platform users cannot manage membership of the Phaeno organization.

## Invitations

- Onboarding is invite-only; public self-registration is not the product model.
- Invitations are organization-scoped and have explicit lifecycle states: `Pending`, `Accepted`, `Revoked`, and `Declined`.
- Invitation tokens must be protected and expire according to configuration.
- Email delivery uses Postmark when configured and a logging implementation for local/unconfigured environments.
- Invite acceptance must connect the external Clerk identity to the intended internal user and membership without bypassing tenant checks.

## Lifecycle, audit, and concurrency

- Users and organizations are deactivated rather than hard-deleted in normal workflows.
- Mutable persisted entities use a numeric version for optimistic concurrency; stale writes should return `409 Conflict`.
- Audited entities receive centralized create/update metadata and append-only `AuditEvent` records.
- Password hashes, tokens, secrets, and unnecessary personal data must not appear in audit diffs.

## Current implementation boundary

The current code implements `Phaeno`, `Prospect`, `Customer`, and `Partner`
organizations; invite-only multi-organization membership; Phaeno-owned curated
data provisioning; Customer laboratory services; Partner reagent ordering;
Partner data assembly; and Phaeno operational/configuration workspaces.
`Distributor` is not a separate product term.

The general shared-folder/file-management model, production storage and malware
scanning, real production scientific definitions and profiles, production
QuickBooks/Postmark configuration, CRM or LIMS integration, and an established
production deployment path are not implemented production capabilities.

Confirmed Prospect rules:

- The first implementation uses the confirmed baseline curated-sample contract.
  Development and tests use an explicitly synthetic Phaeno-created fixture that
  cannot be published, made eligible, or granted in production.
- Production begins with no speculative approved scientific file kinds. Phaeno
  must explicitly configure and approve actual kinds and profile rules before
  real data using them can become ready or published.
- Prospect is the phase before an organization becomes a Customer or Partner.
- Prospect users can sign in and access seed data assigned to their organization.
- Prospect organization administrators can invite and manage their own users.
- Authorized Phaeno users define which sample data is generally eligible for
  Prospect access and explicitly grant a subset to each Prospect organization.
- Authorized Phaeno users may explicitly grant the same Phaeno-owned curated
  packages to Customer or Partner organizations. Organization phase/kind never
  grants access automatically.
- General eligibility never grants access automatically, and Prospect users
  cannot self-assign sample data.
- Prospect-eligible sample data must be Phaeno-owned and de-identified. Customer
  or Partner operational sample data is not eligible.
- Eligible source samples originate only from a dedicated internal Phaeno
  sample workflow, separate from Customer lab-service work and Partner
  data-assembly work.
- The first release includes a minimal Phaeno-only source-sample registry where
  authorized staff register a sample, attach approved data, and record ownership
  and de-identification evidence before curation. It is not a Customer lab or
  Partner assembly workflow.
- Approved files are uploaded directly into managed portal storage; external
  file references/imports are deferred. Marking a complete revision ready
  validates all metadata, evidence, files, scans, and checksums atomically and
  makes the revision immutable.
- An authorized Phaeno user may discard only an unreferenced source-sample draft
  after destructive confirmation and a reason. Ready, archived, snapshotted, or
  otherwise referenced revisions are preserved and cannot be normally deleted.
- Customer or Partner operational data is never reused automatically as a
  curated source. Any future reuse requires a separately approved, explicit
  ownership-and-consent process.
- One authorized Phaeno user may curate, approve, publish, and assign a Prospect
  sample package; no second-person approval is required.
- Curated package creation selects an existing Phaeno-owned sample and snapshots
  its approved data. Later source-sample changes do not alter the snapshot;
  Phaeno creates a new version explicitly.
- The source sample must already be marked de-identified before selection.
  Curation validates and records the evidence but does not perform
  de-identification.
- Ownership evidence records the Phaeno ownership basis, confirming Phaeno user,
  confirmation time, and a non-sensitive evidence reference or notes. No second
  approver is required.
- De-identification evidence records the authorized Phaeno user who confirmed
  it, completion time, method or policy, and optional non-sensitive notes. It
  must not contain removed identifiers, and no second approver is required.
- A suspected de-identification failure or loss or uncertainty of Phaeno's
  ownership or right to share requires immediate quarantine of every published
  version derived from the affected source across all organizations. Quarantine
  overrides all grants, blocks viewing and downloading, requires a reason,
  notifies affected organization administrators, and preserves all package and
  audit evidence. Previously downloaded copies cannot be recalled.
- The administrator notice identifies the high-level concern category, confirms
  blocked access, and provides prior-download guidance. It never exposes
  internal evidence, suspected identifiers, or investigation details.
- While the investigation is open, affected organizations are instructed to
  stop using or sharing prior downloads, isolate local copies, and await final
  Phaeno instructions. Deletion is not required before the final disposition.
- A confirmed unsafe or no-longer-shareable disposition requires one
  administrator per affected organization to attest that local copies were
  deleted and downstream recipients were notified. Phaeno tracks the attestation
  and follow-up status but cannot technically verify deletion.
- The affected version then becomes permanently `Withdrawn`. It can never regain
  tenant access or receive new grants, remains preserved internally as evidence,
  and any corrected content requires a new version.
- Outstanding closeout attestations generate administrator reminders and Phaeno
  follow-up. They do not automatically deactivate the organization or block
  unrelated packages or operational data; broader action requires an explicit
  Phaeno decision.
- Each confirmed-unsafe incident has a required attestation due date selected by
  an authorized Phaeno user. Reminders and overdue status follow that date; the
  product does not impose one universal deadline.
- An authorized Phaeno user may record an attestation received outside the
  portal. It is marked `Recorded by Phaeno`, identifies the organization contact
  and evidence source, and retains the Phaeno actor and timestamp without
  impersonating an organization user.
- An authorized Phaeno user may clear quarantine only after a documented
  investigation confirms the immutable version is safe and unchanged. The
  clearance requires a reason and audit record; any correction requires a new
  package version.
- Quarantine suspends rather than revokes organization grants. Clearance
  automatically restores still-active, non-revoked grants, leaves revoked
  grants inaccessible, and notifies administrators of organizations whose
  access resumes.
- Specifically authorized Phaeno investigators may view or download quarantined
  contents after recording a purpose or reason. Every investigation access is
  audited; all external-organization and ordinary Phaeno access remains blocked.
- Curators cannot add supplemental data files or records outside the selected
  source sample. They may add presentation metadata that does not change the
  sample-data contents.
- Every published package includes a portal-visible summary with the sample
  description, biological and assay context, analysis summary, QC status, and
  provenance, plus a checksummed manifest and the complete downloadable source
  snapshot. Dataset-specific metadata may extend this minimum set.
- The initial portal shows that summary, scientific context, QC, provenance,
  manifest, and file metadata but does not preview scientific file contents
  in-browser.
- Curated package publication accepts only file kinds on a Phaeno-approved
  configurable list. Any unexpected, unsupported, or disallowed kind blocks
  publication. Development/test fixture approvals never flow into production.
- Publication is all-or-nothing. Any failed required metadata, file, checksum,
  scan, schema, or policy check leaves the entire package version in draft; no
  partial package becomes visible or grantable.
- Prospect users can view and download sample data explicitly granted to their
  selected organization. Every download is authorized and audited.
- Authorized organization users may download either an individual file or a
  complete archive containing the manifest and every file in the exact
  immutable package version. Both download modes are audited.
- Organization administrators can see per-user package download history for
  their own organization. Authorized Phaeno users may review cross-organization
  history; audit records never contain package contents.
- All active organization users can access Phaeno-owned curated Prospect sample
  packages granted to their organization, including after conversion.
- Customer- or Partner-owned operational data follows Customer/Partner access
  rules and does not inherit the broad access rule for Prospect data.
- Customer and Partner organization administrators manage access to their
  organization-owned operational data. Authorized Phaeno administrators may
  assist, and all access changes are audited.
- Phaeno defines each sample's complete data package in a curated area. Granting
  that sample gives the Prospect access to all data in the curated package, not
  a separately selected subset of its files.
- Curated packages are read-only Phaeno-managed data. Organizations may view and
  download a granted version but cannot edit or customize it in the portal.
- Standard portal terms govern curated sample access; no separate package-level
  click-through is required initially.
- Each grant is frozen to one immutable curated package version. A newer version
  requires an explicit Phaeno-controlled grant upgrade and never rolls out
  automatically.
- An explicit upgrade makes the new version the organization's only accessible
  version. The superseded version and its grant/download history remain
  preserved internally, but organization users can no longer view or download
  its files.
- Revoking a curated package grant immediately ends portal viewing and
  downloading for every organization user. Copies downloaded before revocation
  cannot be recalled.
- Organization deactivation suspends curated-data access without changing its
  grants. Reactivation restores still-active, non-revoked grants.
- Curated sample-package grants do not expire automatically; they remain active
  until Phaeno explicitly revokes them.
- Removing a package from the Prospect-eligible catalog prevents new grants but
  leaves every existing organization grant active until separately revoked.
- Active organization administrators are notified when Phaeno grants, upgrades,
  or revokes a package. Each event appears in portal activity; ordinary members
  are not emailed.
- A Prospect may be created and users invited without a package. Phaeno receives
  a warning and explicitly continues; Prospect users then see a clear no-data-
  assigned state until a grant is added.
- Prospect organization creation commits independently from optional package
  grants. A failed grant leaves a valid organization with a visible retryable
  failure and no access to that package; it never rolls back or deactivates the
  organization or prevents invitations.
- During catalog removal, an authorized Phaeno user may choose to revoke the
  package for all Customer, Prospect, and Partner organizations. The choice is
  explicit, shows the affected scope, and blocks portal access immediately.
- Curated sample packages are not permanently deleted through normal product
  workflows. Retirement permanently prevents new grants while preserving all
  existing grants, files, and access. Revocation remains a separate action.
- Retirement cannot be reversed. Returning the data for future grants requires
  a newly published package/version.
- Every published package version and its files are retained indefinitely,
  including superseded and retired versions. Normal cleanup cannot delete them;
  a future exceptional purge process is the only planned deletion path.
- Prospects cannot view, create, or place orders.
- Conversion preserves the same organization and its history.
- Existing seed-data access remains after conversion unless Phaeno explicitly
  removes or replaces it.
- Conversion preserves every curated-package grant and exact pinned version;
  it never adds, replaces, upgrades, or revokes packages automatically.

## Customer and Partner services

- A Customer is an end user that can place lab service orders.
- A lab service order submits physical samples to Phaeno for accessioning,
  laboratory analysis, data processing, and release of resulting data through
  the portal.
- Customers can track the progress of their samples through the portal.
- Customer quote acceptance atomically authorizes the corresponding Lab work;
  a failed Lab authorization records no accepted quote.
- Lab receipt, accession, physical lineage, protocol execution, materials,
  equipment, library/batch membership, NGS sendout/custody, internal exceptions,
  and scientific approval are Phaeno-only records. Customers see only the
  Commercial-owned safe milestone, schedule health, expected timing, action
  summary, reviewer-permitted QC, and released deliverables.
- Phaeno Lab roles are additive: Operator, Supervisor, Protocol Administrator,
  Scientific Reviewer, and Lab Operations Administrator. Platform
  administrators retain bootstrap access; external users have no Lab role.
- Protocol execution pins one active version. Later protocol changes never
  rewrite active or historical execution.
- Material consumption requires passed or exception-approved QC, a non-expired
  lot, a matching tracked unit, and sufficient available quantity. Equipment
  use requires an active asset with current calibration.
- Libraries retain source-container, specimen, preparation-execution, and
  output-container lineage. A cross-order batch may contain multiple
  organizations, but its membership and other-organization identifiers never
  enter a Customer projection.
- Outsourced NGS records are provider-neutral operational metadata and custody
  evidence. They do not own raw files, pipeline orchestration, intermediate
  artifacts, scientific storage, provenance, retention, or output handoff.
- A Customer-action-required Lab exception has a separate Customer-safe
  summary. Internal descriptions never project to Commercial. Open blocking
  exceptions prevent scientific approval.
- Scientific approval moves Lab work to Ready for release and may project only
  reviewer-permitted QC. It does not upload, attach, release, or publish a file;
  existing Commercial scan, credit/payment, and publication gates still apply.
- An approved Commercial cancellation reaches Lab before the Commercial order
  commits cancellation. Received or started work requires manual review rather
  than forced history rewriting.
- A Partner can place reagent orders.
- A Partner can submit data to Phaeno for data assembly and later download the
  assembled data/results for availability to the Partner's customers.
- Seed data is separate from lab service results and data assembly inputs or
  outputs.
- Active Customer and Partner organization administrators create and submit or
  place work, accept applicable quotes or commercial changes, request
  cancellations, and manage their own organization memberships. Active
  non-admin members have read, progress, and eligible released-file access.
- Prospect memberships never grant ordering capabilities.
- Customer laboratory work and Partner data assembly are priced per job through
  immutable Phaeno-issued quotes. Partner reagents use active,
  organization-specific negotiated pricing. A Partner never sees or uses
  another Partner's offering or price.
- Quote visibility and acceptance require a successfully synchronized
  QuickBooks estimate. The default quote-validity period is 30 days and can be
  changed in Phaeno configuration; each issued quote snapshots its expiration.
- QuickBooks Online is the only implemented commercial system. There is no ERP
  or LIMS. QuickBooks owns catalog base facts, estimates, invoices, adjustments,
  tax, freight, discounts, balances, terms, paid status, and hosted payment
  links. The portal owns operational workflow and immutable commercial links.
- Customer laboratory credit and Partner assembly credit are separate audited
  organization settings. Approved credit uses Net 30 release. Without approved
  credit, completed result/output downloads remain blocked until QuickBooks
  confirms payment.
- Scientific completion and commercial release are separate. A ready file is
  downloadable only after its scan, checksum, provenance/QC, membership,
  commercial-sync, credit/payment, and release rules pass.
- Customer laboratory result availability is sample-specific. A
  credit-approved Customer may receive an eligible sample result while other
  samples remain in progress; a non-credit Customer waits for the completed job
  invoice to be paid before any job result is released.
- Partner reagent placement requires an active Partner offering, valid quantity,
  active negotiated price, selected active shipping address, and purchase-order
  number. Placement snapshots those facts and revalidates them on the server.
- Reagent substitutions and total-increasing post-placement changes require
  explicit Partner-administrator approval. Partial shipments and backorders
  preserve shipped and remaining quantities, shipment, tracking, lot, and
  expiration history.
- Partner data-assembly submission creates an immutable input revision under an
  active Partner-allowed profile. Corrections create a new revision. Approved
  outputs are immutable releases tied to the accepted input/profile and are
  downloaded by the Partner for its own downstream delivery.
- Drafts may be discarded or withdrawn within their allowed pre-acceptance
  boundary. After acceptance, cancellation is a request decided by Phaeno;
  completed work, shipped quantities, prior revisions/releases, and financial
  history remain preserved.
- The initial order workflows are not a protected-health-information intake
  workflow. Direct identifiers must not be placed in fields, notes, filenames,
  uploads, logs, notifications, audit diffs, or QuickBooks memo fields.

Continued workflow, activation, and ownership requirements are recorded in:

- `docs/plans/ORGANIZATION-DATA-PROVISIONING-PLAN.md`
- `docs/plans/FILE-MANAGEMENT-PLAN.md`
- `docs/plans/ORDER-MANAGEMENT-PLAN.md`

Treat any remaining proposed entities or statuses in those plans as unimplemented until code and tests establish them.
