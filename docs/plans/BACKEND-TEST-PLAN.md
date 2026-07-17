# Backend Test Plan

Keep this file updated as backend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `backend/test/PhaenoPortalMetadataTests.cs` - `HealthMetadataIdentifiesTheApi`.
- [x] `backend/test/PersistenceTests.cs` - `PSeqOperationsDbContextMapsEveryCurrentEntityToCommercialSchema`.
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
  milestones, protocol activation, QC-gated material consumption, and
  customer-safe exception separation.
- [x] `backend/test/LabOperationsAuthorizationTests.cs` - exact additive
  Operator, Supervisor, Protocol Administrator, Scientific Reviewer, and Lab
  Operations Administrator capabilities; platform-administrator bootstrap;
  inactive-assignment filtering; external-user denial; disabled-user denial;
  explicit role matching; and `/api/session` capability projection.
- [x] `backend/test/PersistenceTests.cs` - Commercial and Laboratory assembly
  schema ownership, all 22 Laboratory mappings, and no Laboratory foreign key
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
- [x] `backend/tools/PSeq.Operations.ReferenceJourney` - controller-level
  authenticated PostgreSQL journey covering approved service-request source
  enforcement, rejection of an onboarding-only source, usable entitlement
  derivation, history-preserving entitlement end, synthetic source authoring,
  authoritative managed upload/scan, readiness, immutable snapshot/checksum,
  publication, eligibility, idempotent exact-version Prospect assignment,
  tenant list/detail and file/archive downloads, audit history, cross-tenant
  non-discovery, revocation, transaction rollback, and temporary-file cleanup.

## Deferred Tests

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
- [ ] Complete Lab Operations API - cover atomic quote-acceptance authorization,
  cancellation handoff, receipt/accession and
  lineage validation, protocol lifecycle and pinned execution, QC/expiry/
  calibration gates, cross-order batching, sendout custody, exception
  resolution, scientific approval, and optimistic concurrency.
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
- [ ] Invitation endpoints - cover create, resend cooldown, pending replacement, inactive organization rejection, disabled user rejection, and active membership rejection.
- [ ] Membership endpoints - cover deactivate, leave, promote, demote, cross-org denial, Phaeno-org denial for customer admins, and last-admin protection.
- [ ] Platform lifecycle endpoints - cover organization deactivate/reactivate, user disable/reactivate, platform-admin-only access, and last-platform-admin protection.
- [ ] User read/list endpoints - cover self read, platform read, org-admin organization list, active-default filtering, inactive include filter, and forbidden cross-org access.
- [ ] Invitation acceptance/decline endpoints - cover verified email match, token hash lookup, single-use behavior, expired/revoked/declined rejection, and membership activation.
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
  one `/api` prefix, and the guarantee that approval alone creates no
  organization, invitation, entitlement, or order.
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
