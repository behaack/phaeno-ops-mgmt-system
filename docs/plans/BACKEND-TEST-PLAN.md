# Backend Test Plan

## September 25, 2026 — Kit readiness regressions

`LabOperationsCommercialHandoffPostgresTests.RetiredAssemblyOrInactiveKitComponentBlocksNewOrderingAndQuoteAcceptance` verifies that deactivating a kit component or retiring its approved assembly workflow removes the kit and Sample type from new-work choices, marks its administration detail unready, and blocks quote acceptance and draft submission without changing their statuses. Focused connected execution passed on a verified isolated PostgreSQL 18 database. `ShippingKitContentsPostgresTests.HistoricalContainerWithoutFinishedProductCannotBeActivatedForNewOrders` and `TransportationKitOrderingPostgresTests.WithdrawnPhysicalKitIsNotOfferedForDispatch` passed in earlier isolated focused runs. These cases complement, but do not replace, a full post-hardening connected suite or authenticated end-to-end acceptance.

The Commercial-to-Lab fixture now wraps initial configuration in one transaction and reads the unique PSeq catalog external ID before inserting. An incompatible pre-existing item produces a clear setup error with no partial synthetic organizations, users, or departments. Always verify the disposable target database name before connected execution; a case-sensitive connection-string substitution previously pointed two failed runs at local development instead.

## September 25, 2026 — Samples and shipping restart checkpoint

The replacement model removes Shipping assignments and kit compatibility records. New configuration uses one procedure per Sample type, at most one permanent Sample type link per Transportation kit, and one global Default Phaeno ship-to destination. The connected `SampleShippingPostgresTests` suite exercises Order, kit request, physical stock, shipment, packet, location inventory, and laboratory handoff behavior against an isolated PostgreSQL 18 database migrated through `20260925220000_RestartSampleShippingConfiguration`: 98 passed, 1 pre-existing backup/attachment scenario skipped. The common fixture creates an approved Lab step and kit assembly workflow, records exact bill-of-material use, and completes assembly before dispatch. The adjacent `LabOperationsCommercialHandoffPostgresTests` class passed 54/54 after its fixtures selected the required Sample type and configured a Default destination. Backend solution Release and Debug builds passed with no warnings or errors. This checkpoint supersedes the assignment-based fixture expectations and request-only test notes below; those sections remain historical records of earlier iterations.

## September 25, 2026 — Default destination audit

The isolated commercial-to-lab journey now configures the global Phaeno ship-to default in its disposable database and verifies sample-list finalization through laboratory authorization. Transportation-kit fixtures select the Job's Sample type and supply required kit packing details at an eligible effective time. The PostgreSQL fixture removes Sample types before their referenced procedures. `LaterKitRequestCannotRedirectAJobAfterItsFirstKitDispatch` covers a received first kit followed by another request with two otherwise compatible destinations; the second request stays on the Job's saved destination and rejects a redirect. The isolated journey passed, two connected kit flows passed, and the new route regression passed in a separate disposable local database; those generated databases were removed after each run.

## September 25, 2026 — Shipping procedure description

`SampleShippingProcedurePostgresTests.cs` carries an optional description through procedure create, revision and persisted read. The migration adds a 4,000-character non-null description with an empty default for earlier rows and was applied to the configured local development database. Release build is the static checkpoint; connected test execution remains request-only.

## September 25, 2026 — Shipping dependency hardening

`SampleShippingProcedurePostgresTests.cs` adds a new Sample type with no selected procedure and verifies that a new assignment is rejected. `ShippingKitContentsPostgresTests.cs` adds cases for a duplicate destination on one kit and an Active kit save after its chosen assignment is withdrawn. Active kit saves now resolve exact assignment and procedure availability at their effective time. Customer roster finalization rechecks that resolved configuration, and operational readiness includes current procedure availability. Release solution build is the static checkpoint; connected test execution remains request-only.

## September 25, 2026 — Procedure choice belongs to Sample type

The Sample type fixture selects its shared procedure. Assignment create and revision ignore a client-supplied procedure choice and inherit the type's current choice; `SampleShippingProcedurePostgresTests.cs` covers a null submitted assignment choice and a new Sample type revision choosing another procedure. Active kit combinations still require packing and temperature details when the current type chooses a procedure but a historical assignment lacks one. The nullable migration backfills only unambiguous families and was applied to the configured local development database. Release solution build and EF model check are static checkpoints; connected tests remain request-only. This supersedes assignment-level procedure expectations below.

## September 25, 2026 — One Sample type per named kit product

The kit catalog rejects new specifications that combine Sample type families and rejects revisions that change the product's family. New recommendation and stock choice reads exclude historical multi-type specifications while leaving their saved records readable. `ShippingKitContentsPostgresTests.cs` now covers many kits for one type, mixed-family create/revise rejection, and exclusion of a simulated historical mixed-type kit. A same-family revision across Sample type versions remains for a requested test checkpoint. The backend Release build is the static checkpoint; automated suites remain request-only.

## September 25, 2026 — One Sample type per PSeq order

The order API requires one currently Active PSeq Sample type for new Customer and Phaeno Jobs and stores the selected revision identity and material class. Existing orders without that selection remain readable. Pricing request snapshots include the selection; new shipping work resolves only its active family revision. Standard placement also checks offering support. Shipping rejects a mixed-type packet even when historical rules share a compatibility label, and packing reset pools only within one type family. `SampleShippingDomainTests` includes the mixed-type rejection. Backend solution Release build and EF pending-model check passed; automated test suites remain request-only.

Container compatibility resolution now anchors Customer Job shipments to the order's selected Sample type family and blocks mismatched shipment items. Transportation-kit supply reports the selected type name alongside its recommendation. Historical Jobs without a selection retain item-based lookup. Static build is the checkpoint; connected recommendation and mismatch cases remain for requested test execution.

The Job supply response filters its inventory-kit choices to the same compatible container-definition set used for recommendations and received-stock options. General location inventory remains complete. The order-creation and container-order save endpoints continue to enforce the current compatible set on the server.

## September 25, 2026 — Shared procedure required for new assignments

`SampleShippingProcedurePostgresTests.cs` asserts the API rejects a new assignment when the current Sample type has no shared procedure, regardless of a client-supplied assignment choice. The common PostgreSQL fixture selects an Active procedure on its Sample type, preserving coverage of other rules. An assignment revision inherits the type's procedure even when the submitted procedure ID is null; activation of a standalone draft also requires a procedure on the current Sample type. Historical standalone records and issued packets remain unchanged. Backend build is the static checkpoint; automated execution remains request-only.

## September 25, 2026 — Current shared shipping procedure

`SampleShippingProcedurePostgresTests.cs` now asserts that an assignment anchored to an earlier procedure revision resolves the newer Active revision in a fresh preview while its already issued packet snapshot remains unchanged. Packet issuance uses the same resolved instruction fields; missing Active procedure revisions block new resolution. Regression source is updated; automated execution remains request-only. The backend solution build is the static checkpoint.

## September 25, 2026 — Assignment revisions may change scope

`SampleShippingPostgresTests.cs` adds a PostgreSQL regression source for an Active assignment revision that changes destination and sample-type family while retaining the definition key, ending the predecessor and preserving its exact historical references. Creation and status changes lock all old and new scopes in stable order and keep overlap/version validation. The backend solution build is the static checkpoint; automated execution remains request-only.

## September 25, 2026 — Shipping procedure revision status

`SampleShippingProcedurePostgresTests.cs` covers an Inactive successor retaining the earlier Active revision, activation retiring it, an Active successor retiring its predecessor at creation, stale-version and administrator checks, and rejection of historical activation. Assignment creation and pending-assignment activation reject a superseded procedure even if legacy data still flags it Active. Regression source is updated; automated execution remains request-only. The Release solution build is the static checkpoint.

## September 24, 2026 — Shipping procedure deactivation

`SampleShippingProcedurePostgresTests.cs` covers platform-administrator authorization, stale-version rejection, exact-revision deactivation without a content revision, version increment, and duplicate-deactivation conflict. Assignment creation and activation acquire the same procedure lock as deactivation before checking approval. The regression source is added; automated execution remains request-only. The backend solution build is the static checkpoint.

The September 2026 manual UAT pack and its case scripts were retired after substantial workflow changes. Historical case IDs and results below describe their dated checkpoints; derive any new acceptance exercise from the current product and code. Automated regression coverage remains tracked here.

## September 23, 2026 — Tube-label scan-back

The label-print PostgreSQL cases now send the exact physical scan for successful POMS label prints and reject a wrong scan without recording success. New generated tubes are expected to remain `LabelPending` through failed prints and become `Available` only after a matching scan-back; existing saved status values are unaffected. Failed attempts still require a reason and preserve the print count. The solution build passes; these modified database cases were not run at this checkpoint. Physical DataMatrix decoding and label adhesion remain bench acceptance, not API evidence.

## September 23, 2026 — Exact transfer and dashboard follow-up

`ExactDecimalQuantityTests` covers representable inputs, rejected rounded inputs, and source/destination balance precision. The sequencing handoff regression exercises `quantityText`, ambiguous and invalid input rejection, exact transferred/remainder values, and identical replay. The preparation PostgreSQL journey exercises text and legacy numeric input together and rejects mixed or unrepresentable input. `CustomerLabDashboardCandidateQueryTests` checks PostgreSQL translation; the governed result dashboard regression retains complete-download, partial-download, and missing-commit-evidence cases. The combined dashboard endpoint is covered for counts, paging, Department scope, and revoked access. The isolated API test-project build passed with zero warnings/errors; the 11 focused non-database tests and 6 selected PostgreSQL integration cases passed. PostgreSQL used a freshly migrated, generated loopback database, which was removed afterward. The normal API build was locked by Visual Studio/IIS Express, so the isolated build supplied the current source and migrations.

## September 23, 2026 — Material amounts, transfers and expiration

The owner authorized full database-backed release checks. Combined evidence covers **1,072 passing applicable cases and one intentional Windows symlink skip**, with zero unresolved failures. The initial full run had 1,067 passes and four failures; subsequent runs recorded 64 passed/two failed, 45 passed/one failed, and finally two passed. Every failed case has a later same-name passing result, including the newly added preparation test. This is combined evidence, not a clean full run. Corrections use mapped `VoidedAt` in the dispatch query, catalog-linked return-kit fixtures with shared suppliers, and the expected third physical sequencing tube in the operator journey. The new preparation case verifies both barcode paths, atomic multi-tube rollback, stale/wrong scan rejection, report-backed replay with no second debit, operational-hold resolution after source exhaustion and independent prepared yield. Final Release build has zero warnings/errors; EF model and migrations agree. Isolated loopback test databases were removed afterward. The [release record](../operations/material-tracking-release-20260923.md) supersedes the initial unexecuted checkpoint below.

Regression sources cover customer-declared per-tube amounts, required shipment declarations and immutable crosswalk snapshots; biological transfer quantities/remainders, explicit exhaustion adjustments, unknown amounts, repeated input before measured yield and attempt identity; reagent-lot exhaustion with actual consumption retained; and product-dependent expiration dates. Existing shipping fixtures now supply explicit amounts. New sendouts require sequencing-tube transfer evidence and retain a versioned physical manifest. Automated execution is not requested at this checkpoint; build results and remaining manual/database acceptance are recorded in the [owning plan](SAMPLE-MATERIAL-TRANSFER-PLAN.md).

Required persisted acceptance includes retry/concurrency rollback, source exhaustion with valid Start/Resume, manufacturer barcode collisions across stock/registered/Lab/tray identities, schema-2 sendout/lineage and retained schema-1 reads, unknown historical balances, frozen stock-product expiration, and no double debit on corrections. These cases remain unexecuted until separately requested.

## September 22, 2026 — Authorized release regression checkpoint

The owner requested a full database-backed release run. Combined evidence covers **1,046 passing applicable cases and one intentional Windows skip** for the Unix symlink fixture. The full PostgreSQL-enabled run completed 1,047 cases in 15m7s: 1,028 passed, 18 failed and one skipped. A focused 56-case follow-up passed in 2m47s with zero failures/skips; every original failure has a same-name passing result. This is combined evidence, not a single clean full run.

Corrected validation fixtures retain exact assertions: shipping timestamps use PostgreSQL microsecond precision, quoted handoff orders reference the actual active PSeq offering, and persistence checks enumerate all 11 migrations plus the Assembly job/event tables. The final Release solution build has zero warnings/errors and EF reports no model changes after the latest migration. Integration fixtures used isolated loopback databases, which were removed afterward; existing local and production records were untouched. The Unix-only case remains unexecuted because the available Linux environment has no .NET SDK. See the [release record](../operations/shipping-dashboard-release-20260922.md). Earlier unexecuted-suite notes below describe the implementation-time checkpoint and are superseded for current source.

## September 22, 2026 — Shipping kit contents

Regression sources cover multiple supplier products and arbitrary active product types, independent quantities, missing/duplicate/inactive products, empty drafts, and immutable revision labels after catalog changes. Update existing shipping fixtures with explicit contents and cleanup ordering. Compile only; automated execution was not requested.

## September 22, 2026 — Department dashboard metrics

`CustomerDashboardRequestsPostgresTests` covers full attention counts beyond the
first page, matching list filters, Department isolation and revoked summary
access. `GovernedResultRetentionPostgresTests` adds completed-Job visibility and
requires complete verified downloads of every artifact; failures, partial
completion and missing commit evidence cannot silently clear New results.
These PostgreSQL regressions are authored but have not been executed.

## September 22, 2026 — Customer dashboard, priced runs and sized tubes

`CustomerDashboardRequestsPostgresTests.cs` adds opt-in coverage for active-only
paging, pricing priority, tenant/Department boundaries, revoked access and refresh
after completion. `SampleSequencingRunTests` covers fixed one-per-sample pricing
and extra reserve tubes through CSV validation. `SampleSubmissionUnitsTests` covers
plain and sized tubes while excluding volume-only and unsupported units.
Regression sources are added; automated execution remains request-only.

## September 22, 2026 — Quote notification Job name

The Lab Service quote-issued notice now uses the Job name in its opening sentence
and retains the order reference on a separate line. No tests added for this copy
change. Existing quote issuance and notification-recipient coverage remains
unchanged; automated suites and live email delivery are not run.

## September 22, 2026 — Optional completion notes, required cancellation reasons

`RelationshipManagementDomainTests` covers optional/trimmed completion notes,
retained completion identity, approval and length validation, omitted DTO notes,
and blank/oversized cancellation rejection before decision mutation.
`CrmRequestCompletionPostgresTests` now exercises omitted/blank completion notes
against current and stale readiness and verifies completion actor/time. Automated
execution remains request-only; the PostgreSQL cases require the opt-in fixture.

## September 22, 2026 — Catalog families and unused-item deletion

Catalog family and deletion regression sources: CatalogItemPolicyTests and CatalogOfferingPostgresTests cover explicit family membership independent of names/references, legacy inactive plus specific active offerings, multiple-offering quote identity, active/ever-active/unknown-history deletion protection, and saved configuration references. Controller deletion retains platform-admin checks, version concurrency and restrictive foreign keys. Automated execution remains request-only; sources are compiled. Integration acceptance still includes independent-connection activation/delete and reference/delete races.

## September 22, 2026 — Optional Company approval notes

`RelationshipManagementDomainTests` now covers omitted/null/empty/whitespace approval notes for onboarding, evaluation, offboarding and service changes; retained decision/reviewer/time; trimmed notes and the 2,000-character limit; reasons required for every decline and other approval types; and invalid reasons leaving decision state unchanged. The decision DTO can deserialize an omitted reason. Sources are compiled by the solution build; automated execution remains request-only.

## September 22, 2026 — Company departments before online access

Authored `CrmCompanyDepartmentSetupTests` and `CrmCompanyDepartmentSetupPostgresTests` cover separate setup/access identities, merge retention/conflicts, platform-admin-only creation, inactive setup, generated references, editing, no requests/invitations/memberships/entitlements, rejection of direct activation, approval retaining department settings, and inactive-Company denial. Automated execution remains deferred under the repository request-only rule. Solution build compiles the regression sources.

## Sequencing assembly runner — September 22, 2026

New `LabAssemblyTests` cover actual start/stop and disposition, delayed/duplicate/conflicting outcomes, cancellation races and unstarted cancellation, timestamp precision, transient percentage expiry, no persisted progress fields, disabled production provider and rejection of combined-run completion counts. `LabAssemblyPostgresTests` adds an opt-in reference fixture for recovery without duplicate dispatch, a percentage stream producing no job-version/audit/event writes, restart recovery, failure retention, late-progress rejection and the unique active-attempt constraint. The simulated adapter exists only in the test project. Sources compile; test execution remains request-only. Remaining acceptance includes real provider idempotency/replay, S3 byte verification, input admission and independent-connection start/cancel/hold races, completed output import and provider/scientific acceptance.

## Shipping availability without content revisions — September 21, 2026

Regression sources: `SampleTypeStatusPostgresTests`, `SampleShippingAvailabilityPostgresTests`, `SampleShippingDomainTests`, and the issued-packet journey in `SampleShippingProcedurePostgresTests`. Cover same-ID/revision status changes, audit/version increments, admin-only access, stale requests, draft retention, scheduled activation, no fallback after retirement, exact destination references, assignment overlap and activation after an inactive destination becomes available. Issued packet instruction and manifest snapshots remain unchanged. No schema change. Sources compile with the solution; suites remain request-only and have not been executed for this change.

## Flexible sample/container packing - September 21, 2026

Added SampleShippingPackingInstructionsTests for regular ice, dry ice, cold packs, no cooling, distinct container amounts, missing or conflicting controls, authoritative approved procedures and legacy preservation. Added an additive procedure/compatibility migration. Sources compile; automated suites are not run because they remain request-only. Integration follow-up: issue a real local packet for each approved method and verify its snapshot survives configuration revisions.


## Managed scientific uploads — September 19, 2026

Added LabScientificFilesTests and LabScientificFilesPostgresTests for actual-byte download integrity, truncated/extra/altered content, temporary-file disposal, specimen/job/metadata scoping, supporting-document validation, private-key exclusion and customer-retention protection. Sources added; not executed (tests remain request-only). See [plan](LAB-MANAGED-SCIENTIFIC-FILES-PLAN.md).

## Company request history search and pagination — September 19, 2026

Owner limited this change to Completed / history. Add a read-only, platform-admin history endpoint with database filtering by company name, request number, summary, decision and completion notes; case-insensitive literal matching, newest-updated ordering with ID tie-breaker, 25-row pages, bounded page sizes and stale-page clamping. The active queues remain unpaginated and load only active requests; legacy API callers retain their existing response. History search/page stay in CRM route state; searching resets page, direct request links retain their exact target, and only history shows the search/paginator. No schema, permission or migration changes. Regression sources cover authorization, page boundaries, global search, empty matches, pinned requests and active/history separation. Automated suites remain request-only.

## Current sample-type revisions — September 19, 2026

See [owning plan](SAMPLE-TYPE-CURRENT-REVISION-PLAN.md). Coverage added for family-based previews, inactive/future exclusion, readiness, existing container compatibility, duplicate-family rules, missing effective revisions, and immutable issued packet snapshots. UI coverage verifies one named choice per family and current revision readback. Manual acceptance: publish an approved successor, confirm rule/container/readiness continuity for new shipments and unchanged old packet content; an inactive or future successor must not interrupt current use. Automated suites remain request-only and were not run.


## Sample-sequencing runs — September 19, 2026

SampleSequencingRunTests covers one sample with 20 purchased runs versus 20 samples with one each, legacy defaults, immutable submitted scope, allocation totals and CSV validation. ConfiguredLabServicePostgresTests includes a one-sample/20-run pricing, commitment and sale-summary regression. Test sources compile; suites were not run (request-only). Manual/integration acceptance remains required for sequential successful attempts, duplicate selection locks, material-reuse confirmation, recovery attempts, result coverage per distinct producing attempt, and additional-sample quotes.

## September 19, 2026 — Department-led administration

Regression sources cover department-led onboarding/reconciliation, invitation acceptance in the same transaction, active/inactive membership and Department evidence, Department-specific readiness, standard/Kit role admission and replay, custom-work origin, and Trial acceptance/member and cross-Department denial. Company-wide permissions remain restricted. Automated suites were not requested or run.


## September 19, 2026 — Invited access edits and active access notices

InvitationAccessChangesPostgresTests.cs covers Department-only version increments; retained
invitation/link/expiry/delivery; no membership or email on edit; current preview and stale-review
acceptance; terminal, unauthorized, cross-Company, empty and stale edits; expired intent editing;
no-op stability; active Organization/Department changes without reinvitation; exact recipient
resolution after membership removal; no duplicate notices on no-op/rejected changes; and failed
transport followed by successful retry without reversing access. Source coverage compiled;
automated suites were not requested or run. Live provider delivery and recipient acceptance
remain separate. No schema changes or migrations.

## September 19, 2026 — Automatic Department references

Added DepartmentAccessPostgresTests sources for missing Code, server allocation, ignored legacy
Code payloads, inactive/legacy-numbered reservations, saved rename stability, existing GENERAL
and RESEARCH preservation, and audit creation. DepartmentAccessDomainTests covers immutable
references through rename. Existing administrator/permission/concurrency sources remain.
Full solution compilation passed with zero warnings/errors using temporary output to avoid the
running API's locks. Automated suites were not requested or run; concurrent database allocation
is serialized by a transaction-scoped Organization advisory lock but not runtime-tested here.


## September 19, 2026 — Request completion minimums

CrmRequestCompletionPostgresTests.cs adds administrator-only readiness access; missing and revoked active-admin rejection; successful onboarding closeout; exact source/current/Ready service requirements; stale entitlement rejection; and offboarding access deactivation. Existing relationship conversion remains covered by TrialClosureAcceptancePostgresTests. Suites are not executed without explicit request.

Automatic access-completion follow-up adds InvitationRequestCompletionPostgresTests for actual acceptance orchestration, non-admin exclusion, pending/cancelled/other-Company/Trial/service exclusions, recorded actor/time/notes and repeat-acceptance stability. CrmAutomaticAccessCompletionPostgresTests covers already-ready approval and idempotent reconciliation. Sources compile; suites remain unexecuted.

## Immediate traceability enforcement — verified September 19, 2026

**105 backend tests passed, zero failures/skips:** 104 lineage, scientific governance, Trial, retention, concurrency and commercial handoff/domain regressions plus one isolated legacy approval boundary test. New tests prove default-on enforcement for preexisting unlinked or unprofiled results, unchanged historical records, complete profiled replacement acceptance, and Trial approval/release rejection. Historical compatibility fixtures explicitly retain their original policy. Full solution build passes with zero warnings/errors. No migration/backfill or production activation occurred; see the [enforcement verification record](../testing/runs/2026-09-19-traceability-enforcement.md).

## Sample traceability — verified September 18, 2026

The [focused verification record](../testing/runs/2026-09-18-sample-traceability.md) supersedes the initial unrun notes below. **44 backend tests passed across the 43-case regression run and one isolated restore rehearsal, zero failures/skips in the final runs**. Coverage includes isolated PostgreSQL result-to-reserve-tube attribution, shared preparation performance/report retries, metadata privacy and external-actor denial, immutable investigation reports, organization-scoped lookup, scientific evidence validation and 10,000-event cursor traversal. The continuation adds exact attachment coverage/size/checksum checks, missing and altered files, same-batch noncoverage denial, corrupt-manifest rejection, and native database/private-file restoration; see the [restore record](../testing/runs/2026-09-18-investigation-restore.md). Solution build passes. No model or migration changes were needed for the continuation. Real producers, hosted recovery, retention/holds and policy activation remain gates.

## Step performance slice — initial authoring checkpoint, superseded above

`LabStepPerformanceTests` covers explicit self/now capture, offset and minute-preserving late entry, required reasons, future/invalid/offset-free rejection, legacy unknowns and unchanged null-field serialization, correction identity preservation, repeats and skip/coverage guards. `LabPreparationPostgresTests` now submits performance in its shared QC journey, checks invalid late-entry rollback, equal member/receipt timestamps and actor attribution after the existing report retry. These are authored cases, not passing-test evidence; execution remains pending. Actual physical times, independent performer verification, on-behalf entry, time/performer amendments and late-entry review policy are outside this slice.

Checkpoint: the full backend solution build passed with zero warnings/errors; EF reports no model changes since the last migration. Frontend typecheck, changed-file lint, documentation generation/check (56 guides) and diff/link checks passed. Automated suites and browser acceptance were not executed. No migration, Git publication, deployment or production activation occurred for this slice.

## Sample traceability — phase 1 authored, September 18, 2026

`LabResultLineageTests` adds compatibility/default-off release, required analysis/locator, sticky voluntary binding, correction predecessor/reason, immutable input sets/resource evidence, restrictive links and immutable bindings. `LabResultLineagePostgresTests` adds a rolled-back persisted failed-first/reserve-success journey through paired sequencing inputs, analysis, package/legacy release and the restricted lineage reader, plus wrong specimen/organization, missing input, changed replay and checksum rejection. `PersistenceTests` now expects all 51 Laboratory entities, including the three new lineage tables. These cases compile; tests were not executed because the implementation request did not request test execution. The full backend build and additive local migration are implementation checks, not passing-test evidence.

Remaining coverage is specified in [Sample traceability acceptance](SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md#12-acceptance-and-verification-matrix), especially ST-19/ST-20. Execute the authored cases and existing result/Trial/preparation/retention regressions before rollout. Complete independent-connection races, all controller authorization/bypass cases, full resource snapshot evolution, actual provider/physical handoffs and phase-2/3 performed-time, preservation/restore and report cases separately. No full traceability acceptance claim is made.

## Service catalog scientific consolidation (2026-09-18)

`ConfiguredLabServiceDomainTests` covers distinct required sample assignments, immutable assignment and legacy/new snapshot round trips. `ConfiguredLabServicePostgresTests` adds parent immutability, duplicate definition rejection, no availability from material text alone, and frozen supported revision IDs; configured-order fixtures now assign an explicit RNA type and cleanup removes the new children. These cases compile but were not executed (tests not requested). The additive migration was applied to verified local `phaeno_ops`; the Release solution build and pending-model check pass. Concurrent cross-family writes and rejection of a retired pinned type at authorization remain acceptance cases to execute before production release. No production migration occurred.

## September 18 jobs/settings release checkpoint

Release solution build passed with zero warnings/errors, and EF reports no model changes missing a migration. Automated suites were not requested or run; authored Jobs/forecast integration coverage remains unexecuted. See [release evidence](PORTAL-JOBS-SETTINGS-RELEASE-2026-09-18.md) for production migration and health results.

## Material lot identity matching (2026-09-17)

See [implementation plan](MATERIAL-LOT-PRODUCT-LINK-PLAN.md). Added domain/Postgres regressions for exact product/definition matching, unlinked and wrong-supplier assignment, immutable assignment, stale versions, configured prepared identity, and rejected wrong-lot consumption with no stock change. Updated material creation fixtures for required products and added frontend helper/schema checks for same-vendor wrong products, unlinked lots, prepared identity and unusable stock. Automated tests are authored/compiled but not executed. Build, typecheck, scoped lint, migration review and local read-only UI checks form this checkpoint; populated operational writes remain unverified.


## Shared output command checkpoint (2026-09-17)

Extended preparation PostgreSQL reference journey for multi-output atomic validation, duplicate/foreign members, invalid row quantities/unit/location, stale version, individual lineage/barcodes, no automatic physical confirmation, replay without duplicate containers/records, and existing-output rejection. Existing held-job/access-denied matrix includes outputs. Tests authored and compiled, not executed.

## Preparation report checkpoint - September 17, 2026

Added domain regression coverage for optional preparation reference, required output barcode and required resource confirmation. Extended the PostgreSQL journey for optional preparation-report omission/upload, metadata purpose, private-key redaction, covered tube count, authenticated download and idempotent replay. Existing scanned-upload behavior is reused. Tests authored, not run; connected preparation upload, retry, private download and backup restore remain acceptance checks.

## Automatic conditional-review skips — September 17, 2026

Added domain coverage for all-pass histories, missing prerequisites, empty coverage, historical Hold/Fail followed by Pass, unknown condition prose, existing review evidence, and stale evidence after correction. Extended the mixed-tray PostgreSQL journey to retain review when a tube is on hold, automatically skip for the remaining passing tube after explicit failure, verify coverage/audit metadata, and prevent duplicate skips on reconciliation. Existing validation/roles remain authoritative. Build includes these tests; execution deferred per repository instruction.


## Optional preparation QC reports — September 17, 2026

Added domain regressions for omission of the two exact synthetic file-reference captures while retaining QC and unrelated required captures. Extended the mixed-tray PostgreSQL journey with malformed file rejection, unclean scan rollback/cleanup, successful attachment and exact coverage, metadata redaction, retry without duplicate upload, changed-file idempotency rejection, protected download and wrong-batch/customer denial. The alternate journey still saves without a report. Solution build compiles these tests; execution is deferred per repository instruction.


## Automatic preparation specimen references (2026-09-17)

Add automatic specimen-reference tests for server-owned accession values across record/repeat/correct and legacy scopes, ignored client substitutions, distinct tube accessions, missing accession failure, skipped evidence and unchanged ordinary exception rules. Extend the mixed-job preparation journey to check customer sample references from original/replacement authorizations and persisted per-execution accession evidence. Build tests with the solution; execution deferred per repository instruction.

## Preparation specimen declarations — September 17, 2026

Extend the mixed-tray PostgreSQL journey fixtures/assertions to read biological source and multiline safety declarations from both original and replacement authorization snapshots, distinguish two jobs' specimens, and retain null when the second specimen has no safety declaration. Existing denied-reader coverage remains. Tests updated but not executed; Release build is the compilation checkpoint.

## Guided preparation and tray confirmation — September 17, 2026

LabPreparationPostgresTests now covers rejecting Start before assembly confirmation, persisted confirmation readback, rejection of assign/add/move/remove while confirmed, reason-required reopening, invalidation/reconfirmation, idempotent confirmation retries and rejection of reopening after Start. Existing workflow-decoupling coverage explicitly confirms before Start. Confirmation uses the existing audited command records and optimistic version guard; no migration. Tests updated, not executed; Release compilation is the checkpoint. Concurrent confirm/edit, stale-client recovery and closed-batch regressions remain part of requested acceptance execution.

## Eligible tube pagination — September 17, 2026

Extended preparation eligibility PostgreSQL assertions for one-item pages with distinct identities, correct eligible totals/page counts and filtered out-of-range page clamping. Existing exclusions and unpaged compatibility assertions remain. Eligibility now executes before counting and paging in the database. Tests added/compiled, not executed; populated translation, large-list and concurrent-list-change acceptance remains pending.

## Physical preparation tray identity — September 17, 2026

Domain coverage adds required tray identity before Start, trimming, batch-label rejection, populated-tray reassignment denial, empty-tray reassignment, running-tray locking and closed-history retention. Preparation PostgreSQL journeys now assign distinct physical trays before adding tubes; cross-batch active reuse is rejected. Concurrent assignment protection is provided by a transaction lock plus an active-only unique index; concurrent/reuse acceptance remains pending. Tests updated/compiled, not executed unless requested.

## Eligible tube freezer-box filter — September 16, 2026

Extended the preparation workflow PostgreSQL regression with distinct recorded boxes: trimmed/partial box filtering, tube/job query AND box filtering, exclusion of unreviewed tubes and whitespace-only reset. Filtering occurs before the existing candidate limit. Assertions added, not executed per repository policy.

## Service-based commercial jobs — September 16, 2026

Added PreparationSelectsWorkflowByServiceAndPreservesAttemptVersions and CommercialAuthorizationDoesNotRequireOrPinAWorkflow. Coverage: historical commercial v1 pin permits same-service v2 batch; wrong service/unreviewed tube excluded; actual attempt/stage v2 persisted while legacy pin retained; incompatible reservation excluded; standalone selection follows Production at selection time; retirement follows queued/started execution dependencies; authorization without a production workflow is idempotent and unpinned. Tests added, not executed per repository policy. Existing preparation lock, held/closed job and concurrency suites remain required before release.


## Administrator approval override — September 16, 2026

LabApprovalOverrideTests covers unchanged independent approval, required/trimmed/bounded reasons, self-approval with override, production use, immutable retired history and withdrawal clearing. LabApprovalOverridePostgresTests covers both controller paths with strict role enforcement: ordinary Protocol Administrator denial, standard self-approval denial, blank reason rejection, persisted actor/time/reason, stale protocol version rejection, DTO visibility, audit retention after workflow withdrawal and promotion with recorded overrides. Existing legacy self-approval production-denial tests remain. Tests added, not executed by request policy.

## Managed product types — September 16, 2026

Managed type persistence, seeded type references, reagent exclusion from kits, inactive-type assignment restrictions, uniqueness, stale updates and used-type kit-use protection are covered in SupplierCatalogPostgresTests. Tests updated/compiled, not executed.

## Supplier catalog and kit product snapshots — September 16, 2026

Added supplier-catalog PostgreSQL coverage for administrator-only access, normalized duplicate names/numbers, required descriptions, wrong-type/missing/inactive selections, stale edits and frozen kit descriptions. Existing shipping fixtures now prepare stock from catalog products. Tests compiled but not executed; requested verification remains build-only.

## Lab request submission and pricing review — September 16, 2026

Atomic lab request creation/submission and revision coverage is added in LabRequestSubmissionPostgresTests; domain coverage checks pending edits and issued-quote rejection. Existing manual quote coverage no longer supplies a Customer price proposal. Check idempotent creation, unchanged prior snapshots, fresh revisions, stale edits, withdrawal and no Lab authorization before acceptance. Tests are added/updated but not run (not requested).

## September 16, 2026 — Invitation-authorized identity setup

`ClerkInvitationRegistrationTests` covers exact-email existing-user lookup, silent provider invitation creation, revision-specific reuse, provider errors and unsafe URL rejection. `InvitationRegistrationPostgresTests` covers pending-token handoff without membership, no-store responses, revoked/expired/accepted/declined/replaced/inactive links, and revocation during the provider call. The approved focused run uses disposable PostgreSQL databases and simulated identity-provider responses; it does not create production identities or send email.

Focused verification: all 12 provider and PostgreSQL handoff cases passed on September 16, 2026.

## September 16, 2026 — Empty pipeline deletion

`CrmPipelineDeletionPostgresTests.cs` adds rollback-scoped coverage for admin-only access, stale versions, active/inactive empty deletion, default protection, active/inactive stages and retained closed/inactive Opportunity history. Tests added but not executed (not requested).

## September 16, 2026 — Opportunity summary and queue

`CrmOpportunitySummaryPostgresTests.cs` adds rollback-scoped coverage for more
than 25 records, per-currency totals, zero/unpriced amounts, empty stages, search,
pipeline isolation, inactive inclusion and stale-only/list count agreement.
Tests added, not executed (not requested).

## September 16, 2026 — Missing conversion Company name

`CrmLeadConversionPostgresTests.cs` adds rollback-scoped cases for missing/blank/
overlong names without conversion writes, trimmed saved names, duplicate entered
names, recorded-name precedence, existing-company linking and contact-only
conversion. Tests added, not executed (not requested).

## September 16, 2026 — Task editing and rescheduling

`CrmTaskEditingTests` covers rescheduling in each active status, overdue/due-soon
membership, reminder validation without partial mutation, and terminal
edit/owner/reopen denial. `CrmTaskEditingPostgresTests` extends the existing
rollback-scoped Commercial fixture for saved readback, version conflicts without
duplicate audit events, actor and before/after dates, rescheduled recurrence,
terminal history and revoked access. Tests added, not executed (not requested).

## Coordinated recovery rehearsal - September 15, 2026

The complete command-driven Lab journey can now opt into exporting its own synthetic disposable database and actual invoice/result bytes through `PSEQ_RECOVERY_EXPORT_DIR`. Export rejects non-loopback or non-generated databases and preserves ordinary database cleanup. The final exported journey passed; the real API then passed coordinated encrypted capture, fresh database/file restoration and authenticated matching-byte downloads in an owned Linux/systemd/Docker environment. All 26 unchanged backup safety checks passed, and an actual killed coordinator recovered its exact API through the independent watchdog. Production backup maintenance was separately activated successfully; actual overnight scheduled evidence remains pending. [Evidence and boundaries](../testing/runs/2026-09-15-sys06-recovery.md).

## Final manual and Change-quote acceptance - September 15, 2026

The final-three continuation adds disposable PostgreSQL journeys for correction/resubmission and independent pricing review; immutable incremental quotes; stale, expired, superseded and unauthorized decisions; new-only sample authorization/shipping; preserved started-work specimens; and combined amendment billing with completion replay. The retained two-person check is exercised. The existing open-opportunity handoff helper now creates and cleans up its own pipeline/stage instead of depending on shared seed data. [Full results and boundaries](../testing/runs/2026-09-15-final-three-acceptance.md).

## Remaining-case review — September 15, 2026

43 distinct backend checks pass across the remaining-case continuation, including authoritative terminal outcomes, current hold checks, failed-processing billability, invoice/PDF issuance and preservation, selected partial cancellation and contextual notice retry. The change-quote probe records ORD-03 as Fail. Tests use disposable loopback databases; no source/shared migration. [Case crosswalk](../testing/runs/2026-09-15-remaining-case-acceptance.md).

## September 15 scientific and workflow acceptance

New CRM request and Trial closure tests plus the strengthened command-driven Lab journey verify governed independent approval, separate release/exact-byte download, timing, same-notice retry, three-sample/multiple-library projections and Trial replacement/conversion. The partial Trial member archive is now executed and checked before complete release. Fixtures explicitly own missing seed prerequisites and preserve cleanup. Thirty focused checks plus the separate paid-held Kit check pass without skips; the same Lab journey passes again with its final all-samples/hold/rejection/withdrawal assertions. Two product gaps remain: missing Trial/result email links and incomplete partial Lab cancellation. [Crosswalk and test boundaries](../testing/runs/2026-09-15-scientific-ten-software-acceptance.md).

## September 15 ten-case shipping and accession acceptance

Three new `ShippingAcceptancePostgresTests` journeys cover durable same-notice failed/retried delivery to current administrators, full-capacity stock registration with incomplete/duplicate/excess/used identity denials, and a specimen split 9+9 through frozen packet correction, distinct dispatch/receipt, 18 exact-once accessions and derived-label failure/success/reprint history. All 28 focused backend checks pass without skips. Physical facts and transport/print confirmations are simulated. A schema-only disposable database was removed afterward; source business data and migrations were unchanged. [Complete case crosswalk and limits](../testing/runs/2026-09-15-shipping-ten-software-acceptance.md).

## September 15 session and role acceptance continuation

Two new disposable PostgreSQL journeys in `SessionRoleAcceptancePostgresTests.cs` verify pending-to-accepted additive Lab roles, ignored display/provider role labels, unauthorized/missing-session edits, fresh authorization after role changes, retained assignment history and stale-update rejection. The second rejects unauthenticated Company association without persistence, then verifies authorized save and duplicate denial. All 17 focused backend checks pass without skips, including identity and session regressions. ACC-06 remains open for live provider/browser execution. [Crosswalk and limits](../testing/runs/2026-09-15-session-role-acceptance.md).

## September 15 simulated account lifecycle acceptance

Two new disposable PostgreSQL journeys cover Company suspension/restoration, retained order/grant/invitation history, membership-only isolation and fresh acceptance using the original membership/Department assignment, employee disable/restore with preserved roles, and administrator self-disable denial. All 23 focused lifecycle, account authorization and session checks pass without skips. The shared invitation fixture supports selected scope and existing-user invitations; its original defaults remain unchanged. Final inspection confirms no disposable invitation databases remain. [ACC-05 crosswalk and limits](../testing/runs/2026-09-15-account-lifecycle-software-acceptance.md).

## September 15 simulated invitation acceptance and recovery

Four new `InvitationAcceptancePostgresTests` use newly created loopback disposable databases for real endpoint commits, actual dispatcher/template and simulated provider delivery, verified-email/Research membership, session/replay, resend/cooldown, revoked/expired/declined/invalid-Department guards, and signed hard-bounce deduplication/reissue. The 24-check focused run passes without skips; the four new checks also pass after strengthening the fixture to use the specified Phaeno platform administrator. No shared migration, real external send or existing UAT identity mutation. [ACC-01/02 crosswalk, results and limits](../testing/runs/2026-09-15-invitation-software-acceptance.md).

## September 15 simulated Website intake and delivery acceptance

Three PostgreSQL checks in `WebsiteIntakeAcceptancePostgresTests.cs` add rejected-CAPTCHA/no-intake and updates-only/demo isolation, real Mailgun-adapter failure/recovery with a separate simulated inbox, and inactive/active legacy eligibility plus actor audit. They share the existing notification class's transaction rollback fixture. All 14 PostgreSQL notification checks and the sender-failure unit check pass without skips. Five failed attempts remain after the same notice is recovered; captured sender URL/recipient fields and separate provider/inbox timestamps are retained. No real external send or product behavior change. [Full WEB-02/04 crosswalk and limits](../testing/runs/2026-09-15-website-intake-recovery-software-acceptance.md).

## September 15 approved simulated Kit batch

KIT-02–06 now pass the approved simulated software scope. Four additional PostgreSQL checks cover two-unit shipment admission/replay/source separation, different-product substitution decisions and member denial, extension/cancellation/repeat-draft/historical compatibility, and corrected-input release/member file and ZIP completion against the original invoice. The shared fixture now supplies download-attempt tracking and an optional member identity. The 13 Kit PostgreSQL plus six domain checks pass without skips; the strengthened substitution check passed a final targeted rerun. Real physical/scientific/provider acceptance remains open. [Full crosswalk and recovery notes](../testing/runs/2026-09-15-kit-batch-software-acceptance.md).

## September 15 included Kit input recovery

Three new disposable PostgreSQL checks cover included-input upload interruption/cleanup/replay, all non-clean scan states, file and metadata limits, confirmation/manifest gates, frozen purchased scope, one immutable submitted revision and expired-draft preservation. The shared fixture accepts the known loopback UAT source and injectable upload adapters while creating and removing only its own disposable databases. All nine Kit controller checks pass without skips. Bytes, scans and shipments are simulated; KIT-04 remains open under its original real-world criteria. [Evidence and remaining gate](../testing/runs/2026-09-15-kit-input-continuation.md).

## September 15 approved simulated completion of seven cases

The Product Owner approved simulated software acceptance for DAT-03–06, ACC-04, SYS-03 and WEB-03, preserving real scientific/provider acceptance as a separate gate. The final focused run passes 107 checks, and one additional focused monitoring-disabled test passes: **108 distinct checks, no skips**. Four new checks verify exact Lab/Assembly/Trial file and ZIP bytes, second-member credit, membership/Department revocation with non-revival, and quarantine denial without monitoring. Synthetic hashes match their bytes; commit/concurrency tests accept the existing loopback UAT source while retaining disposable-database cleanup guards. No shared schema or production application change. [Scope, results and crosswalk](../testing/runs/2026-09-15-seven-case-software-acceptance.md).

## September 15 managed files and governance recovery

Two focused PostgreSQL regressions pass without skips: reloaded governance investigation/reminder/recorded-attestation commands insert their three follow-ups and one reminder notice; an unconfigured sender records Failed with a retry time and no delivery timestamp. Each fixture rolls back. Connected evidence separately verifies actual ClamAV and storage faults/recovery, source-version/role/frozen-file retry guards, real source/grant lifecycle and durable Trial-to-CRM projection failure/retry exactly once. See [ten-case crosswalk](../testing/runs/2026-09-15-files-access-ten-case-batch.md). No schema migration or production activation; external attestation and operational release/retention acceptance remain gated.

## September 15 empty Job completion guard

Two focused OrderManagementDomainTests pass: accepted pricing cannot complete a Job with no samples, while normal post-acceptance roster finalization remains available. The guard preserves InProgress and a null completion time on rejection. This is local domain evidence; FIN-01 still requires supported terminal laboratory outcomes and genuine invoice/PDF issuance. See [completion continuation](../testing/runs/2026-09-15-job-completion-control.md).

Connected ten-case UAT found Trial action requests returning 404 because the route used MVC's reserved action value. ControllerRouteTests now exercises real endpoint matching for six lifecycle commands: the new check fails before the operation-parameter correction, and both route tests pass afterward. A separate disposable PostgreSQL test reproduces zero-tube roster creation escaping as ArgumentOutOfRangeException (HTTP 500). Explicit add/edit tube-count validation returns 400; zero/negative rows leave roster/version unchanged and a valid two-tube retry succeeds. All three focused tests pass; no shared schema change. See ../testing/runs/2026-09-14-ten-case-execution.md.

## Guided evidence and retirement persistence — September 14, 2026

LAB-04/07 connected API/PostgreSQL acceptance covers typed capture and role guards, immutable correction/repeat history, held/finished writes, active and queued protocol retirement, workflow recovery/invalidation, stale previews and races against start, assignment, save, approval, promotion and internal authorization. Read-only audit confirms fifteen step-evidence events, five distinct queued-work warnings and zero jobs/receipts for rejected authorization. No backend implementation or automated backend test was changed for this slice; the discovered defect was frontend field-array initialization. The API was rebuilt to include the updated help corpus and passed fresh authenticated readback. [Full evidence and fixture boundaries](../testing/runs/2026-09-14-guided-evidence-retirement-uat.md).

## Connected intake concurrency and persistence — September 14, 2026

LAB-10/13 actual API/database acceptance now covers whole-batch validation/rollback, dropped-success idempotency, simultaneous intake reviews, review-versus-start, locked used sources, independently correctable reserves, legacy scope/eligibility and preserved acceptance targets. Independent read-only PostgreSQL confirms seven main accession records, twelve intake-history events including corrections, one batch receipt and one execution start. No backend implementation or automated backend tests changed for this slice; its two defects were in frontend focus/draft handling. [Full crosswalk](../testing/runs/2026-09-14-tube-intake-uat.md).

## Material consumption validation — September 14, 2026

Extended `AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney` with zero, negative and excessive material consumption. It requires `material_quantity_unavailable` / 409, unchanged saved stock/version and zero consumption rows before valid use. The complete disposable-database journey failed on the raw domain exception before correction and passed after correction (1 passed, 0 skipped). Connected Operator/Supervisor UAT also verifies the live error, corrected save, component atomicity, QC and equipment restrictions. [LAB-03 evidence](../testing/runs/2026-09-14-lab-resources-uat.md). No broad suite or shared migration.

## September 14, 2026 — Commercial intake access

CommercialIntakeAccessPostgresTests covers scoped Customer/Department/catalog and Lab intake reads, rejection of other queues, administrator read without pricing, disabled-role fallback, revoked assignment and external membership denial. Database tests run within a rolled-back transaction, including Begin quote, Request changes, status events and absence of Lab authorization. Session tests cover BusinessRoles/DualControl flag combinations. Final checkpoint: 15 tests passed, none skipped.


## Invalid CRM import commit — September 14, 2026

Added `CrmCommercialAccessPostgresTests.InvalidImportCommitLeavesPreviewAndBusinessRecordsUnchanged`. The original implementation began constructing valid rows before reaching invalid input; the connected null-name variant returned 500. The controller now rejects the preview's invalid-row count first. The rollback-scoped regression failed before correction and passes with null/empty-name rows, unchanged preview/version and no persisted or tracked Company additions (1 passed, 0 skipped). Actual admin corrected import, duplicate skipping and batch/content replay also pass. [Ten-case evidence](../testing/runs/2026-09-14-next-ten-uat.md). No broad suite, schema or authorization change.


## Opportunity stage response regression — September 14, 2026

`CrmCommercialAccessPostgresTests.OpportunityStageMoveReturnsSavedStageAndRejectsStaleReplayWithoutDuplicateHistory` reproduces the connected save-then-500 defect against isolated PostgreSQL and verifies returned stage/name/probability/version, fresh readback, no duplicate stage history after stale replay, and closed-to-open history preservation. The same test failed on the original loaded-navigation reset and passes after fresh saved-record readback (1 passed, no skips). Setup and changes roll back. An intermediate assertion was corrected to expect the existing `DbUpdateConcurrencyException`, which middleware maps to HTTP 409. Artifacts: `tmp/uat-closure/crm03-stage-before.trx` and `crm03-stage-verified.trx`. No broad suite was rerun.


Trial canonical material eligibility: extended the existing PostgreSQL batch-submission regression with `extracted_rna`; reproduced missing configuration choice, fixed configuration/submission normalization, and passed that test plus existing spaced-label approval/submission (2 passed, 0 skipped). Rolled-back local fixtures only. See [execution evidence](../testing/runs/2026-09-14-acceptance-closure.md).

## Completion recovery — September 14, 2026

Added one disposable PostgreSQL completion test: final idempotency-save failure reproduces the prior committed-invoice defect; after atomic transaction/per-order locking and verified PDF cleanup, failure rolls back business state, deliberate retry creates one PDF/invoice and same-key replay preserves identity/status. Test passed; no whole FIN-01 UAT claim. [Evidence](../testing/runs/2026-09-14-acceptance-closure.md).


## File safeguards and quote recovery checkpoint — September 14, 2026

54 file scanner/storage/verification/download and API/module/route/metadata checks passed; one Unix symbolic-link fixture intentionally skipped on Windows. Uses temporary storage and loopback scanner protocol doubles, not live malware detection or Customer delivery. No backend changes. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-file-safeguards-shared-controls-and-quote-recovery-slice).

## Finance rules and Web Operations checkpoint — September 14, 2026

62 Website parsing/search/crawler/extraction, queue-monitor, Finance/import/domain, quote-rendering and unconfigured-gateway checks passed. No PostgreSQL notification-processing fixture, legitimate invoice issuance or provider-delivery claim. No backend changes. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-finance-rules-and-web-operations-recovery-slice).

## CRM, people and account access checkpoint — September 14, 2026

94 account, identity/session, invitation, department and CRM/outreach/relationship checks passed with no failures or skips. Stub invitation HTTP responses verify message construction, not provider delivery. No backend changes. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-crm-people-and-account-access-slice).

## Documentation, access and provisioning checkpoint — September 14, 2026

34 documentation-search and data-provisioning domain/profile checks passed with no failures or skips. No backend test or product changes. TRX recorded in the run ledger. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-documentation-access-and-provisioning-slice).

## Release/download/retention grouped verification — September 14, 2026

56 checks passed: 44 domain/decision/download and governed-result PostgreSQL checks, plus 12 managed-release lifecycle/notice/commit checks. The latter includes ten generated local database journeys. The harness now accepts the existing isolated UAT database name alongside local phaeno_ops; loopback and generated-database cleanup guards remain. Actual commit timing, independent archive revocation, concurrent notices, holds, simulated cleanup retry and reissue history passed. No product change or shared migration; no real file deletion/email delivery. Saved UAT state and disposable cleanup verified. See [release checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-release-download-and-retention-grouped-continuation).

## Shipping and packing grouped verification — September 14, 2026

72 distinct shipping domain/container/PostgreSQL checks pass after three focused fixture-assertion corrections. Queue completeness now scopes its 261 expected rows to the generated organization, failed routing verifies unchanged notification count instead of assuming an empty database, and accepted-tube intake expects recorded specimen acceptance while retaining null completion timing without a quote. No product rule/schema change. Generated-fixture cleanup and retained UAT counts verified. See [shipping results](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-shipping-packing-and-accession-grouped-continuation).

## Handoff and Trial grouped verification — September 14, 2026

66 distinct backend checks pass across the initial group (62/66) and focused retests of three corrected Trial release fixtures and the operator journey. Trial ready-package fixtures arrange resolved specimen state; they are not execution acceptance. The operator journey now selects a source through the attempt command, starts its generated execution with barcode confirmation, then creates the library and exercises evidence/review. It uses a guarded generated local database so commands can own transactions; exact database cleanup was verified. No product/schema/guard change. See [grouped results](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-grouped-handoff-shipping-and-trial-verification).

## Grouped laboratory verification — September 14, 2026

Broader laboratory selection ran 158 checks: 157 passed, one failed, zero skipped. The failure was the stale 30-entity expectation in `PersistenceTests.PSeqOperationsDbContextMapsCompleteLaboratoryModelWithoutCommercialForeignKeys`; the current model contains 36 entities. Corrected the count and explicitly asserted specimen-attempt/receipt, preparation and role-invitation table mappings, retaining schema and no-Commercial-FK assertions. All 11 persistence tests then passed, including ERD completeness. Combined runs contain 168 distinct passing backend checks. No model/migration change.

Eight PostgreSQL journeys passed on isolated loopback 5436: five Lab provider authorization/amendment/cancellation/projection cases, scientific approval/non-publication, atomic batch accession with destroyed-tube exception, and forced concurrent preparation creation/retry. Saved preparation IDs/statuses/versions/history and aggregate fixture counts matched before/after. Tests use generated fixtures and scoped cleanup; this is supporting server/database evidence, not signed-in physical/provider acceptance. TRX files are in ignored `tmp/uat-resume-20260914-results`. See [grouped run](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-grouped-software-verification-and-saved-lineage-trace).

## Laboratory closeout concurrency — September 12, 2026

Added ConcurrentPreparationCreatesResolveNameCollisionsAndRetainRetryIdentity in LabPreparationCreationConcurrencyPostgresTests.cs. Real PostgreSQL advisory-lock contention proves both create requests overlap; seeded test-only base names force collision handling without changing clocks. Both creates receive distinct names/IDs, unchanged retries retain those identities and notes, and exactly two creation records/no members remain before scoped cleanup. Focused test passed 1/1; the two connected preparation journeys and scientific-review-gate regression passed 3/3 with no skips. Local test/API build warning-free; original UAT fixtures preserved and generated race workflow absent afterward. This closes the forced-creation regression gap, not full signed-in acceptance. See [closeout ledger](../testing/runs/2026-09-12-laboratory-uat-closeout.md).

## Multi-artifact scan rejection — September 12, 2026

Four engineering-assisted local HTTP/database variants passed on separate package d14354fb-36ef-4801-8184-adf6cde706e2: unknown artifact ID and duplicated artifact ID each return 400 without any persisted state/version/timestamp change; actual ClamAV-clean bytes with a deliberately mismatched manifest checksum produce Failed/artifact_checksum_mismatch with Clean and Rejected sibling artifacts; subsequent callback returns 409 and preserves failed state. No automated suite or product edit. Original ReadyForReview/ReadyForRelease fixtures remain unpublished and unchanged. See [checksum rejection evidence](../testing/runs/2026-09-12-lab-14-preparation.md#multi-artifact-scan-validation-and-checksum-rejection--september-12-2026).

## Retained result artifact real-scanner callback — September 12, 2026

Engineering-assisted local LAB-06 continuation: existing ClamAV 1.4.6/28121 scanned the retained 158-byte artifact via loopback INSTREAM and returned stream: OK; independent SHA-256 matched the manifest. The actual pipeline scan-result endpoint returned 200/ReadyForReview, then rejected a repeated callback with 409 result_package_not_scanning. Database confirms package version 3, Clean artifact version 2 and null approval/release. No new automated test or suite; owned temporary API stopped. Real-byte local scanner/callback passes; external transfer/provider and complete scientific lineage remain separate gates. See [retained scan evidence](../testing/runs/2026-09-12-lab-14-preparation.md#real-scanner-callback-and-scientific-access-boundary--september-12-2026).

## Billing approval and completion handoff - September 12, 2026

Actual signed-in FIN-01 billing validation, approval, approval reset after a terms change, reapproval and reload passed on the existing marked Customer A. Saved profile is version 4/configuration 3, Net 45 with a synthetic 10% tax rate. All invoice readbacks stayed identical; receipt totals remain 8/$108 unapplied. Settled desktop/390px billing screenshots inspected. FIN-01 remains partial: neither saved InProgress Job has terminal Commercial samples, governed release does not advance those statuses, the current Job UI has no completion action, and this isolated runtime lacks CommercialOperator. No completion, invoice issuance, PDF, role change or production action was performed. No automated tests were added or rerun; this checkpoint is signed-in acceptance and code/read-only record tracing. [Evidence and next implementation slice](../testing/runs/2026-09-12-lab-production-verification.md#billing-approval-and-completion-handoff---september-12-2026).

## Real scanner and receipt evidence - September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied. [Exact runtime and saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#real-scanner-and-receipt-evidence--september-12-2026). No deployment, migration, auth change or Git mutation. Remaining legitimate issuance/PDF, scientific independence and production/physical/provider gates stay open.

## Finance upload validation — September 12, 2026

Live UAT found automatic ValidationProblemDetails being wrapped as success=true despite HTTP 400. ApiResponseEnvelopeFilter now uses the existing failure envelope, validation_error and field/message detail shape for validation problems. ApiResponseEnvelopeFilterTests covers missing multipart fields, explicit validation status/fallback and preserved success behavior. Eight focused envelope tests passed. Actual authenticated malformed upload returns 400/success=false; valid multipart reaches unavailable scanner and creates no receipt/evidence artifact. Existing domain rejection endpoints also passed live Cash duplicate reversal, unauthorized adjustment, cross-Customer and over-allocation probes, plus Billing concurrency recovery. No schema/auth change. See [run evidence](../testing/runs/2026-09-12-lab-production-verification.md#finance-exceptions-and-upload-correction--september-12-2026).

### Accession before storage and bulk acceptance (2026-09-11)

Added domain coverage in `LabTubeIntakeTests` and persisted shipment coverage in `LabTubeAccessionPostgresTests` (partial shipping fixture): rejected expected tube retains identity/evidence with null location/quantity and Rejected availability; accepted/held material needs real storage; correction needs retained material. Bulk requires inspection, frozen expected identities and current work version; includes no recorded exceptions, rejects invalid storage atomically, and replays without duplicate events. Existing per-tube and receipt identity coverage remains. Suites are authored, not run.

Manual/concurrent gates: wrong role/tenant, voided or unreceived shipment, duplicate/wrong tube, stale decision and two simultaneous batches; consumed/started source and cancelled work; rollback following a mid-save failure; used-tube correction denied; no overwriting storage; no automatic reserve start. These persisted acceptance gates remain Not run.


## Implemented specimen-attempt guards — September 11, 2026

Added LabSpecimenAttemptTests covering barcode mismatch without mutation, same-attempt QC repeat versus explicit operational hold, failure immutability, required/foreign stage skip rejection and processing failure preserving intake acceptance. Domain and controller implementation also add versioned authorization, transactional command receipts, filtered uniqueness, lineage and downstream gates. Tests are authored/compiled, not run. PostgreSQL concurrency, rollback/replay, source/start races, legacy adoption and full lifecycle acceptance are still required by LAB-09. Earlier proposed-status notes are superseded by this implementation checkpoint.

## Execution tube prerequisite - September 11, 2026

Execution detail now projects TubeAcceptanceRequired for Planned specimen executions through the same predicate enforced by Start. Verify missing acceptance, accepted but unavailable input, foreign-specimen tubes, accepted available input, job-level execution, and started/completed history; a stale ready page must still be rejected by Start if eligibility changed. Existing behavior is preserved; automated coverage deferred and not run for this navigation/prerequisite slice.

## Tube intake reason coverage - September 11, 2026

Added LabTubeIntakeTests for one accepted tube among held/rejected reserves, stable first acceptance time, invalid reason/Other validation without mutation, resolution notes, unreviewed tubes and cross-specimen isolation. Adapted existing acceptance fixtures to tube-derived intake. API acceptance must cover automatic accession, reason catalog, deprecated specimen-write rejection, role/concurrency denial, start/review races and event/turnaround projection. Tests added/updated but not run.

## Tube-attempt enforcement coverage - September 11, 2026

The [tube-attempt plan acceptance matrix](SPECIMEN-TUBE-ATTEMPT-PLAN.md#acceptance-matrix) requires coverage for policy snapshots, atomic tube reservation, competing starts, retries, explicit failure, same-attempt repeats, cross-attempt stage isolation, eligibility, retirement/cancellation, permissions and legacy adoption. The domain sources listed above are now authored and compiled. Automated execution and PostgreSQL lifecycle/concurrency acceptance remain Not run.

## Promotion actor policy - September 11, 2026

Added LabWorkflowPromotionTests and revised protocol activation regressions: author or reviewer may promote independently approved versions; self-approval captured in audit-only mode cannot authorize activation/promotion; Draft and withdrawn approvals remain blocked; promotion actor/time and original approval are preserved. Automated tests not run. API acceptance still needs role denial, mixed independently/self-approved stages (including Active), stale workflow version, and atomic rejection without retiring previous production versions.

## Revised retirement and invalidation coverage — September 11, 2026

New required coverage is specified in LAB-07. It supersedes the prior rule blocking all workflow/unfinished-job references: active processing blocks, queued work requires explicit current-impact confirmation, and authorized retirement atomically invalidates affected workflows and creates clean Invalid recovery revisions. Cover immutable historical versions, remaining-stage preservation, empty-stage rejection, revalidation with/without edits, independent approval, production gating, queued-pin retention, role checks, stale impact tokens, duplicate retries, concurrent execution starts/assignments/workflow transitions/job authorization, and audit atomicity. Add domain regressions for Invalid candidate approval and invalidated historical immutability. These new scenarios are not yet marked passed; earlier dependency-blocking evidence is historical only. Automated suite execution has not been requested.

## Protocol retirement — September 11, 2026

Added LabProtocolRetirementTests for retained identity/version, reason and actor validation without partial mutation, repeat retirement rejection, and rejection of edits/new versions/use after retirement. Built API and test project; did not run automated tests. Retirement enforces ProtocolAdministrator/version checks, previous approval, no open draft, no Draft/Approved/Production workflow references and no unfinished dependent jobs. New workflow/job/execution references participate in identity concurrency. Live local UI covered Draft workflow blocker and successful retirement after discarding it, with persisted reason/time/actor/version corroborated. Cross-role denial, Approved/Production dependency branches, unfinished-job references, provider rejection and concurrent requests still need executable acceptance coverage.

## Equipment retirement — September 11, 2026

Added LabEquipmentRetirementTests for required/limited reasons, actor requirement, metadata retention, duplicate retirement rejection, calibration/identity retention, and refusal of new usage even when backdated after retirement. API retirement requires Supervisor/OperationsAdministrator and expected equipment version. Recording use now updates the equipment concurrency version in the same SaveChanges transaction to conflict with concurrent retirement. Test project and API build passed; automated tests were not run. Local live verification covered successful retirement and persisted audit metadata; role-denial and concurrent-request scenarios remain unrun.

## Customer laboratory stages — September 10, 2026

**Local checkpoint: 4/4 cases passed; 0 skipped.** See the [stage verification record](../testing/runs/2026-09-10-customer-laboratory-stages.md) and [TRX evidence](../../artifacts/customer-progress-test-results/customer-progress.trx). This is a focused run, not a full backend-suite result.

| Coverage | Evidence and result |
| --- | --- |
| Preparation, sequencing, assembly, review and release | `LabCustomerProgressTests.PreparedAndAwaitingProviderRemainPreparationUntilSequencingIsRecorded` passed. A DataAvailable status alone and withdrawn output do not establish release. |
| Mixed sample stages and partial release | `MixedSamplesAndPartialReleaseDoNotAdvanceTheWholeJob` passed. Outstanding receipt/earlier work prevents whole-Job Results Available; all released samples permit it. |
| Job-wide versus individual progress; holds | `JobWideActivityDoesNotFabricateSampleStageCounts` passed. Global review preserves attributed sample counts; holds remain visible. |
| Persisted workflow and scope | `LabOperationsCommercialHandoffPostgresTests.AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney` passed. Started preparation, provider Shipped/ReceivedByProvider versus Sequencing/Complete, organization/order isolation, and scientific readiness without released results are verified against the local database. |

Remaining coverage: a database fixture with multiple libraries for one sample (only some sequencing), populated Customer and entitled Partner list/detail response checks across Department/member boundaries, and actual partial output release through the complete customer journey. These are **Not run** for this feature; pure mapping tests do not establish persisted release or API authorization acceptance. No test or data migration was executed while updating this plan.

## Intake progress synchronization — September 10, 2026

`LabIntakeProgressTests` covers receipt/accession replay, immutable identity, preserved timestamps, holds and later/terminal statuses. The registered-tube reference journey checks Work progress, projection-version replay, completed accession facts and unchanged scientific acceptance/turnaround. The complete Lab operator journey checks Commercial Job/sample propagation. Existing projection tests cover monotonic replay. Results are recorded in [the intake correction run record](../testing/runs/2026-09-10-intake-progress-correction.md).

**Prior local checkpoint: 3 domain cases and 4 focused PostgreSQL cases passed.** The operator journey above overlaps this checkpoint; do not add these historical totals as unique coverage. The database cases are the registered-tube journey, complete operator journey, replay-safe monotonic projection delivery, and whole-kit/partial-fill case. The corrected fixture expectation for an outstanding second shipment is retained in the run record. Failure-injection coverage for atomic rollback/retry across the projection and Commercial update remains **Not run**. Container arrival advances Lab Work to Received and the Commercial lifecycle to InProgress; the newer customer-facing display says Received. No scientific acceptance, target or tube/storage backfill is implied.

## Location inventory correction — September 9, 2026

The [location-inventory plan](TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md)
supersedes the same-Job stock restriction below. The final isolated PostgreSQL
checkpoint passed **76/76** shipping, kit, location, packing, reset and cancellation
cases; the solution build passed with zero warnings/errors. Six new cases in
`TransportationKitLocationInventoryPostgresTests.cs` establish:

- Receipt after origin Job cancellation and exact reservation for another Job at
  the same Customer/Department/location, with no repeated receipt or delivery.
- Concurrent Jobs produce exactly one container reservation without losing tubes.
- Pre-scan reset releases the container; a wrong-container tube fails; first
  successful scan locks reset and freezes the physical barcode into the packet.
- Receipt, tenant, Department, location and Member write restrictions are enforced.
- Ordinary catalog supersession retains compatible physical stock, while explicit
  withdrawal blocks it.
- Pending and declined cancellation retain reservations; approved cancellation
  releases only unused reservations and preserves fulfillment history. Scanned
  containers remain bound. Existing native Lab approval/veto tests also pass.

Existing partial-receipt, dispatch and scan tests now use exact reservations.
The first 73-case checkpoint exposed a dispatch-replay comparison between .NET
100-nanosecond ticks and PostgreSQL microseconds. Matching now compares at the
persisted precision; the regression deliberately supplies a finer-grained time.
The final 76-case run passed, its scratch database was removed, and zero synthetic
notification rows remained. Counts overlap earlier checkpoints and are not additive.

Migration `20260909153238_AddTransportationKitLocationReservations` adds four
nullable fields, four indexes and three restrictive foreign keys; no record
backfill or repair is included. The complete ERD is updated. Shared/production
application is not part of this local implementation. Automatic cancellation of
unshipped requests remains a pending product decision.

Evidence: `artifacts/location-inventory-tests/location-inventory.trx` and
`latest-run.log`. Applied the migration only to verified local
`localhost/phaeno_ops`; API restarted from `artifacts/location-inventory-runtime`
with health HTTP 200. `local-preservation.json` confirms all six before/after
state hashes match: the saved Job still has nine samples and 18 unmatched tubes;
its received kit is version 5, unreserved and unbound. No walkthrough data repair
or consumption occurred.

## Customer Job kit requirement and dispatch synchronization — September 8, 2026

The final isolated checkpoint passed **68/68** shipping, kit, location, packing,
reset and legacy-boundary cases. It includes six new cases in
[TransportationKitOrderRequiredPostgresTests.cs](../../backend/test/TransportationKitOrderRequiredPostgresTests.cs).
The solution build completed with zero warnings/errors. Evidence:
`artifacts/kit-order-required-tests/kit-order-required.trx` and `latest-run.log`.
The scratch database was removed and zero remaining synthetic notification rows
were verified. These totals overlap earlier checkpoints; they are not additive.
An initial run passed 65/66 and exposed an incompatible quantity unit in the new
historical-shipment fixture; the fixture was corrected before the final run.

For accepted Customer Lab Jobs, no request or only cancelled requests must block
unbound container preparation, first tube scanning, packet confirmation and
shipping. Ordering recommendations remain available before an order exists.
Only acknowledged kits ordered for the same Job and delivery location provide
preparation capacity. Existing bound shipments and Trial/Partner policies retain
their prior behavior. New direct shipment-bound legacy kit creation must direct
staff to the Customer Job's kit order.

Both staff dispatch entry points must update the stock kit, matching request
line, request status and one customer dispatch notice in the same transaction.
An already-recorded, unused dispatch may be linked through the same dispatch
endpoint only with its saved Job/carrier/tracking/time unchanged. An identical
retry must not repeat the status event or notice. The shared mutation lock order
is Job, then request, then stock kit; concurrent entry points must not overfill a
request or partly dispatch another kit.

| ID | Trigger and required invariant | Exact test method in TransportationKitOrderRequiredPostgresTests.cs | Evidence |
| --- | --- | --- | --- |
| KIT-B20 | Open or mutate an unbound physical container before ordering, then after cancelling its only request. Reject preparation/scanning/packet/shipping without changing shipment versions, slots or histories; retain a complete order recommendation and enabled eligible ordering. | `TransportationKitMissingOrCancelledOrderBlocksUnboundPreparationWithoutBlockingOrdering` | Passed in the 68-case isolated checkpoint |
| KIT-B21 | Try direct dispatch without an order or new legacy return-kit creation, then scan old unlinked stock despite having another received ordered kit. Reject bypasses; bind the correctly ordered and received kit successfully. | `TransportationKitReceivedOrderCannotBeBypassedWithUnorderedStockOrLegacyDispatch` | Passed in the 68-case isolated checkpoint |
| KIT-B22 | Continue an already-bound historical Customer shipment with no kit request. Retain tube matching, packet confirmation and recorded return shipping. | `TransportationKitOrderRulePreservesAlreadyBoundHistoricalCustomerShipment` | Passed in the 68-case isolated checkpoint |
| KIT-B23 | Evaluate the order requirement for Partner, Trial and unaccepted legacy contexts. Keep the new Customer rule out of those policies. | `TransportationKitOrderRuleRetainsPartnerTrialAndUnacceptedLegacyPreparationPolicies` | Passed in the 68-case isolated checkpoint; existing shared-shipping journeys also rerun |
| KIT-B24 | Race kit-detail dispatch against request fulfillment for the same kit, then replay and attempt an extra kit. Reconcile one line/status/event/notice, accept an unchanged retry and leave excess stock undispatched. | `TransportationKitDirectAndRequestDispatchSynchronizeOnceUnderConcurrentRequests` | Passed in the 68-case isolated checkpoint |
| KIT-B25 | Reconcile an existing direct dispatch with its request. Reject altered saved facts; preserve the original dispatch and every permanent barcode, add the request/location links once, and leave customer receipt unset. | `TransportationKitRecordedDispatchReconcilesWithoutRewritingFactsOrDuplicatingNotices` | Passed in the 68-case isolated checkpoint |

The walkthrough kit's pre-reconciliation dispatch/barcode fingerprints were
captured read-only in `artifacts/kit-order-required-tests/local-kit-before-reconciliation.json`.
This checkpoint did not mutate that kit, reload the local API or send a provider
notification. Record connected reconciliation, delivery acknowledgement and
physical scanning separately in the [E2E test plan](E2E-TEST-PLAN.md) and the
[local walkthrough record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

## SHP-03-001 fulfillment routing failure — September 8, 2026

Locally corrected and verified; connected Customer retry saved one request. The
failed unscoped Phaeno lookup now resolves the exact active organization named by
the existing bootstrap configuration, with a controlled conflict for unavailable
or ambiguous routing. Existing administrator-recipient routing is retained.
All **7 focused TransportationKit PostgreSQL tests passed**, including multiple
active Phaeno organizations with concurrent/replayed request creation and only
the configured organization's fake recipient, plus inactive/missing/non-Phaeno
routing rollback. Build had zero warnings/errors. Evidence:
`artifacts/kit-order-routing-tests/kit-order-routing.trx`. The isolated database
was removed and zero remaining synthetic notifications verified. Local API was
reloaded and health returned 200. No live order or provider send was performed
by the isolated checks. Later user confirmation saved request D20018AA and one
logical fulfillment notice recorded Sent, corroborated read-only. Inbox and
physical fulfillment are not yet verified.
See the [incident run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

## Reset container configuration before scanning — September 8, 2026

September 9 explanation correction: an active **ReadyToShip** shipment was
incorrectly described as an inactive container selection. The reset service now
reserves that reason for cancelled/unconfigured, preparation-pool and empty
records, then identifies any issued packet in the shipment family before the
existing scan/history and progress blockers. The packet reason reads
**Containers cannot be changed because a shipping insert has already been issued
for this job.** Eligibility and the 409 rejection remain intact; no schema or
contract-shape change is involved.

The existing PostgreSQL
`ContainerResetBlocksScanningClearedMatchesCancelledHistoryAndShipmentProgress`
case now includes ReadyToShip and Delivered alongside Shipped and Received,
checks the current-record blocked reason and verifies rejection. The retired
identity case also checks that a truly retired selection retains the inactive
reason. These additions have not been executed and are separate from the older
passing checkpoints below.

The active Visual Studio API still runs the older source, so the corrected
backend explanation is not yet verified at runtime. A narrow frontend fallback
provides the issued-insert explanation when a current insert exists and the
server already disallows reset; it does not change backend eligibility or the
409 response. Runtime activation and the new backend assertions remain pending.

The final backend Release solution build passed with zero warnings and zero
errors in 41.65 seconds. No automated suite was run; this build result does not
execute the added reset-reason assertions or activate the running API.

The focused checkpoint passed **61/61**, including **eight reset cases** in
addition to the previous 53 shipping/kit/location cases. The order-wide packing
reset checks target the new eligibility/read and versioned confirmation/write
paths: tenant and Department isolation; organization/Department administrators
versus members; exact family snapshot versions; whole-plan retirement to
cancelled shipment history; and restoration of the correct selection pools.
Assert preserved specimen/tube IDs, global ordinals, counts, destination/handling
separation, quotes, kit requests and physical inventory.

Exercise every family-wide blocker independently: current scan, immutable past
scan with cleared fields, ReturnKit/physical-kit binding, packet, dispatch and
receipt. Race reset against scanning, packing and another reset; stale or changed
families must produce a conflict without partial moves or duplicate tube slots.
Dialog cancellation/no-write behavior is covered in frontend checks. No migration
was planned; model consistency remains part of implementation verification.
The 61-case checkpoint is distinct from older passing totals, and this
documentation update runs no tests itself.
Connected acceptance is the SHP-09 reset variant,
currently Not run.

## Customer transportation-kit ordering and receipt — September 8, 2026

The focused checkpoint passed **53/53** cases against a newly migrated,
isolated PostgreSQL database. This includes the existing 44 shipping, packing,
catalog and Lab handoff cases, six new transportation-kit cases and three new
Customer delivery-location cases. The solution build completed without warnings
or errors. The scratch database was removed and synthetic notification rows
were verified empty; notification delivery used a fake sender.

New coverage includes concurrent/duplicate request suppression, frozen delivery
and container facts, one Phaeno fulfillment notice, partial dispatch and receipt,
receipt-gated tube scanning and packing, residual capacity after another
container is allocated, delivery-location isolation, cancellation without
operational changes, and all 261 records in the staff queue with status filters.
Delivery-location coverage checks Department ownership, tenant isolation,
administrator/member permissions, default replacement, optimistic concurrency,
soft deactivation and validation without changing a saved default. A demoted
administrator must receive explicit Department membership before member reads
are permitted; missing membership remains a 404.

Migration `20260909013740_AddCustomerTransportationKitOrdering` was applied only
to the configured localhost `phaeno_ops` database. The model has no pending
changes. Before/after evidence confirms identical HS5Y7DB7 order state, nine
sample identities and values, 18 tubes, and shipment identities and versions.
Evidence: `artifacts/transportation-kit-ordering-tests/transportation-kit-ordering.trx`,
`latest-run.log`, `local-migration.log` and `local-job-{before,after}.json`.

### Reusable transportation-kit scenarios

The IDs below are stable regression references. **H53** means the named test
passed in the historical September 8, 2026 53-case checkpoint above; this
documentation update did not run tests or produce new acceptance evidence.
**Planned** means the stated scenario has no dedicated passing case identified
here. A passing API test or fake notification sender does not establish mailbox,
physical inventory, scanner, carrier or customer-delivery acceptance. Follow
the [E2E test plan](E2E-TEST-PLAN.md) for the observable Customer/Phaeno walkthrough
and record its evidence separately.

Reference keys below name exact source files. Methods in TK, LOC, PACK and SHIP
belong to the shared `SampleShippingPostgresTests` partial class.

| Key | Test source |
| --- | --- |
| TK | [TransportationKitOrderingPostgresTests.cs](../../backend/test/TransportationKitOrderingPostgresTests.cs) |
| LOC | [CustomerDeliveryLocationPostgresTests.cs](../../backend/test/CustomerDeliveryLocationPostgresTests.cs) |
| PACK | [SampleShippingPackingPostgresTests.cs](../../backend/test/SampleShippingPackingPostgresTests.cs) |
| SHIP | [SampleShippingPostgresTests.cs](../../backend/test/SampleShippingPostgresTests.cs) |
| CAT | [SampleShippingContainerTests.cs](../../backend/test/SampleShippingContainerTests.cs) |
| DOMAIN | [SampleShippingDomainTests.cs](../../backend/test/SampleShippingDomainTests.cs) |
| LEGACY | [LabOwnedSampleOperationPostgresTests.cs](../../backend/test/LabOwnedSampleOperationPostgresTests.cs), in `LabOperationsCommercialHandoffPostgresTests` |

| ID | Trigger and required invariant | Existing exact test reference | Evidence |
| --- | --- | --- | --- |
| KIT-B01 | Read/order as Customer administrator, ordinary Department member, user without Department access, foreign Customer or Phaeno staff. Retain member reads, deny unauthorized writes, and hide foreign records; cancellation before dispatch permits one replacement request. | TK.`TransportationKitOrderAuthorizationCancellationAndWrongKitLeaveRecordsIntact`; LOC.`CustomerDeliveryLocationsRejectOtherTenantAndMemberWritesWhilePhaenoCanManage`; LOC.`CustomerDeliveryLocationsRespectDepartmentOwnershipAndRejectInvalidAddressWithoutReplacingDefault` | H53 |
| KIT-B02 | Create/change a default delivery location, submit stale edits or invalid address data, and deactivate a location. Keep one active default per Department, reject stale/invalid writes without changing it, and retain inactive record details. | LOC.`CustomerDeliveryLocationsReplaceDefaultWithConcurrencyAndPreserveInactiveDetails`; LOC.`CustomerDeliveryLocationsRespectDepartmentOwnershipAndRejectInvalidAddressWithoutReplacingDefault` | H53 |
| KIT-B03 | Confirm recommended kits for an accepted Customer Lab Job from concurrent clients and retry. Create one Pending request, retain included-cost presentation, preserve sample counts and shipment allocation, freeze the confirmed address against later address edits, and retain requested container capacity. | TK.`TransportationKitConcurrentRequestsFreezeFactsAndNotifyPhaenoOnlyOnce` | H53; included-cost flag is asserted, financial-ledger absence is not separately asserted |
| KIT-B04 | Process the new-request notification and replay ordering. Queue one notice and resolve the Phaeno administrator recipient through the existing dispatcher. | TK.`TransportationKitConcurrentRequestsFreezeFactsAndNotifyPhaenoOnlyOnce` | H53 with fake sender; actual mailbox delivery outstanding |
| KIT-B05 | Dispatch one requested size before the other, or pick a wrong size. Preserve exact requested revision/quantity matching; report PartiallyDispatched, then Dispatched; reject the wrong kit without saving dispatch facts. On-the-way quantities remain unavailable. | TK.`TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity`; TK.`TransportationKitOrderAuthorizationCancellationAndWrongKitLeaveRecordsIntact` | H53 |
| KIT-B06 | Acknowledge only received kits, repeat the acknowledgement, then receive the remainder. Make only acknowledged capacity usable, preserve receipt/version on repeat, and reach Received only when every requested kit is acknowledged. Block preparation and tube scans before receipt. | TK.`TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity`; TK.`TransportationKitReceiptGateBlocksTubeScanUntilCustomerAcknowledgesDelivery` | H53 |
| KIT-B07 | Allocate a received 20-tube kit while ten tubes remain, or order to a second delivery location. Keep the same request across the residual pool; subtract already-prepared containers; recommend only missing capacity; do not pool another location's kits. An acknowledged kit already bound to its shipment remains usable there. | TK.`TransportationKitPartialDispatchAndReceiptEnableOnlyAcknowledgedCapacity`; TK.`TransportationKitPackingDoesNotPoolReceivedKitsAcrossDeliveryLocations`; TK.`TransportationKitReceiptGateBlocksTubeScanUntilCustomerAcknowledgesDelivery` | H53 |
| KIT-B08 | Configure compatible sizes and recommend/override them with unknown, zero or limited availability. Enforce Phaeno configuration access and exact compatibility; preserve frozen shipment revisions; prefer fewest containers, then least spare capacity; support 20+10, two 20s or six 5s and retain exact shortfall. | PACK.`ContainerCatalogRequiresPhaenoConfigurationAccessAndExactCompatibilityPairs`; PACK.`ContainerCatalogDraftPreviewRevisionsAndDeactivationPreserveFrozenShipmentFacts`; CAT.`DefaultThirtyTubesUsesTwentyAndTen`; CAT.`ActualAvailabilityControlsRecommendation`; CAT.`UnknownAvailabilityIsNotZeroAndNoCompatibleOptionsIsIncomplete`; CAT.`ZeroAvailabilityDoesNotInventContainers`; CAT.`InvalidSelectionsRejectDuplicatesUnavailableAndUnknownDefinitions` | H53; recorded Job stock does not establish a complete customer inventory balance |
| KIT-B09 | Split tubes 15+15 or 10+10+10, skip an empty container, finish a residual pool, or submit simultaneous packing confirmations. Preserve every physical tube's global sample ordinal and earlier shipment identities; invalid plans leave the source unchanged; only one concurrent allocation wins. | PACK.`ContainerPackingCustomCountsSupportEvenSplitsAndSkipEmptyExtras`; PACK.`ContainerPackingHonorsAlternateSelectionsAndLeavesShortfallExplicit`; PACK.`ContainerPackingRejectsInvalidCustomCountsWithoutChangingTheSource`; PACK.`ContainerPackingConcurrentConfirmAllocatesEveryPhysicalTubeOnlyOnce` | H53 |
| KIT-B10 | Register/dispatch a standard kit and scan its permanent tube barcode into a partially filled return container. Require the complete registered kit before dispatch, bind the physical kit once, retain unused spare tubes separately, and preserve existing supplier-barcode adoption. | DOMAIN.`ReturnKitRequiresTheExactRegisteredTubeCountBeforeFulfillment`; PACK.`ContainerStockConcurrentScansBindOnePhysicalKitToOnlyOneShipment`; PACK.`ContainerStockWholeKitBindsOnFirstScanWhilePartialFillKeepsUnusedTubesSeparate`; SHIP.`RegisteredTubeJourneyFreezesCrosswalkEnforcesTenantAndAdoptsBarcodeAtAccession` | H53 |
| KIT-B11 | Print/replace a split-sample manifest and receive/accession individual tubes. Preserve order/shipment/sample/tube identities, reject a void packet, resolve the current shipment packet, and advance physical counts only for received tubes. A complete package can become Received without fabricated Customer dispatch details; the other package stays incomplete. | PACK.`ContainerStockWholeKitBindsOnFirstScanWhilePartialFillKeepsUnusedTubesSeparate`; SHIP.`RegisteredTubeJourneyFreezesCrosswalkEnforcesTenantAndAdoptsBarcodeAtAccession` | H53; physical print/scan acceptance remains E2E work |
| KIT-B12 | Open and filter a queue or a Job with more than 250 related records. Return all 261 matching requests/shipments without losing older records; retain readable Customer/Department names and tenant/member scope. | TK.`TransportationKitQueueReturnsAllRecordsForClientFilteringBeyondTwoHundredFifty`; PACK.`ContainerShipmentSourceListingIncludesAllPackagesAndRetainsMemberReadOnlyScope` | H53 |
| KIT-B13 | Invoke old whole-sample receipt/accession/status endpoints for Lab-owned shipping samples, then repeat on an unowned legacy sample. Reject the owned bypass with 409 and unchanged state; retain the three legacy operations for unowned samples. | LEGACY.`LabOwnedShippingSampleRejectsLegacyReceiptAccessionAndTransitionWithoutChanges`; LEGACY.`LegacySampleWithoutLabOwnedShippingRetainsReceiptAccessionAndTransition` | H53 |

### Additional backend cases and broader inventory boundaries

These are coverage requirements for later authorized test work, not new passing
results or a claim that the broader inventory model exists. Keep the scenario
IDs when adding tests and replace the reference/status only after evidence is
recorded.

| ID | Trigger and expected invariant | Existing coverage boundary | Evidence/status |
| --- | --- | --- | --- |
| KIT-B14 | Open ordering with no location, one non-default location or several locations without a default; change/deactivate the chosen location before confirmation. Require explicit setup/choice where needed and reject stale confirmation without creating a request. | KIT-B02 covers saved defaults, validation and deactivation; no dedicated backend case covers every ordering-selection branch or stale location confirmation. | Planned regression |
| KIT-B15 | Attempt kit ordering for an unaccepted/held/cancelled Job, Trial or Partner context; retry the same idempotency key with altered data; race dispatch, receipt and cancellation. Preserve eligibility, payload-conflict, quantity and transaction boundaries. | KIT-B01/B03/B05/B06 cover selected authorization, concurrent creation, wrong-kit rollback and repeated receipt; these additional negative/race combinations are not established by those passes. | Planned regression |
| KIT-B16 | Order included kits/outbound delivery and exercise notification failure/retry, missing routing or a future designated recipient. Assert no new invoice/financial posting and no duplicate notification delivery record. | KIT-B03 asserts the included-cost flag; KIT-B04 proves initial routing through a fake sender. Dedicated financial-absence and notification-recovery cases are not identified. | Planned regression; named-recipient policy/configuration remains a separate decision |
| KIT-B17 | Reserve Phaeno/customer stock for simultaneous Jobs, move supply between warehouse/customer locations, and release reservations after plan changes or cancellation. Prevent double allocation across Jobs and distinguish transit from confirmed on-hand balance. | Current kit supply is Job/location scoped; it is not a cross-Job inventory ledger or warehouse reservation system. | Planned product scope; no implemented backend test reference |
| KIT-B18 | Reconcile unknown/stale balances, record lost/damaged supply, adjust with reasons, or split/reassemble kits and reuse spare tubes. Preserve movement history and permanent identities without inventing availability. | Current partial-fill/spare-tube checks do not implement reusable spare inventory, stock adjustments or reconciliation. | Planned product scope; no implemented backend test reference |
| KIT-B19 | Recalculate preliminary demand at order intake, then exact demand after final sample entry; apply replenishment thresholds and partial fulfillment/receipt over multiple orders. Create one appropriate replenishment work item and avoid automatic charges or shipments without policy. | Finalized-Job request and partial receipt are covered above; automatic replenishment and preliminary-demand inventory planning remain in the [owning shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md). | Planned product scope; no implemented backend test reference |

For future authorized execution, use isolated synthetic PostgreSQL fixtures and
a fake notification sender; verify cleanup. Do not use the walkthrough Job as
a test fixture. Backend pass counts, signed-in walkthrough results and real
delivery/receipt evidence must remain separate in the
[E2E test plan](E2E-TEST-PLAN.md).

## Container configuration, stock kits and split shipments — September 8, 2026

The final focused checkpoint passed **44/44** cases: 17 container/catalog
domain and packing cases, eight existing shipping domain cases, four packing
invariants, and 15 PostgreSQL cases (twelve new and three existing journeys).
The new PostgreSQL cases are in `SampleShippingPackingPostgresTests.cs`, a
partial of the existing shipping fixture; cleanup scopes all new catalog and
stock records to that fixture's unique SKU prefix.

Coverage includes inactive draft preview, stable case-insensitive SKU identity,
revision history, explicit deactivation, frozen shipment container facts,
Phaeno configuration authorization, exact structured compatibility pairs,
fewest-container/least-unused-capacity recommendations, unknown/zero/limited
availability, arbitrary compatible selections, exact shortfalls and preserved
global sample tube ordinals. The optimizer is also compared with exhaustive
results for 675 small bounded cases. Confirmed plans cover 20+10, two 20s,
six 5s, custom 15+15 and 10+10+10 splits, skipped empty extras, and rejection of
invalid counts without source changes.

The final lifecycle review also verifies completing a previously partial
packing pool without changing earlier containers, retrieving all 261 packages
for a selected job despite the general list's 250-record limit, and retaining
Member read access while blocking administrative writes. Draft preview cannot
override active, ended or deactivated revisions. Complete physical receipt or
accession marks a confirmed package Received even if Customer dispatch details
were never entered, retaining absent carrier/tracking values rather than
inventing them.

`LabOwnedSampleOperationPostgresTests.cs` verifies that the legacy POMS sample
receipt, accession and status-transition endpoints reject samples connected to
Lab-owned shipping work with 409 and direct staff to Lab operations. The guard
leaves sample, order, specimen, work and shipment state, audit events and notices
unchanged. Samples without that ownership retain all three legacy operations.

Concurrent confirmation and concurrent stock-kit binding each permit exactly
one winning operation. A complete stocked 20-tube kit can back a 10-tube return
container without making the other supplied tubes expected returns. Packet
tests verify SKU, distinct order/shipment/sample barcodes, split-sample totals
and other-container references. Identity lookup resolves each context; a
shipment barcode resolves the current packet, while an explicitly replaced
packet barcode is rejected. Physical receipt advances from 1 through 10 of
30 expected tubes while the other container remains at zero. Unpaired receipt,
receipt of an unused spare tube, cross-tenant reads and reuse of a received
tube are rejected. Existing supplier-barcode adoption and packet issuance
regressions still pass.

All database fixtures ran against freshly created local scratch databases with
no copied user data or running notification dispatcher. All five scratch
databases were dropped and absence verified; each left zero synthetic notices.
The intermediate checkpoint caught an unmapped computed void-status property
in packet queries; the final code queries the persisted void timestamp.
The isolated backend/test build passed with zero warnings and errors.

Migration `20260908234930_AddSampleShippingContainerPackingAndStock` adds five
catalog/stock tables, three shipment packing fields and a physical-tube receipt
timestamp. Existing required return-kit ownership is unchanged. The model
snapshot has no pending changes and the complete database ERD is regenerated.
After verifying it was the sole pending migration on `localhost/phaeno_ops`,
it was applied locally. Before/after evidence confirms that the walkthrough
job's nine unique sample IDs, saved sample values, 18 tubes, order status and
version, and shipment IDs/statuses/versions are identical. No fixtures ran
against that database. Shared/production migration, actual supply configuration
and physical kit/scanner acceptance remain unperformed.

## Sample source capacity, imports and roster responses — September 8, 2026

The final focused checkpoint passed 13 cases: five new PostgreSQL capacity
cases, three existing acceptance/finalization/replay PostgreSQL regressions,
and five unit/CSV checks. An earlier broader unit/domain batch passed 27/27.
Coverage includes quota enforcement while other sources still have room,
record counts independent of tubes, source normalization, unchanged-source
legacy metadata recovery, moving/removing records, exact finalization flags
and authorization, persisted CSV revalidation, and simultaneous requests for
the last available source slot. The computed count property is verified absent
from EF metadata, so no model or migration change is required.

The first isolated run exposed duplicate Add response rows from EF collection
fix-up: tracking the sample before explicitly adding it to the order collection
could return the same saved record twice. Add/import now attach the collection
member before tracking it; response-count checks passed. A subsequent failing
assertion depended on source-group iteration order; it now accepts either
correct source-mismatch explanation, and the entire checkpoint passed.

The owner's Visual Studio session repeatedly restarted local IIS, so tests
used fresh local scratch databases instead of the active development database.
Each received the existing migrations without copied user data. All three
scratch databases were dropped and absence verified; cleanup left zero
synthetic notification rows. No user samples were changed and no shared or
production database was used. Root's final local API build passed with zero
warnings/errors; the restarted API returned health HTTP 200.

## Quote decline reason selection — September 8, 2026

The decline dropdown uses the existing withdrawal `ReasonRequest` contract
and request-closure operation. Named selections serialize their readable label;
Other serializes `Other: ` plus trimmed explanation, within the existing
2,000-character limit. No API, authorization or persisted-model change is
required, so no migration or additional backend test run is needed for this UI
change. Focused frontend tests cover the payload and conditional validation.

## Quote expiration and extension requests — September 8, 2026

All six `LabQuoteExtensionPostgresTests` cases passed against guarded local
PostgreSQL. They cover effective expiry without read mutation, blocked expired
acceptance, durable duplicate/idempotent requests, organization/department and
Member/admin boundaries, inactive membership, stale versions/source quotes,
pending staff filtering, future-dated reissue, immutable original terms,
atomic request resolution, one issuance notice, and Accepted-state preservation.
The first checkpoint found a duplicate fixture Job name; unique fixture names
fixed it and all six cases passed on rerun. The other 36 related quote issuance,
PDF and order-domain cases passed in the original checkpoint.

The API was stopped during committed test fixtures so synthetic notices could
not dispatch; fixture cleanup deletes extension requests before their quotes.
Migration `20260908204524_AddLabServiceQuoteExtensionRequests` was verified
additive and applied only to `localhost/phaeno_ops`. Existing Phaeno read
authorization is unchanged. Shared/production execution remains unperformed.

## Branded quote PDF — September 8, 2026

All 6 `QuotePdfRendererTests` cases passed: embedded Phaeno logo/fonts, saved
USD900 pre-tax quote without invented terms, frozen billing/tax/payment terms,
precise unit prices and rounded line amounts, historical status, long/multipage
descriptions with repeated headers and bounded glyphs, and safe failure for
unsupported characters. The representative one-page PDF and every page of the
five-page layout sample were visually checked under `artifacts/quote-pdf-review`.

All 5 `DepartmentAccessPostgresTests.QuotePdf*` cases passed against guarded
local PostgreSQL using rolled-back fixtures, with zero failures/skips. They
cover ordinary Member download, organization/department/order/quote boundaries,
unissued and missing revisions, membership revocation, immutable quote/order/
audit data, frozen billing versus the current profile, and malformed-line 409
recovery. Local API build passed with zero warnings/errors. No migration or
shared-environment change was required. The owner's Firefox retry remains
separate from these automated results.

After the owner's successful Firefox download, the spacing-only refinement
reran the same 6 renderer cases successfully. The sample and all five long
document pages were visually reviewed again, including aligned metadata, table
padding and totals-divider clearance. No new cosmetic test or access-test
rerun was needed; content, money calculations and download permissions did
not change. API rebuild passed with zero warnings/errors.

## Private invitation preview — September 8, 2026

Two `DepartmentAccessPostgresTests.InvitationPreview*` cases passed against the
local development database inside rolled-back transactions. They cover the
minimal pending recipient preview, no-store headers, no membership/lifecycle
mutation, and generic failures for unknown, empty, oversized, expired, revoked,
accepted, declined, and inactive-organization links. The preview POST is
anonymous only with a valid secret invitation token and uses the API rate
limiter. Acceptance and decline authorization remain unchanged. Local API
build passed with zero warnings/errors. No migration was needed.

## Domain invitation template — September 8, 2026

Updated `MailgunInvitationEmailSenderTests.SendInvitationPostsSingleEmailToMailgun`
to verify the domain template name, private `t:variables` organization/recipient/
invitation URL, plain-text fallback, and absence of inline HTML or public token
metadata. All four focused Mailgun sender/renderer/webhook tests passed. API
build passed with zero warnings/errors. No other backend suite was run.

## CRM outreach decisions — September 8, 2026

`CrmOutreachTests` covers legacy permission requiring review, legacy suppression,
required source/date/explanation/email, future dates, inactive/merged eligibility,
email-change invalidation, and preservation of suppression. The transactional
`CrmCommercialAccessPostgresTests.OutreachDecisionsPersistWithImmutableHistoryAndCannotBeChangedThroughLegacyFields`
checks API legacy-field bypass rejection, persisted evidence, actor history,
immutable activity, and email-change history. Focused checkpoint: 30 passed,
zero failed/skipped (includes `CrmCompanyDomainTests`); PostgreSQL fixture rolled
back. Migration `20260908161948_AddCrmOutreachEvidence` applied only to verified
local `localhost/phaeno_ops`. ERD regenerated. No outreach sender exists; queue,
dispatch, and provider receipt enforcement remain a future integration gate.

## Final isolated retention checkpoint — September 8, 2026

All 12 `ManagedReleaseRetentionPostgresTests` passed with zero failures/skips on an owned, temporary loopback PostgreSQL 18 cluster with `track_commit_timestamp=on`. This resolves the four environmental prerequisite failures in the bundle integration run below. The cluster and its generated test databases were stopped and removed; the normal development instance was neither restarted nor reconfigured. Evidence: `artifacts/portal-operational-completion-20260908/retention-isolated.trx`. These cases overlap the selected PostgreSQL checkpoint and are not an additional unique-test total.

## Configured Lab Service bundles — September 8, 2026

`ConfiguredLabServiceDomainTests` covers immutable offering scope/effective windows, invalid turnaround ranges, exact accepted-quote commitment with no early specimen authority, acceptance-based clocks, preserved original targets, controlled timing reasons/private notes, and durable sale publication retry. The configured portion of `LabOperationsCommercialHandoffPostgresTests` lives in `ConfiguredLabServicePostgresTests.cs`: it exercises atomic placement and idempotent replay, stale scientific/catalog review, organization-admin-only Partner commitment and Department-scoped replay admission, real session capabilities, delayed/earlier timing changes and tenant-safe history/notices, and inactive/future offering versions that preserve current availability. `SessionAccessTests` additionally covers Partner Lab navigation without granting administration and keeps the separate invoice capability aligned with current Accounts Receivable authority.

The initial focused checkpoint passed **12 tests, zero failures/skips**, including four PostgreSQL cases against the explicitly approved local reference database. It found and fixed an accepted-quote tracking defect before commitment could succeed; its failed transaction left the Job unplaced. A failed test-fixture teardown was corrected to include its exact Lab work outbox rows, and the one generated fixture was removed with identity guards. Evidence: `artifacts/portal-bundles-20260908/configured-lab-focused.trx`. Subsequent session, canonical-item, publication-window and current schedule-display changes require the integrated checkpoint below; the initial result does not cover those later changes.

The integrated Release run without the PostgreSQL opt-in discovered **554 tests: 415 passed, one failed, and 138 skipped** (`artifacts/portal-bundles-20260908/backend-non-postgres.trx`). The failed persistence assertion exposed that cross-module timing/notification history belonged in the application layer; moving that record preserved its table and restrictive foreign keys while restoring the Laboratory module's original 30 entities and no-Commercial-foreign-key invariant. The final focused model, session and configured-domain run passed **26 tests, zero failures/skips** (`backend-bundle-model-session.trx` in the same directory), including that strict boundary check and one additional invoice-capability case. This follow-up repairs the identified failure; it is not a second complete-suite run.

The selected local PostgreSQL checkpoint executed **88 tests: 83 passed, five failed, zero skipped** (`artifacts/portal-bundles-20260908/backend-bundle-postgres.trx`). All 26 commercial Lab handoff cases, including the five configured Lab journeys, all five Lab provider cases, all 32 Department-access cases, all three shared-shipping cases and all five Kit cases passed. Retention passed eight cases and failed four because the normal local server has commit-timestamp tracking disabled; that server was not restarted or reconfigured. Custom-work passed four cases and exposed one real routing regression: a Kit-only Partner was incorrectly required to have Lab entitlement. The owning correction selects the existing Kit tenant admission for Kit requests and preserves the new Lab eligibility check for Lab requests. The final Kit/custom-work checkpoint passed **22 tests, zero failures/skips**: six Kit PostgreSQL cases (including a paid order whose Assembly is held or cancellation is pending), five custom-work PostgreSQL cases (including Kit-only Partner access) and 11 unit cases. Evidence: `artifacts/portal-completion-20260907/backend/kit-custom-work-final-acceptance.trx`. The final solution Release build completed with zero warnings/errors. These focused results overlap the earlier checkpoint and must not be added as independent coverage.

The final model/session Release build completed without compiler warnings/errors. EF reports **no pending model changes** after the application-layer history correction; its installed-tool-version advisory (10.0.5 tooling versus 10.0.10 runtime) is separate from the successful model comparison. Reviewed idempotent migration SQL from `20260907232219_AddTrialAndReconciliationDrafts` to `20260908015114_AddConfiguredLabAndPartnerKitBundles` is `artifacts/portal-operational-completion-20260908/bundle-migration.sql`, SHA-256 `E93B6E9E45A5F162D6063C48666D091383713021AFD165E0E7C33F96E37A2FEF`. It adds 21 columns, six tables and 43 indexes; all 37 foreign keys restrict deletion. Existing rows retain manual Lab ordering and non-bundled Kit behavior through additive defaults. It contains no drops, business-data inserts, updates, deletes or explicit historical backfill; its sole insert records migration history. This review generated SQL only and did not execute it against a database.

Remaining acceptance includes the pending Partner Finance scope decision, retention checks on a commit-tracking-enabled reference server, real Customer/Partner submissions, physical specimen acceptance, provider delivery and production release. Approved Partner self-service standard ordering and manual draft submission do not enable staff-created Partner sales-assisted conversion: that existing intake remains Customer-only, and a Partner custom request currently creates a CRM opportunity for staff follow-up. Local reference data is not operational acceptance.

## Approved file-service activation — 2026-09-07

Added the permanent operator-only `--verify-file-services` command for the approved production activation. It starts no HTTP listener or background workers, accesses no database, and uses injected storage/scanning for uniquely owned synthetic files in both managed areas. It verifies size, checksum, exact readback, clean scan and deletion, with cleanup even after failure or cancellation. It requires the configured ClamAV provider; fixture/Disabled scanning cannot establish readiness. This command is reusable deployment verification, not temporary data-repair code.

Five new cases cover both areas and owned cleanup, rejected/unavailable scan failure, corrupt readback and incomplete deletion. The focused storage/scanner/verification checkpoint passed **34 tests, one Linux-only skip, zero failures (35 total)**. Evidence: `artifacts/portal-completion-20260907/storage-activation.trx`. Release build passed with zero warnings/errors. The prior full 506-backend/321-frontend checkpoint below remains the full-suite evidence; this targeted follow-up does not claim a new full-suite run. Live daemon/volume evidence belongs in the completion release plan.

## Portal completion integration — 2026-09-07

The completion checkpoint passed **506 tests, zero failures and one Linux-only skip (507 total)** in the full Release suite. The filesystem-link test is explicitly skipped on Windows; its Linux execution and production volume ownership remain target acceptance. Evidence: `artifacts/portal-completion-20260907/backend-final.trx`.

Coverage includes private Local storage and restart persistence, stream limits/checksums and failed-write cleanup, explicit scanner verdicts and unavailable/error rejection, ordinary Commercial Operator CRM access with active membership, restricted administration and exact attention filters, partial Trial scope drafts and approval separation, allocation correction, append-only reconciliation draft history, independent approval and resolved attention after balancing/cancellation. Earlier focused counts overlap this full checkpoint and must not be added to it.

The usual development PostgreSQL instance has commit-timestamp tracking disabled, so retention verification initially failed on that environmental prerequisite. The final suite used an isolated loopback PostgreSQL 18 reference cluster with commit tracking enabled and the entire migration history applied. That cluster was stopped and removed after verification; the normal development server was not reconfigured or restarted.

Release build passed with zero warnings/errors. EF reports no pending model changes. Additive migration `20260907232219_AddTrialAndReconciliationDrafts` was applied only to configured local development and the isolated reference database. It adds four nullable columns, one index and one restrictive foreign key, with no historical-row rewriting. The complete ERD was regenerated. Reviewed idempotent SQL: `artifacts/portal-completion-20260907/add-drafts.sql`, SHA-256 `2B56AC6801CD7147F19BC25E462A6152BD804972561A2D7B10108B18B94CFFFA`.

Production migration application remains explicitly unapproved. No production financial, scientific or customer records were created by these checks. Real scanner service, target volume backup/restore, authenticated role journeys, upstream scientific output and physical bench acceptance remain separate.

## Intake consolidation - 2026-09-07

Readiness regression assertions now cover separate pricing and invoice blockers. Customer options/readiness endpoints retain platform authorization and validate the selected active Customer department. Readiness uses the canonical specimen catalog and department entitlement precedence; absent system configuration is incomplete. API build is the local checkpoint; automated suites and database-backed endpoint acceptance were not requested.

## Optional Trial assignment note - 2026-09-07

API build passed with isolated output for the optional Trial authority assignment note; the running Visual Studio/IIS Express process locked normal output. Automated tests for omitted/blank notes, trimming and the existing length limit remain deferred; no test suite was requested.

## Combined API/Portal release checkpoint — 2026-09-05

The Product Owner authorized committing/pushing the combined change and deploying
the production API plus Portal UI. Inspected production workflow `33975386749`
at commit `ab2df0a` records migration through
`20260905140916_FreezeReleasedDeliverableReceiptLineage`. The pending release
migrations are `20260905172646_AddTrialProjectIntegration`,
`20260905213944_AddWebsiteNotificationRecovery`, and
`20260905222201_AddWebsiteNotificationProcessingControl`, in that order.
Their reviewed idempotent script is
`artifacts/review-gap-closure/production-review-migrations.sql`, SHA-256
`10A12E85A0B0930AA98E5766D3991227B19556E58248FE60D7F33AC1BBC01EA3`.
Explicit approval for the shared migration is still pending; API/Portal
deployment authorization and earlier local applications do not establish it.
No production application of these migrations is claimed at this checkpoint.

The current release-focused run passed **59 tests with zero failures/skips**.
The backend Release build passed with zero warnings/errors, and EF reports no
pending model changes. Evidence is in `artifacts/review-gap-closure/release-backend-*`
and `release-pending-model.log`. The earlier 27 distinct Website checks remain
the prior subsystem checkpoint. Local release verification is complete;
commit/push, exact deployed artifact, production migration/backup evidence and
runtime health remain unrecorded pending release-owner confirmation.
Hosted operator admission, real provider acceptance versus inbox delivery,
external alert collection/routing and actual Trial/storage paths remain separate
acceptance evidence. Public Website deployment is outside this request.

## Follow-up: review gap closure and Website processing controls — 2026-09-05

All **27 distinct Website checks** passed: 11 PostgreSQL workflow cases, one
independent-connection processing case, one sender case, one queue-monitor case,
and 13 API cases. This follow-up extends the prior checkpoint below; the counts
overlap and must not be added together as independent coverage.

Coverage includes durable pause/resume with required reason, current-version
conflicts and actor audit; intake and manual recovery queuing without consuming
attempts while paused; acknowledgement without waiting for an in-flight provider
call; persistence across fresh connections; and resumed processing of retained
work. Summary/filter cases cover failed and expired claims, including an explicit
interrupted-row projection. Monitor checks cover counts while paused, changed
attention, bounded reminders, cleared attention, numerical gauges, and exclusion
of actor/reason details from logs. Unsubscribe and completion cancel queued or
failed work while retaining attempt history; retired intake also cancels a final
expired claim and a provider failure that finishes after retirement.

The Release build passed with zero warnings, and the EF pending-model check was
clean. Migration `20260905222201_AddWebsiteNotificationProcessingControl` was
applied to isolated loopback PostgreSQL on port 55435 and configured local
`phaeno_ops` on port 5432; the configured-local application followed a backup.
The regenerated ERD accounts for all 157 tables at this checkpoint. Providers
and identities remain synthetic. These results do not establish shared or
production rollout, hosted admission, real provider acceptance, or inbox delivery.
External collection of the emitted metrics/logs and alert-sink configuration
remain deployment work; the monitor tests do not establish an active external
alerting service.

## Review gap closure — 2026-09-05

All 51 focused Website API, notification, Trial domain/PostgreSQL, and persistence
cases passed with zero skips. The PostgreSQL cases used the isolated loopback
reference cluster with commit tracking; notification providers were fake.
`WebsiteNotificationPostgresTests.cs` covers atomic intake/enqueue, duplicate
suppression, bounded retries and immutable attempt history, version/cooldown and
actor audit for recovery, interrupted final leases, inactive intake, legacy brief
recovery, and propagation of Mailgun rejection through a fake HTTP handler.
`TrialProjectPostgresTests.cs` adds a two-sample authorization/shipment, sample-type
quantity rules, exact Company/request lookup, and superseded/expired availability.

Release build passed with zero warnings/errors. Additive migration
`20260905213944_AddWebsiteNotificationRecovery` was applied to the isolated
reference database and configured local `phaeno_ops` after a backup; the complete
ERD was regenerated. Real provider acceptance/inbox delivery, hosted admission,
shared migration and production workers remain release verification steps.

## Portal documentation search — 2026-09-05

All 51 focused documentation-search, Website API and Website crawler cases passed
with zero failures/skips. `DocumentationSearchTests.cs` covers packaged corpus
loading without frontend files, cached-index restart, corrupt-index recovery,
guide removal/version mismatch, audience filtering before counts/facets/snippets,
metadata browsing, short terms and literal syntax, relevance, bounds, index path
separation, concurrent-process locks, rebuild cooldown and Website sentinel/index
byte isolation. A loopback HTTP test exercises the real controller, MVC binding,
authentication admission, error/envelope handling, no-store caching, forbidden
scope overrides and rebuild denial. The test uses a synthetic authentication
handler and active-user source; hosted Clerk/database admission remains separate.

Measured locally with 55 guides: 100 sequential warm searches had p95 19.54 ms;
one recorded initial index build took 183.09 ms. These are search-engine timings,
not production identity/database/network measurements. Backend build and Release
publish passed; the publish artifact contains the exact generated corpus and no
frontend source directory. No database migration is introduced.

## General Lab/Assembly scheduled notices (2026-09-05)

All 111 affected policy/download/PSeq/Department/persistence cases passed with
zero failures/skips against isolated loopback PostgreSQL with commit tracking.
`ManagedReleaseRetentionNoticePostgresTests.cs` extends the existing general
fixture with five cases covering both release families, concurrent warning/grace
polling, authenticated links without file details, actual ZIP completion before
and after standard cutoff, unavailable/undated releases, no-admin recovery,
current recipient selection, repeated provider failure and attention reopening,
expired final claims, independent family activation, and ordinary-notice claims.
The focused 14-case general/governed checkpoint run also passed. No new schema
or external provider was required. Mailbox and hosted acceptance remain open.


## General Lab/Assembly retention enforcement (2026-09-05)

The 106-test affected run passed all 104 prior tests and the new commit/revocation
journey; its other new journey had a fixture-only Department-selection failure.
After correction, both `ManagedReleaseRetentionPostgresTests` journeys passed.
They create/drop unique local databases and cover Customer Lab and Partner
Assembly file/ZIP cutoff, preserved undated/default-off behavior, full completion,
partial response and failed-ZIP non-counting, frozen grace, completed-before-
standard closure, cross-Department denial, payment/release/withdrawal gating,
actual delayed COMMIT admission/completion, and cross-connection ZIP revocation.
Existing PSeq tests use the generalized monitor name and retain their coverage.
No schema migration is needed. Hosted/provider acceptance remains separate.


## Verified commit-time retention (2026-09-05)

The 104-test affected backend set passed with no failures/skips against an
isolated loopback PostgreSQL 18.3 cluster with commit tracking enabled. The new
`GovernedDownloadCommitPostgresTests` holds the actual COMMIT across standard and
final deadlines; it proves late success preserves grace, late admission opens no
storage, lost observations recover durably without rewriting dates, repeated
observation is unchanged, and rollback/uncommitted events cannot create proof.
Existing rollback workflow fixtures use explicit synthetic observations, not
claimed commit timestamps. Missing historical evidence produces controlled
unavailability while revocation still records. Migration/ERD completeness passed.
Hosted startup/restart/failover and browser/provider acceptance remain open.


## Durable governed retention verification (2026-09-04)

- All 103 focused policy/download/PSeq/Department/persistence tests passed with
  zero failures or skips on guarded localhost. The set includes seven new
  rollback-backed checkpoint/outbox cases, two new immutable-boundary cases,
  one independent-connection concurrency/streaming journey, and ERD completeness.
- `GovernedRetentionCheckpointPostgresTests.cs` covers queued/skipped warnings,
  one grace notice, frozen dates, safe links/content, missing admins, dispatch-time
  admin resolution, failed delivery/retry, reopened Operations attention, recovered
  interrupted final attempts, and immutable completion-versus-revocation outcomes.
- `GovernedRetentionConcurrencyPostgresTests.cs` creates a uniquely named local
  database, applies the migration chain, seeds only synthetic records, and drops
  that database in `finally`. Separate connections exercise competing workers,
  a completion waiting across a deadline, current-authority revocation, and a real
  MVC response whose blocked source read is aborted without bytes or counting
  success. Reinstated access cannot turn the revoked attempt into success.
- ERD coverage now checks every runtime-model table/column. Regeneration includes
  primitive collections and previously omitted retention/CRM/model structures.
- Migration `20260905031439_AddGovernedRetentionCheckpoints` applied only locally;
  production processing/dispatch remain default-off. These tests do not prove
  exact PostgreSQL commit-time eligibility across the wall-clock deadline, hosted
  Clerk/proxy behavior, real provider delivery, byte deletion, or shared rollout.


## Governed retention reconciliation (2026-09-04)

- `ReleasedDeliverableRetentionDecisionTests.cs`: 11 cases cover exact warning,
  standard/final boundaries, complete/incomplete packages, late completion,
  historical cutoff without worker progress, and old-worker exclusion.
- `GovernedResultRetentionPostgresTests.cs`: six rollback-backed cases cover
  governed release policy/Organization override capture with one timestamp,
  unchanged recapture, full MVC response success, partial/cancelled/failed streams,
  old non-counting request evidence, grace completion, deadline admission, and
  historical/new cutoff before storage opens. No real bytes are deleted.
- The 79-test focused policy/download/PSeq/Department/persistence set passed with
  no failures/skips on guarded localhost. Backend build passed with zero warnings.
  Updated Department controller construction and obsolete offset expectations.
- Migration `20260905022605_UnifyGovernedResultRetentionPolicy` was inspected and
  applied locally; ERD updated. Concurrent deadline checkpoint ordering, hosted
  transfer/revocation, real provider delivery/deletion, and shared migration remain
  open. No automatic warning/grace outbox implementation is claimed.


## Secondary department paths checkpoint (2026-09-04)

- `DepartmentSecondaryPathPostgresTests.cs`: 13 rollback-backed cases prove
  shared-package file/archive event scope, legacy history restrictions, membership
  reassignment/revocation, wrong-Department non-discovery before storage opens,
  activity/governance ownership, dispatch-time role/status checks, routing
  precedence/deduplication, no-recipient failures, suspended-Organization safety
  follow-up, and Customer Lab/Partner Reagent/Assembly lists/search/counts/CSV.
- All 68 Department/data-provisioning/operational-download/persistence tests
  passed with zero failures/skips using guarded `localhost/phaeno_ops`, including
  the 13 new cases. This set overlaps previous checkpoints. Sender/storage
  recorders avoid real email and production files. Backend build passed with
  zero warnings/errors.
- Additive audit migration `20260905014541_ScopeCuratedDownloadAuditByDepartment`
  was inspected and applied locally, preserving unknown legacy scope. ERD updated.
  Shared migration and hosted signed-in two-department acceptance remain deferred.

## Department administration closeout checkpoint (2026-09-04)

- `DepartmentAccessDomainTests.cs`: five domain cases including field-by-field
  inheritance, explicit false PO overrides, cleared defaults, validation without
  partial writes, and cross-Organization rejection.
- `DepartmentAccessPostgresTests.cs`: 18 rollback-backed local database cases.
  New coverage exercises assigned-admin settings/access, exact active-member
  lookup, ordinary-member denial, role/version/revocation behavior, Organization
  defaults audit/concurrency/inheritance, foreign-Organization denial, and
  protection of Organization-admin access from Department-admin changes.
- `LabOperationsCommercialHandoffPostgresTests.cs`: added real quote-acceptance
  proof for inherited PO enforcement, explicit Department override, and frozen
  accepted snapshots after Organization defaults change.
- Passed 60 focused Department/PSeq order-to-cash/order-domain tests plus nine
  quote/staff-initiation integration cases, with no skips. Both commands used
  guarded `localhost/phaeno_ops`; the two sets are disjoint. Backend build passed.
- Additive migration `20260905011422_AddOrganizationConfigurationDefaults` was
  inspected and applied locally. Shared migration, hosted authenticated flows,
  and full restored-database acceptance remain deferred.


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

- [x] `backend/test/DepartmentAccessDomainTests.cs` - new Organizations receive
  one active General Department, typed Department overrides use null for
  inheritance and protect the default lifecycle, and explicit Contact/User
  identity links require a reason while retaining deactivate/reactivate history.
- [x] `backend/test/DepartmentAccessPostgresTests.cs` - 12 rollback-isolated
  PostgreSQL checks for foreign-Organization denial, selected-Department result
  and invoice downloads, default uniqueness/audit, safe deactivation/reactivation,
  invalid/missing invitation intent, inactive Department denial, and service-rule
  override precedence. Passed locally on 2026-09-04.
- [x] Review regression run: 243 non-reference tests passed; 42 focused tests
  passed with the local PostgreSQL connection, including all 12 new checks plus
  quote issue and staff initiation. Other opt-in database suites were not run.
  Updated persistence assertions for separate organization/department grant
  indexes and existing lab workflow entities; fixed handoff fixture cleanup.
- [x] `backend/test/DepartmentSecondaryPathPostgresTests.cs` - the 13 cases in
  the secondary-path checkpoint cover curated grants/history/notice recipients
  and operational reads/counts/search/exports alongside existing Department tests.
- [ ] Remaining Department acceptance - restored-database migration/backfill,
  hosted invitation/identity acceptance, in-flight context switching, and signed-in
  cross-role two-Department workflows. Local controller/database proof does not
  replace authentication middleware, real provider delivery, or browser acceptance.

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
- [x] `backend/test/LabProtocolExecutionTests.cs` - strict definition validation,
  historical-evidence recovery, empty-results rejection, typed number/date/
  choice/barcode/reference checks, required roles and confirmations, explicit
  optional/conditional decisions, sequence and QC gates, resource attestation,
  repeat permissions, reasoned supervisor corrections, downstream re-review,
  pinned versions, and immutable completed/abandoned evidence.
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
  The scenario now also preserves the Department access scope across an exact-
  version upgrade; it passed in the 2026-09-04 secondary-path regression run.
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
  QuickBooks Customer link nor a completed billing profile, inserts the new
  quote instead of treating its client-generated ID as an existing row, and
  creates no QuickBooks estimate/outbox work, the shared idempotency boundary
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
  The guided-execution extension rejects invalid definitions, empty and forged
  completion results, wrong-role and stale step writes, and step/resource
  evidence on held jobs. It saves a QC hold, appends a supervisor correction,
  checks retained actors/attempts, and completes using persisted evidence.
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

The commit-evidence migration refuses rollback while evidence exists; the isolated
database test verifies refusal preserves every evidence row. The additive
migration also applied to the guarded local development `phaeno_ops` database;
no shared database or server configuration changed.

### Released lifecycle closeout (2026-09-05)

`ReleasedDeliverableLifecyclePostgresTests.cs` extends the isolated retention
fixture with immutable hold/reissue validation, Lab/Assembly lease and hold
blocking, partial-provider deletion retry/idempotency, shared-source deferral,
governed artifact cleanup with retained evidence, cross-connection quarantine
revocation, stale version recovery, tenant/auditor privacy and new-object reissue
lineage. Fixtures use synthetic storage and uniquely named loopback databases.
Full regression execution is authorized for this closeout. Shipping fixture
cleanup now deletes its Department assignments/departments before organizations.

## Guided protocol completion checkpoint (2026-09-05)

The focused command passed **79 tests, zero failed or skipped**:

```powershell
dotnet test backend/test/PSeq.Operations.Test.csproj --no-restore --artifacts-path .artifacts/protocol-completion --filter 'FullyQualifiedName~LabProtocolExecutionTests|FullyQualifiedName~LabOperationsDomainTests|FullyQualifiedName~PSeqOrderToCashDomainTests|FullyQualifiedName~LabOperationsAuthorizationTests|FullyQualifiedName~AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney'
```

The existing opt-in reference connection was supplied from development settings
only after verifying `localhost` and database `phaeno_ops`. The controller
journey uses its established isolation and cleanup. This is local PostgreSQL
proof; shared databases, migrations, deployments, and physical acceptance were
outside this completion run. The solution compiled with no warnings or errors
using the isolated artifact directory.

The final compatibility regression verifies that absent optional procedure
fields remain omitted in saved JSON, so draft resume and formal review retain
the portable authoring format.

## Trial integration checkpoint (2026-09-05)

`TrialProjectDomainTests` and `TrialProjectPostgresTests` cover immutable scope,
two-person approval and revoked authorities, RUO/no-PHI coded samples, allowance
and windows, amendments, one-use replacement lineage, residual-material terms,
first-party CRM outbox retry/deduplication, exact organization/department access,
organization-admin acceptance, Lab authorization and shared shipments without
paid orders, real Lab scientific approval, complete versus partial release,
conversion without changed deadlines, parent holds, commercial closeout and
Prospect deactivation blockers. The combined lifecycle journey verifies warning,
grace, held cleanup, actual artifact deletion metadata and explicit reissue with
new objects and a distinct scientific approval.

The full backend suite includes PostgreSQL reference journeys. Use a local
`phaeno_ops` source with `track_commit_timestamp=on`; concurrency tests create and
remove their own isolated databases. Merely supplying a differently named source
or a server without commit tracking does not meet those tests' prerequisites.
Final execution evidence is in `TRIAL-INTEGRATION-CLOSEOUT.md`. Production
mailbox/scanner/storage and physical acceptance remain separate.


## Portal consistency regression coverage (September 7, 2026)

Authorized implementation covers all 20 review items. Added `OrderReadinessConfigurationDomainTests` for arbitrary/malformed JSON and contradictory/duplicate property rejection, supported modes and atomic failed updates; `PaymentImportBatchDomainTests` for owned, unconfirmed corrections; and `AccountsReceivableEvidencePostgresTests` for protected scanned evidence, retired arbitrary-key writes, upload retries/cleanup, corrected previews, ownership/concurrency, duplicate confirmation, deactivated Customers and malformed CSV. Reagent domain coverage verifies draft purchase/delivery retention without placement requirements.

Source review additionally traces held intake visibility, canonical CRM request completion/conversion, contextual Contact association, paid roster/shared-shipment tracking, Assembly file correction/idempotency, result identity/retention and Lab authorization. New PostgreSQL tests are opt-in and require the existing isolated test database setup. Test suites were not requested and have not been executed in this implementation turn. Build and browser evidence is recorded separately in the implementation tracker.

The production preparation review adds `UnconfiguredQuickBooksGatewayTests`: all unconfigured catalog/create/read operations must fail with `503 quickbooks_not_configured`, and cancellation must remain `OperationCanceledException`. The unconfigured dispatcher immediately records NeedsAttention instead of retrying fabricated success. These two regression cases have not been executed. Release solution compilation passed with zero warnings and zero errors on September 7, 2026; compilation is not test execution.

Final source review adds opt-in `AssemblyUploadPostgresTests` for a failed idempotent save rolling back its input and cleaning up uncommitted bytes, followed by a retry retaining one input. `DepartmentSecondaryPathPostgresTests.RelationshipReadinessUsesPendingConversionWithoutSavingItEarly` verifies readiness uses the authorized tracked Customer conversion while the database still contains the prior Prospect kind. Both preserve transaction boundaries; neither regression has been executed.

## Quote PDF sample-scope verification — September 10, 2026

Focused renderer coverage checks the biological-source names, per-source counts,
total sample count and saved pricing on the same representative page; many rows
and a source longer than a page retain all text with repeated headers and bounded
text. PostgreSQL download coverage checks immutable request-revision selection,
quote-linked standard placement, omitted unrecorded legacy scope, inconsistent
count rejection and unchanged tracked data. Existing quote access, historical
status, commercial immutability, branding and billing tests remain in scope.

Local verification: 16 focused renderer and PostgreSQL download tests passed,
including historical scope and unchanged data. The representative one-page PDF
and all six pages of the long-source stress PDF were visually reviewed. The
scope heading and count share a shaded band attached to the source table; pricing
headers retain room for the first item. Documentation generation and freshness
checks passed (56 guides); whitespace checks passed. No commit or deployment.

### Container receipt and accession separation — September 10, 2026

Regression coverage: each expected container has its own tracking row; PH-P- receiving is an explicit write; repeat scans preserve one receipt/event; unrelated identifiers and void/cancelled inserts cannot receive; container arrival leaves tubes unaccessioned; Accession samples uses read-only lookup and individually saves tube accession. Verify queue movement, permissions, multi-container Jobs, missing tracking, retry, tab navigation and final-tube removal. Backend reference journey and frontend navigation assertions updated; automated suites are unrun by request scope. Manual browser and physical scanner acceptance remain pending. No real shipment is received merely to verify this feature.

Verification: solution build passed with zero warnings/errors using a separate output folder because Visual Studio/IIS Express held the normal output files. Frontend TypeScript, scoped ESLint, documentation freshness (56 guides) and whitespace passed. Read-only signed-in local browser inspection confirmed the separate tabs, two expected container rows with distinct tracking numbers for 69SJN4PA, and a received HS5Y7DB7 container showing 0/18 tubes accessioned. Desktop screenshot review passed. The agent did not submit receipt or accession. Automated suites, narrow/dark layouts, physical scanner and completed tube-accession acceptance remain unrun. The existing shipping insert files have no additional working-tree diff from this work.

## Container accession loop — 2026-09-10

Coverage: PH-P opens complete container modal; each tube opens required freezer-box prompt; no accession before valid save; progress and scan focus repeat until completion; wrong tube blocked; same-tube/same-box replay creates one container/event; different-box replay rejected. Component and PostgreSQL coverage updated. Automated suites not run (not requested). Physical scanner, nested-modal keyboard behavior, partial resume and populated save journey remain manual acceptance gates.


Release checkpoint (September 10): 87 focused backend cases pass in an isolated
PostgreSQL database; 315 frontend cases pass across 30 affected suites. Four
focused browser print checks pass with two intentional mobile-label skips.
Letter/A4 receiving sheets and 50 x 25 mm lab label output were visually reviewed
and independently QR-decoded. See
[release evidence](PORTAL-LAB-PROGRESS-RELEASE-2026-09-10.md) for local fixture
failures, artifacts and outstanding physical/production acceptance gates.

## Focused execution checkpoint — September 11, 2026

LabTubeIntakeTests, LabSpecimenAttemptTests, LabWorkflowPromotionTests, LabWorkflowInvalidationTests and LabProtocolRetirementTests passed: 23 tests, zero failures/skips. Earlier authored/not-run entries describe the prior checkpoint. PostgreSQL acceptance/concurrency suite remains unrun. Current partial manual evidence is in ../testing/runs/2026-09-11-protocol-preparation.md.

## Preparation-batch verification — September 11, 2026

LabPreparationBatchTests: 10 passing cases; LabSpecimenAttemptTests: 5 passing cases. LabPreparationPostgresTests: 2 passing persisted journeys covering competing reservations, stale versions, unauthorized Customer access, start locking, command replay, one material consumption, shared evidence/tube Hold, explicit failure, output creation and existing-output selection, optional final-stage skip, QC references, sequencing membership and reserve fallback. The optional-stage fixture lookup was corrected and rerun. The local migration was applied to localhost/phaeno_ops; the ERD includes all new tables and provenance links.

The owning [Library prep plan](LAB-WORK-JOURNEY-PLAN.md#verification-checkpoint) and LAB-14 manual journey retain remaining acceptance coverage: held/closed Trial races, all staff-role combinations, physical trays/scanners/labels, owner sign-off and production/provider gates. Historical TEST-008 work was not retrofitted or replayed. Customer-requested hold implementation remains blocked.

## September 12 — Preparation batch identifiers

Preparation naming: extended PostgreSQL preparation journey assertions for server-owned names, optional notes, stable create replay, distinct creates and ignoring legacy supplied names. Same-second concurrent allocation uses the existing transaction advisory lock. Regression execution pending; no database migration.


September 12 naming follow-up: both focused PostgreSQL preparation journeys passed, including name/notes/retry assertions. Signed-in UI verified removal of the name field, two distinct identical-choice creates, persisted notes and unchanged historical names. Reserve exhaustion confirmation produced terminal specimen Failed. See the LAB-14 run record; unrun variants remain open.


September 12 LAB-14 follow-up: failed-output scan prompts removed while traceability links remain; terminal specimens use Processing outcome. Live saved-record inspection passed. Failed-output regression passed on desktop/mobile (2); all 11 preparation-domain tests passed, including new repeat reason/history coverage and existing correction invalidation. Manual correction/repeat remains separate and pending; see the active run record.

September 12 LAB-14 checkpoint: existing TypedEvidenceRequiresTheStepRoleConfirmationAndValidValues regression passed (1, no skip). No backend implementation change. This domain proof does not substitute for signed-in role-matrix acceptance.

September 12 preparation concurrency: both PostgreSQL journeys now assert a stale material command returns concurrency_conflict without history, stock or consumption changes, followed by valid idempotent use. Both passed on isolated UAT DB (2, no skips), including competing reservation coverage. No backend product change.

September 12 review-role checkpoint: all 11 existing LabOperationsAuthorizationTests passed, zero skipped. Isolated LAB-14 launcher has governed result-package validation disabled, so no governed missing-package claim is made from that runtime. Independent approval/package controller acceptance requires separate LAB-06 setup; see active run. No backend code or data changed.

September 12 LabScientificReviewGatePostgresTests added and passed (one journey, four rejection cases, zero skipped) against the isolated UAT database. Calls the real scientific-approval controller with governed package validation and dual-control enforcement enabled for test context only. Checks exact errors for premature milestone, missing output package, contributor conflict and blocking exception; after each, asserts unchanged status/version/event count and no approval. Transaction rollback verified by absence of fixture work/user afterward. Uses a legacy-compatible job without tube policy to isolate approval guards; this does not cover specimen readiness, package scanning, HTTP authentication or signed-in acceptance. No runtime flags or operational records changed.

September 12 package-gate extension: same journey passed with seven controller rejections, adding Uploading, Scanning and Failed output packages. Each package stays in its original state/version with no approval ID or release timestamp. Domain transition checks also reject incomplete artifact count, checksum mismatch and non-clean malware result while retaining Scanning. Fixture includes synthetic order/sample/package relationships and rolls back, verifying package absence afterward. No real file, scanner, provider or signed-in package workflow exercised. One journey passed, zero skipped; no product code or runtime change.

September 12 independent approval extension: LabScientificReviewGatePostgresTests now also approves a synthetic ready package through the real controller using a separate non-admin Scientific Reviewer with no work contributions. Work and package become ReadyForRelease; the package references the saved approval and independent reviewer, exactly one ScientificApprovalRecorded event exists, and release timestamp/user remain null. The earlier failed package remains Failed. Focused journey passed (one test, zero skipped), retaining seven controller and three domain rejection checks. Transaction rollback verifies both packages and both reviewers absent. This isolates server approval behavior using a legacy-compatible job and synthetic scan readiness; it does not prove scanner, HTTP authentication, customer visibility or signed-in acceptance.

September 12 signed-in supplement: actual UI/API approval on separate 3016/7116 runtime and cloned DB at 127.0.0.1:5436 persisted one independent approval and ReadyForRelease with no release timestamp/user. Missing-package UI prevented submission, so that case adds UI evidence rather than another controller rejection. Database commit tracking enabled only on the owned temporary cluster; original server unchanged. Full lineage/scanner/publication not covered. See active LAB-14 run.

September 12 HTTP/UI supplement: signed-in contributor approval rejected on separate synthetic LAB-06 work; real database before/after retains ScientificReview/version 1, ReadyForReview/version 1, one original event and zero approvals. Confirms enforced contributor guard through live request with overlapping reviewer/release roles. No new automated test or product change; full lineage/provider cases remain separate.

September 12 release checkpoint: API Release build passed with zero warnings/errors; 66 selected laboratory domain tests passed, zero skipped. Production migration/deployment evidence belongs to LAB-WORKFLOW-RELEASE-2026-09-12.md.

September 12 production release: source 5365a38 deployed by workflow 34716138359 with owner-approved seven migrations, encrypted-backup restore/checksum proof and API/database smoke checks passed. See LAB-WORKFLOW-RELEASE-2026-09-12.md for exact identities and remaining acceptance.

September 12 engineering-assisted LAB-06/DAT-04 ingestion acceptance: current-checkout helper/API build passed. LocalFileStorage wrote/read 158 harmless bytes with independent SHA-256/length confirmation. Ten actual HTTP cases on temporary isolated API 7118 passed: missing service auth, manifest hash/scope validation, registration/retry, idempotency conflict, artifact count/register/repeat, incomplete scan report. One package remains Scanning with Pending artifact and no approval/release; no scanner verdict was fabricated. Owned API stopped. Synthetic authorization setup and direct local-storage save do not establish Customer handoff, remote upload or actual malware scanning. Full positive pipeline remains Blocked on those prerequisites. Exact evidence is in [the active UAT run](../testing/runs/2026-09-12-lab-14-preparation.md#real-byte-storage-and-pipeline-http-ingestion-acceptance--september-12-2026). No committed regression tests or application source changes.

September 12 SYS-01 ingestion concurrency: OPEN UAT-20260912-01. Two overlapping identical registration requests returned 200 and 500 internal_error; PostgreSQL unique idempotency-key conflict was unhandled. Exactly one package persisted and a later retry recovered its ID. Data integrity passed, clean race recovery failed. Preserve package 278a61d2-d7a4-4f78-b183-17bcab60360e. Fix and focused PostgreSQL/HTTP regression remain pending; no product code change in this UAT checkpoint. See [active run](../testing/runs/2026-09-12-lab-14-preparation.md#concurrent-registration-and-release-screen-keyboardreflow-uat--september-12-2026).

September 12 correction supersedes the open status above: UAT-20260912-01 fixed and retested locally. Added PSeqResultRegistrationConcurrencyPostgresTests.OverlappingRegistrationsRecoverIdenticalRequestsAndRejectChangedRequests with independent connections and a deterministic overlap barrier. Covers identical races, changed manifest races, changed scope/count/correction replay, distinct-key version collision and recovery, one-row persistence and null approval/release. Creates and drops its own disposable database on a guarded local PostgreSQL connection; no shared migration. Focused dotnet test with --artifacts-path tmp/uat-defect-fix-build passed 1/1, no skips or build warnings. Original HTTP variant passed 200/200/retry 200 for one new package. Retained 7116 uses the verified build; no full suite or deployment. See [correction evidence](../testing/runs/2026-09-12-lab-14-preparation.md#uat-defect-corrections-and-focused-retest--september-12-2026).

September 14 LAB-14 continuation: extended both `LabPreparationPostgresTests` journeys with six unauthorized Customer command rejections (403 / `lab_capability_required`) and 15 held/closed Job-command combinations (`execution_work_unavailable`) each. Complete tray/history readbacks and Job/attempt versions remain unchanged; no execution starts or library creation. Generated fixture statuses are arranged directly, not through real closure. Both positive journeys and the independent scientific-review/non-publication regression passed: 3 tests, 0 failed/skipped, including 42 added negative checks. Current source compiled into `tmp/uat-resume-20260914-build`; isolated loopback 5436 database only, generated-fixture cleanup verified and retained packages unchanged. Trial-specific guards and signed-in Customer writes remain separate acceptance work. See [continuation checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-continuation--preparation-command-guards).

September 14 Trial preparation coverage: PreparationCommandsRespectTrialHoldClosureAndScopeCurrencyWithoutPartialWrites passes 56 rejected command/state combinations with unchanged persisted snapshots and one valid move control. Uses a guarded disposable local PostgreSQL database because preparation controllers own their transactions; database cleanup verified. Existing rollback fixtures remain the default. New test passed 1/1; four related Trial/preparation regressions passed 4/4, no skips. Initial nested-transaction harness failure was corrected, not a product defect. See [continuation evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-trial-preparation-guards-and-reviewer-keyboard-check).


September 14 CRM terminal-history fix: added `DisqualifiedLeadRejectsProfileAndStatusChangesWithoutChangingHistory`, covering controller/profile/working/qualify/disqualify/convert rejection and unchanged saved history. Reproduced red, then 2 focused checks passed including retained conversion/merge identity. Rolled-back local PostgreSQL fixture; actual signed-in verification recorded separately. [Execution record](../testing/runs/2026-09-14-acceptance-closure.md).

September 14 ten-case checkpoint: SampleShippingTransactionPostgresTests proves nested shipping packing joins the outer transaction, holds the advisory lock against another connection, rolls back correctly and owns a standalone transaction. Failed before fix; passes with the two real routing checks. Independent final PostgreSQL readback verifies exact main quote/shipment/slot/work counts, distinct Trial decision actors, revoked temporary authority and no accidental kit request/invoice. DerivedReadiness explicitly enabled for staged gate acceptance. [Full evidence and limits](../testing/runs/2026-09-14-ten-case-execution.md).

September 15 LAB-09 provider/database continuation: historical V1 payload replay returns the identical acknowledgment with one authorization version, receipt and event; changed-payload command reuse is rejected. V2 Customer finalization preserves the legacy order snapshots and produces exact one-/three-tube crosswalks. Completed historical execution remains unlinked after adoption denial. Independent PostgreSQL assertions pass. [Evidence and synthetic-precondition boundaries](../testing/runs/2026-09-15-policy-history-and-shipping-access-uat.md). No backend source or automated backend tests changed.


## Reusable Lab steps and configuration preview - September 17, 2026

September 24 name and first-draft follow-up: PostgreSQL regression now covers version 1 Draft creation in the same write as the identity, refusal to approve it before configuration, case-insensitive duplicate-name rejection, rename propagation into an open draft, and approved-version name preservation after a later rename. The migration adds a unique normalized-name index. Tests were authored but not executed under the request-only test policy; apply the migration before connected acceptance.

Added LabStepTests and LabStepPostgresTests: one scoped catalog step, author/editor separation, immutable approval, retirement retention, independent repeated-occurrence evidence, exact-version pinning, rejected overrides, retained retired references, blocked new retired occurrences and stale parent version. Tests are authored, not executed. API role denial and concurrent retirement/approval races remain acceptance scenarios; no production acceptance is inferred.

LabStepTests adds hidden/optional/required/permitted-skip report policy and legacy QC inference regressions. Automated tests remain unexecuted under repository policy.

Added partial-coverage rejection and no-record-write assertion to the PostgreSQL preparation journey. Automated tests remain unexecuted under repository policy.

### Inline resource fields and sample exception disclosure (September 17)

LabStepTests: resource scopes, optional tracking and material quantity basis; LabPreparationPostgresTests.PreparationInlineMaterialUseIsAtomicAndIdempotent: rejected step rollback, unavailable lot, per-sample stock total and receipt replay. Authored; not executed. Product/supplier matching, corrections and output atomicity need connected acceptance before release.

### Material identity at configuration

Configured material snapshot resolution and retention added to LabStepPostgresTests. Inline material integration coverage now checks rejection of runtime identity replacement and retained configured name. Tests authored, not executed.

Material unit configuration follow-up: require authoring units, preserve them in save/reopen, show fixed runtime labels, reject tracked lots or submitted units that differ, and keep legacy definitions runnable. Regression cases added/updated; not executed. Manual preview checks cover symbol insertion and report placement after step-entry fields.

### Material amount exceptions and quantity reconciliation

Authored domain coverage for shared material scope, total-batch rejection, uncertain stock holds and reconciliation without replenishment. PostgreSQL preparation journeys cover actual failed-tube consumption, unknown stock and tube holds, mandatory reasons, late-validation transaction rollback, request replay, and reconcile-before-resume. Solution build compiles these cases; they are not executed under the repository's request-only test policy. Role denial, stale reconciliation and concurrent consumption still need execution acceptance.

### Equipment selector requirement — September 18, 2026

Preparation step recording now requires a catalog equipment identity for every Equipment used field, even when an older definition disabled tracking or requiredness. Name-only and omitted entries are rejected. Existing active/calibration checks and resource-use transactions remain in effect; corrections retain prior evidence. Backend compilation passed with zero warnings/errors. Connected API regression execution (missing identity, optional legacy field, inactive/out-of-calibration asset, valid selection and atomic rollback) remains deferred; no automated test run requested.

## Jobs delivery deadlines — September 18, 2026

Authored `LabJobDeadlineTests`: undated/acceptance, exact cutoff, three-day warning, blocking risk, reforecast independence, earlier specimen target, partial publication/ReadyForRelease, cancellation, immutable deadline-at-delivery and SQL translation/pagination beyond the dashboard cap. Automated execution not requested. Local read-only database acceptance verified query translation and complete counts; live concurrent release, withdrawals/reissue, roles and actual publication fixtures remain acceptance cases.

`LabJobDeadlinePostgresTests` additionally defines rollback-scoped acceptance cases for a 276-job queue/page 12, complete-query counts, distinct sample coverage and retained completion/deadline history. These cases compile but have not been run.

Jobs queue refinement: authored PostgreSQL eligibility coverage for every shipment state, receipt fallback and direct detail availability; the 276-job pagination fixture now records specimen receipt. SQL-translation coverage uses the eligible queue. Tests not run (not requested).

Required date at acceptance: added LabJobDeadlineTests coverage for missing-date rejection, configured automatic deadlines, explicit manual deadlines and domain refresh enforcement; historical accepted/undated work is AtRisk. Shared shipping fixture now supplies its 14-day standard turnaround. Intake rollback and single/bulk/correction acceptance paths remain focused integration acceptance cases. Tests authored, not run.

Active/Closed Jobs: added stage classification, partial delivery/hold/cancelled precedence, SQL translation for stage/date predicates and rollback-scoped database coverage for inclusive lower/exclusive upper due and order-date boundaries, pre-shipment cancellation in Closed, outcome filtering and warning counts. Authored/compiled; suites not run.

## Progress-based completion forecast — September 18, 2026

Authored `LabCompletionForecastTests` covers mixed day bases, weekend/observed holidays, fractional eligible days, daylight saving, exact exhaustion and repeatable actual-plus-one overruns, missing coverage, future entry, duplicate holidays, zero downstream duration and per-stage validation. Authored `LabCompletionForecastPostgresTests` covers latest-sample delivery, a real mixed-stage policy, read-only preview, missing-duration coverage, preserved pinned binding and no read-triggered snapshots. Suites not executed (not requested). Build and read-only local database projection checks are recorded in the owning plan. Remaining acceptance: atomic state tracking/no-op edits/retry, configuration permissions/concurrency, policy application, parallel library joins/provider waits, rework/holds/publication withdrawal, scheduler history and large queues.

## Full-suite release verification - September 18, 2026

Ran every API test with PSEQ_OPERATIONS_REFERENCE_CONNECTION pointing to a separately initialized loopback PostgreSQL 18 cluster on port 55439, migrated from empty. Database-backed suites are enabled. Corrected the complete laboratory model assertion (48 entities), a release fixture lacking its laboratory job/specimen, sequential workflow revision creation, configured 14-day acceptance expectation, an explicit manual due date before accession, and a self-approval negative fixture missing the proposed price. The five affected cases all pass. Final full-suite result is recorded in SERVICE-CATALOG-RELEASE-2026-09-18.md. The Unix-only symlink case remains a declared Windows platform exclusion.

## Evidence governance checkpoint — September 18, 2026

See [the governance verification record](../testing/runs/2026-09-18-evidence-governance.md) for executed scope and limitations. Coverage includes actual-person capture and preview isolation; independent review, self/stale/scope/retry rejection; retained original evidence; scientific profile requirements and explained exceptions; private evidence preservation versus customer-byte deletion; and desktop/mobile proposal/review accessibility. Production, real producer/bench and hosted recovery acceptance remain separate.

## Staff scientific capture and delivery history — September 19, 2026

The [capture/history verification record](../testing/runs/2026-09-19-scientific-capture-history.md) records 19 backend, 13 frontend and 12 browser passes, including sample-scoped commercial/Trial history, immutable report snapshots, staff sequencing/analysis capture and linked corrections, unchanged retries, exact manual-upload attribution, access limits, error recovery, keyboard focus and light/dark mobile accessibility. TypeScript, focused ESLint, EF model consistency and documentation checks pass. No new migration; no production activation. Browser evidence is simulated, and real producer/bench/hosted recovery acceptance remains separate.

## Database baseline and preservation release — September 19, 2026

The [reset execution record](../operations/database-rebase-20260919.md) records the completed production release: all 930 backend cases have passing evidence across the full run and focused follow-ups, 1,061 UI unit tests passed, and the final browser run passed 176 cases with two intentional mobile print skips. Signed-in hosted acceptance remains separate. The baseline-only discovery assertion replaces the retired additive-migration assertion; downgrade still must refuse loss of commit evidence. The legacy scientific-review gate fixture explicitly selects legacy evidence policy, while enforcement suites retain current defaults. Browser keyboard coverage includes the added performer and performed-time controls. Export/import probes cover wrong targets, transactional rollback, replay conflicts, source preservation and drift detection. Production identity, physical scientific evidence and real provider delivery remain separate from automated fixtures.

## PostgreSQL 18 production engine verification — September 19, 2026

The [engine upgrade plan](POSTGRESQL-18-UPGRADE-PLAN.md) requires a full PostgreSQL 17-to-18 data/schema comparison, unchanged EF migration check using the deployed application, isolated version 18.6 governed-download commit and managed-retention tests, normal-deployment engine/volume guard checks, and encrypted backup restoration on the new engine. Execution completed with all 16 focused PostgreSQL 18.6 cases passing (zero skips), equal data/schema across all 197 tables/211 rows, deployment-guard rejection on version 17, and successful pre/post encrypted backup restores. No application behavior or frontend test fixture changes are part of this upgrade; the preceding full application suites remain the application-code checkpoint. Hosted signed-in and physical/provider acceptance are recorded separately.


### September 19 repeated-sequencing release coverage

Repeated sequencing: `RepeatedSequencingLineagePostgresTests` exercises frozen allocations, explicit preparation choices, same-library reuse, corrections using a new preparation, over-allocation/missing-choice rejection, idempotent capture, reanalysis deduplication, and first delivery after every run is covered. Baseline discovery now expects three follow-up migrations: run counts, output lineage, and active-preparation uniqueness. Scientific approval keeps repeated-run work open until all allocations have approved results; package publication is a separate step. Disposable database tests also accept the explicitly isolated localhost `phaeno_release_verification_` prefix. Final full release run: 957 passed, zero failed, one Windows-only skip; the skipped Unix filesystem case passed separately in an isolated Linux container. All 958 cases have passing evidence. See the [release record](../operations/repeated-sequencing-release-20260919.md) for the exact migration and production activation boundaries.

## September 20 operational gap closure

Added `LabOperationalGapPostgresTests`, `LabCustomerHoldTests`, `S3ScientificStorageTests` and managed-file restore coverage. The isolated connected suite passed 84 tests (one Unix-only symlink skip on Windows), including 50 MiB resume/scan/integrity/cleanup, exact tenant scope, hold transitions/concurrency/release blocking, S3 adapter bytes and backup deletion coordination. See OPERATIONAL-GAP-CLOSURE-20260920.md for boundaries and subsequent checks.

Final release rerun: 968 passed, zero failed, one Unix-only symlink test skipped on Windows. All connected cases ran against disposable databases; the driver verified scratch-database removal and no remaining synthetic notification rows. Updated model/migration discovery assertions cover the scientific receipt, upload session and hold additions.

Backup release follow-up: all 29 archive/envelope/failure cases passed after covering a zero-entry referenced-file archive and sizing the synthetic restore workspace. Actual online production backup restoration/encryption/cleanup passed; no API outage occurred. See the operational gap closure release receipt for the manual-versus-scheduled evidence boundary.

## September 21 samples and shipping release coverage

`SampleShippingPackingInstructionsTests` covers regular ice, dry ice, cold packs,
no cooling, distinct container amounts, missing/conflicting instructions, approved
procedure authority and legacy compatibility. `SampleShippingProcedurePostgresTests`
adds the real save/assign/issue/revise journey: authorization, exact procedure
revision, different small/large quantities, actual-container packet content,
revision conflicts and unchanged historical packets. Cleanup removes only the
fixture's uniquely named procedure revisions after its assignments are removed.
Persistence discovery now includes the additive shared-procedure migration.
Release tests use a verified loopback disposable `phaeno_release_verification_`
database and verify its removal; the application development database is untouched.

Final full release run: 977 passed, zero failed and one Unix-only symlink test
skipped on Windows. The new connected shipping-procedure case passes. Synthetic
notification count is zero and the disposable database was verified removed.

September 23 barcode follow-up: domain coverage records distinct supplier namespaces for identical printed values and a primary alias per laboratory container. Focused domain and transfer tests cover manufacturer-specific internal library keys, rejection of identical physical source/destination scans, preservation of available historical POMS tubes during intake correction, and first-print gating after a newly rejected POMS tube is corrected. Model discovery checks now expect the barcode alias entity and migration. The full local backend suite passed: 750 passed, 0 failed, 341 skipped because the reference connection was unset and for platform-specific cases. Three focused connected PostgreSQL journeys then passed without skips on the verified local development target: a bound kit sharing its printed value with available stock from another manufacturer, split-shipment receipt through POMS label print history, and preparation material transfer with manufacturer selection and POMS label scan-back. Their synthetic fixture records were cleaned up. Before release, connected cases must also cover same-supplier collision rejection, cross-supplier registration, packet-scoped receipt and accession, ambiguous unscoped scan, and container move audit/concurrency.

September 24 storage/material follow-up: `MaterialLotProductPostgresTests` now covers automatic, stable purchased-product material identity across two lots and preservation of a legacy definition. A connected storage-settings case covers creation, unused-name correction, stale-version rejection, referenced-name protection, deactivation/reactivation, exclusion from new lots and duplicate-name rejection. These regression sources were compiled in Release; tests were not run for this change.

September 24 reagent manufacturing follow-up: `ReagentManufacturingDomainTests` covers independent approval or a reasoned administrator override, exact run procedure snapshot after revision, ordered step and source-use requirements, and abandonment retaining source-use count. `ReagentManufacturingPostgresTests` covers seeded internal producer, generated lot prefix, immediate source deduction, stale-version rejection, retained deduction after abandonment, QC hold and output lineage. These focused cases passed after approved local migrations. Additional connected cases for role gates, concurrent starts, seed/backfill, expiry/hold/overdraw and no sample/tube schema links remain in the acceptance plan.

September 24 unit and reagent identity follow-up: all three reagent migrations were explicitly approved and applied to the configured local development database. Five focused reagent domain tests pass, including stable reagent identity/unit. Seven focused connected PostgreSQL tests pass after the third migration: immediate reagent source use and abandonment, automatic purchased-product identity and unit matching, supplier catalog and product types, storage settings, expiration policy, and setting a future unit on a legacy product without rewriting its older lots. The connected cases use rollback transactions or fixture cleanup. Release solution build has zero warnings, and EF reports no model changes beyond the generated migration.

September 24 release verification: the complete Release suite without a reference database passed 755 cases, with 344 database or platform cases skipped. A full connected run against an isolated database migrated from empty passed 1,090 cases, failed seven older laboratory/shipping fixture assertions, and skipped two environment-specific cases. The seven failures reflected the first-print requirement for newly generated library/sequencing tubes and the now-valid reuse of a printed barcode across different manufacturers. After correcting those fixtures, all 11 affected connected journeys passed in a focused rerun. This is combined full-run and focused follow-up evidence, not a clean connected full run. The scratch database was dropped. EF reports no pending model changes. The new reagent and storage connected cases passed on the configured local development database in the preceding focused run; full hosted, physical-label and bench acceptance remain separate.
### September 24 Phaeno reagent product follow-up

The Phaeno catalog now creates a distinct Reagent product and prepared-material
identity per named reagent. New workflows require that product; manufacturing
runs pin its product onto the output lot. The new migration links existing
prepared identities and lots. The connected catalog scenario covers multiple
products, fixed type, immutable saved unit, renamed identity, and status sync;
the manufacturing scenario covers workflow creation, inactive-product denial,
required expiration, and output lot product lineage. The migration-discovery
assertion now expects 18 revisions. These
tests were added but not run because this follow-up did not request tests.

### Transportation kit product and assembly (2026-09-24)

The local kit-product migration was explicitly approved and applied to the configured development database. New domain tests cover independent approval, pinned step snapshots, ordered completion, an exact physical tube rescan, and verification invalidation. A connected PostgreSQL test covers registering a full stock roster, rejecting a mismatched rescan, retaining a reasoned correction, and verifying the corrected roster; its synthetic records are cleaned up. Both domain tests passed. The connected `SampleShippingPostgresTests` group passed 96 cases with one existing skip; the backend solution build passed with zero warnings and errors. Further connected acceptance must exercise a named Phaeno kit product through workflow/BOM approval, paired shipping specification, lot consumption, assembly completion, Customer dispatch and stock-to-return-to-Lab tube lineage; include concurrent retries and historical definitions without invented verification.

The Phaeno kit catalog regression now creates a kit product, corrects its name before specification, and rejects a direct API attempt to change its SKU afterward. The focused case passed against the configured local PostgreSQL database with its changes rolled back (1 passed, 0 skipped); the Release solution build passed.

### September 24 review-remediation coverage

Kit domain regressions now check that a same-author override needs platform-administrator authorization and a reason, plus immutable recorded tube-lot matching. A reagent domain regression checks that an approved prior procedure remains inspectable after revision without a run. Connected acceptance remains required for withdrawn steps/components at approval, inactive finished products at preparation/recommendation, one source tube lot per kit with multiple material lots available, discrete `each` consumption, current approved workflow selection, and rejection of an unlinked new shipping specification. These additions have not been run in this remediation turn under repository verification policy.

The migration-discovery assertion expects 23 migrations after the master-mix gap-closure migration.

### Single-use master mix (2026-09-24)

`MasterMixDomainTests` covers independent workflow approval, exact procedure revision snapshots, ordered completion with ingredient evidence, allocation across more than one tray, overdraw rejection, and terminal discard with a separately measured amount. The September 24 disconnected backend suite passed 760 cases, including these domain tests, and skipped 348 database-dependent cases. The connected backend suite passed 1,106 cases with two skips against a newly migrated disposable PostgreSQL database, then dropped. Feature-specific connected PostgreSQL acceptance remains to cover source-lot QC, expiry, unit and stock enforcement; exact approved revision pinning without silent adoption; atomic tray-step save and replay; concurrent trays competing for the final amount; operator role gates; and retained ingredient/tray lineage after discard. With explicit owner approval, the Lab step naming and master-mix migrations were applied in order to local development database `phaeno_ops_clean_20260919` on `localhost:5432`; EF lists both as applied and reports no pending model changes.

Gap-closure acceptance must additionally exercise exact recipe totals across multiple lots, extra/missing/wrong-unit ingredients, independent Supervisor deviation approval and invalidation after another ingredient, Pacific local midnight and daylight-saving boundaries, concurrent workflow retirement versus mix preparation and new-tray creation, blocked retirement for active approved Lab steps, permitted use of an existing Ready mix on an open tray after retirement, rejection of new trays pinned to a retired recipe, full barcode scan matching, and correction races. Include the retired-recipe check for a protocol pinned through an older Lab step version, and verify that a failed new-tray request creates no batch. For corrections, verify a never-dispensed ingredient restores stock exactly once, an exhaustion override instead holds the lot for count, a never-dispensed tray use restores mix allocation once, and an uncertain or physically dispensed use stays recorded while the mix closes and the source lot is held. Confirm duplicate request IDs and same-target corrections cannot apply twice. The `CloseMasterMixGaps` migration was applied to configured local database `phaeno_ops_clean_20260919`; EF lists it as applied with no pending model changes. Connected acceptance has not run under the request-only test rule.

# Global Phaeno ship-to default — September 25, 2026

Regression scope: one configured destination family follows its latest current Active revision; a new finalized Job selects that destination only when its Sample type has a current Active assignment and procedure; an absent or incompatible default fails finalization with a configuration error; an amended Job retains a compatible selected route. Fulfillment offers only Active destinations compatible with every requested kit, permits a change before the first dispatch and before packing or packet issuance, and rejects route changes afterward. Migration backfills the default only when exactly one Active destination family exists. The initial checkpoint used a Release build and EF model checks; the focused connected regression added afterward is recorded below.

The partial-dispatch regression `PartialDispatchKeepsItsSavedDestinationAfterDeactivationAndRequiresReceivingConfirmation` covers a changed Default and deactivated exact saved revision. Detail still offers that revision to the committed Job, while the command rejects dispatch without receiving confirmation and rejects a redirect even with confirmation. It records the confirmed continuation and retains the Job's saved destination.
It also covers a later kit request on the same Job, the physical-kit detail dispatch API, and confirms that new work excludes the inactive destination. This case and the two adjacent route-lock/partial-dispatch cases passed against the verified disposable PostgreSQL reference database.
