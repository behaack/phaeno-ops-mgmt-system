# Customer And Distributor Data Provisioning Plan

Keep this file updated as account-seeding, dataset, and distributor requirements
are supplied and decisions are made.

Do not execute this plan until the terminology and data-semantics gates are
resolved and implementation is explicitly requested.

## Status

- Planning state: discovery; dataset details are pending.
- Requested outcomes:
  - seed a new customer or distributor account with data
  - give authorized Phaeno users a configuration area where datasets can be
    made available to customer/distributor organizations
- This plan treats an account as a tenant organization, not as a login identity.
  Confirm that interpretation before implementation.

## Terminology Gate

The current repository is not yet consistent enough to infer the distributor
model:

- persisted `OrganizationKind` values are `Phaeno` and `Customer`
- the repository overview and mock UI refer to `Partner`
- `Distributor` is not currently a persisted or planned organization kind

Before a schema or authorization contract is designed, choose one direction:

1. Distributor is the product name for the existing planned Partner concept.
2. Partner and Distributor are distinct organization kinds.
3. Distributor is a relationship/capability of an organization rather than an
   organization kind.

Do not silently add `Distributor` to `OrganizationKind`. Once the decision is
made, update the repository overview, auth plan, mock UI vocabulary, persisted
model, authorization rules, and affected tests together.

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
- `PLANS/FILE-MANAGEMENT-PLAN.md` already defines local/S3 storage abstractions
  for managed binary files, but file management is not yet represented as an
  implemented backend feature.

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

Rename these concepts when the actual data and user language are known.

## Planning Principles

- Dataset configuration is an explicit Phaeno administrative feature; it is not
  environment startup seeding.
- Published versions are immutable. Corrections create a new version rather
  than changing data already assigned to organizations.
- Dataset availability is explicit per organization or through an explicitly
  applied package. Organization kind alone must not accidentally expose all
  data to every tenant of that kind.
- Every grant, revocation, provisioning run, retry, and version change is
  attributable and auditable.
- Provisioning is idempotent and safe to retry.
- Partial failures are visible and recoverable; a new organization must not
  appear fully provisioned when required data failed.
- The design must distinguish access to shared Phaeno-managed data from a copy
  of data that the customer/distributor owns and may later customize.
- Dataset payloads use domain-specific validation. A generic JSON blob alone is
  not a sufficient integrity model for important business data.
- Binary artifacts use the file-storage abstraction when that feature is
  implemented; dataset code must not create a second unmanaged storage system.

## Data-Semantics Gate

Resolve and record these decisions before the final model or migration is
designed.

### Dataset Contents

- What concrete data is seeded or shared?
- Is the data structured records, files, reference data, templates,
  configuration, catalog content, or a combination?
- What schema, validation, size, and file-type rules apply to each dataset type?
- Does any dataset contain PHI, PII, credentials, licensed content, or other
  regulated/restricted data?
- Who owns the source data and who may modify it after provisioning?

### Access Versus Copy

- Does "make available" mean live read access to a centrally managed dataset?
- Does "seed" mean copying data into organization-owned records?
- Can customers/distributors customize seeded data?
- Should future dataset versions automatically flow through, require opt-in, or
  never affect an existing organization?
- What does revocation mean for data already copied or downloaded?
- Is a hybrid model required, with reference access for some dataset types and
  materialized copies for others?

### Targeting And Lifecycle

- Are datasets assigned individually, by organization kind, by distributor
  relationship, by contract, or through named packages?
- May one organization receive multiple datasets or versions of the same
  dataset?
- Can datasets be added to existing organizations, or only selected during new
  organization creation?
- May Phaeno re-run, repair, upgrade, or roll back a provisioning operation?
- Does deactivating an organization suspend dataset access automatically?
- What happens to grants and organization-owned copies when an organization is
  reactivated?

### Account Creation Workflow

- Is organization creation allowed to succeed before provisioning completes?
- Which datasets are required versus optional for each account type?
- Should user invitations wait until required provisioning succeeds?
- Who selects the package/datasets and who may approve the selection?
- Does provisioning need an asynchronous job because of volume or external
  dependencies?

## Recommended Domain Direction

The following is a candidate architecture, not a final schema.

### DatasetDefinition

Represents the stable identity and policy of a logical dataset:

- name, description, dataset type, and owning Phaeno area
- allowed target organization kinds or relationship rules
- payload schema/validator identifier
- active/inactive lifecycle
- audit fields and concurrency `Version`

### DatasetVersion

Represents an immutable revision:

- dataset definition id and version number
- lifecycle such as `Draft`, `Published`, and `Retired`
- schema version and content checksum
- structured manifest and/or references to managed file artifacts
- release notes, created-by, reviewed-by, published-by, and timestamps
- compatibility or upgrade metadata if later versions can be applied

Draft content can be edited with optimistic concurrency. Publishing validates
the complete version and freezes its content.

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
- effective and optional expiration timestamps
- source package/provisioning run
- granted, revoked, and failure context
- audit fields and concurrency `Version`

An active grant must be unique according to the decided versioning rules.

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

Expected boundaries:

- Only authorized Phaeno users create, edit, publish, retire, grant, revoke, or
  retry datasets.
- Customer/distributor users can see only datasets actively granted to their
  selected organization and only the content allowed by that dataset type.
- Cross-organization administration occurs through an explicit Phaeno platform
  view.
- A distributor's ability to seed or grant data to customers is out of scope
  until the distributor/partner relationship and delegation policy are defined.
- Dataset status must not bypass normal user, membership, and organization
  active-state gates.

## Phaeno Configuration Experience

Provide a dedicated Phaeno-only configuration area with separate surfaces for:

- dataset definitions and status
- version authoring, validation, review, publish, and retirement
- managed artifacts/files when applicable
- provisioning packages, if required
- organization grants and provisioning history
- failures, retries, and audit context

Recommended interaction rules:

- Use list pages with modal create/edit forms where practicable; do not place
  inline management forms inside lists.
- Use a dedicated detail/editor page for complex dataset contents or manifests.
- Require a preview and explicit confirmation before publishing or provisioning.
- Show the exact immutable versions that will be assigned.
- Prevent publishing while validation errors exist.
- Clearly distinguish `Draft`, `Published`, `Retired`, `Pending`, `Active`,
  `Failed`, and `Revoked` states without relying on color alone.
- Require a reason for retirement, revocation, destructive repair, or rollback.

## New Organization Provisioning Experience

Extend the Phaeno organization-creation workflow only after the base organization
contract is real and the account type terminology is settled.

A likely flow is:

1. Enter and validate organization details.
2. Select the customer/distributor account type.
3. Select a published provisioning package or explicit dataset versions.
4. Preview required and optional data, versions, and consequences.
5. Create the organization and start one idempotent provisioning run.
6. Show per-dataset progress and a clear overall state.
7. Enable invitations or handoff according to the decided readiness rule.

If provisioning is asynchronous, model organization readiness explicitly, for
example as a separate provisioning/readiness status. Do not overload
`Organization.IsActive` with transient job progress.

## API Direction

Final contracts depend on the data-semantics gate. A likely split is:

### Phaeno Administration

- dataset definition list/create/detail/update/deactivate
- draft version create/update/validate
- version publish/retire
- package list/create/version/publish, if packages are required
- organization grant, revoke, upgrade, and retry commands
- provisioning-run detail and history

### Tenant Access

- list datasets available to the selected organization
- retrieve dataset metadata or content according to its type
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
  retention direction from `PLANS/FILE-MANAGEMENT-PLAN.md` for binary payloads.
- Dataset versions reference immutable file versions rather than mutable file
  names.
- Publishing verifies referenced artifacts exist, are active, pass scanning
  when required, and match recorded checksums.
- Dataset authorization is checked before issuing any file download.
- Dataset retirement or grant revocation does not hard-delete shared artifacts
  that remain referenced by another published version or active grant.
- If the first dataset types are structured metadata only, that slice can be
  implemented without waiting for binary file storage.

## Reliability, Audit, And Security

- Persist the selected dataset versions before a provisioning job begins.
- Use transactions per safe unit of work; do not leave untracked partial copies.
- Use an outbox or durable queue if provisioning crosses process or service
  boundaries.
- Store validation results and per-dataset outcomes without logging sensitive
  payload contents.
- Verify checksums for imported/published artifacts.
- Apply schema versioning and reject payloads whose validator is unavailable.
- Write explicit audit events for definition changes, version publication and
  retirement, package changes, grants, revocations, provisioning starts,
  completion, failure, retry, upgrade, and rollback.
- Require least-privilege capabilities for dataset publication and organization
  provisioning; consider separating author and publisher if governance needs
  four-eyes approval.
- Define retention and deletion behavior before storing regulated or licensed
  data.

## Implementation Phases

1. Resolve the distributor/partner terminology and account-type model; align the
   auth plan and repository vocabulary.
2. Inventory the first concrete dataset type and resolve access-versus-copy,
   lifecycle, upgrade, revocation, and governance behavior.
3. Write representative dataset examples, schemas, validation rules, and
   organization provisioning acceptance scenarios.
4. Finalize the domain model, API contracts, permission capabilities, and
   synchronous/asynchronous transaction boundary.
5. Add definitions, immutable versions, grants, provisioning runs, persistence,
   and a migration only when migration work is explicitly requested.
6. Implement the first dataset-type adapter and Phaeno dataset/version
   configuration UI.
7. Implement organization grant/provisioning commands, progress/history UI, and
   the new-organization workflow integration.
8. Add customer/distributor dataset access UI and file integration as required.
9. Add version upgrades, packages, bulk assignment, and advanced governance
   only after the first dataset type is proven.

## Recommended First Slice

After discovery, prove one non-sensitive, structured dataset type end to end:

- Phaeno creates a definition and draft version.
- The backend validates and publishes an immutable version.
- A Phaeno user explicitly grants that version to one existing customer
  organization through an idempotent provisioning run.
- A user in that selected customer organization can list and read it.
- A user in another organization cannot discover or read it.
- Audit history explains who published and granted the version.

Use an existing organization for this slice. Integrate automatic selection into
new organization creation only after grant and retry behavior is reliable.

## Verification Plan

When implementation begins, update the running backend, frontend, and e2e test
plans with concrete cases. At minimum cover:

- only authorized Phaeno users can author, publish, retire, grant, and retry
- draft concurrency and published-version immutability
- payload/schema validation and checksum failures
- tenant isolation for metadata, records, and files
- exact-version grants and prevention of accidental cross-tenant availability
- idempotent provisioning and retry after each failure boundary
- partial failure visibility and readiness behavior
- deactivated/reactivated organization access behavior
- revocation and version-upgrade semantics
- accessible dataset management, previews, confirmations, status communication,
  focus handling, and responsive layouts
- the complete Phaeno publish-to-customer-access journey

Do not run tests or execute the test plans until explicitly requested.

## Definition Of Ready For Implementation

- Account means organization, or the intended alternative is documented.
- Distributor, Partner, and Customer terminology is resolved.
- The first dataset type has representative real examples.
- Access-versus-copy and post-provision customization rules are approved.
- Version upgrade, revocation, deactivation, and retention behavior is approved.
- Required versus optional new-account data and invitation timing are approved.
- Phaeno author, publisher, and provisioner capabilities are approved.
- Binary storage and scanning dependencies are explicit.
- API examples and end-to-end acceptance scenarios are reviewed.

## Deferred Until Details Arrive

- Final entity/schema names and migrations.
- Final dataset payload format and validators.
- Final account-creation transaction and readiness behavior.
- Distributor-managed customer provisioning.
- Bulk assignment and scheduled rollout.
- Customer-authored datasets or customer uploads.
- Automatic upgrades, rollback, and complex package inheritance.
- Regulated-data handling beyond the baseline security constraints above.

