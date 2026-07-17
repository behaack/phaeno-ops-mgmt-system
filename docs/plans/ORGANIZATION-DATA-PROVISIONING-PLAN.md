# Organization Data Provisioning Plan

Keep this file updated as organization-seeding, dataset, and external-tenant requirements
are supplied and decisions are made.

The recommended first slice and the remaining implementation phases are complete
for the confirmed baseline curated-sample contract. Real production scientific
content and approved file kinds remain a content-readiness gate, not unfinished
application behavior.

## Status

- Implementation state: the confirmed provisioning plan is implemented in source
  code with focused unit/component coverage. It includes organization phases,
  explicit session capabilities, the Phaeno source registry, environment-scoped
  managed uploads and scan policy, immutable curated versions, eligibility,
  idempotent exact-version grants, revocation, tenant-isolated metadata access,
  audited file/archive downloads, and the Phaeno and tenant user interfaces. The
  source workspace exposes audited, reason-required discard for an unreferenced
  draft and returns the curator to the registry after managed-byte cleanup. The
  four configuration sections use the shared far-left sidebar with a remembered
  pinned desktop rail and the same non-modal hover, keyboard, and click rail
  when narrow or unpinned.
- The completion slice adds dataset metadata and active-state management,
  version retirement, catalog removal with optional bulk revocation, atomic
  exact-version upgrades, organization creation with optional package grants,
  provisioning history/retry, durable organization notices, and tenant activity.
- Source-wide governance now supports immediate cross-organization quarantine,
  separate unchanged-content clearance and confirmed-unsafe withdrawal,
  Phaeno-only purpose-audited investigation downloads, affected-organization
  tracking, reminders, and portal or Phaeno-recorded attestations. Customer APIs
  expose only external guidance and never internal investigation notes.
- Provisioning persistence is included in the clean
  `20260716220428_InitialPSeqOperations` baseline applied to the rebuilt
  Development database. The former feature migrations were intentionally
  replaced during the approved disposable-database reset. EF reports no pending
  migrations. Applying the baseline to any shared, staging, or production
  environment remains an explicit deployment operation.
- The repeatable PostgreSQL reference journey passes against the configured
  development database with all fixture rows rolled back and managed fixture
  files removed. It verifies source registration through publication, an
  idempotent exact-version Prospect grant, tenant downloads and audit history,
  cross-tenant non-discovery, and immediate revocation. Clerk JWT middleware
  remains a separate integration boundary.
- Real production sample data remains unavailable and is a production-content
  prerequisite, not an implementation blocker. Production defaults contain no
  speculative approved file kinds and reject synthetic fixture workflows.
- Requested outcomes:
  - seed a prospect, customer, or partner organization with data
  - give authorized Phaeno users a configuration area where datasets can be
    made available to prospect, customer, or partner organizations
- This plan treats an account as a tenant organization, not as a login identity.
  That interpretation is confirmed for this feature.

## Confirmed Product Decisions

- `Prospect` is the phase before an organization becomes a Customer or Partner.
- A Prospect is a real portal tenant: its invited users can sign in and use the
  selected organization context.
- Prospect organization administrators can invite and manage users in their own
  organization under the same tenant and last-admin safeguards as other
  eligible external organizations.
- Prospects can access seed data explicitly made available to their organization.
- The first seed-data type is sample data.
- The first implementation uses a baseline curated-sample contract consisting
  of the confirmed standard summary, ownership/de-identification evidence,
  immutable managed-file manifest, and source lineage. Profile-specific
  scientific fields and validators are added only when real data is available.
- Development and automated tests use an explicitly synthetic, Phaeno-created
  reference fixture. It is not evidence of scientific validity and cannot be
  marked externally eligible, published, or granted in production.
- Production begins with no assumed scientific file kinds. Authorized Phaeno
  configuration must explicitly approve actual file kinds before a production
  source revision using them can become ready or a package can be published.
- Prospect-eligible sample data must be Phaeno-owned and de-identified.
- Customer or Partner operational sample data is never eligible for the
  Prospect catalog.
- Prospect Trial Project samples and results are confidential operational data
  and are also never eligible for the Prospect catalog. Their submission and
  access rules are owned by `PROSPECT-TRIAL-PROJECT-PLAN.md` rather than a
  curated dataset grant.
- Eligible source samples originate only from a dedicated internal Phaeno
  sample workflow that is separate from Customer lab-service work and Partner
  data-assembly work.
- The first release includes a minimal Phaeno-only source-sample registry.
  Authorized Phaeno users register the sample, attach its approved data, and
  record ownership and de-identification evidence before curation. This registry
  is not a Customer lab accessioning or Partner data-assembly workflow.
- Approved source files are uploaded directly into managed portal storage from
  the source-sample registry. The first release does not reference or import
  files from another system.
- A source sample starts as an editable draft. Marking a complete revision ready
  validates its metadata, evidence, files, scanning status, and checksums
  atomically, then makes that revision immutable. Later changes create a new
  draft revision.
- An authorized Phaeno user may discard a source-sample draft only if no ready
  revision or curated snapshot references it. Discard requires destructive
  confirmation and a reason. Ready, archived, or referenced revisions are
  preserved and cannot be deleted through the normal workflow.
- Customer or Partner operational data is never reused automatically as a
  curated source sample. Any future reuse requires a separately approved,
  explicit ownership-and-consent process.
- Authorized Phaeno users maintain a configuration area that defines which
  sample data is generally eligible to be shared with Prospects.
- General Prospect eligibility does not grant access by itself. For each
  Prospect organization, an authorized Phaeno user explicitly selects which
  eligible sample data that Prospect can access.
- Authorized Phaeno users may also explicitly grant the same Phaeno-owned
  curated packages to Customer or Partner organizations. Organization phase or
  kind never grants package access automatically.
- Prospect users and Prospect organization administrators cannot grant their
  own organization access to sample data.
- The same authorized Phaeno user may curate, approve, publish, and assign a
  Prospect sample package. A second-person approval is not required.
- A curated package is created by selecting an existing Phaeno-owned sample and
  snapshotting its approved data into a curated draft.
- The source sample must already be marked de-identified before it appears in
  the curation selector. Curation validates and records that status but does not
  perform de-identification.
- Ownership evidence records the Phaeno ownership basis, the authorized Phaeno
  user who confirmed it, the confirmation timestamp, and a non-sensitive
  evidence reference or notes. No second-person approval is required.
- De-identification evidence records the authorized Phaeno user who confirmed
  it, the completion timestamp, the method or policy used, and optional
  non-sensitive notes. The evidence must not reproduce removed identifiers, and
  no second-person approval is required.
- If Phaeno later suspects that a published version is not properly
  de-identified, or loses or questions its ownership or right to share the
  source data, an authorized Phaeno user immediately quarantines every published
  version derived from that source across every organization. Quarantine
  overrides all grants and blocks viewing and downloading while preserving the
  package, files, lineage, grants, and audit history for investigation.
- Quarantine requires a reason, notifies affected organization administrators,
  and records that previously downloaded copies cannot be recalled.
- The organization notice identifies only the high-level concern category,
  such as de-identification or sharing rights, confirms that access is blocked,
  and provides guidance for prior downloads. It never exposes internal evidence,
  suspected identifiers, or investigation details.
- While the investigation remains open, the notice directs affected
  organizations to stop using or sharing prior downloads, isolate local copies,
  and await Phaeno's final instructions. It does not require deletion before the
  investigation determines the final disposition.
- If the final disposition confirms that the package is unsafe or no longer
  shareable, one administrator for each affected organization must attest that
  local copies were deleted and any downstream recipients were notified. Phaeno
  records the attestation and follow-up status but does not claim to verify
  deletion technically.
- A confirmed unsafe or no-longer-shareable version enters the permanent
  `Withdrawn` state. It can never be cleared, restored to tenant access, or used
  for a new grant. The version remains preserved internally as evidence, and
  corrected content requires a new version.
- Outstanding organization closeout attestations generate administrator
  reminders and remain visible in a Phaeno follow-up queue. An overdue
  attestation does not automatically deactivate the organization or block
  unrelated packages or operational data; any broader action requires an
  explicit Phaeno decision.
- The confirmed-unsafe incident requires an attestation due date selected by an
  authorized Phaeno user. Reminder scheduling and overdue status follow that
  incident-specific date; there is no universal product deadline.
- If an organization confirms closeout outside the portal, an authorized Phaeno
  user may record the attestation on its behalf. The record is explicitly marked
  `Recorded by Phaeno`, identifies the organization contact and evidence source,
  and preserves the Phaeno actor and timestamp without impersonating an
  organization user.
- An authorized Phaeno user may clear quarantine only when a documented
  investigation confirms that the immutable version is safe without any
  content change. Clearance requires a reason and audit record. Any metadata or
  file correction requires a new version instead.
- Quarantine suspends grants; it does not revoke them. Clearing quarantine
  automatically restores access only for grants that remain active and
  non-revoked, then notifies affected organization administrators and records
  portal activity.
- Specifically authorized Phaeno investigators may view and download
  quarantined contents for an investigation. Each access requires a purpose or
  reason and is fully audited. Customer, Prospect, Partner, and ordinary Phaeno
  access remains blocked.
- Later source-sample changes do not mutate the curated draft or a published
  version. Phaeno must explicitly create a new curated package version from a
  later source snapshot.
- Curators cannot add supplemental data files or records that were not part of
  the selected source sample. The initial package is fully reproducible from its
  source snapshot.
- Curators may add presentation metadata such as package title, description,
  release notes, and external-facing explanatory text; this metadata is not
  sample data.
- Every published package includes a standard portal-visible summary containing
  the sample description, biological and assay context, analysis summary, QC
  status, and provenance.
- Every published package also includes a checksummed manifest and the complete
  downloadable source snapshot. Dataset-specific metadata may extend the
  standard summary without changing these minimum requirements.
- The initial portal shows the package summary, scientific context, QC,
  provenance, manifest, and file metadata. It does not preview the contents of
  scientific data files in-browser.
- Publication accepts only file kinds on a Phaeno-approved configurable list.
  An unexpected, unsupported, or disallowed file kind blocks publication. The
  production list has no speculative defaults and is populated only when Phaeno
  has actual data and approves the required kinds.
- Publication is atomic. If any required metadata, file, checksum, scan, schema,
  or policy check fails, the entire package version remains an editable draft;
  no partial version becomes visible or grantable.
- Prospect users can view and download sample data granted to their selected
  organization.
- Authorized organization users can download either an individual file or one
  complete archive of the exact immutable package version. The archive includes
  the package manifest and every file in that version.
- Individual-file and complete-archive downloads are separately authorized and
  audited.
- Every active organization member can view and download Phaeno-owned curated
  Prospect sample packages granted to that organization, including after the
  organization converts to Customer or Partner.
- Customer- or Partner-owned operational data is a separate access class and
  must respect Customer/Partner access rules rather than inheriting the broad
  access rule for Phaeno-owned Prospect data.
- Customer and Partner organization administrators manage access to their own
  operational data. Authorized Phaeno administrators may provide audited
  support when necessary.
- Every download is tenant-authorized and audited.
- Organization administrators can view per-user download history for their own
  organization, including user, package/version, and timestamp.
- Authorized Phaeno users can review download history across organizations.
  Package contents are never written to download audit records.
- Revoking a curated sample-package grant immediately ends portal viewing and
  downloading for every user in the organization.
- Revocation cannot recall copies downloaded before access ended.
- Organization deactivation suspends all curated-data access without revoking
  or otherwise changing the grants.
- Reactivation restores access to every still-active, non-revoked grant.
- Curated sample-package grants do not expire automatically. They remain active
  until explicitly revoked by an authorized Phaeno user.
- A Prospect may be created and its users invited without selecting a curated
  sample package. The Phaeno user receives a non-blocking warning and must
  explicitly confirm continuing without a package.
- Removing a package from the generally Prospect-eligible catalog prevents new
  assignments but does not change existing organization grants. Existing access
  ends only through a separate explicit revocation.
- When removing a package from the catalog, the authorized Phaeno user is
  offered an explicit option to revoke that package from every Customer,
  Prospect, and Partner organization that currently has access.
- Selecting bulk revocation immediately blocks portal access for all affected
  organizations and revokes their grants. Declining it preserves the grants.
- Curated sample packages are never hard-deleted through the normal
  configuration interface. They may be retired, but retirement semantics must
  remain separate from catalog removal and grant revocation.
- Retirement permanently prevents new grants while preserving every existing
  grant and its access. It does not revoke access or delete package data.
- Retirement cannot be reversed. If Phaeno wants to offer the data again, it
  publishes a new package/version with its own identity and review history.
- Active organization administrators are notified when Phaeno grants, upgrades,
  or revokes a curated package. The event also appears in portal activity.
- Ordinary organization members are not emailed for package access changes.
- Curated sample access is covered by the portal's standard terms. The initial
  workflow does not require a separate package-specific click-through agreement.
- Phaeno curates the complete data package for each eligible sample in a
  dedicated curated area.
- Granting a curated sample package gives the Prospect access to all data Phaeno
  placed in that package. Access is not granted file by file within the package.
- Curated package contents are read-only for Prospect, Customer, and Partner
  users. They may view and download the granted version but cannot edit,
  customize, or create a new version in the portal.
- A grant is frozen to the exact immutable curated sample-package version
  selected by Phaeno.
- Publishing a later version never changes an existing Prospect grant. An
  authorized Phaeno user must explicitly upgrade the grant.
- An explicit upgrade atomically makes the newly selected version the only
  portal-viewable and downloadable version for that organization. The
  superseded version, prior grant state, and download history remain preserved
  internally, but users cannot access its files after the upgrade.
- Prospects cannot view, create, or place orders. An approved Trial Project may
  separately authorize bounded sample submission without creating an order or
  granting ordering capability.
- Conversion preserves the same organization, memberships, grants, audit
  history, Trial Projects, trial samples/results, and stable identifiers; it
  does not create a replacement tenant.
- Existing seed-data access remains after conversion to Customer or Partner
  unless Phaeno explicitly removes or replaces a grant.
- Conversion does not add, replace, upgrade, or revoke curated-package grants.
  Every existing grant and exact package version is preserved unchanged.
- Only an authorized Phaeno user can convert a Prospect to Customer or Partner.

## Terminology Decision

- `Partner` is the correct product term.
- `Distributor` was used in error and is not a separate product concept.
- Persisted `OrganizationKind` values are `Phaeno`, `Prospect`, `Customer`, and
  `Partner`. Prospect and Partner are implemented organization kinds.

Before implementing partner-managed customer provisioning or delegation,
document which customer organizations a Partner serves and what data access or
administrative actions that relationship permits. That deferred relationship
does not block direct organization grants, Prospect conversion, or the first
curated sample profile. Codex will translate it into the appropriate persisted
model and authorization rules.

## Current Repository Baseline

- Only Phaeno users with the proper platform access may create organizations.
- Account access remains invite-only and is modeled with organization
  memberships.
- The existing `AccountsBootstrapSeeder` is an environment-configured,
  idempotent bootstrap for the first Phaeno organization and admin. It is not a
  customer data-provisioning engine and should remain separate.
- Organizations, users, and memberships are deactivated rather than normally
  hard-deleted.
- Tenant-scoped requests use validated selected-organization context.
- Mutable persisted records use optimistic concurrency and centralized audit
  events.
- Data provisioning implements its feature-scoped managed-file abstraction,
  local storage adapter, checksums, scan states, and audited downloads. A
  production object-storage and malware-scanning activation remains an
  environment-readiness gate.
- The repository implements the Phaeno-only source-sample registry, immutable
  source revisions, curated package versions, exact-version grants, and the
  governance lifecycle described by this plan.

## Vocabulary For This Plan

These names make the plan discussable without fixing the final schema:

- **Dataset**: a Phaeno-managed logical collection of seedable or accessible
  data.
- **Dataset version**: an immutable revision of a dataset that can be reviewed,
  published, assigned, and audited.
- **Provisioning package**: an optional named selection of dataset versions and
  parameters used to initialize a type of organization.
- **Grant**: a record that makes a dataset version available to an organization.
- **Provisioning run**: an idempotent, auditable attempt to grant or materialize
  data for an organization.
- **Prospect-eligible sample data**: sample data approved by Phaeno for possible
  assignment to Prospect organizations. It must be Phaeno-owned and
  de-identified. Eligibility is not tenant access.
- **Source-sample registry**: the Phaeno-only workflow for registering an
  internal Phaeno source sample, attaching approved data, and recording the
  ownership and de-identification evidence required before curation.
- **Ready source-sample revision**: an immutable, fully validated revision that
  may be selected for a curated package snapshot.
- **Curated sample package**: the complete set of approved records and files
  Phaeno places in the curated area for one sample. A grant exposes the package
  as a whole rather than selecting its contents separately per Prospect.

Rename these concepts when the actual data and user language are known.

## Planning Principles

- Dataset configuration is an explicit Phaeno administrative feature; it is not
  environment startup seeding.
- Published versions are immutable. Corrections create a new version rather
  than changing data already assigned to organizations.
- Package records, immutable versions, manifests, and audit history are retained
  when a package is retired.
- Every published package version and its files are retained indefinitely,
  including superseded and retired versions. Normal retention cleanup never
  deletes them; only a future exceptional purge process may do so.
- Dataset availability is explicit per organization or through an explicitly
  applied package. Organization kind alone must not accidentally expose all
  data to every tenant of that kind.
- General eligibility and organization grants have independent lifecycles.
  Disabling eligibility affects future grants only.
- Every grant, revocation, provisioning run, retry, and version change is
  attributable and auditable.
- Provisioning is idempotent and safe to retry.
- Partial failures are visible and recoverable; a new organization must not
  appear fully provisioned when required data failed.
- Curated packages remain shared, Phaeno-managed, read-only data. A portal grant
  does not copy the package into organization-owned editable records.
- Dataset payloads use domain-specific validation. A generic JSON blob alone is
  not a sufficient integrity model for important business data.
- Binary artifacts use the file-storage abstraction when that feature is
  implemented; dataset code must not create a second unmanaged storage system.
- Source-sample files are uploaded through the managed file-storage abstraction;
  external file references and imports are outside the first release.
- Seed data is Phaeno-selected data made available independently of an
  operational service workflow. Customer lab results and Partner data assembly
  inputs/outputs are not seed data and belong to their owning service records.

## Data-Semantics Gate

Resolve and record these decisions before the final model or migration is
designed.

### Dataset Contents

- The first concrete seed-data type is a curated package of Phaeno-owned,
  de-identified sample data. The package contains all data Phaeno places in the
  curated area; there is no fixed product-level subset selected per Prospect.
- The package retains lineage to the selected source sample and the exact source
  revision/checksums captured by the snapshot.
- Package data contents exactly match the selected source snapshot. Direct data
  uploads and supplemental record entry are out of scope for the curation flow;
  approved files enter through the Phaeno-only source-sample registry.
- The package combines a standard portal-visible structured summary with the
  complete downloadable source snapshot and its checksummed file manifest.
- The standard summary includes sample description, biological and assay
  context, analysis summary, QC status, and provenance. Dataset-specific
  metadata may extend this minimum set.
- Each dataset type has versioned schema, validation, size, and approved-file-
  kind rules. The baseline contract validates the confirmed standard metadata,
  evidence, lineage, manifest, checksums, and managed-file invariants.
- Scientific profile-specific fields, file kinds, and limits are configuration
  added when actual production data becomes available. Do not invent scientific
  rules from the synthetic fixture.
- Development/test configuration may approve only the harmless file kinds used
  by the synthetic fixture. Those approvals never flow into production.
- Prospect-eligible sample data must not contain identifiable Customer or
  Partner data, PHI, PII, credentials, or content Phaeno lacks the right to
  share.
- Source samples without current Phaeno ownership and de-identification evidence
  are rejected before snapshot creation.
- A later loss or uncertainty in ownership, sharing rights, or de-identification
  triggers quarantine for every published version derived from that source.
- Source samples are created and maintained through the dedicated internal
  Phaeno sample workflow. Customer lab-service samples and Partner assembly data
  are outside this source pool.

### Access Versus Copy

- "Make available" means read-only view/download access to a frozen, centrally
  managed Phaeno package version.
- "Seed" does not create organization-owned editable portal records.
- Prospect, Customer, and Partner users cannot customize curated package
  contents in the portal.
- Future versions never flow through automatically. An explicit Phaeno upgrade
  is required for each Prospect grant.
- After an explicit upgrade, the new version replaces the old version for
  portal access. The old version remains in internal history but is no longer
  viewable or downloadable by organization users.
- Revocation immediately ends portal access but cannot recall copies already
  downloaded.
- The first curated sample dataset uses reference access to one centrally
  managed immutable version. Any future materialized-copy dataset requires a
  separate product decision.

### Targeting And Lifecycle

- Curated sample packages are assigned through explicit organization grants;
  organization kind, partner relationship, or contract never grants access by
  itself.
- Explicit grants may target a Prospect, Customer, or Partner organization.
- For Prospect sample data, use explicit per-Prospect grants selected from the
  Phaeno-managed eligible catalog; do not auto-grant the entire catalog.
- One organization may receive multiple curated packages, but its active grant
  for a given package points to one exact immutable version.
- Authorized Phaeno users may add grants to an existing organization as well as
  select them during Prospect creation.
- Failed provisioning may be retried or repaired idempotently. Version upgrades
  require an explicit audited Phaeno action. Rollback remains deferred.
- Deactivation suspends dataset access automatically. Reactivation restores
  still-active, non-revoked grants; revoked grants remain revoked.
- Retirement removes the package from future assignment and catalog eligibility.
  It preserves all existing grants, files, immutable versions, and history.
  Access ends only through separate grant revocation.
- Retired packages cannot be restored, republished, or re-enabled for new grants.

### Organization Creation And Conversion Workflow

- Prospect creation may succeed without a package grant, and invitations may
  proceed after the documented warning and explicit confirmation.
- Curated sample packages are optional during Prospect creation. No package is
  required before invitations can be sent.
- Organization creation commits independently from optional package grants. A
  failed grant leaves a valid Prospect with no access to that package, a visible
  failed provisioning result, and an idempotent retry action; it never rolls
  back or deactivates the organization.
- An authorized Phaeno user selects and approves the package. The same user may
  perform both actions.
- Operations that may exceed an interactive request use a durable asynchronous
  job with visible progress and failure state; the implementation selects that
  boundary from actual volume and dependency behavior.
- No seed-data grants are added or replaced automatically when a Prospect
  converts to Customer or Partner.

## Recommended Domain Direction

The following is a candidate architecture, not a final schema.

### SourceSample

Represents one Phaeno-owned sample available only to authorized Phaeno users:

- stable internal sample id and label
- the confirmed baseline sample description, biological and assay context,
  analysis summary, QC status, and provenance, with profile-specific extensions
  only when configured
- Phaeno ownership basis, confirmer, confirmation timestamp, non-sensitive
  evidence reference or notes, and current status
- de-identification confirmer, completion timestamp, method or policy, and
  non-sensitive notes
- managed references to the approved data files, recorded file kinds, sizes,
  checksums, and revision
- lifecycle such as `Draft`, `Ready`, and `Archived`, controlling whether a
  revision can appear in curation
- audit fields and optimistic-concurrency `Version`

The registry is intentionally narrower than a laboratory sample-management
system. It supplies an authoritative source for curation and does not implement
Customer accessioning, lab progression, Partner assembly, or operational-result
delivery. Curation snapshots one exact ready source-sample revision and never
mutates it.

Authorized Phaeno users upload approved files directly into managed portal
storage while the source revision is a draft. The portal records server-derived
file kind, size, checksum, scan status, and storage reference. Marking the
revision ready validates the complete metadata, ownership evidence,
de-identification evidence, approved file kinds, checksums, and scan results in
one operation. A successful transition makes the revision immutable; a failure
leaves the complete revision in draft with actionable errors.

The first release has no external-system file references or import connector.
An authorized Phaeno user may discard an unreferenced draft after destructive
confirmation and a required reason. The audit record is preserved, and managed
file bytes are removed only when no other record references them. Ready,
archived, or curated-snapshot source revisions cannot be deleted through the
normal workflow. Archiving prevents new curated snapshots without changing
existing package versions.

### DatasetDefinition

Represents the stable identity and policy of a logical dataset:

- name, description, dataset type, and owning Phaeno area
- allowed target organization kinds or relationship rules
- explicit Prospect eligibility controlled by an authorized Phaeno user
- payload schema/validator identifier
- active/inactive lifecycle
- audit fields and concurrency `Version`

### DatasetVersion

Represents an immutable revision:

- dataset definition id and version number
- lifecycle such as `Draft`, `Published`, `Quarantined`, `Withdrawn`, and
  `Retired`
- schema version and content checksum
- structured manifest and/or references to managed file artifacts
- release notes, created-by, approved-by, published-by, and timestamps; these
  actors may be the same authorized Phaeno user
- compatibility or upgrade metadata if later versions can be applied
- the complete curated sample package manifest of included records and files
- the standard portal-visible sample description, biological and assay context,
  analysis summary, QC status, and provenance
- source sample id, source revision, snapshot timestamp, and source checksums
- source ownership and de-identification evidence captured at snapshot time
- de-identification confirmer, completion timestamp, method or policy reference,
  and non-sensitive notes, without removed identifiers

Draft content can be edited with optimistic concurrency. Publishing validates
the complete version and freezes its content. A failed validation leaves the
whole version in draft for correction and retry; publication never exposes a
partial version.

### ProvisioningPackage

Use only if Phaeno needs reusable bundles rather than selecting datasets one by
one:

- package name, description, and eligible account type
- immutable or versioned list of exact dataset versions
- required/optional flags and safe configuration parameters
- draft/published/retired lifecycle

An organization provisioning run snapshots the selected package version so
later package edits cannot change history.

### OrganizationDatasetGrant

Records organization access to a specific dataset version:

- organization id and dataset version id
- access/provisioning mode, once defined
- status such as `Pending`, `Active`, `Failed`, `Revoked`, or `Superseded`
- effective timestamp; curated sample-package grants have no expiration date
- source package/provisioning run
- granted, revoked, and failure context
- required revocation reason and effective timestamp
- audit fields and concurrency `Version`

An active grant must be unique according to the decided versioning rules.
For a curated sample, the active grant records one exact immutable version. An
upgrade atomically supersedes the prior grant with the newly selected version
and preserves the grant history. The superseded version is retained internally
but is no longer available through that organization's tenant access.

### ProvisioningRun

Records one idempotent operation:

- organization id
- selected package version or explicit dataset-version snapshot
- idempotency key
- status and phase
- requested-by, started, and completed context
- per-dataset results, validation errors, and retry information
- source organization-creation workflow when applicable

If data is copied into organization-owned domain records, use dataset-type
adapters behind a common orchestrator. Each adapter validates and materializes
one known data type in a transaction-safe, idempotent way.

## Authorization Direction

Do not implement dataset security by checking display labels such as "Phaeno
admin" in the frontend. Add explicit capabilities to session output and enforce
them in the backend. Candidate capabilities are:

- `CanViewDatasetConfiguration`
- `CanManageDatasetDrafts`
- `CanPublishDatasets`
- `CanProvisionOrganizationData`
- `CanViewOrganizationDatasets`
- `CanDownloadProspectSampleData`
- `CanManageProspectSampleDataCatalog`
- `CanAssignProspectSampleData`

Expected boundaries:

- Only authorized Phaeno users create, edit, publish, retire, grant, revoke, or
  retry datasets.
- Only authorized Phaeno users may quarantine a published package version. A
  quarantine overrides every organization grant for that version immediately.
- Quarantined content access requires a separate Phaeno investigation
  capability. It is never implied by ordinary curation, publication, or
  provisioning access.
- Only an authorized Phaeno user may clear quarantine after recording the
  investigation outcome and reason. A quarantined version cannot be edited;
  changed content must be published as a new version.
- Only an authorized Phaeno user may record the investigation's confirmed-unsafe
  outcome and withdraw the version. Withdrawal is permanent and cannot be
  cleared or reversed.
- Clearing quarantine restores access through still-active, non-revoked grants.
  Grants revoked during the investigation remain revoked.
- Only authorized Phaeno users mark sample data as Prospect-eligible or assign
  eligible sample data to a Prospect organization.
- Marking sample data Prospect-eligible requires confirmation that Phaeno owns
  it, it has been de-identified under the approved process, and it is permitted
  for Prospect use.
- Prospect/customer/partner users can see only datasets actively granted to their
  selected organization and only the content allowed by that dataset type.
- Phaeno-owned curated Prospect packages remain visible to all active members of
  the selected organization after conversion. This rule does not apply to
  Customer- or Partner-owned operational data.
- A Prospect download requires an active grant to the selected Prospect
  organization; catalog eligibility alone is never sufficient.
- Cross-organization administration occurs through an explicit Phaeno platform
  view.
- A partner's ability to seed or grant data to customers is out of scope until
  the partner relationship and delegation policy are defined.
- Dataset status must not bypass normal user, membership, and organization
  active-state gates.

## Phaeno Configuration Experience

Provide a dedicated Phaeno-only configuration area with separate surfaces for:

- the internal Phaeno source-sample registry, ownership/de-identification
  evidence, approved data attachments, readiness state, and revision history
- the curated area where Phaeno assembles the complete package for each sample
- the catalog of sample data eligible for Prospect assignment
- dataset definitions and status
- environment-scoped scientific profile and approved-file-kind configuration;
  production has no inherited development/test approvals
- version authoring, validation, review, publish, and retirement
- managed artifacts/files when applicable
- provisioning packages, if required
- organization grants and provisioning history
- failures, retries, and audit context
- cross-organization package download audit

Recommended interaction rules:

- Use list pages with modal create/edit forms where practicable; do not place
  inline management forms inside lists.
- Create the source-sample shell in a modal, then use a dedicated sample workspace
  for scientific metadata, ownership/de-identification evidence, managed file
  uploads, validation, and revision history.
- Show upload progress, checksum/scan status, validation errors, and retry state.
  Do not allow a revision to become ready while any required upload, scan,
  evidence, or metadata check is incomplete.
- `Mark ready` previews the exact immutable revision and performs one atomic
  validation. `Archive` prevents future curation but preserves revisions.
- Show `Discard draft` only for an unreferenced draft; require destructive
  confirmation and a reason, and explain which unreferenced file bytes will be
  removed.
- Use a dedicated detail/editor page for complex dataset contents or manifests.
- The organization-facing package detail shows the summary, scientific context,
  QC, provenance, manifest, and file metadata. Do not add a generic or
  file-type-specific content viewer in the initial release.
- Require a preview and explicit confirmation before publishing or provisioning.
- Clearly label synthetic fixtures and test-only file-kind policies. Do not show
  a production action that can publish, mark externally eligible, or grant a
  synthetic fixture.
- Prospect eligibility confirmation shows ownership and de-identification
  status and records the approving Phaeno user and timestamp.
- The de-identification evidence view shows the confirmer, completion time,
  method or policy, and non-sensitive notes without displaying removed
  identifiers.
- The ownership evidence view shows the ownership basis, confirmer, confirmation
  time, and non-sensitive evidence reference or notes.
- Curated package creation starts with a searchable source-sample selector,
  displays the data that will be snapshotted, and records the source lineage.
- The selector lists only Phaeno-owned samples already marked de-identified.
  Missing or stale evidence is a blocking validation error, not a curator task
  inside this workflow.
- Do not show sample-data upload or supplemental-record controls in the curated
  package editor. Keep editable presentation metadata visually separate from
  immutable snapshotted data.
- Present `Remove from eligible catalog` and `Revoke organization access` as
  separate actions with distinct consequences. Never imply that removing
  eligibility revokes existing grants.
- The catalog-removal confirmation includes an optional `Revoke access for all
  organizations` choice, the number of affected Customers, Prospects, Partners,
  users, and grants, and the package version(s) involved.
- Bulk revocation requires an explicit destructive confirmation and reason. The
  package is denied immediately, while any large per-grant audit fan-out runs as
  a durable, visible job.
- Show the exact immutable versions that will be assigned.
- Show the currently granted version and any newer available version separately;
  upgrading requires an explicit confirmation of the version change.
- Show the complete contents of each curated sample package before it is marked
  eligible or assigned; do not imply that per-file access can be configured.
- On each Prospect workspace, show available eligible sample data separately
  from the sample data already granted to that Prospect.
- Show a purposeful `No sample data assigned yet` state with the Phaeno-only
  assignment action; do not present it as a system failure.
- Prevent publishing while validation errors exist.
- Report every blocking validation error together where practicable so the
  curator can correct the draft and retry without partial publication.
- Clearly distinguish `Draft`, `Published`, `Quarantined`, `Withdrawn`,
  `Retired`, `Pending`, `Active`, `Failed`, and `Revoked` states without relying
  on color alone.
- Do not present an expiration field for curated sample-package grants.
- Require a reason for retirement, revocation, destructive repair, or rollback.
- Do not expose a normal `Delete package` action. Use `Retire package` only after
  the retirement consequences are implemented and explained in confirmation.
- Retirement confirmation states that no new grants can be created and shows
  the existing grants that will remain active.
- A revocation confirmation states that organization-wide portal access ends
  immediately but previously downloaded copies cannot be recalled.
- A quarantine confirmation shows every affected organization and grant,
  requires a reason, and states that access ends immediately while prior
  downloads cannot be recalled. The affected package remains preserved for
  investigation.
- Preview the external administrator notice before confirmation. Keep the
  high-level concern category and actionable guidance separate from Phaeno-only
  investigation notes and evidence.
- Investigation downloads require an explicit purpose or reason at the point of
  access and are visibly distinguished from ordinary tenant downloads.
- A clear-quarantine confirmation requires the investigation outcome and
  reason, and confirms that the immutable contents did not change. If a
  correction is needed, direct the user to create a new version instead.
- The confirmation shows how many still-active grants will resume and how many
  revoked or otherwise inactive grants will remain inaccessible.
- A confirmed-unsafe closeout view tracks each affected organization as awaiting
  or having completed its administrator deletion/downstream-notification
  attestation. One completed attestation closes the requirement for that
  organization.
- The closeout view highlights outstanding and overdue attestations, supports
  Phaeno follow-up notes, and shows reminder history without implying that the
  whole organization or unrelated data is blocked.
- The incident closeout requires a due date and shows it in each affected
  organization's notice, status, reminder history, and Phaeno follow-up view.
- The Phaeno follow-up view can record an externally received attestation and
  requires the organization contact and evidence source. The resulting status
  visibly distinguishes `Submitted in portal` from `Recorded by Phaeno`.
- Withdrawal confirmation states that the version can never regain tenant
  access or receive a new grant, remains preserved internally as evidence, and
  requires a new version for any corrected content.

## New Organization Provisioning Experience

Extend the Phaeno organization-creation workflow only after the base organization
contract is real and the account type terminology is settled.

A likely flow is:

1. Enter and validate organization details.
2. Create the organization as a Prospect, Customer, or Partner according to the
   actual commercial stage.
3. Select a published provisioning package or explicit dataset versions.
4. Preview required and optional data, versions, and consequences.
5. Create the organization in its own transaction.
6. Apply each selected package through an idempotent grant operation and show a
   clear result for every selection.
7. Allow invitations and handoff even when no package was selected or an
   optional grant failed; show the empty-data or retry state as appropriate.

If step 3 has no selected package, show a clear warning explaining that invited
users will initially see no sample data. The user may explicitly continue; this
is a warning, not a validation error.

For a Prospect, Customer, or Partner, the selection in step 3 is limited to
Phaeno-owned curated sample data currently marked eligible for external
organization assignment. Each selection creates an explicit organization grant;
catalog eligibility never creates access implicitly.

Prospect conversion is a separate Phaeno-only, audited action. The conversion
experience must preview the target Customer or Partner phase and any dataset or
capability changes before confirmation.
It explains that existing Phaeno-owned Prospect packages remain organization-
wide while newly created Customer/Partner-owned data follows the target
organization's access rules.
- The preview states that all existing curated-package grants and pinned versions
  remain unchanged. Conversion does not run a data-provisioning mutation.

The organization is ready for user administration after successful creation;
optional grant progress is separate. Model any asynchronous grant/bulk-operation
state explicitly and do not overload `Organization.IsActive`. A failed optional
grant never presents the organization as failed or inactive.

## API Direction

Final contracts depend on the data-semantics gate. A likely split is:

### Phaeno Administration

- register and maintain internal Phaeno source samples
- upload approved source-sample files directly into managed portal storage
- discard only unreferenced source-sample drafts with destructive confirmation
  and a reason; archive ready samples to prevent new curation
- attach and validate approved source-sample data through the managed file
  abstraction
- record ownership and de-identification evidence and mark a complete sample
  revision ready for curation
- create a curated draft by snapshotting an existing Phaeno-owned sample
- mark or unmark sample data as eligible for Prospect assignment
- remove catalog eligibility with an optional all-organization revocation command
- list eligible sample data and all Prospect, Customer, and Partner organizations
  granted access
- assign, upgrade, or revoke eligible sample data for one Prospect, Customer, or
  Partner organization
- preserve existing grants when a package is removed from the eligible catalog
- bulk revoke the package across Customer, Prospect, and Partner organizations
- dataset definition list/create/detail/update/deactivate
- manage audited profile and approved-file-kind configuration without promoting
  development/test fixture policy into production
- draft version create/update/validate
- version publish/retire
- emergency package-version quarantine across every affected organization
- documented quarantine clearance when the unchanged immutable version is
  confirmed safe
- permanent version withdrawal after a confirmed unsafe or unshareable outcome
- Phaeno-only quarantined-content investigation view/download with a required
  reason and full audit history
- per-organization confirmed-unsafe closeout and administrator attestation
- Phaeno recording of externally received closeout attestations without user
  impersonation
- retired packages excluded from new-grant and upgrade selectors
- package list/create/version/publish, if packages are required
- organization grant, revoke, upgrade, and retry commands
- explicit curated sample-package grant upgrade with no automatic rollout
- provisioning-run detail and history

### Tenant Access

- list datasets available to the selected organization
- retrieve dataset metadata or content according to its type
- view and download granted Prospect sample data
- list every record and file in a granted curated sample package
- retrieve package summary and file metadata without an in-browser file-content
  preview
- download one authorized file or the complete immutable-version archive
- organization-admin download history scoped to the selected organization
- obtain authorized short-lived file downloads through the file-management
  abstraction when applicable

Contract requirements:

- Use the shared `ApiResponse<T>` envelope.
- Use selected-organization context for tenant access and explicit target
  organization ids only in Phaeno administration routes.
- Require optimistic concurrency for mutable drafts, definitions, packages,
  and grants.
- Require idempotency keys for provisioning, retry, and upgrade commands.
- Paginate administrative and tenant lists.
- Never expose storage keys, another tenant's grant state, or restricted source
  metadata.

## File-Management Integration

- Reuse `IFileStorage`, `FileRecord`, versioning, signed-download, checksum, and
  retention direction from `docs/plans/FILE-MANAGEMENT-PLAN.md` for binary payloads.
- Upload source-sample files directly into managed storage. Compute checksums and
  record file kind, size, and scan state server-side; do not accept client-
  supplied storage keys or checksums as authoritative.
- Dataset versions reference immutable file versions rather than mutable file
  names.
- Publishing verifies referenced artifacts exist, are active, pass scanning
  when required, and match recorded checksums.
- Publishing rejects any file whose kind is not on the configured Phaeno-
  approved list for that dataset type.
- Dataset authorization is checked before issuing any file download.
- Download authorization denies quarantined package versions regardless of
  otherwise-active organization grants or cached tenant state.
- A separate Phaeno investigation authorization path may permit quarantined
  downloads after capturing the required reason. It must not reuse tenant grant
  authorization or expose investigation downloads to external organizations.
- Support both individual-file downloads and a complete archive generated from
  the exact immutable package version. The archive contains the manifest and
  every file referenced by that version.
- Curated Prospect sample data must use API-proxied or otherwise revocable
  delivery so grant revocation can stop new downloads immediately. Do not rely
  on a long-lived pre-signed URL that remains usable after revocation.
- Each Prospect sample-data download records the organization, user, sample-data
  version, download mode, individual artifact when applicable, timestamp, and
  request context without logging sensitive contents.
- Dataset retirement or grant revocation does not hard-delete shared artifacts
  that remain referenced by another published version or active grant.
- Published curated-package artifacts are exempt from normal retention deletion
  even when no active grant remains. Superseded and retired versions remain
  preserved indefinitely unless a future exceptional purge process is used.
- The baseline contract supports managed files, and the synthetic reference
  journey exercises them, so the necessary file-storage and scanning slice is
  an implementation prerequisite.

## Reliability, Audit, And Security

- Persist the selected dataset versions before a provisioning job begins.
- Use transactions per safe unit of work; do not leave untracked partial copies.
- Use an outbox or durable queue if provisioning crosses process or service
  boundaries.
- Store validation results and per-dataset outcomes without logging sensitive
  payload contents.
- Verify checksums for uploaded, snapshotted, and published artifacts.
- Apply schema versioning and reject payloads whose validator is unavailable.
- Reject synthetic fixtures and test-only file-kind policies in production
  readiness, publication, eligibility, and grant commands.
- Write explicit audit events for definition changes, version publication and
  retirement, package changes, grants, revocations, provisioning starts,
  completion, failure, retry, upgrade, and rollback.
- Publish administrator notifications through an outbox or equivalent durable
  mechanism after the access transaction commits. Notification failure retries
  independently and never rolls back the access change.
- Quarantine notifications go to every affected organization's active
  administrators and appear in portal activity. Notification delivery never
  delays the immediate access block.
- External quarantine notices include the high-level concern category, blocked
  access status, and prior-download guidance, but exclude internal evidence,
  suspected identifiers, and investigation details.
- Interim guidance tells affected organizations to stop using or sharing prior
  downloads and isolate local copies pending the investigation outcome. It does
  not direct deletion before Phaeno determines the final disposition.
- Quarantine-clearance notifications go to administrators of organizations
  whose still-active grants resume, and the event appears in portal activity.
- A confirmed-unsafe final notice requests one administrator attestation per
  affected organization that local copies were deleted and downstream
  recipients were notified. The portal tracks outstanding and completed
  attestations without claiming technical verification.
- Send reminders while an attestation remains outstanding and surface the item
  in a Phaeno follow-up queue. Do not automatically deactivate the organization
  or block unrelated data.
- Schedule reminders and calculate overdue status from the required due date
  chosen for that incident rather than a universal deadline.
- Require least-privilege capabilities for dataset publication and organization
  provisioning. Do not require different users for authoring and approval.
- Preserve every published curated-package version indefinitely. Any future
  exceptional purge of regulated or licensed data requires a separately defined
  process.

## Success Measures

- In development/test, an authorized Phaeno user can complete the synthetic
  reference journey from source registration and managed upload through ready
  revision, curated publication, Prospect eligibility, and one-organization
  grant without database or storage intervention.
- Every published version has complete ownership/de-identification evidence,
  source-revision lineage, an immutable checksummed manifest, and successful
  atomic validation; no partial package is visible or grantable.
- Every tenant file or archive request evaluates current user, membership,
  organization, grant, package-version, quarantine/withdrawal, and active-state
  authorization and creates the required download audit record.
- Automated authorization coverage demonstrates zero cross-organization package
  discovery or access for the synthetic reference journey.
- Organization administrators can see their own per-user download history, and
  authorized Phaeno users can trace publication, grants, upgrades, revocations,
  downloads, quarantine actions, investigation access, and closeout.
- Grant failures are visible and idempotently retryable without rolling back or
  deactivating the organization.
- Quarantine blocks external access immediately, preserves investigation access
  only for specifically authorized Phaeno users, and tracks every affected
  organization through clearance or required closeout.

## Implementation Phases

1. Add the Prospect tenant phase and audited in-place conversion direction to
   the account model; document the Partner workflow and customer assignments.
2. Implement the minimal Phaeno-only source-sample registry, baseline contract,
   evidence, managed data attachments, and ready revision.
3. Inventory the first concrete dataset type and resolve access-versus-copy,
   lifecycle, upgrade, revocation, and governance behavior.
4. Create an explicitly synthetic development/test fixture to exercise the
   baseline schema, validation, managed upload, manifest, publication, and
   organization-provisioning acceptance scenarios. Do not use it to infer
   scientific production rules.
5. Finalize the domain model, API contracts, permission capabilities, and
   synchronous/asynchronous transaction boundary.
6. Add definitions, immutable versions, grants, provisioning runs, persistence,
   and migrations with the persisted model.
7. Implement the first dataset-type adapter and Phaeno dataset/version
   configuration UI.
8. Implement organization grant/provisioning commands, progress/history UI, and
   the new-organization workflow integration.
9. Add prospect/customer/partner dataset access UI and file integration as
   required.
10. Add version upgrades, optional organization-creation package assignment,
    bulk revocation, and advanced governance after the first dataset type is
    proven. Generic bulk assignment and scheduled rollout remain deferred scope.

## Recommended First Slice

Prove the baseline contract end to end with an explicitly synthetic,
non-production fixture:

- In development/test, Phaeno registers the synthetic source, attaches its
  harmless fixture data, records synthetic ownership/de-identification evidence,
  and marks one complete revision ready for curation.
- Phaeno snapshots that revision into a curated draft and marks an immutable
  published version eligible for Prospect assignment.
- The backend validates and publishes an immutable version.
- An authorized Phaeno user explicitly grants that version to one existing Prospect
  organization through an idempotent provisioning run.
- A user in that selected Prospect organization can list and read it.
- That user can download an individual file or the complete immutable-version
  archive through a tenant-authorized, audited download.
- A user in another organization cannot discover or read it.
- Another Prospect does not receive access merely because the sample data is in
  the generally eligible catalog.
- Audit history explains who published and granted the version.
- The Prospect cannot access ordering capabilities.
- Production rejects the synthetic marker and test-only file-kind configuration;
  no synthetic fixture can become externally eligible, published, or granted
  there.

Use an existing organization for this slice. Integrate automatic selection into
new organization creation only after grant and retry behavior is reliable.

Implementation checkpoint refreshed on 2026-07-16: the application code,
interfaces, unit/component coverage, and persistence mappings are present in the
clean `InitialPSeqOperations` Development baseline. The controller-level
authenticated PostgreSQL reference journey passes with transaction rollback and
isolated temporary storage. A full browser-to-Clerk-to-API run remains a
separate authentication/E2E checkpoint.

## Verification Plan

When implementation begins, update the running backend, frontend, and e2e test
plans with concrete cases. At minimum cover:

- only authorized Phaeno users can author, publish, retire, grant, and retry
- source-sample registry is Phaeno-only and rejects tenant access
- production rejects synthetic sources and test-only profile/file-kind policy at
  readiness, publication, eligibility, and grant boundaries
- managed direct uploads compute authoritative checksums, enforce file/size
  rules, expose scan/retry state, and reject external storage references
- atomic source-revision readiness validates metadata, ownership and
  de-identification evidence, files, scans, and checksums; failure leaves the
  complete revision editable in draft
- ready source revisions are immutable; later changes create a new draft
  revision, and archiving prevents new snapshots without affecting existing ones
- only an unreferenced source draft may be discarded, with destructive
  confirmation, a reason, preserved audit, and reference-safe byte cleanup
- draft concurrency and published-version immutability
- payload/schema validation and checksum failures
- rejection of unexpected, unsupported, or disallowed file kinds at publication
- atomic publication: any blocking package failure keeps the complete version in
  draft and exposes no partial content
- source-sample selection, immutable snapshot lineage, and no automatic source
  synchronization
- rejection of source samples that are not already Phaeno-owned and de-identified
- validation of accountable de-identification evidence without storing removed
  identifiers
- immediate cross-organization quarantine after a de-identification, ownership,
  or sharing-rights concern, including every version derived from the affected
  source, cached-session denial, preserved evidence, and administrator notice
- quarantine notices disclose only the concern category, access status, and
  actionable guidance while keeping investigation evidence Phaeno-only
- interim quarantine guidance requires suspended use/sharing and isolation of
  prior downloads without premature deletion
- confirmed-unsafe disposition requires one deletion and downstream-recipient
  notification attestation per affected organization, with visible follow-up
  status and no claim of technical deletion verification
- outstanding-attestation reminders and Phaeno follow-up without automatic
  organization deactivation or unrelated-data blocking
- incident-specific attestation due dates, reminder timing, and overdue status
- externally received attestations retain the organization contact, evidence
  source, Phaeno recording actor, timestamp, and `Recorded by Phaeno` provenance
- Phaeno-only investigation access to quarantined content requires the dedicated
  capability, a reason, and a complete audit trail
- quarantine clearance requires an authorized user, documented safe outcome,
  unchanged content, and a reason; changed content requires a new version
- clearance restores still-active, non-revoked grants but never reactivates a
  grant revoked during quarantine
- confirmed-unsafe withdrawal permanently blocks clearance, tenant access, and
  new grants while preserving the version as evidence
- rejection of supplemental data files/records while allowing presentation metadata
- tenant isolation for metadata, records, and files
- authorized Prospect viewing and separately audited individual-file and
  complete-version-archive downloads
- organization-admin download-history visibility with strict tenant isolation
- exact-version grants and prevention of accidental cross-tenant availability
- all-active-member access to Phaeno-owned curated Prospect data before and
  after conversion
- isolation of Customer/Partner-owned operational data from the broad Prospect
  data rule
- separation of general Prospect eligibility from explicit per-organization
  access
- explicit Customer and Partner grants with no organization-kind auto-grant
- removal from the eligible catalog without mutation of existing grants
- optional catalog-removal bulk revocation across every external organization
- authorization for catalog management and Prospect/Customer/Partner assignment
- idempotent provisioning and retry after each failure boundary
- partial failure visibility and readiness behavior
- non-blocking no-package warning, explicit continuation, and the empty-data state
- organization creation remains committed and invitations remain available when
  an optional package grant fails; the failed grant is visible and retryable
- deactivated/reactivated organization access behavior
- suspension without grant mutation and restoration of non-revoked grants
- revocation and version-upgrade semantics
- retirement blocks new grants without changing existing access
- grants remain active indefinitely until explicit revocation
- immediate organization-wide denial after grant revocation, including stale
  browser sessions and attempted repeat downloads
- frozen-grant behavior when a newer curated sample-package version is published
- explicit upgrade replaces tenant access to the prior version while preserving
  its internal grant and download history
- accessible dataset management, previews, confirmations, status communication,
  focus handling, and responsive layouts
- administrator notification and portal activity for grant, upgrade, and revoke
  actions without email fan-out to ordinary members
- the complete Phaeno publish-to-Prospect-access journey

Do not run tests or execute the test plans until explicitly requested.

## Production Data Readiness

No real Phaeno sample will be provided for implementation. This does not block
the baseline source registry, curation, grant, authorization, audit, quarantine,
download, or organization workflow.

Use an explicitly synthetic fixture only in development and automated tests.
Production starts without synthetic data and without speculative approved
scientific file kinds. Before Phaeno can publish and grant a real production
package, an authorized Phaeno user must register actual Phaeno-owned data,
complete the ownership/de-identification evidence, configure and approve its file
kinds and applicable profile rules, and pass the normal atomic readiness and
publication checks.

## Definition Of Ready For Implementation

- Account means tenant organization for this feature.
- Prospect, Partner, and Customer workflows and boundaries are documented.
- Curated source samples originate from the dedicated internal Phaeno sample
  workflow; no Customer or Partner operational data is reused automatically.
- The minimal Phaeno-only source-sample registry and its boundary from Customer
  and Partner operational workflows are documented.
- Source files upload directly into managed portal storage; ready revisions are
  atomically validated and immutable, and only unreferenced drafts may be
  discarded through the confirmed audited workflow.
- A synthetic non-production fixture exercises the baseline contract in
  development and automated tests without being treated as scientific evidence.
- Production has no speculative sample data or approved scientific file kinds;
  real publication remains blocked until Phaeno explicitly configures and
  approves actual data and its profile rules.
- Every published package has the required standard summary, checksummed
  manifest, and complete downloadable source snapshot.
- The baseline record/manifest contract, curated-area review process,
  de-identification approval criteria, and allowed uses are approved.
  Production scientific file kinds remain an explicit content configuration
  step rather than an implementation prerequisite.
- Standard portal terms govern curated sample access; no separate first-view or
  first-download acceptance is required.
- Curated packages are read-only Phaeno-managed references; portal grants do not
  create organization-owned editable copies.
- Revocation and deactivation behavior is approved. Deactivation suspends access
  and reactivation restores non-revoked grants; version upgrades are frozen and
  Phaeno-controlled as documented above. Grants do not expire automatically;
  published, superseded, and retired versions are retained indefinitely.
- Permanent deletion is outside normal configuration workflows. Retirement
  blocks all new grants and preserves existing access.
- Curated packages are optional at Prospect creation, invitations may proceed,
  and the no-package warning/empty state is documented.
- Any automatic additions or replacements to seed-data grants at Prospect
  conversion are prohibited; existing grants are preserved unchanged.
- Phaeno author, publisher, and provisioner capabilities are approved.
- Binary storage and scanning dependencies are explicit.
- Product capabilities, authorization outcomes, and end-to-end acceptance
  scenarios are explicit. Final endpoint and persistence contracts are
  implementation-owned technical decisions.

## Implementation-Owned Finalization

- Final entity, schema, endpoint, and background-job names.
- Final profile-specific payload types, scientific validators, approved file
  kinds, and size limits when actual production data becomes available.
- File-storage/scanning configuration and operational limits.
- Persistence mappings and migrations. Create required EF migrations and apply
  them to the configured local development database with the authorized model
  change; removing migrations or applying them to shared, staging, or production
  databases remains confirmation-gated.

## Deferred Product Scope

- Any separate exceptional administrative purge process.
- Partner-managed customer provisioning.
- Bulk assignment and scheduled rollout.
- Customer-authored datasets or customer uploads.
- Any future ownership-and-consent process for reusing Customer or Partner
  operational data as a Phaeno-owned curated source.
- Generic or specialized in-browser scientific file-content viewers.
- External source-sample file references or imports.
- Production scientific profile extensions beyond the baseline contract.
- Rollback and complex package inheritance.
- Regulated-data handling beyond the baseline security constraints above.
