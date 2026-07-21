# Backend Test Plan

Keep this file updated as backend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

Lab Operations is feature-complete for the approved internal application
scope. The five opt-in provider/projection tests and five opt-in Commercial
handoff/operator tests below passed together against the migrated local
`phaeno_ops` database on 2026-07-16. Negative API paths and physical bench
acceptance remain production-activation coverage. Protocol-key, batch-name,
automatic batch-type, and batch-number allocation, barcode normalization,
reasoned print outcomes, exact scan lookup,
library-key derivation, and duplicate-safe batch entry now have focused unit
and rollback-isolated PostgreSQL coverage.

## Created Tests

- [x] `backend/test/PersistenceTests.cs` -
  `PSeqOperationsDbContextMapsWebsiteEntitiesToWebsiteSchema` and the
  all-entity schema assertion cover the Website-owned tables in the shared
  portal context.
- [x] `backend/test/WebsiteApiTests.cs` - sitemap URL discovery,
  accent normalization, hyphenated-term highlighting, and rejection of
  HTML-page-title-only and search-keyword-only false positives, plus PDF-only
  landing matches, visible-before-PDF snippet selection, source-aware ranking,
  and exclusion of index-only text from the public Website response.
- [x] `backend/test/WebsiteDocumentTextExtractorTests.cs` - deterministic
  two-page PDF reading order, extracted-character limits, and malformed-PDF
  failure classification for the PdfPig implementation.
- [x] `backend/test/WebsiteCrawlerTests.cs` - one-record document mode,
  same-origin source enrichment, external-origin/prefix/redirect/MIME/robots/
  size rejection, encrypted/malformed/image-only/unavailable/excessive-text
  fallback, hard extraction timeout, unchanged ordinary section indexing, and
  successful mixed valid/invalid publication rebuilds.
- [x] `backend/test/PhaenoPortalMetadataTests.cs` - `HealthMetadataIdentifiesTheApi`.
- [x] `backend/test/PersistenceTests.cs` -
  `PSeqOperationsDbContextMapsEveryEntityToItsOwningSchema`.
- [x] `backend/test/PersistenceTests.cs` - `PSeqOperationsDbContextMapsAccountEntities`.
- [x] `backend/test/PersistenceTests.cs` - `PSeqOperationsDbContextMapsDataProvisioningEntitiesAndTenantBoundaries`.
- [x] `backend/test/ModuleBoundaryTests.cs` - `CommercialAndLaboratoryAssembliesDoNotReferenceEachOtherOrApi`.
- [x] `backend/test/LabOperationsContractTests.cs` - core v1 contract version,
  Commercial ownership, transport neutrality, prohibited-field boundary, and
  partial-cancellation representation, plus the internal adapter's provider-port
  implementation.
- [x] `backend/test/LabOperationsDomainTests.cs` - monotonic authorization
  versions, receipt-before-accession behavior, controlled hold/rejection reasons,
  immutable authorization payload hashes, pre-receipt cancellation boundaries,
  work cancellation, provider-command receipt matching, controlled work
  milestones, protocol activation, QC-gated material consumption, required
  failed-QC reasons with the laboratory QC date, and
  customer-safe exception separation, including execution completion without
  an optional deviation note; plus Phaeno barcode kind/prefix allocation,
  safe-character generation, Code 39 scan normalization, checksum validation,
  and altered-value rejection; plus readable protocol/material-key collision
  handling, material-lot quantity and structured-component invariants, and
  date-stamped scanner-safe batch-number generation and captured batch lifecycle
  timestamps; plus draft definition
  updates, approval withdrawal, discarded-version history, and illegal
  post-discard transitions.
- [x] `backend/test/LabOperationsAuthorizationTests.cs` - exact additive
  Operator, Supervisor, Protocol Administrator, Scientific Reviewer, and Lab
  Operations Administrator capabilities; platform-administrator bootstrap;
  inactive-assignment filtering; external-user denial; disabled-user denial;
  explicit role matching; and `/api/session` capability projection.
- [x] `backend/test/PersistenceTests.cs` - Commercial and Laboratory assembly
  schema ownership, all 26 Laboratory mappings, and no Laboratory foreign key
  into a Commercial entity.
- [x] `backend/test/ApiResponseTests.cs` - `SuccessEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `FailureEnvelopeSerializesWithReferenceShape`.
- [x] `backend/test/ApiResponseTests.cs` - `DomainExceptionMapsLikeReferenceApi`.
- [x] `backend/test/ApiResponseTests.cs` - `ConcurrencyExceptionMapsToConflict`.
- [x] `backend/test/AccountDomainTests.cs` - `NewUserIsInvitedAndInactiveUntilAccepted`.
- [x] `backend/test/AccountDomainTests.cs` - `AcceptInvitationLinksExternalIdentityAndActivatesUser`.
- [x] `backend/test/AccountDomainTests.cs` - `PlatformAdminRequiresActiveAdminMembershipInActivePhaenoOrganization`.
- [x] `backend/test/AccountDomainTests.cs` - `InvitationExpirationIsDerivedFromPendingStatusAndExpiresAt`.
- [x] `backend/test/AccountDomainTests.cs` - `InvitationTokenServiceStoresHashSeparateFromRawToken`.
- [x] `backend/test/AccountDomainTests.cs` - `OrganizationDeactivateDoesNotDeactivateMembership`.
- [x] `backend/test/AccountDomainTests.cs` - `UserDeactivateDoesNotDeactivateMemberships`.
- [x] `backend/test/ExternalIdentityContextTests.cs` - `ClaimsExternalIdentityContextReadsClerkSubjectAndVerifiedEmail`.
- [x] `backend/test/ExternalIdentityContextTests.cs` - `ClaimsExternalIdentityContextReturnsNullForUnauthenticatedUser`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `PlatformAdminCanManageCustomerOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `CustomerOrgAdminCannotManagePhaenoOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `CustomerOrgAdminCanManageOwnCustomerOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `ProspectOrgAdminCanManageOwnProspectOrganizationMembers`.
- [x] `backend/test/AccountAuthorizationTests.cs` - `ActiveProspectMemberCanViewOnlyOwnOrganizationDatasets`.
- [x] `backend/test/AccountDomainTests.cs` - `NewExternalOrganizationDefaultsToProspectAndConvertsInPlace`.
- [x] `backend/test/AccountDomainTests.cs` - `ProspectCannotConvertToPhaenoOrConvertTwice`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ProvisioningPolicyKeepsEnvironmentConfigurationOutsideTheDomain`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ReadySourceRevisionIsImmutable`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `CuratedVersionSnapshotsReadySourceAndBuildsStableChecksum`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ManifestComparisonAcceptsJsonbKeyOrderingAndWhitespace`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `ManifestNormalizesTimestampsToPostgresqlMicrosecondPrecision`.
- [x] `backend/test/DataProvisioningDomainTests.cs` - `EligibilityAndGrantPinOnePublishedExactVersionUntilRevoked`.
- [x] `backend/test/DataProvisioningDomainTests.cs` -
  `GrantUpgradeSupersedesPriorExactVersionWithoutErasingHistory`.
- [x] `backend/test/DataProvisioningDomainTests.cs` -
  `GovernanceQuarantineCanRestoreUnchangedContentOrWithdrawUnsafeContent`.
- [x] `backend/test/DataProvisioningDomainTests.cs` -
  `AffectedOrganizationAttestationPreservesEvidenceAndClosesOutstandingStatus`.
- [x] `backend/test/DataProvisioningProfileTests.cs` - production rejects
  synthetic fixtures even when incorrectly enabled.
- [x] `backend/test/DataProvisioningProfileTests.cs` - production never trusts
  files without a scanner integration.
- [x] `backend/test/DataProvisioningProfileTests.cs` - unconfigured scientific
  file kinds are rejected.
- [x] `backend/test/OrderManagementDomainTests.cs` - laboratory request/quote
  transitions, immutable request revisions, sample stages, and quote expiry.
- [x] `backend/test/OrderManagementDomainTests.cs` - negotiated reagent price
  snapshots, effective quantity rules, destination restrictions, immutable
  placement confirmation, approved substitutions, partial shipment, and
  partial cancellation behavior.
- [x] `backend/test/OrderManagementDomainTests.cs` - assembly input-revision,
  quote, placement, and processing continuity.
- [x] `backend/test/OrderManagementDomainTests.cs` - operational-file scan and
  release gating, separate lab/assembly credit decisions, configurable quote
  validity, and failed-notification manual recovery.
- [x] `backend/test/RelationshipManagementDomainTests.cs` - an approved request
  authorizes only its associated organization and requested service,
  onboarding-only requests cannot source service entitlements, and entitlement
  end reasons are required and retained; service eligibility is covered for
  Customer, Partner, Prospect, and Phaeno organizations.

## Created Database Verification

- [x] `backend/test/LabOperationsProviderPostgresTests.cs` - opt-in PostgreSQL
  provider conformance coverage for atomic authorization creation, exact command
  replay, conflicting command-ID reuse, safe/stale/unsafe amendments, full and
  partial pre-receipt cancellation, current projection lookup, Commercial
  organization isolation, prohibited commercial-field leakage, durable event
  replay, out-of-order projection rejection, customer-safe exception fields,
  and proof that `ReadyForRelease` creates neither a file nor a result release.
  The tests use `PSEQ_OPERATIONS_REFERENCE_CONNECTION`, require an already
  migrated database, and explicitly clean their run-specific Lab, Commercial
  projection, outbox, event-receipt, and audit fixtures.
- [x] `backend/test/LabOperationsCommercialHandoffPostgresTests.cs` - opt-in
  controller-path coverage proving quote acceptance atomically commits the
  Commercial authorization and Lab work, provider rejection rolls both back
  even after an intermediate save, accepted cancellation updates Commercial
  and Lab together, and started Lab work vetoes the decision without partially
  approving it. A fifth rollback-isolated journey assigns additive Lab roles
  and exercises one-open-candidate protocol enforcement, active protocols,
  receipt/accession and barcode-print history,
  including automatic submitted/derived barcode allocation, readable protocol
  keys, library keys derived from their container barcodes, scanner-safe batch
  numbers, Code 39 scan normalization, reasoned initial/reprint/failure outcomes
  without false print increments, exact submitted/library lineage lookup, and
  duplicate-safe scan-first batching; QC-approved materials, calibrated
  equipment, system-assigned equipment asset codes, date-only calibration
  sequencing, execution, library lineage, NGS sendout/custody, exception
  resolution, scientific approval, customer-safe projection delivery, and proof
  that Ready for release creates neither a managed file nor a Lab result release.
  The fixture uses unique
  Customer/Phaeno identities and removes its Commercial, Laboratory, account,
  idempotency, notification, and audit records.
- [x] `backend/tools/PSeq.Operations.ReferenceJourney` - controller-level
  authenticated PostgreSQL journey covering approved service-request source
  enforcement, rejection of an onboarding-only source, usable entitlement
  derivation, history-preserving entitlement end, synthetic source authoring,
  authoritative managed upload/scan, readiness, immutable snapshot/checksum,
  publication, eligibility, idempotent exact-version Prospect assignment,
  tenant list/detail and file/archive downloads, audit history, cross-tenant
  non-discovery, revocation, transaction rollback, and temporary-file cleanup.

## Deferred Tests

- [ ] Internal Web Operations dashboard endpoint - cover authenticated Phaeno
  platform-administrator access, external and non-admin denial, total counts,
  five-item bounds, newest-first mailing-list ordering, deterministic
  demo-request ordering, and response-envelope serialization. Cover the
  additive mailing-list and demo-request endpoints for their fixed 10-item
  pages, boundary-page normalization, stable ordering, totals, and the same
  authorization rules. Cover the platform-admin-only unsubscribe and complete
  endpoints, missing-record responses, idempotent retries, actor/time capture,
  audit events, immediate active-count/list filtering, and page normalization
  after the final item on a page leaves its queue.
- [ ] HubSpot/Portal lifecycle - cover signed webhook intake, exact Company and
  Deal correlation, duplicate/out-of-order delivery, pending onboarding with no
  access, direct Customer/Partner creation, narrow Portal Prospect creation,
  designated-admin invitation, service entitlements, Customer/Partner
  reclassification, offboarding review, durable publication, reconciliation,
  outage tolerance, and scientific-data exclusion.
- [ ] HubSpot committed-sale publication - cover one HubSpot Order per committed
  specimen, reagent, or assembly sale; no routine Deal creation; Company and
  originating-Deal associations; amount/currency/status/payment summaries;
  cancellation/refund history; retry without duplication; and QuickBooks/Portal
  authority over inbound HubSpot edits.
- [ ] Direct configured-price work - cover entitled Customer and Partner
  specimen placement, Partner data-assembly placement, ineligible/custom-work
  routing, immutable pricing snapshots, Partner downstream-identity omission,
  post-placement scientific validation, and cross-tenant denial.
- [ ] Complete Lab Operations API negative paths - extend the passing
  controller/PostgreSQL operator journey with hosted-HTTP unknown-barcode,
  platform lab-intake resolution before authorization and missing-authorization
  consistency checks,
  lineage rejection, stale-version conflict, parallel protocol-candidate
  rejection, invalid draft/approval transitions, expired material, overdue
  calibration, wrong-work-order batch/custody, unresolved blocking exception,
  and cross-tenant HTTP/authentication scenarios.
- [ ] Prospect Trial Projects - cover idempotent HubSpot request intake, dual
  approval, frozen scope/amendments, Prospect acceptance, project-specific
  submit authorization, extracted-RNA-only validation, the five-sample cap,
  deadlines/analyses, schedule updates without a fixed turnaround SLA, member
  view-versus-submit behavior, the three-month default and approval-time access
  override snapshot, default changes not rewriting approved projects, the
  approved access clock starting only when the complete standard result package
  is released, result release without payment, replacement lineage, terminal
  states, HubSpot retry, conversion preservation, normal-order denial, and
  cross-tenant metadata/file/result isolation.
- [ ] Clerk JWT authentication - validate issuer, audience, signature, and expiry with integration-level test coverage.
- [ ] Session/bootstrap endpoint - cover unauthorized, disabled, no active memberships, organization unavailable, and ready states with database-backed endpoint tests.
- [ ] Invitation endpoints - cover required invited first/last name, intended
  Phaeno Laboratory-role persistence, non-Phaeno Laboratory-role rejection,
  roleless-Phaeno-invitation rejection, create, resend cooldown, pending
  replacement, inactive organization rejection, disabled user rejection, and
  active membership rejection.
- [ ] Membership endpoints - cover deactivate, leave, promote, demote, cross-org denial, Phaeno-org denial for customer admins, and last-admin protection.
- [ ] Platform lifecycle endpoints - cover organization deactivate/reactivate, user disable/reactivate, platform-admin-only access, and last-platform-admin protection.
- [ ] User read/list endpoints - cover self read, platform read, org-admin organization list, active-default filtering, inactive include filter, and forbidden cross-org access. Cover the consolidated Phaeno user projection/update endpoint for platform-administrator and Lab Operations Administrator access, profile edits, Platform administrator promotion/demotion with last-admin protection, exact additive Lab-role replacement, inactive-user rejection, optimistic versions, and forbidden non-role/profile changes by a Lab-only access administrator.
- [ ] Invitation acceptance/decline endpoints - cover verified email match,
  token hash lookup, single-use behavior, expired/revoked/declined rejection,
  membership activation, and atomic activation of intended Phaeno Laboratory
  roles without granting them while pending.
- [ ] Account domain model - cover Phaeno and Customer organization kinds.
- [ ] Account domain model - cover multi-organization memberships and selected organization authorization gates.
- [ ] Account domain model - cover organization admins managing memberships in their own organization.
- [ ] Account domain model - cover non-admin customer users not managing memberships in their own organization.
- [ ] Account domain model - cover Phaeno platform admins managing customer organizations through platform admin flows.
- [ ] Account lifecycle - cover users, organizations, and memberships marked inactive rather than hard-deleted.
- [ ] Bootstrap seed - cover first Phaeno organization/admin creation and one-time Clerk identity linking with database-backed tests.
- [ ] Data provisioning HTTP host - extend the passing controller/database
  journey through the real ASP.NET authentication middleware and API envelope.
- [ ] Managed files - add endpoint coverage for configured file-kind rejection,
  scanner unavailable/rejected states, and missing-byte behavior. The reference
  journey covers authoritative checksum/size and isolated storage cleanup.
- [ ] Order-management authenticated HTTP/PostgreSQL journey - cover Customer,
  Partner, Prospect, Phaeno, cross-tenant non-discovery, optimistic concurrency,
  idempotency, file ownership, download audit, and outbox atomicity through the
  real API host.
- [ ] QuickBooks adapter contract suite - cover catalog/payment synchronization,
  estimates, invoices, credits, partial-shipment invoices, webhook replay and
  signature rejection, bounded retry, and reconciliation mismatches against a
  fake or sandbox company.
- [ ] Notification dispatcher integration suite - cover acting-admin versus
  all-admin recipient rules, Postmark failure, bounded retry, and manual retry.

## Remaining Coverage

- [ ] Remaining relationship management - cover platform-admin authorization,
  organization creation with persisted readiness, organization summary
  derivation, readiness concurrency, service eligibility by organization kind,
  entitlement overlap and all effective boundaries, required
  completed-organization association for a
  pre-organization request, request state transitions, controller routing under
  one `/api` prefix, the development-only HubSpot simulator's production 404,
  platform-admin gate, path-specific organization/service validation, unique
  Deal replay rejection, the account simulator's Prospect/Customer/Partner and
  service validation, Company-plus-Deal replay rejection, `HubSpot` source
  mapping, and the guarantee that simulation or approval alone creates no
  organization, invitation, entitlement, order, or Trial Project. Cover the
  separate approved-request account-creation endpoint, including supported
  request type/kind validation, duplicate-name and stale-version rejection,
  durable request association, Pending readiness, and the guarantee that it
  creates no invitation or entitlement and does not mark the request applied.
- [ ] Remaining relationship management persistence - cover audit
  actor/time/version stamping, existing-organization readiness migration
  default, and request-number uniqueness.

- 2026-07-15: portal hardening verification ran `dotnet test
  backend/PhaenoPortal.slnx --no-restore`; all 66 tests passed. The rollback-only
  PostgreSQL reference journey also passed with approved-request service
  matching and history-preserving entitlement end coverage.

- 2026-07-14: order-management implementation verification ran `dotnet test
  backend/PhaenoPortal.slnx --no-restore`; all 63 tests passed.
- [ ] Tenant curated data - add selected-organization missing/invalid cases,
  deactivation denial, and non-admin download-history denial. The reference
  journey covers cross-tenant non-discovery, revocation, individual/archive
  audit records, and organization-admin history.
- [ ] Production policy - cover synthetic rejection and empty production
  file-kind/scanner configuration at readiness, publication, eligibility, and
  grant boundaries.
- [ ] Advanced provisioning HTTP workflows - cover organization creation with
  optional grants, retry, exact-version upgrade, retirement, catalog removal,
  bulk revocation, durable notice dispatch/retry, and retired-grant access.
- [ ] Governance HTTP workflows - cover source-wide quarantine, publication
  denial during an open incident, internal-note non-disclosure, unchanged-content
  clearance, unsafe withdrawal, investigation-purpose audit, reminders, and both
  attestation sources with database-backed authorization coverage.

## Requested Execution Log

- 2026-07-18: one-open-protocol-candidate lifecycle verification compiled the
  complete solution, including updated domain and PostgreSQL journey coverage,
  with zero warnings and zero errors using an isolated output path while the
  local API was active. `dotnet ef migrations has-pending-model-changes`
  confirmed that the string-backed status and lifecycle operations require no
  schema migration. Backend tests were not requested and were not run.
- 2026-07-18: system-owned Lab identifier verification ran `dotnet build
  backend/PSeq.Operations.slnx -c Release --no-restore`; all projects,
  including the updated test sources, compiled with zero warnings and zero
  errors. The Debug build could not replace assemblies held by the active
  Visual Studio/IIS Express session. Backend tests were not requested and were
  not run.
- 2026-07-18: Web Operations unsubscribe and demo-completion lifecycle changes
  passed the full solution build with zero warnings and zero errors. The
  additive migration was generated and applied to the local `phaeno_ops`
  development database. Backend tests were not requested and were not run.
- 2026-07-17: the additive Phaeno-admin Web Operations dashboard read endpoint
  passed a full solution build with zero warnings and zero errors by using an
  isolated output path because the normal Debug assemblies were locked by the
  active Visual Studio/IIS Express session. Backend tests were not requested
  and were not run.
- 2026-07-16: barcode completion verification ran the full Release backend
  suite with the local PostgreSQL reference connection enabled; all 113 tests
  passed with no failures or skips. A separate Release build completed with
  zero warnings and zero errors. Coverage now includes POMS allocation and
  checksum normalization, submitted/derived scan context, reasoned successful
  and failed label attempts, non-incrementing failures, and duplicate-safe
  batch membership.
- 2026-07-16: database-backed Lab verification ran the five provider/projection
  and five Commercial handoff/operator PostgreSQL tests together against the
  migrated local `phaeno_ops` database; all 10 passed. The complete focused Lab
  run passed 37 of 37 tests, and the full backend regression run passed 107 of
  107 tests with no failures or skips. The new rollback-isolated operator
  journey exposed and fixed new-aggregate state tracking during authorization
  amendment, optional Lab text rejecting `null`, a zero-service test fixture,
  and formatting-sensitive JSON comparison. PostgreSQL reference classes now
  run serially to avoid invalid cross-fixture serialization races.
- 2026-07-16: the Commercial-to-Lab handoff slice added four opt-in PostgreSQL
  controller scenarios and ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; all projects compiled without
  warnings or errors. Test execution was not requested and was not run.
- 2026-07-16: the Lab role-authorization slice added shared request/session
  capability policy and focused unit coverage, then ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; all projects compiled without
  warnings or errors. Test execution was not requested and was not run.
- 2026-07-16: the Lab projection-coverage slice added the fifth opt-in
  PostgreSQL conformance test and ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; all projects compiled without
  warnings or errors. Test execution was not requested, so the new database-
  backed scenario was not run.
- 2026-07-16: Lab Operations completion verification ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore`; the solution, including the new
  domain and test sources, compiled without warnings or errors. The three
  completion migrations were generated and applied successfully to the local
  `phaeno_ops` development database. Automated tests and opt-in PostgreSQL
  provider conformance tests were not requested and were not executed.
- 2026-07-16: clean-baseline verification ran `dotnet build
  backend/PSeq.Operations.slnx --no-restore` and `dotnet test
  backend/PSeq.Operations.slnx --no-build`; the build completed without warnings
  or errors and all 69 tests passed with no skips or failures. The rebuilt local
  Development database bootstrapped successfully, `/api/health` returned HTTP
  200, and the PostgreSQL reference journey passed while preserving exact table
  counts after rollback.
- 2026-07-14: completion-slice verification ran `dotnet test
  backend/PhaenoPortal.slnx --no-restore`; all 48 tests passed with no skips or
  failures.
- 2026-07-14: next-slice verification ran `dotnet test
  backend/PhaenoPortal.slnx --artifacts-path backend/.tmp/reference-artifacts`;
  all 45 tests passed. Isolated artifacts avoided the app DLL held by the
  active Visual Studio/IIS Express session.
- 2026-07-14: the PostgreSQL reference journey passed against the configured
  development database. Fixture rows were rolled back and temporary managed
  storage was removed.
- 2026-07-14: implementation verification ran `dotnet test
  backend/PhaenoPortal.slnx`; all 43 tests passed. The existing lowercase
  `initial` migration-name compiler warning remains unchanged.
