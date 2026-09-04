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

- [x] `backend/test/PSeqOrderToCashDomainTests.cs` - invitation retry and hard
  bounce transitions; derived full readiness versus permitted internal staging
  without an active Customer administrator;
  manual Blocked override; enforced and audit-only protocol author separation;
  result-package
  completeness, approval, release, correction, and withdrawal; invoice decimal
  arithmetic and append-only adjustment effects; partial allocation and
  overpayment/unapplied behavior; reconciliation balance and independent-actor
  approval in enforced and audit-only modes; retention warning/cutoff/grace/
  deletion/reissue; and production governed-result configuration validation.
- [x] `backend/test/MailgunInvitationEmailSenderTests.cs` - Mailgun form/API
  request and message-id correlation, locale-named embedded template rendering
  with HTML escaping, webhook HMAC verification, and production invitation
  configuration validation.
- [ ] PSeq order-to-cash PostgreSQL/API coverage - invitation webhook
  deduplication and out-of-order retry, durable dispatch concurrency, tenant
  isolation, pipeline idempotency, invoice-number uniqueness, serializable
  allocation/reconciliation conflicts, CSV duplicate import, exact decimal
  persistence, stage-eligible Company filtering, administrator-free pricing
  initiation with quote-issuance blocking until an approver is active,
  migration backfills, and forward-fix behavior remain required against a
  restored production-like database before shared activation.

- [x] `backend/test/FileStorageTests.cs` - local provider round-trip, checksum,
  deletion, oversize cleanup, feature-area separation, dependency-injection
  provider selection, and rejection of local storage in Production.
- [x] `backend/test/ReleasedDeliverablePolicyDomainTests.cs` - approved 30/5/5
  defaults, positive whole-day validation, warning-before-retention validation,
  partial organization inheritance, invalid resolved-policy rejection,
  monotonically versioned revisions, reasoned deactivation history, immutable
  effective-value/source snapshots, exact UTC deadline calculations, and
  cross-organization override rejection. The tenant-safe package projection is
  also checked to expose dates without policy configuration history.
- [x] `backend/test/PersistenceTests.cs` - released-deliverable global-policy and
  organization-override schema ownership, filtered active-version uniqueness,
  immutable release-target snapshot uniqueness, optimistic-concurrency tokens,
  and restricted organization, policy, lab-result, and assembly-output
  relationships.
- [x] `backend/test/OrderManagementDomainTests.cs` - repeated file and package
  release attempts preserve the first release timestamp used by retention.
- [x] `backend/test/PersistenceTests.cs` -
  `PSeqOperationsDbContextMapsWebsiteEntitiesToWebsiteSchema` and the
  all-entity schema assertion cover the Website-owned tables in the shared
  portal context.
- [x] `backend/test/WebsiteApiTests.cs` - sitemap URL discovery,
  accent normalization, single-pass stemming for scientific terms,
  hyphenated-term highlighting, and rejection of
  HTML-page-title-only, hidden-result-title-only, hidden-summary-only, and
  search-keyword-only false positives; all-term visible/source eligibility;
  PDF-only landing matches and source-dependency signaling;
  visible-before-PDF snippet selection, source-aware ranking, and exclusion of
  index-only text from the public Website response; Preview/production Lucene
  index isolation, rejection of a shared index path, and preview-proxy key
  comparison; locale-isolated English, Arabic, French, Spanish, Simplified
  Chinese, Japanese, German, and Italian indexing; Arabic diacritic
  normalization; French, Spanish, German, and Italian stemming; dependency-free
  CJK n-gram matching; regional locale normalization; and unchanged English-default queries. The locale-focused
  additions are created but have not yet been executed.
- [x] `backend/test/WebsiteDocumentTextExtractorTests.cs` - deterministic
  two-page PDF reading order, extracted-character limits, and malformed-PDF
  failure classification for the PdfPig implementation.
- [x] `backend/test/WebsiteCrawlerTests.cs` - one-record document mode,
  same-origin source enrichment, external-origin/prefix/redirect/MIME/robots/
  size rejection, encrypted/malformed/image-only/unavailable/excessive-text
  fallback, hard extraction timeout, unchanged ordinary section indexing, and
  successful mixed valid/invalid publication rebuilds, and separation of
  hidden section metadata from extracted destination-visible text; nested
  heading wrappers retain destination-visible section content such as
  biomarker names and evidence attributions without leaking into the next
  section; unanchored nested headings remain part of their indexed parent
  section; section records retain the page's published document type for result
  labeling and icons. Added locale coverage verifies `<html lang="ar">`
  propagation and prevents an Arabic landing record from indexing its linked
  English PDF; these additions have not yet been executed.
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
  updates, protocol name/description edits that preserve the immutable key,
  irreversible independent approval, replacement of the prior Approved
  version, discarded-version history, and illegal post-discard
  transitions; plus service-workflow service-key normalization,
  Draft-to-Production lifecycle and immutability, conditional-stage validation,
  and exact work-order workflow-version pinning.
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
- [x] `backend/test/ClerkVerifiedEmailResolverTests.cs` - `IsVerifiedReadsVerifiedEmailFromClerkWhenClaimsOmitEmail`.
- [x] `backend/test/ClerkVerifiedEmailResolverTests.cs` - `IsVerifiedRejectsAClerkEmailThatIsNotVerified`.
- [x] `backend/test/ClerkVerifiedEmailResolverTests.cs` - `IsVerifiedUsesMatchingVerifiedClaimsWithoutCallingClerk`.
- [x] `backend/test/AccountDomainTests.cs` - guarded external-identity relinking
  rejects an unexpected prior Clerk subject and accepts only the exact expected
  development-to-production replacement.
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
- [x] `backend/test/OrderManagementDomainTests.cs` - required and normalized Lab
  Job names, required and normalized job-level storage and safety values,
  shared-versus-mixed biological-source validation and normalization, trimmed
  optional Job notes, eight-character mixed Job numbers with ambiguous-
  character and offensive-fragment rejection, laboratory request/quote
  transitions, immutable request revisions, sample stages, quote expiry,
  price-proposal validation, frozen proposal metadata, approval-as-proposed,
  and reason-required price amendment.
- [ ] Laboratory pricing-profile controller coverage - prove an authorized
  Customer administrator may create a draft with no sample records, receives a
  unique generated Job number, must supply a case-insensitively unique Job name
  plus a complete source-count composition, storage, and safety profile, and
  may save optional Job notes and an optional positive two-decimal USD unit-
  price proposal with Customer-safe context. Prove submission requires zero sample records,
  inserts the first immutable request revision rather than treating it as a
  stale update, and retains tenant, role, duplicate-name, limit, idempotency,
  and genuine stale-version enforcement. After quote acceptance, prove manual
  and CSV sample entry use the server-owned `extracted_rna` material type and
  `tube` quantity unit and cannot be finalized until identifiers and source
  counts exactly comply with the accepted Job profile.
- [ ] Laboratory proposal-review controller coverage - prove quote issuance
  binds the designated `pseq-lab-service` line to the requested specimen count,
  records the source request revision, proposed-price snapshot, reviewer,
  decision type and time, requires an internal reason for an amended proposal,
  blocks proposer self-review when dual control is enabled, and leaves Jobs
  without proposals backward compatible. Prove incomplete billing does not
  block quote issuance or acceptance; a complete Finance-approved profile
  calculates and freezes quote tax (including a valid zero-tax decision), while
  an incomplete profile produces a pre-tax quote and defers the system tax
  calculation and billing snapshot until invoice issuance. Invoice issuance
  remains blocked until the current billing and tax profile is complete and
  Finance-approved.
- [ ] Unified Commercial intake query - prove `activeIntake` returns only
  pre-acceptance Customer laboratory, Partner kit-review, and Data Assembly
  pricing states and excludes held, accepted, or executing work. Held work
  remains governed by the separate Attention queue.
- [ ] Order-entitlement and Phaeno-recipient controller coverage - prove an
  effective, `Ready` PSeq Lab Service entitlement and active offering are
  required for Customer Job creation/submission/acceptance and Phaeno Job
  initiation/quote issue; an ended entitlement blocks new Jobs without
  silently invalidating an accepted snapshot. Prove Phaeno quote preparation
  sends no Customer notice, quote issue/revision targets every active eligible
  Customer administrator and fails when none exists, acceptance establishes
  the acting administrator, ordinary and high-impact fan-out remains distinct,
  and an early or unmatched package cannot enter the Customer order receipt or
  Lab-authorization path.
- [x] `backend/test/OrderManagementDomainTests.cs` - negotiated reagent price
  snapshots, effective quantity rules, destination restrictions, immutable
  placement confirmation, approved substitutions, partial shipment, and
  partial cancellation behavior.
- [x] `backend/test/OrderManagementDomainTests.cs` - assembly input-revision,
  quote, placement, and processing continuity.
- [x] `backend/test/OrderManagementDomainTests.cs` - operational-file scan and
  release gating, separate lab/assembly credit decisions, configurable quote
  validity, stable manual journal-entry source creation without changing the
  balance, failed-notification manual recovery, and recovery of an abandoned
  `Sending` notification only after its claim lease expires.
- [x] `backend/test/SampleShippingDomainTests.cs` - packet-barcode allocation,
  scanner framing and checksum rejection, deterministic compatibility and
  mandatory split rejection, effective revision boundaries, and immutable
  packet snapshots with void/replacement identity; supplier-tube barcode
  normalization, exact return-kit tube-count enforcement, tube-to-sample
  assignment, and supplier-barcode adoption by a submitted Lab container.
- [x] `backend/test/RelationshipManagementDomainTests.cs` - an approved request
  authorizes only its associated organization and requested service,
  onboarding-only requests cannot source service entitlements, and entitlement
  end reasons are required and retained; an existing entitlement can become
  Ready and attach its approved source without changing service identity;
  service eligibility is covered for Customer, Partner, Prospect, and Phaeno
  organizations.

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
  controller-path coverage proving an authorized Phaeno user can initiate an
  active Customer's price-bearing Job as an immutable submitted revision in
  `QuoteInPreparation`, the exact same initiation key/request replays one Job
  and one idempotency record, missing no-PHI attestation is rejected without
  creating a Job, an unrelated specimen-priced catalog item cannot satisfy the
  designated laboratory-service quote line, quote issuance requires neither a
  QuickBooks Customer link nor a completed billing profile and creates no
  QuickBooks estimate/outbox work, the shared idempotency boundary
  preserves replay status, rejects payload mismatch, and rolls back an
  intermediate business save, quote acceptance opens sample-roster preparation
  without creating Lab work, and roster finalization atomically creates and
  idempotently replays the Commercial authorization, Lab work, specimen, and
  shipping records. Provider
  rejection rolls the finalization back even after an intermediate save,
  accepted cancellation updates Commercial and Lab together, and started Lab
  work vetoes the decision without partially approving it. The rollback-
  isolated operator journey assigns additive Lab roles
  and exercises immutable-key protocol metadata editing,
  one-Draft protocol enforcement, Approved protocol replacement,
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
  Customer/Phaeno identities and removes its Commercial, Laboratory, shipping,
  account, idempotency, notification, and audit records. All thirteen sources
  compiled with zero warnings or errors on 2026-08-27; tests were not requested
  and were not run.
- [x] `backend/test/SampleShippingPostgresTests.cs` - opt-in authenticated
  controller/PostgreSQL coverage for destination, sample-type, and combination-
  rule revisions; active-rule overlap rejection; return-kit registration and
  fulfillment; global supplier-barcode uniqueness; tenant-scoped assignment,
  correction history, and non-discovery; frozen destination, instruction,
  manifest, and tube-crosswalk snapshots; CSV crosswalk output; concurrent
  first-packet uniqueness; malformed, unknown, voided, mismatched, expected,
  and repeated packet-plus-tube scan outcomes; exact registered supplier-
  barcode adoption at Lab accession; and repeated-accession denial. The fixture
  uses `PSEQ_OPERATIONS_REFERENCE_CONNECTION`, verifies a fully migrated
  database, and removes its run-specific shipping, Lab, account, configuration,
  and audit records. The suite passed against the local `phaeno_ops`
  development database on 2026-08-18.
- [x] `backend/tools/PSeq.Operations.ReferenceJourney` - controller-level
  authenticated PostgreSQL journey covering approved service-request source
  enforcement, rejection of an onboarding-only source, usable entitlement
  derivation, history-preserving entitlement end, synthetic source authoring,
  authoritative managed upload/scan, readiness, immutable snapshot/checksum,
  publication, eligibility, idempotent exact-version Prospect assignment,
  tenant list/detail and file/archive downloads, audit history, cross-tenant
  non-discovery, revocation, transaction rollback, and temporary-file cleanup.

## Deferred Tests

- [ ] Development invitation sign-in link - cover Development-only endpoint
  registration, authorized pending-invitation token rotation and audit without
  raw-link persistence, inactive/non-pending rejection, tenant denial, and the
  production not-found boundary.

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
- [ ] Public Website intake language metadata - cover contact and demo-request
  submissions with canonical locales, supported regional variants, omitted
  values, and unsupported values; verify canonical persistence for both tables
  and the backward-compatible `en-US` fallback. Cover technical-brief Mailgun
  template selection and localized `technicalBriefPath` resolution for every
  supported locale, including the legacy single-URL fallback.
- [x] CRM domain foundation - cover Company normalization, validation, and
  record-preserving lifecycle; Contact normalization and merge identity; Lead
  qualification/conversion identity; Pipeline terminal rules; Opportunity
  close/reopen behavior; Task state; immutable Portal activities; typed custom
  fields; and effective-dated Company/Contact history, including the
  Company-specific job title. Company access-scope uniqueness and transfer
  during a merge are also covered. The focused tests are maintained in
  `backend/test/CrmCompanyDomainTests.cs`.
- [x] Controller route materialization - build the complete MVC controller
  endpoint collection so reserved route-token conflicts and other startup-time
  route-construction failures are caught before runtime. Coverage is maintained
  in `backend/test/ControllerRouteTests.cs`.
- [ ] Remaining first-party CRM foundation - cover Company API authorization,
  list/search/pagination, duplicate-name handling, concurrency, audit and
  scientific-data exclusion; then Contact, multi-company contact
  association, Lead, Opportunity, configurable Pipeline/Stage, ownership,
  relationship-title projection and legacy-title migration,
  Activity, Note, Task, reminder, saved-view, custom-field, import/export,
  duplicate detection, controlled merge, search/report projection, optimistic
  concurrency, soft deactivation, authorization, field visibility, audit, and
  scientific/protected-data exclusion.
- [ ] CRM/Portal lifecycle - cover explicit Company Portal-access proposal,
  pending onboarding with no access, approval that creates exactly one internal
  tenant scope, direct Customer/Partner Company creation, designated-admin
  invitation, service entitlements,
  Trial Project and custom-work handoffs, Customer/Partner reclassification,
  offboarding review, idempotent retries, relationship-safe summary
  publication, reconciliation, and domain authority.
- [ ] CRM committed-sale publication - cover one relationship-safe summary per
  committed specimen, reagent, or assembly sale; no routine Opportunity
  creation; Company and originating-Opportunity associations when present;
  amount/currency/status/payment summaries; cancellation/refund history; retry
  without duplication; and POMS/accounting-system authority over CRM projections.
- [ ] Direct configured-price work - cover entitled Customer and Partner
  specimen placement, Partner data-assembly placement, ineligible/custom-work
  routing, immutable pricing snapshots, Partner downstream-identity omission,
  post-placement scientific validation, and cross-tenant denial.
- [ ] Complete Lab Operations API negative paths - extend the passing
  controller/PostgreSQL operator journey with hosted-HTTP unknown-barcode,
  Lab-owned commercial-order-to-work resolution before authorization and
  missing-authorization consistency checks, unified Commercial order-list type
  filtering, Lab-role authorization for the explicit kit, assembly, and shipment
  manufacturing API allowlist, denial of quote, cancellation, sample-shipping
  configuration, and other Commercial actions through the Lab namespace,
  lineage rejection, stale-version conflict, parallel protocol-candidate
  rejection, invalid draft/approval transitions, expired material, overdue
  calibration, wrong-work-order batch/custody, unresolved blocking exception,
  and cross-tenant HTTP/authentication scenarios. Also cover canonical
  marketed-service workflow uniqueness, ordered Required/Optional/Conditional
  stage persistence, workflow promotion with exact Approved protocol versions,
  historical protocol pinning, and rejection of a protocol
  or later stage outside the pinned workflow.
- [x] Completion-aware released-download foundation - create domain coverage for
  immutable `Started` to terminal transitions, successful retention counting,
  rejection of non-success counting, partial range success remaining
  non-counting, whole-package completion across every file, active versus
  expired lease projection, manifest file identity, concurrency-token mapping,
  and package-query indexes. The focused tests were created on 2026-08-19 but
  were not executed because test execution was not requested.
- [ ] Hosted completion-aware download API - prove Customer and Partner tenant
  authorization, transfer creation before storage open, normal individual and
  ZIP response completion, partial range and disconnected response behavior,
  bounded timeout reconciliation, first-terminal-writer concurrency, external
  projection privacy, and cross-tenant non-discovery through the real HTTP and
  PostgreSQL path.
- [ ] Global released-deliverable retention - cover validated global 30-day
  retention, 5-day warning-lead, and 5-day grace defaults; optional Customer-,
  Partner-, and Prospect-organization overrides with partial inheritance,
  required reasons and audit history; authorization denial for external users;
  resolution and source/version snapshot at package release; global or
  organization changes affecting only later releases; exact UTC calculations
  using 24-hour configured-day intervals across daylight-saving transitions
  with no midnight/end-of-day rounding; successful individual
  versus complete-archive download accounting; one authorized member download
  satisfying the organization without per-user completion; later membership
  change preserving that event; failed, cancelled, unauthorized, and internal
  Phaeno downloads not counting; no warning and standard-deadline access close
  plus atomic package-byte deletion queueing when all files were downloaded;
  download denial at the exact applicable deadline even while byte deletion is
  pending or retrying; a pre-cutoff file or archive lease finishing successfully
  after the cutoff and counting only on stream completion; strict denial when
  lease creation would commit exactly at the cutoff; partial file and archive
  streams counting nothing; failed, cancelled, disconnected, and timed-out
  leases not counting; denial of new, retry, range-resume, and archive requests
  at or after cutoff; an incomplete lease at the standard deadline activating
  grace despite later completion; simultaneous eligible leases delaying physical
  deletion only until every lease terminates or reaches its original expiry,
  without renewal, reopened access, changed grace/final dates, or a premature
  cleanup failure; an operational lease-duration change affecting only new
  leases; restart reconciliation to a non-counting terminal outcome with no
  resume right; emergency
  quarantine, withdrawal/correction, membership deactivation, and organization
  deactivation each revoking a matching active lease, stopping further stream
  delivery, recording a non-counting `Revoked` outcome, and not depending on the
  retention-worker interval; durable completion/revocation ordering where the
  first committed terminal transition wins, client time is ignored, and restored
  access permits only a fresh pre-deadline request; one de-
  duplicated warning to all active organization administrators, grace
  activation and notice, full grace despite a later download, and final-deadline
  access close plus atomic package-byte deletion queueing when any file was
  undownloaded; idempotent retries, notification failure without deadline
  extension, no-active-administrator urgent Operations work without deadline
  extension, authenticated package-detail links with no bearer secret,
  attachment, or direct download URL, authorization recheck on arrival,
  exactly one warning plus one grace email and no recurring reminders; delayed
  warning suppression when all files succeed before outbox creation, with no
  recall after outbox creation; warning-state clearance when all files are
  downloaded before grace; activated grace persisting despite later download;
  preservation holds protecting bytes without extending access, resetting the
  clock/notices, or delaying deletion after an overdue hold is released;
  correction immediately
  withdrawing the superseded package, independent old-package retention/
  deletion, a fresh effective-policy snapshot/clock/download state/notices for
  the corrected package, old downloads not satisfying the correction, retained
  metadata/audit, no customer restore operation, authorized regeneration only
  when source material exists, a new linked immutable reissue with Phaeno actor/
  reason and fresh effective policy, the deleted release remaining unchanged,
  permanent receipt generation before and after byte deletion, tenant admin
  access to downloader names plus attempt start/completion timestamps and
  outcomes, including a post-cutoff success's pre-cutoff authorization;
  ordinary-member status without member-level audit, exclusion of file contents/
  scientific values/internal notes/network telemetry/storage identifiers,
  distinct access-closed and actual byte-
  deletion timestamps, overdue cleanup escalation without renewed access,
  equivalent Portal/PDF data with PDF generation timestamp and represented
  state, no initial CSV route, and Trial/
  Customer/Partner frozen file-lineage snapshots. Cover sample-scoped mapping to
  non-PHI Customer sample ID, original submitted-tube supplier barcode, and
  Phaeno accession; complete included-sample membership for combined/project-
  level files; no false single-sample mapping; exclusion of derived-container
  barcodes; and tenant isolation.
- [ ] Prospect Trial Projects - cover idempotent commercial-only CRM request
  intake, rejection or exclusion of scientific fields from that boundary,
  POMS-owned scientific scoping, relationship-safe outbound milestones and deep
  links, dual approval with default CBO/COO authority, domain-specific delegate
  designation and revocation, primary-versus-delegate attribution, denial outside the
  authorized domain, retained actor/authority/reason/timestamps, both decisions
  still required under delegated coverage, rejection when one dual-authorized
  user attempts both affirmative decisions, two different acting users required
  for initial and amended scope versions, later delegate revocation preserving
  valid historical approvals, frozen scope/amendments, Prospect acceptance,
  versioned RUO/no-PHI affirmation at project acceptance and shipment
  confirmation, structured PHI/direct-identifier rejection, restricted hold
  without sensitive propagation into logs, audits, notifications, or CRM,
  blocked receipt progression/processing/release until authorized disposition,
  project-specific
  submit authorization, extracted-RNA-only validation, enforcement of each
  project's frozen approved sample allowance,
  deadlines/analyses, eligible shipping destinations, versioned detailed
  instructions, immutable packet allocation/void/replacement, scan-first
  read-only Lab-work resolution, partial receipt, schedule updates without a
  fixed turnaround SLA, member
  view-versus-submit behavior, configurable deliverable catalog with
  FASTQ/FASTA/BAM as
  the current default selection, exact deliverable/version snapshots at
  approval, catalog/default changes affecting only future projects,
  deliverable changes after approval requiring amendment/reapproval, default
  changes not rewriting approved projects, the package-retention clock starting
  only when the project's complete frozen result package is released, effective
  global-plus-Prospect-organization policy snapshot with no project-level
  override, result
  release without payment, replacement approval and
  original-sample lineage, exactly one restored slot after a Phaeno-caused
  processing failure, no automatic restoration for a Prospect-supplied sample
  problem, an explicit recorded Phaeno exception, no silent allowance rewrite,
  configurable 30-day residual-material default, immutable project-specific
  retention/disposition snapshot, future-only configuration changes, retain-
  until calculation at terminal closure, no automatic disposition, authorized
  exhaustion/destruction recording, pre-first-shipment return approval with
  destination/handling/payer, separate return tracking, post-shipment return
  denial, controlled-hold suspension, and rejection of material reuse without a
  separate written-authorization workflow,
  complete-package enforcement before `Completed`, a required reason for the
  `Closed incomplete` outcome, separate final CRM outcomes, required
  owner/date for nonterminal follow-up, denial of automatic conversion from any
  CRM outcome, explicit authorized POMS conversion, terminal states, CRM
  summary retry,
  conversion preservation without resetting or extending the frozen standard
  or final package-deletion deadline, byte deletion with retained project/
  result/audit history, no automatic organization deactivation on package
  deletion, rejection of deactivation while another active
  Trial Project, grant, or commercial relationship exists, explicit audited
  Phaeno closeout deactivation, retained internal estimated retail value and
  anticipated cost, no QuickBooks records or outbox work through the complete
  journey, continuity during QuickBooks unavailability, normal-order denial,
  and cross-tenant metadata/file/result isolation.
- [ ] Remaining sample-shipping hosted HTTP and Customer freebies - exercise the
  shared journey through the real ASP.NET authentication middleware and API
  envelope after an owning authorization can create the shipment; then cover
  one-time named-Customer promotional grant consumption, no-charge placement
  and Lab authorization atomicity, and absence of a payment gate or
  manufactured QuickBooks invoice by default.
- [ ] Clerk JWT authentication - validate issuer, audience, signature, and expiry with integration-level test coverage.
- [ ] Session/bootstrap endpoint - cover unauthorized, disabled, no active memberships, organization unavailable, and ready states with database-backed endpoint tests.
- [ ] Invitation endpoints - cover required invited first/last name, intended
  Phaeno Laboratory-role persistence, non-Phaeno Laboratory-role rejection,
  roleless-Phaeno-invitation rejection, create, resend cooldown, pending
  replacement, inactive organization rejection, disabled user rejection, and
  active membership rejection.
- [ ] Membership endpoints - cover deactivate, leave, promote, demote,
  administrative self-deactivation denial, cross-org denial, Phaeno-org denial
  for customer admins, and last-admin protection. Pure authorization coverage
  confirms that an administrator may deactivate another membership but not
  their own.
- [ ] Platform lifecycle endpoints - cover organization deactivate/reactivate,
  user disable/reactivate, self-disable denial, platform-admin-only access, and
  last-platform-admin protection. Pure authorization coverage confirms that a
  platform administrator may disable another account but not their own.
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
- [ ] Clerk Production bootstrap cutover - database-backed coverage for the
  production-only command, sole-linked-user guard, verified-email requirement,
  idempotent replay, audit event, and refusal when any other Portal identity is
  linked.
- [ ] Data provisioning HTTP host - extend the passing controller/database
  journey through the real ASP.NET authentication middleware and API envelope.
- [ ] Managed files - add endpoint coverage for configured file-kind rejection,
  scanner unavailable/rejected states, and missing-byte behavior. The reference
  journey covers authoritative checksum/size and isolated storage cleanup.
- [ ] Order-management authenticated HTTP/PostgreSQL journey - cover Customer,
  Partner, Prospect, Phaeno, cross-tenant non-discovery, optimistic concurrency,
  idempotency, file ownership, download audit, and outbox atomicity through the
  real API host. Include adding and reconciling Job biological-source rows on an
  existing draft without treating new child records as stale updates.
- [ ] Manual accounting API/PostgreSQL journey - cover Phaeno-only authorization,
  inclusive UTC date filtering, stable entry IDs, laboratory completion,
  assembly output approval, per-shipment reagent rows, source references,
  exclusion of historical provider-created documents, 366-day and 10,000-row
  limits, repeat-download non-posting, CSV formula neutralization, and cross-
  tenant non-discovery. QuickBooks adapter/webhook contract coverage is
  deferred with the integration.
- [ ] Notification dispatcher integration suite - cover acting-admin versus
  all-admin recipient rules, Mailgun failure, bounded retry, and manual retry.

## Remaining Coverage

- [ ] Remaining relationship management - cover authorized CRM and
  platform-admin boundaries,
  Company access-scope creation with persisted readiness, organization summary
  derivation, readiness concurrency, service eligibility by organization kind,
  entitlement overlap and all effective boundaries, required
  completed-organization association for a
  pre-organization request, request state transitions, controller routing under
  one `/api` prefix, first-party CRM Company/Opportunity correlation,
  path-specific organization/service validation, request idempotency, the
  Company proposal's Prospect/Customer/Partner and service validation,
  provider-neutral source mapping, and the guarantee that intake alone creates
  no organization, invitation, entitlement, order, or Trial Project. Cover
  atomic approval plus
  access-scope creation for Company onboarding/evaluation requests, including
  supported kind validation, duplicate-name and stale-version rejection,
  durable request association, Pending readiness, rejection of products or
  services on online-access intake, unchanged entitlements, and the guarantee
  that it creates no invitation or order and does not mark the request applied.
  Retain coverage of the legacy access-scope lookup as a deep-link recovery path.
- [ ] Guarded exact-name access-scope recovery - add focused PostgreSQL coverage
  proving the first attempt returns a confirmation candidate, the confirmed
  retry links only the same active, unlinked, kind-compatible scope, and
  changed, linked, inactive, or kind-mismatched candidates are rejected without
  mutation.
- [x] Customer Lab ordering eligibility - focused PostgreSQL coverage verifies
  that Phaeno initiation requires a current `Ready` entitlement, sends no
  Customer notice during quote preparation, permits pricing before Customer
  administrator activation, blocks quote issuance until that administrator is
  active, and then queues quote issue for all active Customer administrators.
  Canonical item identity/quantity and idempotent initiation coverage remain in
  the same reference journey.
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

- 2026-08-29: PSeq order-to-cash verification passed all 13 focused domain and
  persistence tests. The full solution passed 169 tests with 10 opt-in
  PostgreSQL tests skipped and no failures. The Release solution build passed
  with zero warnings and zero errors. EF Core reported no model changes after
  `AddPSeqOrderToCashGapClosure`. No database was migrated in this task;
  restored-production-like migration/backfill, webhook concurrency, and live
  PostgreSQL/API acceptance remain activation gates.
- 2026-08-07: added source coverage for the credential-free production
  `DisabledFileStorage` DI selection and its fail-closed storage behavior.
  `dotnet build backend/PSeq.Operations.slnx --configuration Release
  --no-restore` compiled all projects with zero warnings and zero errors.
  The focused Release `FileStorageTests` and `ApiResponseTests` run passed all
  12 tests, including HTTP 503 mapping. Its first run exposed and then corrected
  a Windows file-handle lifetime defect in the pre-existing local round-trip
  test; the storage implementation was unchanged.
- 2026-08-07: provider-neutral local/S3 file-storage verification ran `dotnet
  build backend/PSeq.Operations.slnx -c Release --no-restore` with an isolated
  artifacts path; all projects, including the new storage test source, compiled
  with zero warnings and zero errors. Backend tests were not requested and were
  not run. The S3 adapter was not exercised against a live production bucket.
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
- 2026-08-22: Job-profile-first pricing and post-acceptance sample-roster
  coverage was added for domain sequencing and strict CSV parsing, including
  text-preserved identifiers, quoted commas, single-source inheritance, and
  committed count/source mismatches. Follow-on hosted PostgreSQL coverage must
  exercise atomic CSV replacement, finalization rollback, authorization plus
  shipment creation, multi-tube accession, and legacy one-tube compatibility.
  The API and module projects compiled with zero warnings and errors; tests
  were not requested and were not run.
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
- 2026-08-28: Customer PSeq Lab Service CRM handoff-to-order verification ran
  the complete backend suite through isolated artifacts against the migrated
  local PostgreSQL database; all 240 tests passed with no failures or skips.
  Coverage includes atomic Order creation/request application, immutable source
  linkage, duplicate prevention, rejection while a linked Opportunity is not
  Won, idempotent initiation, quote creation, and cleanup-preserving Commercial,
  Lab, and shipping reference journeys.
- 2026-08-28: Opportunity identity verification built the API through isolated
  artifacts and ran the focused CRM domain suite; all 13 tests passed with no
  failures or skips. Coverage confirms the readable Opportunity Number format,
  1,000 generated values without duplication, and the controlled PSeq Lab
  Service/PSeq Kit product-interest domain. Migration
  `20260828234907_AddCrmOpportunityNumber` was applied successfully to the local
  development PostgreSQL database, including deterministic legacy backfill and
  the database unique index.
- 2026-09-01: the Company-as-canonical-customer change passed the Release API
  build and EF pending-model check. Migration
  `20260901162409_FoldPortalAccountsIntoCrmCompanies` was applied to the local
  development database. The Release backend suite passed 234 tests with no
  failures; 27 opt-in database tests remained skipped under the default test
  configuration.
- 2026-09-03: controlled service-workflow implementation verification compiled
  the Release API and test project through isolated output directories without
  warnings or errors. EF reported no model changes after migration
  `20260903160117_AddControlledLabServiceWorkflows`; that migration was backed
  up and applied to the local `phaeno_ops` database, and its three workflow
  tables were verified. Automated tests were not requested and were not run.
