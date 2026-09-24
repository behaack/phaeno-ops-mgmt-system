# Frontend Test Plan

The September 2026 manual UAT pack and its case scripts were retired after substantial workflow changes. Historical case IDs and results below describe their dated checkpoints; derive any new acceptance exercise from the current product and code. Automated regression coverage remains tracked here.

## September 23, 2026 — DataMatrix labels and readable scan results

The container-label component regression now requires a matching scanned value before **Label printed** and preserves failed-print reporting. New POMS tubes display **Label pending** until verification, and sequencing transfer actions remain unavailable while the destination is pending. Sample tube matching and the preparation tray regressions expect readable saved identifiers without an on-screen QR image. The dedicated tray/kit/packet print surfaces retain their scannable codes. TypeScript, scoped lint and the client/SSR production build passed before the pending-status follow-up; focused component tests were updated but not run because no test execution was requested. Physical DataMatrix decode/print quality still needs bench acceptance.

## September 23, 2026 — Review follow-up

`SampleShippingDetailPage.test.tsx` adds required-error association and unsaved dispatch discard coverage. `SequencingTubesDialog.test.tsx` checks that a precise decimal is compared with the exact source balance and submitted as text without JavaScript number conversion. `biological-material-fields.test.ts` and `PreparationBatchPage.access.test.tsx` cover precise source-to-library transfer entry, exact source comparison, representable balance and same-command retry. Dashboard component cases cover a shared counts/list response, Department changes, pagination, unavailable data, and retry. The six focused frontend files passed 55/55 tests; TypeScript, full ESLint, documentation consistency, and the production Vite build pass. The full frontend unit suite was not rerun for this follow-up.

## September 23, 2026 — Material amounts, transfers and expiration

The owner subsequently authorized the release checks. The full unit suite passed **1,208 tests in 188 files**; the final durable-recovery changes passed **15 focused tests in two files**. Full ESLint, TypeScript, all 56 generated guides and the production build pass. Preparation saves retain their report and original command across reload; sequencing saves retain the same original command. Real browser storage and exact replay are exercised by the [E2E checkpoint](E2E-TEST-PLAN.md#september-23-2026--material-amounts-transfers-and-expiration). These results supersede the initial unexecuted checkpoint below; physical bench acceptance remains separate. See the [release record](../operations/material-tracking-release-20260923.md).

Authored/updated regression sources cover per-tube shipment amount entry and packet display; Biological material configuration/fictional preview; distinct library tube allocation, source/destination scans, amount/unit validation and optional exhaustion; deliberately repeated transfers and measured yield; sequencing allocation/transfer, immutable uncertain retries and read-only frozen batches; lot amount/exhaustion and product-dependent expiration entry. Run TypeScript and focused lint at the integration checkpoint. Automated suites are not requested; see [implementation status](SAMPLE-MATERIAL-TRANSFER-PLAN.md).

Manual acceptance remains required for focus/scanner behavior, dirty/uncertain-request protection, error recovery, the contextual Actions rule, 320px/desktop light/dark views, real labels and physical amounts. Preview must not allocate containers, consume material or save configuration.

## September 22, 2026 — Authorized release regression checkpoint

The owner requested the full release checks. All **1,185 unit tests in 185 files passed** with four workers. Shipping-container assertions now follow the Kit contents editor; catalog menu tests use the established keyboard opening interaction. The changed sources pass ESLint and TypeScript, and all 56 generated help guides pass consistency checks. Temporary ignored preview files are excluded from ESLint alongside other generated output. Shipping Supplier, Product name and Quantity controls now announce their required state to assistive technology. See the [release record](../operations/shipping-dashboard-release-20260922.md) for build/deployment status and separate hosted acceptance boundaries. This checkpoint supersedes the earlier unexecuted-suite notes below for current source.

## September 22, 2026 — Shipping kit contents

Update container editor coverage for multiple product rows, supplier-scoped active choices across all types, per-row quantity, removal, activation validation, catalog failure and unavailable saved references. Preserve earlier-notes validation. Add stock preparation prefill coverage. Typecheck/lint only; automated execution was not requested.

## September 22, 2026 — Customer metrics

`CustomerDashboardMetrics.test.tsx` covers full summary counts, zero results,
metric selection, unavailable/stale data and Department changes.
`CustomerLabRequestsCard.test.tsx` adds the results view for completed Jobs and
updates query expectations for the selected view. Regression sources added;
automated execution remains request-only.

## September 22, 2026 — Customer dashboard and fixed priced runs

`CustomerLabRequestsCard.test.tsx` covers two named pricing links, member guidance,
waiting on Phaeno, paging, Department reset, failed-refresh recovery and removal
of completed work after refresh. `SampleIdentificationRows.test.tsx` covers fixed
one-per-sample runs with editable reserve tubes and retained additional-run
allocation. Regression sources are added; automated execution remains request-only.

## September 22, 2026 — Pricing next-step guidance

Commercial intake displays bold Phaeno next-step guidance only for Lab Service
orders in Quote in preparation, choosing Review and issue quote or Issue quote
from the saved proposal. No tests added for this presentation change; existing
intake and quote behavior coverage remains unchanged. Automated execution remains
request-only.

## September 22, 2026 — Empty later requirements

The New Customer order readiness disclosure is hidden only when quote and invoice
blocker lists are both empty. The ready message omits its reference to hidden
requirements. Existing nonempty readiness coverage is unchanged; no new tests for
this small presentation change. Automated execution remains request-only.

## September 22, 2026 — Completion notes and checklist feedback

Updated `RequestActionDialog.test.tsx` covers blank completion notes (including
relationship changes), the retained required organization, and required cancellation
reason validation/submission. `CrmPortalAccessPage.test.tsx` covers the all-done
message, bold completion instruction and blank-note submission. `CrmRequestCard.test.tsx`
retains manual-review messaging and failed-refresh completion gating. Automated
execution remains request-only; signed-in verification is deferred. This change
does not start or stop local servers.

## September 22, 2026 — Catalog families and unused-item deletion

`CatalogItemActions.test.tsx` adds coverage for active-item protection, disabled
deletion explanations, named confirmation, Cancel focus/restoration, no write on
cancel, and submission of the reviewed version only after confirmation.

Catalog family regression sources: PlatformQuoteDialog tests cover an active specific offering alongside the inactive generic record, explicit choice with multiple offerings and exact selected item/price. LabChangeQuotes retains the accepted offering when another active item appears first. Manual coverage includes the quiet inactive catalog, editable family, inactive create defaults, protected deletion, named confirmation/cancellation, and focus restoration. Automated suites remain request-only.

## September 22, 2026 - Invitation completion after account setup

Invitation component and session regression sources cover storing explicit
acceptance before verification, completing once after authentication, waiting
for access refresh before home navigation, selecting the invited organization,
changed-version review, mismatched/unverified identity, missing names, unavailable
links and recoverable acceptance failure. Storage cases cover replacement-token
isolation and cleanup. The existing MFA route still preserves the invitation
through required setup; completion now resumes the reviewed acceptance there.
Automated execution remains request-only; provider state in these cases is simulated.
TypeScript, scoped ESLint and generated-documentation validation passed. An
isolated browser preview exercised the real invitation components with synthetic
provider/API state; no real account, membership or MFA enrollment was changed.

## September 22, 2026 — Optional Company approval notes

`RequestActionDialog.test.tsx` covers blank approval submission for the four eligible request types, the visible optional-note field without a Required legend, submitting an optional note, reasons required for all declines and other approval types, and preserved existing-scope confirmation. TypeScript and scoped lint are the static checkpoint. Automated test execution remains request-only.

## September 22, 2026 — Company departments before online access

Authored `CrmCompanyDepartments.test.tsx` covers direct Add department, opening/cancelling without writes, Company-scoped saving, retained draft on failure, setup without membership controls, approved-scope controls, and inactive-Company feedback. Automated execution remains deferred under the repository request-only rule. TypeScript and scoped lint are the static checkpoint.

## Sequencing assembly workspace — September 22, 2026

`assembly-jobs.test.ts` and `AssemblyJobs.test.tsx` cover fresh versus missing/stale/invalid percentages, final disposition replacing progress, actual elapsed-time formatting and unavailable-provider messaging with Start disabled. Build, TypeScript and touched-file lint checks are the implementation checkpoint; automated test execution remains request-only. Further interaction acceptance covers input/run selection, retry reasons, cancellation/analysis-link dialogs, navigation/search restoration, read-only roles and focus return. The runtime contains no simulated provider or fabricated scientific results.

## First-time MFA return path - September 21, 2026

`SetupMfaRoute.test.tsx` covers loading, pending MFA, completion with/without a
saved invitation, reopening completed setup, and missing-session recovery.
Tokens remain available for explicit acceptance. Three cases reproduced the
old dashboard redirect; all six pass after correction. The five-file focused
account/invitation batch passed 35/35, including SessionAccessAcceptance,
AcceptInvitePage, AcceptInviteSession and InvitationAuthentication. TypeScript
and scoped ESLint passed. Provider state is simulated; live recipient MFA
acceptance remains separate.

## Shipping availability actions — September 21, 2026

`SampleShippingConfigurationPanel.test.tsx` now covers separate Activate/Deactivate actions for sample types, destinations and assignments; unchanged revision identifiers; content revisions saved inactive; cancellation/error retention; ended-history controls; older active revisions behind drafts; and named prerequisite guidance before assignment activation. Status actions share the existing Actions menu and confirmation/focus patterns. Automated suites remain request-only and have not been executed for this change.

## Samples and shipping workspace - September 21, 2026

Updated sample configuration/navigation coverage for the consolidated workspace and optional legacy packaging. Added frozen-packet rendering cases for regular ice and no cooling, common-step deduplication, per-sample packing and historical standalone text. Automated suites remain request-only. Type checking and focused lint are build/static checks, not test execution.


## Managed scientific uploads — September 19, 2026

Added ScientificFilePicker.test.tsx for server-generated metadata, no manual reference fields, invalid-size rejection and retaining the prior file after failed replacement. Sources added; not executed (tests remain request-only). See [plan](LAB-MANAGED-SCIENTIFIC-FILES-PLAN.md).

## Company request history search and pagination — September 19, 2026

Owner limited this change to Completed / history. Add a read-only, platform-admin history endpoint with database filtering by company name, request number, summary, decision and completion notes; case-insensitive literal matching, newest-updated ordering with ID tie-breaker, 25-row pages, bounded page sizes and stale-page clamping. The active queues remain unpaginated and load only active requests; legacy API callers retain their existing response. History search/page stay in CRM route state; searching resets page, direct request links retain their exact target, and only history shows the search/paginator. No schema, permission or migration changes. Regression sources cover authorization, page boundaries, global search, empty matches, pinned requests and active/history separation. Automated suites remain request-only.

## Finance tabs and customer-name filtering — September 19, 2026

Finance uses the shared standard tab bar. Invoice, receipt, and Customer billing lists place a customer-name text search and Clear filter in the shaded, bordered card header. Search matches partial names without case sensitivity and persists in route state across tabs and record navigation. Existing customer-ID links remain supported. Focused regression source covers partial-name filtering, selection and clearing; automated suites remain request-only.

## Current sample-type revisions — September 19, 2026

See [owning plan](SAMPLE-TYPE-CURRENT-REVISION-PLAN.md). Coverage added for family-based previews, inactive/future exclusion, readiness, existing container compatibility, duplicate-family rules, missing effective revisions, and immutable issued packet snapshots. UI coverage verifies one named choice per family and current revision readback. Manual acceptance: publish an approved successor, confirm rule/container/readiness continuity for new shipments and unchanged old packet content; an inactive or future successor must not interrupt current use. Automated suites remain request-only and were not run.


## Automatic destination references — September 19, 2026

Destination regression coverage verifies hidden manual-code entry, generated DEST- references, reuse on failed-save retry, and original-code preservation when renaming in a revision. TypeScript, scoped ESLint, documentation consistency and diff checks passed. Browser verification was blocked by the local Access check failed screen, including after one reload. Automated suites were not requested or run.

## Sample instruction units and symbols — September 19, 2026

SampleShippingConfigurationPanel regression covers all eight helpers, replacing selected instruction text with a unit, subsequent symbol insertion at the cursor, focus/caret restoration and no premature save. Existing coverage keeps the submission-unit menu restricted and verifies insertion between existing text with caret restoration. TypeScript, scoped ESLint, generated documentation consistency and diff whitespace checks passed. Browser verification reached sign-in, so visual verification remains pending. Automated suites are request-only and were not run.

## Restricted sample-size helper — September 19, 2026

SampleShippingConfigurationPanel coverage now expects the restored Units helper, exactly µL/mL choices, no header submission-unit menu or symbol insertion, and focus returned to the editable field after choosing a unit. Lab Steps retains its existing full helper. Min defaults to 1 and optional Max remains unchanged. TypeScript, scoped ESLint, documentation consistency and diff whitespace checks passed. The fresh browser verification tab required sign-in, so visual verification remains pending. Automated suites were not requested or run.

## Sample-sequencing runs — September 19, 2026

Job profile, quote review, additional-sample quotes, per-sample entry/edit, CSV preview and laboratory progress expose sample-sequencing-run quantities separately from physical samples and tubes. LabJobDetailsDialog regression includes one sample with 20 runs. Verify whole positive counts, allocation mismatch messaging, dirty drafts, keyboard labels, responsive layouts, and material-reuse confirmation. Existing strict request-body expectations need the additive sequencingRunCount field. Typecheck/lint run; test suites remain request-only.

## September 19, 2026 — Department-led administration

Updated checklist copy and existing Kit purchase/Change-quote coverage to use server-provided selected-Department capabilities. Department administrators may review purchases and changed prices; ordinary members retain disabled/absent decisions. Automated suites were not requested or run.


## September 19, 2026 — Company header Actions

CrmRecordEditSnapshots.test.tsx now opens Company edit, owner and lifecycle dialogs through the Actions menu; existing conflict/draft/version assertions are retained. No new tests are needed for this presentation-only change. TypeScript and scoped ESLint pass. Automated suites were not requested or run.

## September 19, 2026 — Development invitation module recovery

A standalone verification preview had replaced the running Portal's shared Vite
optimization cache; the active app still referenced the missing @clerk/react/errors
output. Portal now uses node_modules/.vite-portal-${mode}, isolated from default
standalone previews and from test mode. The dev server restarted automatically and
rebuilt the missing module in the new cache. Signed-in browser navigation to
/accept-invite rendered the normal missing-link guidance, with no module/MIME/runtime
errors. No invitation token was read, renewed, submitted or accepted. Scoped ESLint
and TypeScript checks pass; this reversible cache change adds no automated tests.
Automated suites were not requested or run. Frontend README records the isolation rule.

## September 19, 2026 — Focused People actions and invitation editing

CrmCompanyWorkspaces.test.tsx covers one contextual Actions menu and pending-to-expired readback.
CrmPersonInvitationDialog.test.tsx covers direct edit, separate resend/revoke review, hard-bounce
blocking and resend failure. CrmPersonAccessDialog.test.tsx covers active-only role/removal work,
confirmation and no invitation controls. InvitationAccessDialog.test.tsx covers versioned saves,
required Departments, protected drafts and explicit conflict reload. AcceptInvitePage.test.tsx
covers proposed access and an explicit second acceptance after stale review. Sources typecheck;
automated suites were not requested or run. Scoped lint passes. Manual browser evidence is in
the E2E plan; provider delivery and actual acceptance remain unverified.

## September 19, 2026 — Automatic Department references

DepartmentSettingsDialog.test.tsx covers creating with only a name, required-name validation,
absence of editable Code/Reference fields, displayed saved references, and rename submissions
omitting Code. Sources added; automated suites were not requested or run. Type/lint/help checks
passed. After local access recovered, signed-in read-only browser checks confirmed no Code input
on Add, automatic-reference guidance, required-name validation/focus, the saved GENERAL reference
as read-only edit context and Cancel restoring trigger focus. No department was created or renamed.


## September 19, 2026 — Department menu width

Presentation-only change: signed-in DOM checks confirm a 192px menu and one-line action labels without clipping; scoped ESLint passes. No new tests are needed for the width adjustment, and automated suites were not requested or run.

## September 19, 2026 — Request work and guarded completion

Added crm-request-work.test.ts for administrator invitation/activation/expiration, source-linked and future-effective service changes, relationship conversion, offboarding review, exact order creation, and current Trial scope decisions. CrmRequestCard.test.tsx covers live invalidation, disabled-to-enabled completion, failed refresh with cached success, and retry. Updated the existing queue completion test for Actions and readiness. Test sources added; suites not executed unless requested.

Automatic access-completion follow-up updates CrmRequestCard.test.tsx for Waiting for acceptance, absence of manual completion, ready-state reconciliation, preserved Company link/history cache, failure/retry and unchanged manual-work gates. Sources added; suites remain unexecuted.

## Sample traceability — verified September 18, 2026

The [focused verification record](../testing/runs/2026-09-18-sample-traceability.md) supersedes the initial unrun notes below. **41 focused frontend tests passed** across performance input, DST handling, evidence presentation, execution, preparation and configuration preview. Typecheck and touched-file lint pass. Sample history includes exact-result selection, explicit unknown/unavailable states, saved reports and organization-scoped lookup; browser evidence is recorded in the E2E plan. Existing protocol and preparation screens remain the authoritative detailed work views.

## Supporting reports — continuation verification

The attachment continuation adds a specimen-scoped **Supporting reports** section, preserves failed-download metadata and permits retry, and displays server integrity errors from binary-download responses. It is verified in four passing desktop/mobile light/dark browser cases, documented in the [restore/attachment record](../testing/runs/2026-09-18-investigation-restore.md). The prior 41 unit cases are unchanged; they were not rerun for this continuation.

## Step performance slice — initial authoring checkpoint, superseded above

`step-performance.test.ts` covers confirmation without a configured instruction checkbox, server-owned Now timestamps, late-entry validation and offset serialization, future/invalid dates, and omission of hidden performance fields for skips/corrections. `StepPerformanceEvidence.test.tsx` distinguishes original performer from correcting recorder, retained offset/reason, historical unknowns and skips. Existing preparation, configuration-preview and execution-form fixtures include the new personal confirmation. Authored tests remain unrun. Frontend typecheck and lint on every touched TypeScript/TSX file passed; documentation generation/check passed for 56 guides. Browser, keyboard, focus, desktop/mobile and dark-theme acceptance remain pending; typecheck/lint are not substitutes for these checks. Touched execution steps group repeat/correct into one Actions menu and retain a direct action when only one is available.

## Sample traceability — planned, September 18, 2026

Phase 1 is backend capture/read contracts with Phaeno guide updates; no investigation UI or capture form is added in this phase. Documentation catalog review dates and generated search content are refreshed. Frontend automated tests were not run for this implementation.

Pending coverage follows the [Sample traceability acceptance matrix](SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md#12-acceptance-and-verification-matrix): exact selected-result/tube identity, preserved attempt/correction history, required capture forms, honest coverage and load failures, document availability, scoped reports, and accessible desktop/mobile navigation. The display must never infer missing source relationships. No tests have been added or executed for this planned feature.

## Sample-type detail navigation (2026-09-18)

`SampleShippingConfigurationPanel.test.tsx` now uses an actual memory router and adds list/detail/return, exact historical revision, latest-only creation, and missing-record checks. Viewing details must not write configuration. Automated tests were not requested and remain unrun. Typecheck, scoped lint, documentation consistency and signed-in local navigation form the implementation checkpoint.

## Service catalog scientific consolidation (2026-09-18)

The Order configuration navigation regression now rejects a standalone Lab Service offerings entry. Scientific-form schema cases require explicit sample assignments while allowing legacy availability withdrawal. The service item owns its scientific-version panel and explicit sample-revision controls. Typecheck and scoped lint passed; automated component tests remain unrun because they were not requested. See the owning Order Management plan for manual browser evidence. Remaining acceptance includes populated current/history display, stale-save recovery and narrow-layout keyboard access.

## September 18 jobs/settings release checkpoint

Full frontend typecheck, lint and production build passed. Updated user guides are included in the generated documentation package. Automated suites were not requested or run. Earlier navigation acceptance records are historical; the current dropdown uses sentence case and the shipping preview is a rule action. See [release evidence](PORTAL-JOBS-SETTINGS-RELEASE-2026-09-18.md).

## Material lot identity matching (2026-09-17)

See [implementation plan](MATERIAL-LOT-PRODUCT-LINK-PLAN.md). Added domain/Postgres regressions for exact product/definition matching, unlinked and wrong-supplier assignment, immutable assignment, stale versions, configured prepared identity, and rejected wrong-lot consumption with no stock change. Updated material creation fixtures for required products and added frontend helper/schema checks for same-vendor wrong products, unlinked lots, prepared identity and unusable stock. Automated tests are authored/compiled but not executed. Build, typecheck, scoped lint, migration review and local read-only UI checks form this checkpoint; populated operational writes remain unverified.


## Material lot detail navigation (2026-09-17)

Manual acceptance: open a material lot by its linked identifier, inspect identity/stock/storage/dates and QC (including failed reason), refresh/direct-load the detail URL and return to Materials. Inspect prepared-reagent source lot links when populated. Permission, mock-session, error/retry and missing-record rendering reviewed in source. No automated tests added or executed for this read-only detail view; typecheck and scoped lint at the checkpoint.


## Supplier catalog presentation (2026-09-17)

Updated existing supplier/product/type test selectors for **Product name** and the standard **New…** button labels. No new tests for the cosmetic card-header change; automated execution remains deferred. Verification uses frontend typecheck, scoped lint and visual inspection.

## Shared output form checkpoint (2026-09-17)

Authored PreparationOutputsDialog regressions for required per-tube quantities, shared defaults/overrides, single submission, individual barcode results, existing/failed tubes, stable rows after uncertain response, API compatibility and cancel. Typecheck and scoped lint at the checkpoint; automated tests not run.

## Preparation report checkpoint - September 17, 2026

Added preparation-dialog regressions for optional file selection/omission, preserved required capture validation and older-API compatibility. Multipart regression covers generic and legacy QC routes. Tests authored, not run.

## Automatic conditional-review skips — September 17, 2026

The preparation page consumes the server eligibility flag and submits one versioned reconciliation per batch version when no form is open. Added coverage for automatic initiation, visible failure/retry, no retry loop and reuse of the same request after uncertain failure. Existing session/role gates remain in force. Typecheck and scoped lint only; automated tests not executed.


## Single-entry review rationale — September 17, 2026

Added regressions for mandatory rationale captured once and copied to condition assessment, explicit skip reason despite a retained rationale draft, and separate required repeat/correction reasons. Tests authored but not executed per repository instruction; typecheck and scoped lint cover compilation/style.

## Collapsed sample cards — September 17, 2026

Updated the existing identity-entry test to expand each sample before interacting with its details. All card states now start collapsed, including failed tubes. No new tests; execution remains deferred per repository instruction.

## Optional preparation QC reports — September 17, 2026

Added modal regressions for optional omission with mandatory QC, save-only file submission, draft preservation after rejection, removal, oversized-file validation, cancellation, and old-API compatibility. Added Axios multipart serialization coverage. Typecheck and scoped lint are the requested-scope checkpoint; automated tests are authored but not executed. Download failure/retry and keyboard/screen-reader upload behavior remain in connected manual acceptance.


## Workflow-based preparation progress (2026-09-17)

Added progress-helper regressions for single counts across multiple stages/tubes, partial coverage, explicit protocol completion, QC hold/repeat, stale evidence after correction, failed/empty batches, and permitted step/stage skips. The progress popover test asserts step/protocol totals replace tube outcomes under Prepare libraries. Tests authored but not executed; typecheck and scoped lint are the checkpoint.

## Retained failed tubes (2026-09-17)

PreparationStepDialog coverage now asserts disabled failed coverage, a read-only card with failure evidence and unsaved reference captures after acknowledged failure, retained other drafts, and submission containing only surviving members. Added persisted-failure reopening/skip and all-failed coverage. PreparationTray coverage asserts failed membership still occupies the same cell and opens its details. Tests authored but not executed; typecheck and scoped lint are the checkpoint.

## Sample card headers and identity explanations (2026-09-17)

Update PreparationStepDialog selectors for the simplified sample heading and card disclosure. Cover omission of the redundant identity exception field and retention of required tube reasons for QC holds. Tests updated but not executed; typecheck and scoped lint are the checkpoint.

## Fail a tube from step entry (2026-09-17)

Added PreparationStepDialog regressions for same-dialog failure confirmation, cancellation with draft and focus preservation, required reason/evidence, duplicate-submit protection, pending controls, failure rejection, operator permissions, and successful removal from coverage while retaining other values and requiring renewed coverage confirmation. Assert no implicit step submission and no failed tube in the subsequent evidence payload. Tests authored but not executed per repository scope; scoped lint and typecheck passed.

## One identity check date per entry (2026-09-17)

Update the preparation identity form regression to use identity-checked-on, require exactly one labeled date control, and assert a shared date with no per-tube overrides. Tests updated, not executed; scoped lint and typecheck are the checkpoint.

## Automatic preparation specimen references (2026-09-17)

Add PreparationStepDialog coverage for read-only customer sample/type/accession details, required manual source scans, submission without accession or spurious exception notes, and compatibility with older APIs lacking automaticSpecimenReferences. Typecheck and scoped lint; tests not executed.

## Tray collapse after preparation starts (2026-09-17)

Adapt the existing running-tray regression to expand the initially collapsed panel before checking that scanning is unavailable. Tests not run per repository instructions; scoped lint and typecheck are the checkpoint.

## Direct start within library preparation — September 17, 2026

Update phase and component assertions for four steps, with confirmed Draft and InProgress both current at Prepare libraries. Page coverage checks direct start payload, no modal, pending state, duplicate-click prevention, visible failure, uncertain-response retry identity reuse and transition to active work. Tests updated but not executed; scoped lint and typecheck are the checkpoint.

## Preparation specimen declarations — September 17, 2026

PreparationBatchPage access tests now render selected-tube details through the tray mock and assert biological source/safety text, multiline preservation and explicit Not recorded fallbacks. No inferred safe status. Tests updated but not executed; typecheck and scoped lint are the checkpoint.

## Tray confirmation checkbox — September 17, 2026

PreparationFormDialog coverage verifies an initially unchecked review checkbox, no select, unchecked/cleared submission rejection and checked submission of the existing yes value. Tests added but not executed; scoped lint and typecheck are the checkpoint.

## Combined preparation step and help panels — September 17, 2026

Update preparation-progress phase coverage for the five-step journey; partial trays remain in Prepare tray until confirmed. PreparationProgress component coverage checks five information controls, saved confirmation transition, keyboard focus retention, Escape dismissal, click/tap opening, current tube counts and persistent next-step guidance. Tests added/updated but not executed per repository policy; scoped lint and typecheck are the checkpoint.

## Restore saved tray identity — September 17, 2026

PreparationTray tests now use persisted tray assignment immediately, verify remount enables tube scanning and Confirm tray without another assignment write, retain pending assignment acknowledgement/focus coverage, and verify failed empty-tray replacement plus cancellation restores the original identity. Confirmed/read-only guards and unsaved tube gating remain. Existing scan tests no longer perform browser-only verification. Tests updated, not executed; scoped lint and typecheck are the checkpoint.

## Guided preparation journey — September 17, 2026

New preparation-progress tests cover assembly/confirmation/start phases, delayed handoff, mixed outcomes, all-failed/cancelled batches, complete handoff assignment and final-stage output/QC guards. PreparationTray tests distinguish physical verification from assembly confirmation and cover confirmed-draft read-only controls, retained inspection and unsaved-scan gating. Page access coverage checks direct Start action and hidden discovery/handoff for confirmed drafts. Existing pagination/access tests remain. Tests are not run without request; typecheck and scoped lint are the checkpoint.

## Eligible tubes inside Tray — September 17, 2026

Update the PreparationBatchPage access test's Tray mock to render the eligible-tube slot; open the initially collapsed disclosure before exercising the existing pagination assertions. No new automated test is needed for the bounded placement change. Typecheck and scoped lint are the checkpoint; tests not run.

## Eligible tube pagination — September 17, 2026

PreparationBatchPage.access.test.tsx adds eligible-tube page navigation, endpoint page arguments, first/last button states, both filter resets and Clear filters. Tray scanning is isolated from this list regression. Tests updated, not executed; typecheck and scoped lint are the checkpoint.

## Physical preparation trays — September 17, 2026

PreparationTray regressions now use separately assigned physical tray identities and await assignment acknowledgement. Added selection coverage verifies one tube detail at a time and no repeated Planned text; an unassigned tray keeps inputs disabled until server acknowledgement. Existing scanning/error/skip/focus/read-only coverage and label preview assertions are updated. Tests are not executed without request; typecheck and scoped lint are the checkpoint.

## Inline tray scanning — September 16, 2026

PreparationTray.test.tsx adds batch identity gating, initial focus, acknowledgement-only advance, duplicate-submit prevention, unavailable/filled-cell skipping, error-value/focus retention, full-tray announcement, read-only/started views and label identity preview coverage. Tests added but not executed per repository policy; typecheck/scoped lint and help consistency are the checkpoint.


## Service-based commercial jobs — September 16, 2026

Add specimen workspace regression: v1 attempt continues its v1 next stage even with a v2 default and mixed version stage list. History displays the attempt version. Scientific review uses service version, not the historical workflow pin. Component tests added, not executed; typecheck and scoped lint are the implementation checkpoint.


## Administrator approval override — September 16, 2026

ProtocolApprovalDialog and WorkflowApprovalOverrideDialog coverage requires reason plus explicit attestation, preserves fields after a rejected save, and blocks pending dismissal. Protocol override dirty cancellation is covered. ProtocolList router mock updated for navigation protection. Tests added/updated, not executed by request policy.

## Accession footer summary — September 16, 2026

Updated LabReceiptAccessionPanel.test.tsx for Accept (Y), exception and pending-acceptance totals before and after saving, and disabled Accept (0). The existing broken-tube and bulk-acceptance scenario covers saved exceptions, unidentified tubes and accepted tubes. Tests updated but not run, per requested scope.

## Product type row actions — September 16, 2026

SupplierCatalog.test.tsx also covers supplier row editing, versioned deactivation, product activation and failed-save retention. ProductTypes.test.tsx now covers list-row editing, confirmation before a versioned deactivation request, activation of inactive types, and the detail Actions menu. Tests updated but not executed; typecheck/lint and documentation checks used for this UI change.

## Supplier catalog tab navigation — September 16, 2026

Product types now lives under Suppliers & Products as a tab, with route-backed selection, legacy-link compatibility and return-to-tab links from details. Manual navigation acceptance remains pending; no automated test run requested for this navigation-only change.

## Managed product types — September 16, 2026

ProductTypes.test.tsx covers view-first type navigation, required descriptions, default non-kit use, preserved classification for referenced types and inactive filtering. Supplier editors load saved types; stock-kit coverage excludes reagents and inactive types. Tests not run.

## Supplier and product selections — September 16, 2026

Updated standard-kit and request preparation fixtures to use supplier/product IDs. Added description/type filtering, supplier-change reset and failed-catalog disabling coverage. Supplier catalog creation/editing, inactive filtering, required descriptions and error retention have focused component coverage. Tests are not executed unless requested.

## Standard kit preparation sections — September 16, 2026

Existing preparation and kit-request tests locate Supplier and Product # within the Tubes or Shipping Container fieldset. Existing default-product, optional-lot and submission assertions remain. Selectors updated; tests not run (not requested).

## Receiving and container location presentation — September 16, 2026

Kit-order selectors use Kit receiving location. Packing coverage preserves the multiple-location choice while stock at the selected location is empty, without showing the full container chooser prematurely. Tests updated but not executed (not requested).

## Container arrival guidance — September 16, 2026

Packing-panel cases cover hidden selection with no received stock, appearance after inventory refresh, and visible error/retry. Kit-panel coverage suppresses redundant ordering advice for outstanding deliveries while retaining the location link. Progress cases cover pending, partially dispatched and dispatched kit requests showing Wait for containers to arrive / View kit delivery while preserving actor, supply-completion and physical-receipt distinctions. Tests updated but not run (not requested).

## Transportation kit recommendation presentation — September 16, 2026

Existing panel expectations now omit the duplicated availability message. Kit adjustment coverage checks that the default recommendation is labeled in the ordering modal and that the label is hidden for custom sizes. Tests updated but not executed (not requested).

## Complete roster review and clear details — September 16, 2026

Updated sample panel coverage for complete rosters replacing CSV controls with a primary review action; partial rosters retaining import guards; application-modal clear confirmation/cancellation (without a browser prompt) restoring a blank ID and one tube without changing scope; and finalized samples remaining protected. Progress tests cover correct sources, unique IDs, positive tube counts and the next-step review-action host. Tests updated but not run (not requested).

## Sample identification — September 16, 2026

`SampleIdentificationRows.test.tsx` covers expected placeholder rows and one-tube defaults without writes, duplicate IDs, invalid tubes, sequential versions, partial failures, lost-response reconciliation and clearing dirty state. `LabJobSamplesPanel.test.tsx` follows Actions menus with concise Edit sample / Remove sample labels and covers source placeholders, unchanged import/finalization guards and unsaved-entry navigation protection. `LabJobOrderProgress.test.tsx` follows Sample identification and Match samples to tubes. Tests added/updated but not run (not requested).

## Lab request submission and pricing review — September 16, 2026

Lab request modal assertions now require Submit lab service request, Submit request, acceptance/decline guidance, no Customer price proposal and atomic submission input. Progress coverage distinguishes Waiting for pricing from Confirm pricing. Tests are updated but not run (not requested).

## September 16, 2026 — Invitation-authorized identity setup

Focused invitation component coverage verifies production and development ticket-based signup, required password and MFA handling, existing-user sign-in, fixed-email guards, rejected Portal revalidation, provider failure, and removal of private query parameters. Registration tickets are bound to the current session-stored Portal token and cleared when that token changes. Run the invitation authentication, page and session suites at the release checkpoint.

Focused verification: all 24 invitation component cases passed; TypeScript and scoped ESLint checks passed on September 16, 2026.

## Combined settings navigation — September 16, 2026

Existing navigation, settings-sidebar, retention-panel, and browser selectors follow **Order & retention settings** and its **File retention** section. Verify one menu entry, independent section permissions, the old retention URL redirect, policy history and Edit/Cancel, and sidebar return without changing saved policy. Automated tests were not requested and were not run. Signed-in local browser checks confirmed the legacy redirect, one combined menu entry, the selected retention sidebar item with its divider, policy history, and Edit/Cancel without saving. TypeScript, scoped lint, and documentation checks passed.

## Intake create action label — September 16, 2026

Updated the existing CommercialOrderIntakePanel permission assertion to the **New Order** accessible button name. This presentation-only change retains the existing creation behavior; automated tests were not requested and were not run.


## September 16, 2026 — Clear Home attention states

CrmHomePage.test.tsx retains exact filtered-link coverage and adds explicit zero-state and loading/error-not-all-clear coverage. Zero counts are neutral nonlinks; positive counts describe the rule and offer Review. Tests updated but not executed (not requested).

Signed-in local browser DOM verification confirmed all five zero counts, the No items need attention heading, explanatory rules and zero attention links. Screenshot capture timed out; populated/loading/error regression cases were updated but not executed. TypeScript, scoped ESLint, documentation consistency and whitespace checks pass. No business data changed.

## September 16, 2026 — Combined pipeline summary

Only multiple available active pipelines expose the Pipeline selector and All pipelines option, independently of the 30-day filter. One pipeline is automatically selected and its selector stays hidden. All pipelines displays one noninteractive All opportunities total from the paginated queue response's full matching count, not the current page length; the existing pipeline/stage context remains visible in each desktop/mobile queue row. Choosing a specific pipeline restores selectable stage summaries. Switching pipeline scope resets stage and pagination atomically. Saved views/export keep an empty pipeline filter for combined scope; the URL uses an explicit all selection so default initialization cannot overwrite it. Search and stale-work filtering apply to both count and queue. Older all-pipeline stale links remain supported. No API or database changes.

Verification covers one pipeline with/without stale filtering, combined count beyond a page, specific/all switching and hidden-stage reset, filtering and queue pipeline/stage context. Automated tests are not run unless requested.

Verified manually in a disposable local preview of the real page with 36 records across two pipelines: the combined total stays 36 on page 2, search reduces it to 1, stale filtering reduces it to 18, specific pipeline restores stage cards, selecting All clears a stage filter, and combined rows show pipeline/stage context. With only one pipeline, the selector stays hidden with stale filtering on/off and an existing All selection normalizes to that pipeline. Unpriced counts remain visible when qualifying records remain (15 with stale filtering versus 30 without). TypeScript, scoped ESLint, documentation consistency and whitespace checks pass. Preview data was local only; no business records were created or changed. Preview files/server were removed.

## September 16, 2026 — Opportunity filter toolbar

Clear filter is always visible at the end of the filter row, after the Pipeline dropdown when shown. On narrow screens with Pipeline visible, search spans the first row and Pipeline/Clear filter share the next. Disable it when no other filters or later queue page need clearing; stage-only selection does not enable it because All stages handles that reset. When enabled, clearing also resets the stage while preserving the pipeline. Other CRM pages retain their existing labels and visibility behavior.

Hide the Pipeline dropdown for one active pipeline, including with stale-work aggregation. Preserve automatic pipeline selection. Search applies after the existing 250ms delay and Enter submits immediately; there is no redundant Search button.

The earlier local browser check verified automatic search, reset behavior, single-pipeline dropdown hiding and the All pipelines exception. The local browser confirmed Clear filter stays visible and disabled with no applicable filters, enables after typing and returns to disabled after reset. Final local browser verification confirms Search, Pipeline, Clear filter left-to-right with aligned control bottoms; without Pipeline, Search is followed by the disabled Clear filter button. Scoped lint, documentation and whitespace checks pass. No automated tests added or run for these bounded presentation changes.

## September 16, 2026 — CRM Actions menus

Lead, pipeline and stage Actions menus retain existing availability and disabled guards. Verify keyboard menu operation, Edit/decision dialog handoff, Cancel returning focus to the trigger, default deactivation disabled and eligible deletion retaining confirmation. Automated component tests are not added for this presentation-only regrouping; execution was not requested.

Verified in the signed-in local Portal: pipeline menu contains Edit, disabled default Deactivate and Add stage; stage menu supports keyboard Edit; lead menu contains Edit, Qualify and Disqualify for a Working lead. Pipeline/stage edit and lead qualification dialogs opened and cancelled without writes, restoring focus to their Actions buttons after closing. TypeScript, scoped ESLint, documentation consistency and whitespace checks pass. Automated tests were not run.

## September 16, 2026 — Empty pipeline deletion

Review Delete visibility only for nondefault pipelines without stages, named confirmation, Cancel, pending dismissal protection, visible errors, success announcement and focus after removal. Component automation is deferred; test execution was not requested. Stage percentages now use smaller 0.65rem text.

## September 16, 2026 — Opportunity summary and queue

`CrmOpportunityStageSummary.test.tsx` covers combined counts, distinct currencies,
zero/unpriced amounts, numeric-only counts, stage probabilities, selection and
All stages reset. The redundant Stage dropdown is removed. A zero-count regression
covers summary responses without probability and configured 10%, 0% and 100% stages. Tests added,
not executed (not requested). The queue ignores legacy board preferences.

## September 16, 2026 — Missing conversion Company name

Missing-name conversion uses React Hook Form and Zod for conditional required
validation. Component test expansion is deferred; test execution not requested.
Review name visibility only for Create company without a recorded name, whitespace
validation, draft retention when switching choices and failed conversion.

## September 16, 2026 — Lead conversion Company dropdown

Single Company selection derives either an existing Company ID, createCompany,
or neither; the API shape and conversion prerequisites are unchanged. No new
component tests added for this bounded control change; execution not requested.
TypeScript and scoped ESLint pass.

## September 16, 2026 — Task editing and rescheduling

`CrmTaskEditDialog.test.tsx` covers pristine Save, preserved timestamp precision
and links/recurrence, local-time rescheduling, reminder validation, cache
invalidation, failed-save draft retention, discard confirmation, refreshed
versions with explicit review and concurrent completion. Shared dialog state is
owned above each task list so background list changes do not discard an editor.
Tests added, not executed (not requested).

## September 16, 2026 — CRM Requests navigation

The queue now lives under `/crm/requests`; legacy queue URLs redirect with
validated search context and leave legacy Company detail links intact. Routing
and active-menu coverage lives in `e2e/customers.spec.ts`; no duplicate component
test was added. Test execution was not requested.

## Final Change-quote acceptance - September 15, 2026

Forty targeted component checks pass across Change quotes, the sample roster and the existing quote dialog. Coverage includes original agreement selection, reviewed version/additional counts, PO and affirmative acceptance, decline, terminal/expired proposals and member denial. TypeScript and focused lint pass. [Final-three evidence](../testing/runs/2026-09-15-final-three-acceptance.md).

## Remaining-case review — September 15, 2026

21 focused component checks pass for completion, partial cancellation, the owning Commercial panel and existing quote-extension behavior. Recorded sample IDs and reviewed version, pending-save guards, protected unsaved choices and the approved failed-processing billing explanation are covered. [Case crosswalk](../testing/runs/2026-09-15-remaining-case-acceptance.md).

## September 15 scientific and workflow acceptance

All 56 focused CRM request/relationship, Trial scope, Job progress/decision/shipping/action and Lab scanner/attempt component checks pass without skips. Existing lifecycle precedence and missing-progress assertions complement the new browser scenarios. No production component changes were made. [Evidence and remaining defects](../testing/runs/2026-09-15-scientific-ten-software-acceptance.md).

## September 15 ten-case shipping and accession acceptance

All 113 focused shipping/stock/inventory/receipt/label component checks pass without skips. The direct shipping-packet print fix hides application chrome, removes the viewport-height shell from paper flow and forces white page/body output in both themes. TypeScript and scoped ESLint pass. Existing supplier identity, explicit print confirmation, frozen packet and failed-save behavior remain intact. [Complete case crosswalk and limits](../testing/runs/2026-09-15-shipping-ten-software-acceptance.md).

## September 15 session and role acceptance continuation

Four new `SessionAccessAcceptance` component checks cover authentication/bootstrap privacy, failed access checks, simulated pending MFA/task rendering and rejected 401 form-save recovery. The real association form retains its draft after rejection; confirmed sign-out unmounts and discards it. All seven focused component checks pass, including Department/session persistence; TypeScript and scoped ESLint pass. ACC-06 remains open for live provider/browser execution. [Crosswalk and limits](../testing/runs/2026-09-15-session-role-acceptance.md).

## September 15 simulated account lifecycle acceptance

Four new component cases cover Company deactivate/reactivate review and cancellation, membership-only deactivation with fresh-invitation guidance, and employee disable/restore. All 14 focused Company lifecycle, person access and employee self-protection checks pass without skips. Existing self-action expectations now match the shared single-action direct button. TypeScript and scoped ESLint pass. No product behavior changed. [ACC-05 crosswalk and limits](../testing/runs/2026-09-15-account-lifecycle-software-acceptance.md).

## September 15 simulated invitation acceptance and recovery

Thirty-nine component checks pass across Company People/access, invitation recipient/authentication/session and Department intent. Six new checks cover explicit Research-only review/session reload, revocation consequence/cancel/focus, cooldown recovery, hard-bounce resend denial and lifecycle display. An existing mismatch test also verifies continuation retention. Company People now matches the existing hard-bounce revoke/correct/reissue guidance. TypeScript and scoped ESLint pass; live provider and browser-profile acceptance remain open. [ACC-01/02 crosswalk, results and limits](../testing/runs/2026-09-15-invitation-software-acceptance.md).

## September 15 simulated Website intake and delivery acceptance

Thirteen existing `WebOpsDeliveryPanel`/`WebOpsDashboardContent` checks pass, covering exact-recipient resend review, stale-version refresh, attempts/provider-accepted wording and legacy recovery eligibility. Two Website error-decoder checks also pass. Actual local public forms pass simulated CAPTCHA/request recovery, optional opt-in, duplicate and demo variants on desktop/phone, with zero tested-form automated WCAG violations or overflow. No frontend production source changed. [Full WEB-02/04 crosswalk and limits](../testing/runs/2026-09-15-website-intake-recovery-software-acceptance.md).

## September 15 approved simulated Kit batch

Twenty BundledOrders/ExternalOrderDecisionDialogs component checks pass. Actual Portal order and input routes also pass at 1440/light and 390/dark with visibly simulated API data, including interrupted second-upload recovery and exactly one final submission. Fulfillment table headers/prices now stay together; a constrained parent and named keyboard-scroll region prevent page overflow. Scoped ESLint and TypeScript pass. Guides retain the same actions/business meaning. [KIT-02–06 evidence](../testing/runs/2026-09-15-kit-batch-software-acceptance.md).

## September 15 included Kit interrupted upload

Added a component check proving that an interrupted second upload retains the saved-request recovery link, retries only that file with its original idempotency key, and submits both saved files without creating another request. Five selected included-Kit component checks pass; five unrelated checks were excluded by the filter. Scoped ESLint and TypeScript pass. No product UI or E2E script changed; real shipped-case/scanner acceptance remains open. [KIT-04 continuation](../testing/runs/2026-09-15-kit-input-continuation.md).

## September 15 simulated receipt and retention acceptance

Fourteen component checks pass across ReleasedDeliverableDetailPage, OrganizationRetentionPolicyPanel and ReleasedDeliverableRetentionNotice. The receipt fixture now consistently represents its completed file in aggregate download state; all four affected receipt checks passed again after that correction. The actual Portal receipt route also passed desktop/mobile and print checks with an explicitly simulated API response. Real deletion/provider acceptance remains separate. [Seven-case scope and evidence](../testing/runs/2026-09-15-seven-case-software-acceptance.md).

## September 15 source scan recovery

Seven focused SourceSampleWorkspace checks pass, covering discard plus Pending/Unavailable retry visibility, rejected/clean/frozen exclusion and dirty metadata retained after scan refresh. Metadata submission keeps its originally reviewed version rather than silently adopting the scan's newer version; handled mutation errors do not produce an unhandled rejection. Unsaved metadata blocks Mark ready with a save-first explanation, preventing an older stored revision from being frozen while newer edits are displayed. TypeScript and scoped ESLint pass. Real browser verification rescanned the same stored outage/pending objects and retained draft entries. [Evidence](../testing/runs/2026-09-15-files-access-ten-case-batch.md).

## September 15 Job completion control

Eight focused CompleteLabJob checks pass: Commercial authority/active-state visibility, empty/unfinished/held sample gates, explicit confirmation, retained operation key and reviewed version after an uncertain response and reopening, deliberate conflict reload, and pending duplicate/dismissal protection. TypeScript and scoped lint pass. [Connected continuation](../testing/runs/2026-09-15-job-completion-control.md) records the separate signed-in negative path; successful issuance remains gated.

## SYS-05 validation and accessibility — September 15, 2026

The [connected SYS-05 run](../testing/runs/2026-09-15-system-ui-uat.md) corrects empty/stale Department submit-and-focus behavior while retaining unavailable-configuration gates. Five invitation checks, nine existing bundled-order checks and four Trial-scope checks pass. Assembly controls now associate validation messages and keep required markers with labels; untouched Trial fields do not reference missing error elements. TypeScript and scoped lint pass. This supersedes the earlier disabled-empty-selection invitation expectation without changing role intent or backend authorization.

Connected evidence also covers the Partner tablet toolbar correction and Assembly empty-state guidance. These low-impact presentation changes use targeted browser verification; no additional broad component suite was run.

## Department persistence during sign-in loading — September 14, 2026

Connected Customer and Partner UAT exposed selection resetting to General on refresh. `SessionDepartmentPersistence.test.tsx` reproduces saved Research being cleared before authentication finishes. The effect now waits for loaded authentication; three tests cover loading, confirmed sign-out and revoked-department fallback. These and the three invitation-session tests pass. Actual Customer/Partner refresh checks preserve Research. See the ten-case execution report.

## Empty workflow recovery — September 14, 2026

`ServiceWorkflowVersionBuilderPage.test.tsx` reproduces an empty Invalid revision adding two blank stages under StrictMode. Initializing the field array empty corrects it. Two tests now verify exactly one added/saved replacement and the one-stage starting point for a new workflow; both pass. TypeScript and scoped ESLint pass. Actual connected UI saves, independently revalidates and promotes the repaired empty recovery, and preserves Invalid state on save of an edited/reordered revision. The Phaeno guide and generated corpus include the empty-recovery instruction. [LAB-04/07 crosswalk and evidence](../testing/runs/2026-09-14-guided-evidence-retirement-uat.md).

## Accession focus and draft recovery — September 14, 2026

`LabReceiptAccessionPanel.test.tsx` now covers delayed-loading focus with and without deliberate keyboard navigation, plus decline/confirm cancellation of an entered bulk storage draft. The delayed-focus and unsaved-storage regressions each fail before their correction; all 12 component tests pass afterward, none skipped. TypeScript and scoped ESLint pass. Actual connected checks confirm both fixes, exception/bulk browser Back guards, 390px light/dark checkbox wrapping and short-height dialog scrolling. The receipt guide and generated corpus are updated. [LAB-10/13 complete acceptance evidence](../testing/runs/2026-09-14-tube-intake-uat.md).

## September 14, 2026 — Commercial intake access

Order section navigation now verifies assigned pricing access to intake with no configuration, Partner queue or Finance grant. LabJobDetailsDialog tests use the bounded Customer Department lookup and retain readiness, validation and draft behavior checks. Direct and CRM-handoff creation controls are disabled for read-only administrators. The focused navigation, intake, form and quote-review checkpoint passes 24 tests.


## Public Website search recovery — September 14, 2026

Connected WEB-01 exposed a service failure rendered as no matches. Website Search now separates loading, successful empty and error states; preserves the query; provides retry; and ignores aborted responses. Local Website build and browser failure/retry/focus/no-match checks pass using live public search responses and controlled transport faults. Portal frontend source is unchanged; no Portal unit suite was run. [Evidence](../testing/runs/2026-09-14-next-ten-uat.md).


## Company association draft protection and CRM-01 closure — September 14, 2026

The connected Company/Contact case exposed silent loss of an Add existing person draft on a second Escape. The dialog now applies the established unsaved-navigation and dismissal guard, preserves a declined dismissal, blocks closing during save, and resets discarded local selections when reopened. The first Escape still closes search choices. The Company workspace regression covers decline/discard/reopen and existing recovery paths (8 passed); real signed-in desktop/tablet/phone checks confirm the nested Escape behavior without writes. TypeScript, scoped lint and generated-help consistency pass. The staff guide and review date are updated. Actual Company/relationship, outreach validation/reset, immutable history, legacy restrictions and suppression-preserving admin merge/export complete CRM-01 on the isolated baseline. See the [complete step crosswalk](../testing/runs/2026-09-14-acceptance-closure.md). No broad test suite was substituted for acceptance.

## Connected CRM closure and table reflow — September 14, 2026

CRM-03 and CRM-04 now have complete actual Clerk-session step crosswalks in the [acceptance run](../testing/runs/2026-09-14-acceptance-closure.md): pipeline/history/currency reporting, restricted activity, task completion/recurrence and populated attention links. These checks used the real isolated API/database, exact write guards and persistent journals; no broad mock suite was substituted. A backend save-then-error defect was corrected and separately regression-tested. The only frontend changes keep Opportunity/Reports column headings together in their existing scrolling containers. Actual populated layouts passed at desktop 1440, tablet 768 and phone 390 pixels, without page-level horizontal overflow or page errors. TypeScript and scoped lint pass. No new UI test file or dependency was added for this small reversible style change.

## Targeted Finance gap fixes — September 14, 2026

Added saved-billing approval reminder recovery and four Finance attention capability/link variants. All 41 Finance panel and disabled-capability checks passed; TypeScript and scoped lint passed. Existing permission boundaries retained. Updated Finance guide and matching generated search corpus checked. [Evidence](../testing/runs/2026-09-14-acceptance-closure.md).


## File safeguards and quote recovery checkpoint — September 14, 2026

100 distinct checks passed: shared controls/API/receipt handling 52 plus quote/configuration/journal/draft checks 48. Five shared dialog checks repeated after adding the missing description in its test fixture; scoped lint passed. Optional quote-line React timing and configuration JSDOM scrollTo warnings remain non-failing. No product changes or browser reflow claim. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-file-safeguards-shared-controls-and-quote-recovery-slice).

## Finance rules and Web Operations checkpoint — September 14, 2026

68 distinct checks passed: dashboard/API 22 and Finance corrections/closeout/capability/order-to-cash panels 46. Wrapped direct tab focus in act in one dashboard test to eliminate its timing warning; all seven file checks retested without the warning. Scoped lint passed; no product changes. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-finance-rules-and-web-operations-recovery-slice).

## CRM, people and account access checkpoint — September 14, 2026

104 distinct checks passed: 55 CRM and 49 organization/invitation checks. Initial CRM 54/55 resolved by testing the current fixed recipient summary and administrator radio action, retaining the contact/email/department/admin payload. All seven affected-file checks pass. Scoped lint passed. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-crm-people-and-account-access-slice).

## Documentation, access and provisioning checkpoint — September 14, 2026

12 documentation and data-provisioning checks passed. Updated SourceSampleWorkspace test to use the current direct Discard draft action; required reason, version payload and scoped navigation assertions retained. Initial 11/12 followed by passing focused retest; scoped lint passed. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-documentation-access-and-provisioning-slice).

## Release and retention grouped verification — September 14, 2026

31 checks across seven file-management/result-release/package/retention files passed unchanged. Covers member/staff action boundaries, policy inheritance, frozen dates, individual/package download requests, confirmation and stale-version recovery. Mocked component downloads are not Customer browser byte-delivery acceptance. See [release checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-release-download-and-retention-grouped-continuation).

## Shipping workspace and feedback verification — September 14, 2026

107 distinct checks across 12 files pass after correcting three stale assertions for tube-policy confirmation and direct revision deactivation. Added four ReturnKitFulfillmentPanel regressions for failed query (both showEmpty modes), pending loading and successful empty results. Empty queue feedback now requires query success; optional empty-panel suppression does not hide errors. TypeScript and scoped ESLint passed. See [shipping results](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-shipping-packing-and-accession-grouped-continuation).

## Shipping and Trial grouped verification — September 14, 2026

162 distinct checks pass across 16 files: all 143 shipping checks passed initially; all 19 Trial checks passed after seven obsolete label selectors in TrialFormDialog, TrialScopePage and TrialSampleDialog tests were updated for current required-marker spacing. No application code changed. An existing SearchableSelect React act warning remains in the passing sample test. Live reviewer kit feedback exposed open UAT-20260914-01; no regression test added for that finding. See [grouped results](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-grouped-handoff-shipping-and-trial-verification).

## Grouped laboratory verification — September 14, 2026

All 48 tests in 15 `src/features/lab-operations` test files passed using the installed Vitest Node entrypoint (30.38 seconds). Covers protocol definitions/list/approval, scanner and receipt/accession behavior, typed QC, material dates, explicit physical-print confirmation and preparation access. Initial package-command executable resolution failed; no dependency change was needed. These are component/unit tests, not physical or signed-in workflow completion. The same checkpoint separately traced saved preparation/specimen/execution/output/source links as Independent Reviewer without writes. See [grouped evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-grouped-software-verification-and-saved-lineage-trace).

## Preparation access closeout — September 12, 2026

UAT-20260912-07 fixed locally: disabled Customer query no longer masquerades as endless loading on a direct preparation link. PreparationBatchPage.access.test.tsx passes four cases: immediate role guidance, cached staff data withheld with no resource/tube queries, unresolved-session cache withheld, and authorized genuine loading. Live Customer retest on isolated 3014 confirms the role explanation and keyboard Back to dashboard recovery. Existing guides retain their accurate role boundary. See [closeout ledger](../testing/runs/2026-09-12-laboratory-uat-closeout.md#uat-20260912-07--customer-preparation-link-never-leaves-loading).

## Billing approval and completion handoff - September 12, 2026

Actual signed-in FIN-01 billing validation, approval, approval reset after a terms change, reapproval and reload passed on the existing marked Customer A. Saved profile is version 4/configuration 3, Net 45 with a synthetic 10% tax rate. All invoice readbacks stayed identical; receipt totals remain 8/$108 unapplied. Settled desktop/390px billing screenshots inspected. FIN-01 remains partial: neither saved InProgress Job has terminal Commercial samples, governed release does not advance those statuses, the current Job UI has no completion action, and this isolated runtime lacks CommercialOperator. No completion, invoice issuance, PDF, role change or production action was performed. No automated tests were added or rerun; this checkpoint is signed-in acceptance and code/read-only record tracing. [Evidence and next implementation slice](../testing/runs/2026-09-12-lab-production-verification.md#billing-approval-and-completion-handoff---september-12-2026).

## Real scanner and receipt evidence - September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied. [Exact runtime and saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#real-scanner-and-receipt-evidence--september-12-2026). No deployment, migration, auth change or Git mutation. Remaining legitimate issuance/PDF, scientific independence and production/physical/provider gates stay open.

## Finance role separation - September 12, 2026

Owner approved one additional development-only CashOperator + CashReconciler login. Actual signed-in UAT passed second-operator import ownership rejection (preview and direct confirm), with retained input and no receipt created. The combined-role user then imported a separate $7 receipt; a different Cash Operator created/submitted its reconciliation. Approval by the receipt contributor returned 409 and left the batch Submitted/version 2 with no approval/report. This isolates contribution exclusion from creator/submitter exclusion. Existing approved reconciliation and all previous receipt readbacks remained identical. Outstanding invoices remain $645; seven receipts now have $107 unapplied. No product defect, code, production role, provider policy, migration, Git or deployment change. [Evidence and saved records](../testing/runs/2026-09-12-lab-production-verification.md#finance-role-separation--september-12-2026). Scanner-backed upload, legitimate issuance/PDF, and production/physical/provider acceptance remain open.

## Finance aging boundaries - September 12, 2026

Actual signed-in Billing verification passed all eight aging boundaries (0, 1, 30, 31, 60, 61, 90 and 91 days) using separately marked isolated fixtures. At UTC date 2026-09-13, bucket totals are $391 current, $6 at 1-30 days, $24 at 31-60, $96 at 61-90 and $128 over 90: $645 outstanding. Aging CSV has 12 open rows; all-invoice CSV has 14 rows, including Paid and WrittenOff. Customer filtering leaves the labeled all-Customer aging/export scope unchanged. Existing receipts, allocations, adjustments and reconciliations were preserved; unapplied cash remains $100. Desktop and fresh 390px page screenshots inspected. This is synthetic arithmetic/export evidence, not legitimate issuance/PDF or production acceptance. [Saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#finance-aging-boundaries--september-12-2026). No product code or new automated suite changed. Remaining role-combination, scanner, issuance and production gates stay open.

## Receipt upload and Finance exception acceptance — September 12, 2026

Receipt FormData was inheriting JSON content type, so Axios serialized the file command incorrectly. Explicit multipart now follows the existing upload pattern and retains the idempotency key. New receipt-upload.test exercises real Axios serialization; 38 focused upload/API/Finance tests, TypeScript and scoped lint passed. Actual signed-in form reaches the unavailable scanner, displays its specific failure and retains entries/attachment; no receipt is saved. Two-session adjustment recovery, split allocations, cancelled draft and controlled aging/Customer lookup recovery passed. No UI/auth redesign; Phaeno guide remains accurate. [Latest evidence and saved balances](../testing/runs/2026-09-12-lab-production-verification.md#finance-exceptions-and-upload-correction--september-12-2026).

## Readable Finance closeout — September 12, 2026

Replaced raw JSON with FinanceCloseoutReport: frozen totals, period, count, approval time/reviewer reference and text download including saved draft changes. Invalid or mismatched evidence fails visibly without a fabricated report. Ten new regression cases cover rendering, downloaded contents, invalid/missing/mismatched/unapproved evidence, older report compatibility and retryable download failure. Forty-four tests passed across report/corrections/panels; TypeScript/scoped ESLint and generated docs check passed (56 guides, eb12cf6e1e64). Real Reconciler download, Tab/Enter disclosure and 320/1440px light/dark checks passed. Cash/Billing receipt reversal and credit/debit/write-off plus export readback passed; full cases remain partial. See [current checkpoint](../testing/runs/2026-09-12-lab-production-verification.md#finance-closeout-and-corrections--september-12-2026).

## Populated Finance acceptance — September 12, 2026

Live Billing review verifies UAT-20260912-05 with a populated invoice, available adjustment, absent forbidden commercial link and retained Customer filter. Cash import validation/duplicate handling, allocation/reversal UI and separate Reconciler approval passed. No product source changed or component suite rerun. Full FIN cases remain partial; raw-JSON closeout needs readable/downloadable presentation follow-up. See [evidence and boundaries](../testing/runs/2026-09-12-lab-production-verification.md#populated-finance-acceptance--september-12-2026).

## UAT-20260912-06 — role-only home dashboard

Real new Billing login found the home dashboard loading forbidden administrator intake. Added OrderOperationsSummary to render allowed workspace links for role-only users and retain ConnectedOperationsSummary only with commercial administration. Six tests cover all three Finance roles, release-only, administrator and absent capabilities; total focused result is 63 passing tests across six files. TypeScript/scoped lint and documentation check pass. Actual separate Billing/Cash/Reconciler sign-ins, role links, Finance sections and old Intake bookmark fallback passed without application errors or writes. All three dashboards fit 320px; settled Billing dark screenshot inspected. Populated Finance and production tests remain open.

## UAT-20260912-05 — invoice commercial link access

Added two Finance invoice tests: Billing-only access hides Open order while retaining Record adjustment; commercial-administration access preserves Open order. Confirmed the first fails before correction. Both panel callers now pass the existing commercial capability. Updated the older order-management partial mock to retain the real disabled-feature classifier. All 57 focused tests across five Finance/Attention/navigation/result files, TypeScript/scoped lint and documentation check passed. Live administrator-without-Finance bookmark/direct-ID UI gating passed; actual Billing/Cash/Reconciler logins remain blocked by missing isolated assignments. Details and proposed identity scope are in the owning PSeq order-to-cash plan.

## UAT-20260912-04 — result package identifier wrapping

Fixed and retested locally: long Job/sample identifiers overflowed the detail header/facts and release confirmation. Scoped shrink/wrapping styles preserve complete values. Actual detail component with isolated simulated data passed 320/390/1440px light/dark checks for ready/disabled views, expanded file/manifest evidence and confirmation layout; no horizontal overflow. Dialog Tab containment, Cancel/Escape focus restoration and withdrawal reason gating passed without submission. All 23 related tests, TypeScript and scoped lint passed. Guide reviewed; no procedure change. Evidence and remaining signed-in/production limits are recorded in the production/local verification run.

## Disabled results signed-in browser checkpoint — September 12, 2026

Actual LAB-14 signed-in browser passed disabled result queue and direct-link neutral feedback, keyboard return, disabled Attention dashboard suppression, and result queue light/dark DOM/computed-style checks at 2124px with no overflow. Existing runtime settings and original LAB-06 records were preserved. This supersedes the earlier pending signed-in disabled queue/detail/dashboard checks; narrow direct detail and deployed retest remain open. No new component edits or automated suite rerun; evidence is in the production/local verification run.

## Administrator Attention capability checkpoint — September 12, 2026

All 23 focused role-navigation, disabled-capability and result-link tests pass. New regressions cover administrator CRM recovery navigation without operational Attention access and suppression of dashboard requests/counts/controls despite cached Attention data. Final TypeScript, scoped ESLint and 56-guide documentation check pass (68829f5db33f). Live Bill acceptance confirms six-order dashboard without a permission error, independent CRM recovery empty state, and successful commercial-order detail link. Backend permissions and roles remain unchanged. Populated recovery, other-role browser and deployed checks remain distinct; see the production/local verification run.

## Disabled queue responsive browser checkpoint — September 12, 2026

Temporary browser preview using actual queue components/full CSS passed six width/theme combinations (320, 390, 1440; light/dark), no horizontal overflow and keyboard focus-visible. Simulated disabled Attention/results responses hide selectors and dashboard retry/shortcut; a 503 control retains errors and controls. Screenshots inspected, zero page errors. Preview setup was corrected to include generated component utilities before final evidence. No new product code or automated suite rerun; retained local preview/check artifacts and measured results are recorded in the production/local verification run. Signed-in/full-shell and deployed acceptance remain distinct.

## UAT-20260912-03 navigation correction — September 12, 2026

Related-link supplement: two result-package regression tests verify that broad operational read plus laboratory access preserves scientific-review navigation but does not offer administrator-only commercial detail; platform administrators retain that link. All 21 related tests, TypeScript, scoped lint and documentation check passed. Live William package link suppression and scientific-review destination passed locally, with no publication or record changes. Corpus 5d5dc935a350; production retest remains pending.

Seven role-navigation cases in `order-sections.test.ts` passed: reviewer/release default and unavailable bookmark fallback, explicit permitted selection, three Finance roles, administrator retention, commercial-role versus administrator distinction, trial-only and no-section handling. Combined with the existing disabled-feature/result workspace regressions: 19 tests passed across three files. TypeScript, scoped ESLint and documentation generation/check passed. The owning plan records current administrator-only queue APIs; no backend access was widened. Organization/integration/notification queries are now limited to the selected permitted workspace. Live local William landing/bookmark/Attention checks passed; production and other-role browser retests remain open.

## Disabled operational capabilities — September 12, 2026

Passed 12 focused checks in `DisabledOperationalCapabilities.test.tsx` and `ResultReleasePanel.test.tsx`. Explicit disabled feature responses show neutral status, hide unusable filters/stale rows, and suppress the dashboard Attention shortcut/retry. Missing-record, permission and service failures remain errors; actual outages retain dashboard retry. Direct disabled package links offer a return route. Existing enabled package navigation and guarded actions still pass. TypeScript/scoped ESLint and documentation generation/check passed. No backend behavior or production flags changed. Rendered narrow/theme acceptance and production retest remain pending; see the owning PSeq order-to-cash plan.

## LAB-14 approval-review regression — September 12, 2026

Signed-in UAT found that the protocol approval dialog omitted preparation evidence/QC scope and source matching. The display now includes preparation eligibility, each scope and the selected-source requirement. Three focused ProtocolApprovalDialog tests passed: existing attestation and invalid-definition cases, plus the new Batch/Tube/Shared scope regression. Legacy versions remain visibly not enabled for preparation batches. TypeScript/scoped lint and live inspection of the saved draft passed. See the [run checkpoint](../testing/runs/2026-09-12-lab-14-preparation.md); approval remains pending with an independent Protocol Administrator.

## Latest UI acceptance alignment — September 11, 2026

Verify **Library prep** uses the existing work route and opens preparation batches plus the job-history lookup. Verify **Lab configurations** is the last sidebar item with a cog icon and the **Protocols**, **Workflows**, and **Tray formats** tabs. Shared Portal tabs use 36 px minimum triggers and 42 px single-line strips, with consistent padding, selected styling and keyboard focus; wrapped rows may grow. LAB-14 records the connected preparation-batch journey. Verify the shared required marker stays with the final wrapped word and long confirmation checkboxes retain first-line alignment and full width. LAB-13 carries these checks alongside accession behavior; build/read-only evidence is recorded separately from unrun full acceptance. Earlier chronological screenshots describe historical labels, not current expected text.


### Accession before storage and bulk acceptance (2026-09-11)

Updated the shared required-label assertion in `required-field.test.tsx` for a nonbreaking space before the marker; wrapped confirmation text keeps the marker on its last line. Updated `LabReceiptAccessionPanel.test.tsx` for exception-first intake: expected broken tube rejection with no box, scan without mutation, explicit inspection and per-tube storage, and bulk containing only identified undecided tubes. Unidentified tubes remain outstanding and saved rejection remains visible. Tests authored, not run.

Manual coverage: keyboard/focus and full-width controls; cancel/navigation protection; changed work preserves entries and requires re-review; Tubes / Received tubes hierarchy; primary barcode opens details with lineage; no routine Review tube in inventory; Supervisor correction requires reason and real storage when restoring retained material; no action for used/closed material. Check both themes and narrow widths.


## Implemented specimen workspace — September 11, 2026

Verify readable sample identities/counts, selected source and reserve reasons, dedicated specimen detail, grouped Actions, barcode selection/start, failure evidence choices, explicit exhaustion and legacy instruction confirmation. Same-request retries retain original work/attempt versions; errors preserve form values. Execution/resource mutations invalidate attempt summaries. Verify source capture binding survives draft round-trip, old definitions remain unchanged and only barcode captures expose the binding. Customer/Partner finalization and Trial submission explain the fixed policy. Execution transition actions are grouped under Actions. The existing synthetic execution E2E fixture now supplies attempt-summary metadata and checks the action menu/meaningful execution label. Local read-only UI/static checks are recorded separately; automated and persisted lifecycle cases Not run.

## Tube navigation and start guidance - September 11, 2026

Verify Specimens → Tubes → Execution → Libraries → Exceptions → Review, existing lineage links, keyboard tab navigation and narrow layout. A Planned execution with TubeAcceptanceRequired shows the explanation, disabled Start and Open tubes link; returning after accessioning refreshes eligibility. No warning for job-level, started/completed or accepted-ready executions. Fixture contract updated; automated tests not run for this slice.

## Tube intake forms - September 11, 2026

Shared IntakeReviewFields is used during accession and Supervisor correction: routine Accepted needs no reason, predefined exception reasons, Other explanation, resolution note, loading/retry and accessible required fields. Updated scanner payload expectations. No automated tests run.

## Proposed specimen workspace coverage - September 11, 2026

The [tube-attempt plan](SPECIMEN-TUBE-ATTEMPT-PLAN.md#poms-workspace) defines required order-policy display, specimen/source/reserve summaries, allowed actions, failure confirmation, accessible selection and meaningful execution labels. The full implementation is now local; persisted lifecycle acceptance remains Not run.

## Discarded-draft visibility — September 11, 2026

Updated existing protocol-list.test.ts expectations: discarded-only records remain hidden with Show retired off or on, new identities and mixed current/history records remain visible, and genuinely retired protocols respond to Show retired. Connected Edge verified removal of Show discarded drafts, exclusion of Test 1-2-3 in both filter states, and inclusion of retired records. Discarded revisions retain read-only history rows without actions; mixed-history regression expectations were updated but the automated suite was not run. Prior instructions to test the discarded-drafts filter are superseded.

## Revised retirement and invalidation UI coverage — September 11, 2026

LAB-07 adds retirement impact loading/error/retry, named active-job blockers, affected-workflow warning, queued-job Proceed anyway warning, cancellation, stale-impact refresh, retained reason, default retired hiding, Invalid and historical Invalidated workflow display, removed retired-stage verification, Review workflow and Revalidate and approve, unchanged and edited recovery, empty recovery error, and queued-job invalid-workflow banner. Include keyboard/focus, narrow view and themes. New cases are Not run until evidence is recorded; previous retirement UI checks do not prove the revised workflow behavior.

## Protocol retirement controls — September 11, 2026

Connected Edge verified reason-required validation, named workflow dependency error with retained input, successful retirement, focus restoration to Show retired, hidden-by-default retired record, inclusion with retained approval/reason/date after Refresh, and absent management actions on retired records. That earlier discarded-draft visibility is superseded: discarded-only records and the Show discarded drafts control are now absent. Workflow selectors and direct protocol builder paths exclude/reject retired identities. TypeScript and scoped lint passed; no new frontend automated tests or suite run. Responsive/theme-specific retirement checks remain unrun.

## Equipment retirement controls — September 11, 2026

Connected Edge verification covered unchecked Show retired by default, required reason validation, saving retirement, hiding the retired asset, revealing it with date/reason, and persistence after refresh. Preparation asset stays Active. Retirement uses a React Hook Form/Zod dialog, preserves error input, and returns focus to the filter after a removed row. Menu width verified at 192px with a one-line label. TypeScript and scoped ESLint passed; no automated frontend suite was run or new frontend test added for this checkpoint. Domain tests were added separately.

## Native material-lot date submission — September 11, 2026

Added MaterialLotCreateDialog.date.test.tsx to stage new reference names, enter a lot, set the native date without a change event, and assert the submission includes that displayed date. This targets the stale form-state scenario; the precise original browser event failure remains unproven. Test added, not run. Scoped ESLint and frontend TypeScript passed. Existing optional-date schema behavior is preserved.

## Protocol tabs and discarded visibility — September 11, 2026

Updated protocol-list.test.ts to replace the prior always-visible expectation with discarded-only default hiding, explicit inclusion, empty-identity visibility, and mixed-history visibility. These tests were updated but not run under the owner's verification policy. Scoped lint and frontend TypeScript passed. Connected Edge confirmed Show discarded restores Test 1-2-3 and clearing it hides that record while retaining the two drafts.

## Role-neutral step confirmation — September 11, 2026

Builder/approval copy now says **Confirmation required**, with role-neutral helper/history text and matching help. This is copy-only: no assertion changes or new tests; existing labels were not referenced by test selectors. Scoped ESLint passed. Connected browser verification found all three new labels; after live-refresh recovery and draft save/reopen, all 55 form values/flags matched the pre-edit snapshot. Approval/history copy was source-reviewed only. See the [run record](../testing/runs/2026-09-11-protocol-preparation.md).

## Protocol capture layout — September 11, 2026

Capture fields now use a responsive label/type row with Required and remove aligned beneath, replacing unconditional vertical offsets. No implementation-mirroring component test was added for this presentation-only correction. Scoped ESLint for both affected Lab pages and the full frontend TypeScript check pass. Connected Edge checks at 375px, the native 950px viewport and 1280px preserve all 19 unsaved field values/flags, keep captures within the page width, and provide keyboard traversal from Type to Required to the named remove button. Number/Choice variant interaction, dark theme and full builder acceptance were not run. See the [run record](../testing/runs/2026-09-11-protocol-preparation.md).

## Laboratory Work tab reflow — September 11, 2026

The local Work page corrects a horizontal fixed-height variant that made a second tab row overlap the panel. It now has an automatic-height grid, 36px minimum targets and two/three/six columns. No component test was added for this CSS-only correction. Connected Edge geometry verifies 122/82/42px tab bars at 375/950/1280px, containing the targets with an 8px gap before the visible panel. ArrowRight moved Execution to Lineage with visible focus. Scoped lint and TypeScript pass. Dark theme and full LAB acceptance remain unrun; see the [paced walkthrough](../testing/runs/2026-09-11-protocol-preparation.md).

## Customer laboratory stages — September 10, 2026

**Local checkpoint: 3/3 cases passed** in [LabCustomerProgressPanel.test.tsx](../../frontend/src/features/orders/LabCustomerProgressPanel.test.tsx); see the [verification record](../testing/runs/2026-09-10-customer-laboratory-stages.md). The cases cover six current-stage counts and partial release, native sample disclosure, unavailable data rather than invented zero counts, and lifecycle-status precedence through the shared list/header selector. They do not mount both complete list/detail pages or prove a signed-in Partner journey.

Frontend typecheck and scoped lint passed. The final numeric sample sorting and focus-ring changes received static checks after the focused component run; no new component-test run is claimed for those final presentation edits. Signed-in desktop inspection confirmed both Customer list rows as Received, HS5Y7DB7's Received header, six stages, nine Received samples and the expanded individual sample list.

**Remaining acceptance: Not run.** Keyboard Enter/Space and visible focus on sample/QC disclosures; 320/375 px reflow, zoom, touch and dark theme; numeric sample sorting in the connected browser; the 7-sample detail of 69SJN4PA; entitled Partner and Department/member views; real partial/mixed stages; and missing/failed progress responses on full pages. Responsive classes and `aria-current` are implementation evidence, not completed browser acceptance. Follow ORD-07.

## Intake progress synchronization — September 10, 2026

Shipment receipt now invalidates Lab dashboard/work-detail caches alongside shipments. Verify the received Job appears in Work and remains after completed accession. Layout and scientific actions are unchanged. TypeScript/scoped lint and signed-in checks are recorded in [the intake correction run record](../testing/runs/2026-09-10-intake-progress-correction.md); no new frontend suite is required for this cache invalidation change.

The prior signed-in local check confirmed both corrected Jobs remain in Phaeno Work as Received. This did not execute every receipt/cache replay path in a browser. The Customer list now uses the laboratory stage, superseding the earlier In Progress screenshot while retaining the Commercial lifecycle and sample Accessioned values.

## Unified samples and stage-relevant Job workspace - September 10, 2026

The Product Owner approved one expandable sample list with integrated Match tubes,
quote decisions at the end of the fixed Order details and billing heading row,
source/count details beside pricing, and stage-relevant sample/tracking sections.
The new design supersedes the prior Samples / Scan tubes switch described below.

Focused coverage includes split-container identities and Job-wide totals; active
sample/page expansion; retained failed/dirty scans; pending locks; successful
advancement and completion; unmapped slots; Member and post-send permissions;
quote source counts and direct decisions; fixed quote-review details; and tracking
visibility for partial sends, receipt, lab progress and results. The standalone
scanner retains eight-slot paging. Older print/scan tests now query the current
rendered controls after asynchronous refresh rather than detached loading nodes.


## Lab Job workspace and horizontal customer progress — September 10, 2026

Implementation approved and completed locally. Focused assertions now cover:

- Evidence-driven six-step progress for configured/manual orders, Members and
  administrators, current kit supply, partial allocations/matches/inserts/sends,
  unknown data, cancellation/holds and nonvoid insert requirements. The horizontal
  icon sequence keeps short labels, completion checks and the current highlight.
  Detailed hover/focus panels retain purpose, saved evidence and status; completed
  steps do not infer the actor. Icons do not navigate; the next-step button opens
  the required work. Shipping insert review, confirmation, printing and packing
  are part of Send; only recorded dispatch completes Send. Single-shipment labels/reminders require a complete one-container
  family; multiple/unknown scopes preserve counts and remaining work. Opening
  print never supplies a physical-print completion fact.
- `LabJobSamplesPanel`: ten-sample pagination across biological-source groups,
  natural order, continued headings, whole-family saved match and receipt counts,
  embedded rendering, restored page and preserved edit/finalization permissions.
- `SampleTubeScanner`: eight-slot paging, whole-container totals, active target
  and draft preserved while browsing, return-to-active, pending save lock,
  successful boundary advancement/focus and failed-save retention.
- `LabJobShippingWorkspace`, `LabJobWorkspaceActions` and search validation:
  single and deliberate multiple selection, malformed/foreign/retired selection,
  permission-aware commands retained in Samples view, loading/retry behavior,
  combined/direct commands and controlled navigation without scope substitution.
  Existing quote download, expiry/extension, invoice capability and decision-dialog
  assertions follow the combined header menu while preserving domain checks.
  Busy/status feedback and disabled-command descriptions remain accessible.
- Shared shipment controller and packing/reset/location return: Lab Job source
  validation, embedded print without navigation, refreshed post-save selection,
  pending/dirty guards, and preserved standalone Trial/staff entry points.

The approved next-step print follow-up also requires focused coverage for:

- **Send** with a ready current insert offers **Print shipping insert** directly
  in **Your next step**. Missing or invalid current inserts retain the existing
  review/confirmation prerequisites and cannot skip to print or dispatch.
- Returning from print presents explicit printed-and-packed confirmation.
  Opening, closing or cancelling print, dismissing the confirmation, and print or
  revision-validation errors never acknowledge success. Only an explicit user
  acknowledgement changes the card's action to **Record shipment**; this neither
  completes Send nor invokes a dispatch/receipt API. Reprint remains in Actions.
- Acknowledgement persists only for the same browser tab, signed-in user, active
  organization, shipment, insert ID and revision. Reload of that scope may retain
  it; another tab/user/organization/shipment or changed insert revision must not
  inherit it. Unavailable storage or incomplete identity cannot manufacture it.
- A sole eligible container retains automatic selection. With multiple containers,
  print and record commands require the deliberate selected current container,
  never the first array element or first unacknowledged shipment. Existing role,
  pending-write, current-version and full-shipment action gates remain in force.

These added requirements are not a report of executed tests or physical printing.

Static frontend checks are recorded in the owning
[workspace plan](LAB-JOB-PROGRESS-AND-SHIPPING-WORKSPACE-PLAN.md) and saved run.
Assertions were added/updated but automated suites were **not run** at this
checkpoint. Do not treat those cases as passing execution evidence.

## Sample receipt in the Lab Job roster — September 10, 2026

The accepted bounded follow-up adds **Receipt: X of N tubes received** to each
finalized Lab Job sample row, separately from lab status, accession and review
reason. It uses the server's per-specimen total/received values across the
shipment family. Repeated values from split tube slots must not be summed.
The roster and shipment summary share organization, Department, source and
capability scoping. Missing counters or failed/loading reads must not manufacture
a zero: show **Receipt: Checking…** while loading and **Receipt: Not available**
when the count cannot be shown.

The Lab Job removes its duplicate **Sample receipt progress** disclosure from
Related shipments; the Trial context keeps its disclosure because it has no
consolidated Lab Job roster. Retired configurations are hidden from external
shipping panels, while staff retain their history disclosure and the underlying
records/audit history remain intact.

Existing component assertions now distinguish a sample's declared tube quantity
and workflow status from actual received counts, repeated split-shipment values,
source/specimen identity, unknown/error states versus an explicit zero, Lab Job
versus Trial disclosure, and external versus staff history. They also cover
shared-query request reuse. The full frontend TypeScript check, scoped ESLint
and documentation freshness/whitespace checks passed. No automated suite ran;
the updated assertions and browser acceptance remain unexecuted.
The separate broad order-progress checklist and shipping-consolidation request
remains planning work and is not implemented by this refinement.

## Related-shipment navigation presentation — September 10, 2026

Active `RelatedSampleShipments` navigation now uses prominent primary-style
buttons while retaining link destinations and permissions. Existing external
assertions use **Open shipment** instead of **Open shipment, tubes and packet**;
pool **Choose containers** and staff **Open Lab shipping** labels remain unchanged.
No new cases or suite run are added for this presentation change. Existing
source filtering, exhausted-pool, receipt-data and retired-history coverage stays
in place. At this navigation-only checkpoint, receipt consolidation and hidden
external retired configurations were proposed follow-up work. Their subsequently
accepted bounded implementation is tracked above.
Scoped ESLint and the full frontend TypeScript check passed. No live browser
navigation was performed for this refinement.

## Location inventory correction — September 9, 2026

Customer implementation of the [revised workflow](TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md)
passed **108/108 tests across nine focused component files**. Evidence:
`artifacts/customer-location-tests.json`. Coverage includes independent location
receipt, exact physical-container barcode claims, alternative kit sizes,
preservation of drafts during inventory failures, assigned-container scan
gating, Member history and separate retired-configuration navigation. Scoped
lint passed for the Customer API/components/tests.

Frozen physical-container barcode rendering and legacy packet compatibility
passed **8/8** cases in `SampleShippingPacketPage.test.tsx` and
`ShippingBarcode.test.tsx`. The packet reads the frozen manifest identity even
when live workflow data names a different container; legacy packets do not gain
an invented barcode. These counts are separate from the Customer checkpoint.

The actual-component desktop/mobile browser suite passed **8/8**, including
conflict recovery and failed inventory refresh with a retained barcode, as
recorded in the [E2E plan](E2E-TEST-PLAN.md). Historical same-Job restriction
assertions below are superseded, not current product requirements.

Staff fulfillment passed **47 focused cases across five files**, including
request/address dispatch, readiness, original dispatch reconciliation, barcode
printing and refresh-failure draft preservation. Scoped lint passed. The full
combined frontend TypeScript check passed after removing duplicate optional DTO
fields introduced during integration.

A final review found the shared delivery-location detail was mounting the
Customer receipt panel for Phaeno staff. It now links staff to Phaeno inventory
and never calls Customer inventory/receipt endpoints in that context. The two
affected suites passed **13/13** including the added real-detail regression;
their totals overlap the earlier Customer checkpoint. The supply status contract
was also aligned to `RecordedForLocation`.

Connected review found two final presentation issues: the location inventory
return link unnecessarily opened a kit-order dialog, and the recommendation
still described manually entered availability. Return now opens the shipment
view, and the Customer summary explains that it uses received location stock.
The affected delivery-location suite passed **10/10** and packing suite **29/29**;
counts overlap the earlier checkpoints. No inventory writes were involved.

## Completed kit receipt feedback — September 9, 2026

The Customer delivery panel no longer invents a receipt instruction when a
preparation action is unavailable without a server-provided reason. This fixes
the contradictory **Kits received** / **Confirm which kits have arrived** state
on an old cancelled container link, while retaining specific preparation
restrictions and outstanding receipt actions. The existing 29
`TransportationKitsPanel.test.tsx` cases passed. The connected Customer page
shows the received TRANS-20 and the current 18-tube preparation pool; the
[manual run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md)
separates screenshots and user reports from full-case acceptance.

## Stock-kit dispatch and request synchronization — September 8, 2026

Both staff dispatch entry points refresh stock, request, Job and Customer supply
queries. An unused already-sent kit with one compatible outstanding request offers
**Update kit request**. Its confirmation uses the original dispatch facts; it
does not record Customer receipt or send another physical kit. Pending/error,
close/navigation guards, repeated-click prevention, eligibility and cache-refresh
coverage passed **28/28 cases** (standard kits 9, recovery 11, requests 8).
Scoped lint and the full frontend typecheck passed after the final changes.

**7/7 actual-dialog synthetic browser cases** passed at 1280×835, 390×835 and
390×480, in light/dark themes and a long specific error. Checks covered the exact
saved-facts payload, a single adapter write, dismissal without a write, visible
fixed actions, a full-width error and no overflow, page errors or external calls.
Evidence: [`kit-request-sync/review.json`](../../artifacts/kit-request-sync/review.json).
Temporary browser fixtures and the isolated server were removed. Connected
reconciliation of Request D20018AA then succeeded through the signed-in local UI;
its fresh detail shows Dispatched, 1 sent, 0 received. Independent read-only
evidence confirms unchanged dispatch facts and 20 barcodes. This does not establish
Customer receipt or physical scanner acceptance.

## Customer containers require received Job kits — September 8, 2026

The latest Customer decision supersedes the earlier existing-kit bypass below.
There is no **I already have kits** or separate **Prepare samples** action.
No order/cancelled order with no received supply offers **Order transportation
kits** only, including an unbound physical-container deep link. Pending/on-way
kits retain their status and receipt actions; server-authorized acknowledged
same-Job supply reveals container configuration directly. Partial delivery
permits only its available portion. Older received stock remains usable when a
later replenishment request is cancelled, and server-permitted already-bound
historical kits retain their scanning path. Trial and Partner gates are unchanged.

The checkpoint passed **62/62 focused component cases**: Customer kit panel 29,
packing 25, and shipment detail 8. Added coverage checks stale permissive flags,
cancelled/deep-link order recovery, received quantities and exhausted sizes,
partial capacity, draft preservation after a stock refresh, a fresh recommendation
before opening configuration, and unchanged Trial/Partner access. Existing Smart
Add, stable Summary, concurrency, dirty/busy and packet behavior remains covered.
Customer options/counts use received Job quantities automatically; no editable
availability controls were reintroduced. Specific server errors remain authoritative.

**28/28 actual-component synthetic browser cases** passed at 1280 and 390 pixels
in light/dark themes for no-order, cancelled, pending, in-transit, received,
partial-received and unbound physical-container states. Keyboard opening/Escape,
confirmation without a write, stock-limited options, no overflow and retained
receipt controls were checked. Representative images were visually inspected.
Evidence: [`job-kit-gating-review/review.json`](../../artifacts/job-kit-gating-review/review.json).
There were no real data writes, nonlocal requests or browser errors. This is local
synthetic evidence, not signed-in receipt/scanner acceptance. Scoped lint and
the final full frontend typecheck passed.

## SHP-03-001 kit-order error feedback — September 8, 2026

The actual Customer confirmation failed with Kit order could not be saved /
An unexpected error occurred; backend evidence confirms a routing exception and
rollback, not a user misclick. The failure alert now spans the same width as the
form; title/description alone reserve close-button space. Generic unexpected
errors give retry guidance while specific validation/concurrency messages remain.
The kit-panel suite passed **25/25**, scoped lint and the full frontend typecheck
passed, and **7/7 actual-dialog synthetic browser cases** verified desktop/phone,
short height, light/dark and a long specific error. Alert/form bounds matched
exactly, without overflow or inaccessible fixed actions. Evidence:
`artifacts/kit-order-error-review/review.json`. No writes or nonlocal requests
occurred; temporary fixtures/server were removed. The later connected Customer
retry saved one Pending request, corroborated by the signed-in Phaeno queue.
See the
[local run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

## Reset container configuration before scanning — September 8, 2026

The focused checkpoints passed **50 cases**: reset UI 12, detail 5, scanner 6,
selector 5 and kit panel 22. The reset/detail subset passed **17/17** again after
the final label/layout: **Reset container configuration** sits beside the top
Shipping container selector. Coverage includes organization/Department administrator access,
server eligibility loading/error/retry, the whole-order container/tube totals,
dismissal without a write, submitted snapshot versions, pending/error states,
and successful navigation/cache refresh to the correct selection pool.
Customer, Partner Lab and Trial entry points remain. The blocking explanation applies when
any sibling has current or historical scans, kit binding, a packet, dispatch or
receipt; clearing a scan must not reopen the action. Stale confirmation and a
scan beginning in another session also have server-backed reset coverage. The
SHP-09 reset variant remains Not run;
the documentation task ran no tests itself. Six final synthetic detail browser
cases are recorded in the E2E plan; they are not signed-in Customer acceptance.

That checkpoint distinguished preparation pools from physical containers, with
ordering limited to pools. The later mandatory Job-kit decision above supersedes
that restriction for unbound physical links missing received supply. Outstanding
delivery keeps status/receipt actions, and server-permitted received/bound physical
containers show scanning without a redundant order card. Unsaved/saving scan
guards still block both route changes and resets as appropriate.

## Individual shipping-container rows — September 8, 2026

The final implementation checkpoint passed **20 focused packing tests**, full
frontend TypeScript and scoped ESLint. **Containers to use** replaces the all-size
quantity form and separate allocation list. Coverage targets recommended rows,
remaining-capacity Add defaults, size changes, targeted removal, preserved counts,
explicit recommendation rebuild, whole-number/capacity/total validation and
dirty/busy/error recovery. Size options retain smaller needed containers plus
the smallest fit, while preserving every existing row's validity: three remaining
tubes offer only 5 with sizes 5/10/20; 30 with 10+5 adds 10 then 5. Add stops once
capacity covers all tubes. Six 5s remain allowed; two 20s/15+15 for 30 is superseded
in the current editor, though older API tests remain historical evidence.

Manual availability controls are removed; recorded-stock/receipt checks remain
automatic. The stable Summary grid has an in-grid Updating indicator, and
confirmation requires the current preview. The shared dialog retains Customer,
Partner Lab and authorized Trial permissions. The final six synthetic layout
browser cases passed as recorded in the [E2E plan](E2E-TEST-PLAN.md); SHP-09
remains Not run. Updated
audience guides and catalog summaries are ready for corpus regeneration by the
implementation task. This documentation follow-up itself runs no tests.

## Transportation-kit action row and wording — September 8, 2026

Historical checkpoint, superseded by mandatory Job-kit ordering above: Order
transportation kits and the then-eligible existing-kit/preparation action shared
a wrapping row. Registration guidance remained below; pending, partial and
received states keep their existing server-controlled gates without duplicate
actions. Unrecorded supply uses the owner-approved wording, "Our records indicate
you have no transportation kits." The 14 existing Customer kit cases passed with the updated wording
assertion; TypeScript and scoped ESLint passed. No cosmetic-only test was added.
Desktop/phone acceptance of the row remains in SHP-03.

## Delivery-location action layout — September 8, 2026

The address card now spans the available content width. The page-header Actions
menu contains Edit location and Deactivate location; the separate Edit button
is removed. Customer copy addresses "your department" while Phaeno retains
its operational description. The eight existing location cases, full TypeScript
and scoped ESLint passed after the final adjustment. No cosmetic-only tests
were added. The audience guides and generated 56-guide corpus are current.

## Customer transportation-kit ordering and fulfillment — September 8, 2026

Historical checkpoint: the September 8 focused checks passed **42 tests**: 19 Customer cases
(`TransportationKitsPanel.test.tsx` 14 and `SampleShippingDetailPage.test.tsx` 5),
plus 23 staff/location and existing Lab receipt/CRM integration cases. Full
frontend TypeScript and scoped ESLint passed after temporary browser harness
cleanup and the final visibility fix.

Customer coverage checks confirmation with recommended quantities and included
delivery, missing-address recovery, required location selection, duplicate-safe
submission, pending/in-transit/partial receipt states, preparation gates and
retained legacy access. A completed request retains its receipt summary while
server-authorized uncovered tubes can start another kit order; the next Pending
request suppresses duplicate controls again. The stale empty Return kit sidebar
is hidden only for Customer packing pools, preserving registered-kit details.

Staff/location component coverage checks view-first request and location pages,
frozen delivery facts, dispatch quantity limits and required physical-kit
selection, shortages, modal dismissal, scoped organization/Department access,
and versioned address editing. The return link and supply refresh are implemented;
the complete location-save-to-order navigation needs the guided journey below.
The recorded checkpoint also included the generated 56-guide documentation
corpus. This documentation update does not rerun or expand that checkpoint.

### Reusable transportation-kit frontend scenarios

Keep the `KIT-Fxx` IDs stable when adding regression tests or recording acceptance.
Use an accepted, active Customer Lab Job with a finalized sample list, compatible
kit definitions, and organization/Department-scoped identities. Use synthetic
fixtures for component/browser checks. The [guided E2E plan](E2E-TEST-PLAN.md)
owns the one-step-at-a-time Customer-to-Phaeno journey and permission boundaries
for any real order, notification, dispatch or receipt.

"Automated" below means existing component assertions with mocked API/session
boundaries. "Browser evidence" means the recorded actual-component synthetic
review, not a persistent authenticated E2E test. "Gap" is a remaining assertion
or acceptance check, not a failed result.

| ID | Scenario and expected behavior | Existing evidence and remaining coverage |
| --- | --- | --- |
| KIT-F01 | No received Job supply offers Order transportation kits only; no existing-kit bypass. Unbound physical links and cancelled requests provide the order pathway, even with a stale permissive preparation flag. | Automated: [Customer kit tests] and shipment-detail cases. Browser evidence: job-kit-gating no-order/cancelled/physical fixtures. |
| KIT-F02 | Confirmation shows recommended sizes/quantities, the default delivery location and included delivery/no additional charge; nothing is ordered before confirmation. | Automated: [Customer kit tests], including submitted location/shipment versions and recommended quantities. Browser evidence: order modal. |
| KIT-F03 | With no locations, Add a delivery location provides recovery; returning to the shipment reopens confirmation without placing an order. | Automated: [Customer kit tests] cover the setup link and auto-open behavior separately. Gap: real-router save, return context and refreshed location must be verified together in the guided journey. |
| KIT-F04 | Multiple locations without a default still allow opening confirmation; blank submit shows the required error and focuses the chooser. | Automated: [Customer kit tests]. Browser evidence: no-default fixtures and keyboard selection. |
| KIT-F05 | Changing the delivery location refreshes the recommendation and submits that location's displayed version, not the prior default. | Automated: [Customer kit tests]. Gap: full route/query-cache refresh after location editing and a stale-location rejection through the order flow. |
| KIT-F06 | A failed order retains the draft and reuses the same retry key; busy state prevents duplicate submission/dismissal; success shows Kits ordered. | Automated: [Customer kit tests]. Gap: simultaneous browser tabs and sibling-shipment ordering require server/integration evidence; component mocks do not prove deduplication. |
| KIT-F07 | Pending and dispatched requests suppress another order; tracking is visible; kits on the way do not enable preparation. | Automated: [Customer kit tests]. Browser evidence: pending and in-transit fixtures. Gap: authoritative reload after a real dispatch. |
| KIT-F08 | Partial receipt leaves undelivered kits On the way and permits preparation only for the server-authorized available portion. Configuration offers only received Job sizes and quantities, preserving drafts and blocking confirmation if supply changes. | Automated: [Customer kit tests] and packing cases. Browser evidence: job-kit-gating partial-received configuration. Gap: actual packing/scanning with only acknowledged physical kits. |
| KIT-F09 | Receipt requires at least one arrived kit, submits only selected IDs, and preserves the selection/error after declined discard. | Automated: [Customer kit tests]. Browser evidence: receipt selection/validation. Gap: async receipt failure/retry, stale request version and busy receipt dismissal have no dedicated component assertions. |
| KIT-F10 | A completed Received request retains its summary; server-authorized residual tubes can start an additional order; the new Pending request suppresses duplicates again. | Automated: [Customer kit tests], residual-order regression. The final fix was not rerun in browser fixtures; populated signed-in acceptance remains open. |
| KIT-F11 | Members remain view-only; Customer administrators manage kits/locations; unauthorized staff or Department viewers do not load protected records. | Automated: [Customer kit tests], [staff kit tests] and [delivery-location tests]. Backend authorization remains authoritative; these UI assertions do not prove tenant isolation. |
| KIT-F12 | Staff discovery opens a dedicated request record without an embedded dispatch form; list filters/pagination and return-to-list context remain usable. | Automated: [staff kit tests] cover the record link and form-free list. Browser evidence: queue/detail. Gap: explicit filter, pagination, empty/error/retry and restored-list-state assertions. |
| KIT-F13 | Fulfillment displays the frozen delivery address, explains stock shortages, requires physical-kit selection, and caps choices at remaining quantities. | Automated: [staff kit tests]. Browser evidence: dispatch/shortage fixtures. Gap: dedicated blank carrier/tracking and invalid dispatch-date validation assertions. |
| KIT-F14 | Partial dispatch sends exact kit IDs/request version and retains carrier/tracking plus retry key after failure; dirty/busy close is guarded. | Automated: [staff kit tests]. Browser evidence: dispatch modal. The read-only detail distinguishes On the way from Received by Customer and suppresses completed dispatch actions. |
| KIT-F15 | Delivery-location discovery/detail stays view-first; administrators can manage the scoped Department while ordinary members only read. | Automated: [delivery-location tests], including scoped list calls and blocked unrelated Departments. Browser evidence: list/detail and empty-location states. |
| KIT-F16 | Location editing validates required fields, normalizes optional values/country, preserves the default flag, sends the displayed version, and retains failed dirty edits. | Automated: [delivery-location tests]. Gap: successful create, changing the default, deactivation, busy save, and supply-cache invalidation need dedicated component/integration assertions. |
| KIT-F17 | Cancellation before dispatch requires deliberate confirmation; cancellation failure retains context, and subsequent ordering is possible only when permitted. | Gap: customer/staff kit-cancellation actions currently have no dedicated behavioral regression. Add coverage for successful cancellation, failed retry and unavailable cancellation after dispatch; verify server rules separately. |
| KIT-F18 | Desktop/phone and light/dark views preserve readable content, keyboard focus, required errors, modal scrolling, dirty dismissal and usable action footers. | Browser evidence: 24 Customer and 24 staff/location cases. Customer axe checks passed. Gap: populated Firefox/screen-reader acceptance and the final residual-order visibility change in a browser. |

[Customer kit tests]: ../../frontend/src/features/sample-shipping/TransportationKitsPanel.test.tsx
[staff kit tests]: ../../frontend/src/features/orders/kit-requests/KitRequests.test.tsx
[delivery-location tests]: ../../frontend/src/features/organizations/delivery-locations/DeliveryLocations.test.tsx

Recorded browser artifacts are
[`transportation-kit-customer-review/review.json`](../../artifacts/transportation-kit-customer-review/review.json)
and [`kit-request-staff-review/review.json`](../../artifacts/kit-request-staff-review/review.json).
They used synthetic records with no live API writes or external notifications;
temporary harnesses were removed. The existing five
[`SampleShippingDetailPage.test.tsx`](../../frontend/src/features/sample-shipping/SampleShippingDetailPage.test.tsx)
cases protect legacy packet/tube behavior, not a complete new Customer kit journey.

Keep actual fulfillment-notification delivery, signed-in Customer reload/return,
carrier tracking, physical arrival, receipt acknowledgement, and subsequent
sample preparation in the [guided E2E acceptance record](E2E-TEST-PLAN.md).
Do not count a mock response or an empty signed-in staff queue as that proof.
Cross-Job inventory, stock corrections, warehouse reservations and replenishment
remain proposed scope in the [shipping plan](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md),
not implemented workflows or silently assumed passing tests.

## Container-size editor layout — September 8, 2026

The 12 `ShippingContainers.test.tsx` cases passed after aligning paired desktop
fields and grouping the form. Shared helper-before-control order is preserved;
other consumers retain the existing default field layout. Supplier and packing
details collapse when empty, open for populated revisions, and automatically
reopen and focus an invalid optional field without losing values or saving.
That recovery has a focused regression; the layout itself adds no cosmetic
unit assertions. Full TypeScript, scoped ESLint and whitespace checks passed.
Phaeno help describes the optional section and Availability group; the generated
56-guide corpus is current. Responsive and signed-in review is in the E2E plan.

## Standard containers, tube scanning and split receipt — September 8, 2026

September 9 shipment header refinement: the shared detail page puts every
visible header action in one **Actions** dropdown when there are two or more,
keeps a single action direct and omits the control when there are none. Visible
disabled actions count toward grouping. Preserve capability gating,
pending/disabled behavior, packet links, CSV download and existing confirmation
dialogs. Rename the CSV action to **Download tube list (CSV)** and remove the
standalone replacement action as requested. The final **Print shipping insert**
action validates the current document and opens the browser print dialog while
keeping the shipment route, page content and scan state unchanged;
permitted tube corrections still generate the corrected revision. Existing
component assertions are updated for menu access, no standalone replacement and
first-confirmation error/recovery and invalidation. They have not been run.
Connected Portal checks confirm the three-item issued-insert menu and no standalone
replacement action. Escape closes the menu and returns focus to Actions. Opening
Record shipment focuses Carrier; cancelling without entry or submission returns
focus to Actions and preserves ReadyToShip with 18/18 matches. Zero/one-action
states and responsive/theme checks remain pending. No new automated suite is added.
The owner's latest screenshot supplies the rendered document page for
**SP-20260910-TJHAQYMGKQ, revision 1**, for the same 18-tube shipment. This verifies
the earlier packet-route rendering correction. Direct-print validation,
cancellation/retry and complete document review remain pending; there is no
physical print or dispatch acceptance. User-facing document terminology is now
**shipping insert**, with internal packet contracts and barcode identities
unchanged.

Final scoped ESLint and the full frontend TypeScript check passed. No automated
suite was run for the final header, print and reset-explanation changes. The live
print-action attempt caused subsequent browser inspection to time out; native
dialog contents and unchanged state after cancellation are awaiting the owner's
confirmation and must not be counted as a passing print check.

The owner reported the inactive-selection reset explanation still present because
the Visual Studio API is running the older backend code. The immediate UI
correction supplies the issued-insert explanation only for a current issued
insert whose server response already disallows reset. The existing disabled state
and server authorization remain unchanged. Its guards exclude cancelled records,
preparation pools, records without a physical container and empty tube lists.
Write/scan blocking, eligibility load failures and pending state retain priority.
Focused assertions now cover current status, those exclusions and transient-state
priority; they have not been run. Verify the explanation with the older API
response and preserve the normal server reason for unrelated blockers. This
presentation check now has connected DOM confirmation of the exact issued-insert
reason on the same shipment URL with 18/18 matches. Excluded-state and transient
variants remain unrun; the backend source fix is recorded separately.

September 9 presentation refinement: the existing `SampleTubeScanner.test.tsx`
save/advance assertion now expects one saved barcode in its sample row and no
duplicate Saved barcode graphic. The visual Saved card is removed, success
announcement retained for screen readers, and on-screen row barcodes made
compact without changing printed dimensions. Connected Portal and user-provided
screenshots verified the current 1-of-18 layout. Automated suites were not rerun
for this refinement; manual SHP-10 continues in the connected walkthrough.

The owner subsequently requested equal matched and unmatched desktop row heights
at the five-scan checkpoint. The scanner bar-height refinement is 1rem on screen
with the existing 12rem width cap, 4px caption gap and readable identifier text;
printed bars remain 7mm. Rows remain content-driven for longer text and narrow
layouts. The change is implemented locally. The owner's latest screenshot
confirms compact 16px bars and rows at **18 of 18 matched**. No unmatched rows
remain for a direct same-view comparison; precise matched/unmatched measurements
were not completed because the browser inspection lost its connection. Scoped
ESLint and whitespace checks passed. No cosmetic unit assertion or automated
suite run was added for this sizing change. The latest screenshot shows packet
review available, Reset disabled and automatic advancement to **Tubes 17–18 of
18**. A later screenshot verifies the nine-sample/18-tube packet confirmation
review, followed by the post-issuance actions. Explicit Previous/Next paging,
the packet document and dispatch remain pending.

The focused component checkpoint passed 59 tests: 34 Customer/receipt/barcode
cases and 25 Phaeno catalog/stock/scanner cases. Full frontend TypeScript and
scoped ESLint passed. Generated documentation contains 56 current guides.

Focused component coverage now includes the container catalog and view-first
record, immutable SKU revisions and deactivation, hypothetical draft preview,
availability constraints, stock-kit preparation/registration/dispatch, dirty
modal dismissal and duplicate barcodes. Customer tests cover packing selection,
custom per-container tube counts, spare capacity, exact allocation validation,
save-before-advance scanning, retained rejected scans, and split manifests.
Related-shipment tests cover source-scoped retrieval and exhausted packing
pools. Lab receipt tests send the exact packet/tube pair and distinguish one
physical tube's receipt from the sample's aggregate progress.

The barcode encoder covers readable exact supplier values, including underscores,
valid Code 128 symbols/checksums, and unavailable-graphic fallback. These checks
do not qualify real label stock, printers or barcode-scanner hardware. Desktop,
phone, theme, modal, keyboard and print evidence belongs in the E2E plan.
No transport stock, operational SKU or Customer fixture was seeded for UI tests.

## Finalization review grouping and sorting — September 8, 2026

The existing seven `LabJobSamplesPanel.test.tsx` cases passed after the review
was grouped and naturally sorted, and again after correcting initial focus.
Full TypeScript and scoped ESLint passed. No cosmetic unit tests were added.
The eight synthetic browser cases in the E2E plan verify natural numeric IDs,
preserved input-array order, sample/tube totals, no-PHI gating and keyboard
focus/scroll behavior, including long lists. Customer and Partner help now
describes the ordering and review totals; generated documentation is current.

## Grouped samples, source capacity and import safeguard — September 8, 2026

Focused checks passed 24 cases: seven `LabJobSamplesPanel.test.tsx` cases and
17 across `LabSampleDialog.test.tsx` and `sample-source-capacity.test.ts`.
The panel verifies accepted/empty/unmatched groups, record counts rather than
tube counts, retained excess records and their repair warnings, group-specific
Add context and full-group blocking, exact composition despite a stale server
finalize flag, disabled populated-list import with template still available,
and separate empty-roster import/no-PHI finalization confirmation.
The final panel rerun also verifies the accessible completion check appears
only for exact overall and per-source composition, staying absent for partial
or wrongly mixed lists. Count completion does not skip finalization consent.

The dialog/helper checks cover the clicked Add group's fixed source without
a source field, no fallback when that group becomes full, accepted-source
validation, original-source edit recovery, unavailable full destinations,
case/space normalization, retained unknown entries, background refresh without
losing typed values, and the existing dirty-dismissal behavior. Source quotas
count sample records independently of tube quantity. Full TypeScript, scoped
ESLint, generated-documentation and whitespace checks passed. Responsive and
keyboard evidence is recorded separately in the E2E plan.

## Compact sample rows and icon actions — September 8, 2026

The two existing `LabJobSamplesPanel.test.tsx` import/finalization cases passed
after the presentation change. Full TypeScript, focused ESLint, documentation
and whitespace checks passed. No cosmetic unit tests were added. Browser
review verifies sample-specific pencil/trash accessible names and tooltips,
correct sample edit context, unchanged removal confirmation, responsive rows,
tube singular/plural, and Expected visibility only after finalization.
Other statuses remain visible before finalization. No backend change or test
run was needed. Customer and Partner guides describe the icon actions.

## Add/Edit sample presentation — September 8, 2026

The sample dialog now uses the shared compact width and padded body, a single
column, concise RNA introduction, persistent field-specific privacy/source
guidance and a compact tube-count control. The scientific fields, default
values, accepted-source choices, payload and validation are unchanged.
Browser verification found that the existing dirty-state guard did not subscribe
during render. The correction is covered by four passing
`LabSampleDialog.test.tsx` regressions: Add/Edit each preserve entered IDs after
declined Cancel/Close/Escape discard, close after confirmed discard, and allow
pristine Cancel without a warning. No API or saved callback was invoked.
The single accepted source is now visible as read-only context. Customer and
Partner guides describe the fields and discard protection.

Full TypeScript, scoped ESLint, documentation and whitespace checks passed.
No cosmetic unit tests or broad suite were added/run. Synthetic responsive
and keyboard evidence is recorded in the E2E plan.

## Quote decline reason dropdown — September 8, 2026

Focused verification passed 45 cases across `LabQuoteDeclineDialog.test.tsx`
(12), `LabQuoteExtension.test.tsx` (19), `ExternalOrderDecisionDialogs.test.tsx`
(10), and `LabQuoteDownload.test.tsx` (4). The initial 43-case batch passed;
two additional parent integration cases passed in the 19-case affected-file
rerun. Coverage verifies every named reason, blank and Other validation,
trimmed explanation and 2,000-character serialized boundary, hidden-text
retention/exclusion, duplicate submission, error/retry, dirty discard/reset,
and the existing withdrawal payload through the detail page. Prequote and
postacceptance decision behavior remains covered. Full TypeScript, scoped
ESLint and whitespace checks passed; no backend tests were needed for this
frontend-only change. Browser evidence is recorded in the E2E plan.

## Quote expiration, extension and action placement — September 8, 2026

All 33 focused Customer/Partner quote, PDF, decision and deadline cases passed.
Coverage includes local deadline crossing, disabled acceptance and explanation,
Member guidance, optional-reason extension requests, duplicate prevention,
safe retries, preserved dirty inputs, accepted-history precedence, and stale
acceptance confirmation. Quote actions appear once in Accept / Decline /
Download order beneath the total, with prequote withdrawal retained in the
header. The final action-row change passed the same focused suite. Contextual
decline/withdraw confirmation wording is covered by the decision tests; the
existing closure endpoint and authorization remain unchanged.

The approved Decline quote wording adds a decision-dialog regression for the
named request, explicit closure consequence, required reason, busy/error state,
and dirty dismissal. Prequote withdrawal keeps its separate wording.

All 26 staff quote-dialog, intake and extension-review cases passed: pending
markers, saved-price reissue, required future expiration, bound source revision,
commercial capabilities, refresh failure and dirty/retry recovery. TypeScript
and scoped ESLint passed. Browser evidence and its synthetic limits are recorded
in the E2E plan; the owner's live Firefox walkthrough is separate.

## Branded quote PDF download — September 8, 2026

`LabQuoteDownload.test.tsx` exercises the detail page through the mocked HTTP
boundary: the displayed issued quote ID/revision determines the PDF request and
filename, an ordinary Member can download without accepting, pending blocks
duplicate clicks, JSON-blob and non-JSON errors remain retryable, and request
revision snapshots remain JSON. All 4 cases passed, together with the existing
invoice-capability and external-decision-dialog coverage (16 passed total).
TypeScript, scoped ESLint, and generated Customer/Partner documentation checks
passed. The owner's real Firefox PDF download remains a separate acceptance step.

## Account menu and external dashboard presentation — September 8, 2026

Presentation-only changes improve menu identity/spacing, display selection,
viewport fit, and the adaptive external dashboard card grid and border. No new
unit tests were added for styling. TypeScript and focused ESLint passed; the
existing desktop/mobile menu browser scenario is recorded in the E2E plan.

## Invitation completion continuity — September 8, 2026

`AcceptInviteSession.test.tsx` uses the real session provider to verify acceptance
through initial organization and General department selection, with the welcome
message and Open Portal action retained and no repeated acceptance or preview
of the consumed token. It also verifies that identity changes reset pre-session
state and organization/department changes reset ordinary workspace state. All
3 regressions and the existing 15 invitation/authentication cases passed.

## Invitation identity and direct verification — September 8, 2026

`AcceptInvitePage.test.tsx` covers recipient preview, URL-token capture and
reload recovery, fixed-email authentication handoff, verified secondary email,
wrong/unverified account blocking, expired-link recovery, explicit acceptance
and decline, and token retention after a failed acceptance (9 cases).
`InvitationAuthentication.test.tsx` covers skipping email entry, one code send,
resend cooldown, existing-user verification, authenticator/backup requirements,
verified first-time signup transfer with known names, wrong-code rejection,
changed-identifier rejection, and preparation retry (6 cases). All 15 passed.
Authentication uses current Clerk hooks, not the editable prebuilt email form.
TypeScript, focused ESLint, and generated documentation checks passed. The
6 authentication cases passed again after the final first-time password wording.

The approved single password field now has a Show/Hide password action. It
starts masked and returns to masked on submission or a step change. Password
manager autofill and the field value are preserved. The existing 6 authentication
cases, TypeScript, and focused ESLint passed; no new test was added for this
small presentation control.

## Invitation branding — September 8, 2026

The root document now explicitly declares the existing Phaeno PNG favicon for
all routes, including invitation acceptance. TypeScript passed. No new unit
test was added for this static metadata change.

Invitation readiness follow-up: updated existing validation/recovery checks to assert Send invitation is disabled immediately for empty or unavailable Department selections and re-enabled for valid selections. All four existing invitation tests passed; focused lint passed.

## Invitation clarity — September 8, 2026

Updated the existing OrganizationInvitationDialog role-choice test for visible radio choices. All four existing invitation tests passed, covering Department validation, failed-save recovery, dirty-draft dismissal, and organization-administrator intent. Focused lint and TypeScript checks passed. Recipient identity still uses reviewed form defaults and the existing invitation payload.


## CRM outreach decisions — September 8, 2026

`CrmContactEditor.test.tsx`, `CrmRecordEditSnapshots.test.tsx`, and
`CrmContactDetailPage.test.tsx`: 13 passed, zero failures. Coverage includes saving
email without creating permission, conditional evidence/reason validation,
legacy review presentation, declined discard, pending controls, retained
decision drafts and reviewed version after background refresh/save failure.
The Contact form uses React Hook Form/Zod and existing modal/draft protections.
The staff guide and generated documentation corpus describe the three outreach
states, immutable history, and the external sending boundary.

## Configured Lab Service and included PSeq Kit bundles - 2026-09-07

The integration run covered **333 tests across 88 files**: 332 passed and the sole failure was the old documentation assertion that Partners have no Lab Service guide. After correcting that assertion, the focused registry checks passed. Evidence: `artifacts/bundled-orders-full-frontend-final.json` and `artifacts/bundled-orders-registry-corrected.json`. This is combined checkpoint evidence, not a claim that a single full run was entirely green.

New `BundledOrders.test.tsx` and `KitPurchaseReview.test.tsx` cover 11 cases: final approved tax/total and exact reviewed commercial/scientific token; fresh acceptance after changed terms; denied incomplete billing; org-admin Kit commitment versus Department draft preparation; same-price included-profile changes; exact purchased-case handoff; retained case version on extension; no standalone Assembly creation; frozen inactive profile editing; controlled timing reasons and reviewed timing version; and exclusion of internal notes from external timing. Navigation covers Customer and Partner Lab access using the server capability. Legacy decision-dialog tests isolate the independent new bundle panel guards while retaining their original dirty/pending/focus behavior assertions.

A later bounded invoice-capability change adds `LabInvoiceCapability.test.tsx`: native AR is queried and shown only with explicit `canViewLabServiceInvoices`; absent authority never uses general Lab access as a fallback and cannot reveal cached invoice data. The two new cases and ten existing external decision-dialog cases passed together (`artifacts/lab-invoice-capability-focused.json`). These two additional cases were checked after the 333-test integration run. TypeScript and zero-warning scoped lint passed at the final checkpoint.

`e2e/bundled-orders.spec.ts` and its separate fixture exercise real components with intercepted synthetic API state. Ten cases passed across desktop and narrow mobile: Customer and Partner configured review/commitment/sample-entry handoff; exact Kit case input preparation, interrupted upload, same-request retry and submission without another quote; offering-version configuration; and staff timing/deadline review. Each checks settled WCAG 2.2 AA Axe results, horizontal overflow, page errors and unexpected API calls. The browser run exposed and corrected deferred FileList capture after input clearing and a refreshed case hiding the retained new draft. Screenshot copies live in `artifacts/bundled-orders-browser-2026-09-07`.

The synthetic fixture simulates signed-in rendering; it does not verify Clerk, real memberships, production authorization, payment, file storage or scanning, physical shipment/bench work, or external notification delivery. API-backed and operational acceptance remain separate. E2E living-plan ownership stays with the coordinating agent; no public Website files were changed.


## Portal completion integration — 2026-09-07

The full frontend suite passed **321 tests across 86 files**, with zero failures. Evidence: `artifacts/crm-integration-vitest-final.json`. This checkpoint includes the earlier consistency tests whose execution was deferred in the historical entries below.

New and updated coverage includes ordinary CRM permissions and hidden administrative actions, failed-search Retry and exact attention destinations, shared Trial draft save/resume and full submission validation, receipt allocation reversal and review snapshots, reconciliation draft editing/cancellation/history, and same-Customer invoice search and paging. Integration exposed an actual invoice picker race: an unchanged initial search debounce reset page 2 to page 1. The controlled-timer regression failed before the fix and now passes. Finance focused verification passed 32 cases; those overlap the full total.

Outdated test fixtures were aligned with current router context, session capabilities, required-field labels, asynchronous form initialization and API arguments. Full TypeScript checking and zero-warning lint passed. Documentation generation/check validates 55 audience-specific guides; the production build and synthetic browser evidence are recorded in the completion plan and E2E plan. No identity provider, package dependency or Customer/Partner permission was changed.

## Intake consolidation - 2026-09-07

Customer order creation is consolidated in Intake. Updated the existing dialog and Intake mocks, removed the retired staging-panel case, and added stage-grouping and legacy-link regression cases. Scoped TypeScript and lint checks plus synthetic browser review are the verification checkpoint; automated suites were not requested.

## Trial dialog choice scrolling - 2026-09-07

The Trial dialog opts into floating SearchableSelect choices and uses the shared dialog scroll body. Scoped lint and typecheck validate these changes. Existing non-portal SearchableSelect unit scenarios remain unchanged; automated suites were not requested or run. Browser observations are recorded in the E2E plan.

## Optional Trial assignment note - 2026-09-07

Trial approver assignment now labels Reason as Note (optional) for primary and delegate assignment. Typecheck and scoped lint passed. Automated regression coverage was not requested; shared required-field behavior remains unchanged.

## Trial navigation and filter presentation - 2026-09-07

Scoped lint and frontend typecheck cover the shared Order operations navigation,
existing Trial route wrappers and list toolbar changes. Documentation generation
and consistency checks are included. Automated suites were not requested and were
not run for this slice. Deferred regression automation: Phaeno Trial-only access,
external Trial menu preservation, active Order ops state on Trial child URLs, and
combined search/status/owner reset. Local browser observations are recorded in the
E2E plan; they do not establish production acceptance.

## Signed-in acceptance CRM corrections — 2026-09-05

Hosted review of release `541c875` reproduced two narrow issues: the association
selector could dismiss its parent on Escape, and Edit Company showed copy that
incorrectly implied existing Portal access was disabled. The local corrections
reuse the shared selector Escape protocol for empty results and focused options,
and provide edit-specific Company copy.

All **eight focused tests** across `CrmAssociationRecordCombobox.test.tsx` and
`CrmCompanyFormDialog.test.tsx` passed. Scoped lint, typecheck and production build
passed; evidence includes `artifacts/review-gap-closure/acceptance-fix-typecheck.log`
and `acceptance-fix-build.log`. No authentication, API or dependency changed.
`crm-companies-contacts.mdx` and `crm-troubleshooting.mdx` were reviewed and remain
accurate for these corrections; no guide/corpus content change is needed.

Portal deployment `dpl_D272h4HEkZGM7NmTeS94sFNYzvCx` is READY at
`portal.phaenobiotech.com`, exact source
`505c9eb350426e78e8949b67b766fe4a7872c6fd`. Fresh signed-in Company Edit showed
the corrected wording. Associate Contact with empty results kept its modal open
and focused Contact when first Escape closed the choices; the same action
preserved a temporary Job title draft. Second Escape dismissed the dialog;
no association was submitted. Evidence is
in `artifacts/review-gap-closure/acceptance-ui-final.json` and
`acceptance-crm-production-check.json`. Final health/browser/error-query evidence
and its bounded scope are recorded in the closure plan.

The API remains at `541c875`. The separately approved technical-brief receipt is
recorded in `artifacts/review-gap-closure/acceptance-email-proof.json`; the
external email's two-page description versus the three-page PDF remains open.
Populated Trial/quote/sample/download acceptance remains unverified. Earlier
combined-release checks below are historical checkpoints; the closure plan
records current release identities and the precise acceptance boundaries.

## Combined API/Portal release checkpoint — 2026-09-05

The Product Owner authorized the combined commit/push and production API/Portal
UI release. The bounded Web Operations correction adds an optional third Email
delivery Radix tab and mounts only the selected panel. Without a delivery panel,
the existing two-tab view remains. Equal-width tab labels/counts wrap on mobile.
All **seven WebOpsDashboardContent component cases** and scoped lint passed;
the integrated release browser checkpoint passed 18 distinct cases across its
initial run and targeted rerun. The earlier separate-unit hold below
records the discovery checkpoint, not a current instruction to extract
independent artifacts.

The full release-checkpoint frontend suite passed **203 tests across 66 files**,
and the Portal production build passed. Frontend lint and typecheck exited
successfully. Documentation freshness passed for all **55 guides**, fingerprint
`3633301d1516`. Logs are retained under
`artifacts/review-gap-closure/release-frontend-*`.

Prior frontend, keyboard and local build results remain dated evidence below.
The verified Portal target is Vercel `cadexgenomics/phaeno-ops-mgmt-system`,
project `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`, repository root directory `frontend`.
At this pre-deployment checkpoint, rollout still awaited migration approval and
release identity/production verification. Those later completed deployment
results and the subsequent CRM acceptance corrections are recorded in the
closure plan. Target identification and local builds alone did not prove
promotion. No public Website promotion is claimed by this checkpoint.

## Option-focused Escape correction — 2026-09-05

The selector now handles Escape from either its input or a focused result:
choices close, focus returns to the input, and the current selection remains.
The containing dialog handles a subsequent Escape through its existing discard
policy. Its Radix capture guard recognizes the whole open selector.

All **27 focused tests across five files** passed for SearchableSelect, Trial
form/sample/scope and PlatformQuoteDialog. The new option-focus regression checks
preserved value, restored focus, closed choices, and the dialog's deferred Escape
callback. Scoped lint, typecheck and the Portal production build passed, with
the existing large-chunk advisory. These are targeted checks of the
combined working tree, not independent release-unit verification.

At that review checkpoint, `REVIEW-GAP-CLOSURE-2026-09-05.md` held the Website
email unit because the parent dashboard lacked the documented Email delivery tab
and isolated-panel tests did not cover that integration. Tab-composition coverage
was deferred with the bounded correction. The current combined-release section
above records the subsequent authorization and its verification status.

## Follow-up: review gap closure and Website processing controls — 2026-09-05

All **201 frontend tests across 66 files** passed before the final narrow
busy-scroll accessibility correction. After that correction, all 11 focused Trial
and six WebOps tests passed, the Portal production build passed, and scoped lint
and final typecheck passed. Full lint passed before the correction. The earlier
195-test integration checkpoint remains recorded below as prior evidence;
overlapping focused runs are not additional distinct tests.

`WebOpsDeliveryPanel.test.tsx` covers processing status and attention filtering,
queued messages retained during pause, explicit interrupted labels without
counting expired attempts as sending, required reasons, preserved reason text
through a stale version and failed reload, refreshed-version resubmission, and
blocked editing/dismissal during resume. Existing resend recipient review,
history, failure/retry, and provider-acceptance wording remain covered. Trial
follow-up cases cover retained entries and busy protection during reload. Browser
verification found a keyboard-scroll gap while controls were disabled; named
focus targets available only while busy now retain keyboard access to the scroll
region, with the affected browser checks passing.

Audience-specific guides and the generated search corpus were updated: 55 guides,
fingerprint `3633301d1516`. Documentation routing and audience admission remain
unchanged. The final browser rerun is recorded in the E2E plan. Local verification
for this follow-up is complete; hosted acceptance, provider delivery, and external
alert-sink setup remain separate deployment checks.

## Review gap closure — 2026-09-05

All 195 frontend tests across 65 files passed at the final integration checkpoint;
47 focused shared-dialog, CRM, quote, Trial, WebOps and documentation cases also
passed. Lint, typecheck and production build passed. New cases cover CRM
loading/failure/retry with cached data; quote discard and pending protection;
changed-scope re-acceptance, dirty Trial dialogs, batch payloads and quantity/
concentration/replacement validation; WebOps resend review/history and legacy
brief recovery; and first-Escape combobox dismissal inside a real Radix dialog.
`CrmCompanyWorkspaces.test.tsx` adds five cases against the actual live People and
Sales components, including cached rows and preserved association/invitation
entries when prerequisite queries fail. The final focused CRM run passed 11 cases.
SearchableSelect preserves Customer wording by default and accepts workflow
labels, validation names and focus refs for Trial uses.

Website error classification has two dependency-free Node cases; both passed.
The separate Website build passed for all 17 pages. Audience-specific guides,
review dates and generated search corpus were updated; guide routing and audience
admission are unchanged. Browser results are recorded in the E2E plan.

## Portal documentation search — 2026-09-05

All 168 frontend tests across 62 files passed; full lint/typecheck and production
build passed. Existing registry tests retain all audience, identity, ordering and
component guarantees. `documentation-search.test.tsx` adds cancellation and
response-isolation checks across organization/Department changes, captured request
headers, and bounded route input. Five Node publication tests cover fresh source
artifacts, catalog/source validation, executable-MDX refusal, duplicate/Unicode
heading anchors and invalid component mapping.

The metadata catalog is shared by navigation, topic/workflow browsing, related
guides and generated backend input. Generated files are validated separately from
rendering code. Browser evidence, including the initial context/hydration input
fix, is recorded in the E2E plan. No new dependency was added.

## General retention notices continuation (2026-09-05)

This slice changes backend scheduling/delivery and audience-specific help prose.
The existing Retention notices queue and notification retry UI are reused; no
component, route, API response shape, audience access, help navigation, or renderer
changed. Frontend suites were intentionally not rerun. Backend PostgreSQL tests
cover general failure records, retry and current-recipient behavior. The previous
rendered download-control checks remain recorded below.


## General release download controls (2026-09-05)

`LabManagedResultReleases.test.tsx` adds five meaningful cases: release schedule
and ZIP selection, disabled file/ZIP actions at cutoff without false deletion,
usable grace plus refresh after failed download, and undated/incomplete legacy
release behavior, and unavailable-file ZIP refusal. All 14 focused Lab/governed/retention-notice tests passed.
Lint/typecheck passed. Assembly controls also disable closed/deleted or invalid
files and refresh after every outcome. No documentation navigation, audience
filter, or shared API shape changed; help prose/review dates changed.


## Commit-time retention continuation (2026-09-05)

This slice changes backend timing/evidence and Customer/Phaeno help prose only.
The existing completion DTO, components, routes, documentation navigation,
audience access, and rendering are unchanged. Frontend and browser tests were
intentionally not rerun; backend controller/database checks cover timing and
storage admission. The prior 15-test frontend checkpoint remains dated evidence.


## Retention recovery queue (2026-09-04)

The existing Operations selector now includes **Retention notices**.
`PSeqOrderToCashPanels.test.tsx` verifies the filter sends `RetentionNoticeFailure`.
All 15 focused PSeq/governed-package/retention-notice unit tests passed; lint and
typecheck passed. Customer and Phaeno help explain reminders, recovery, and
revocation. No documentation navigation or audience access behavior changed.


## Governed retention reconciliation (2026-09-04)

`GovernedResultPackagePanel.test.tsx` adds four cases for frozen date display,
artifact selection, completed-download grace, closed access without false deletion,
legacy missing snapshots, and pending actions. All 14 focused governed-panel,
retention-notice, and PSeq panel tests passed across three files. Lint/typecheck
passed. The real job page uses the extracted component and invalidates package
state after each transfer attempt. Audience guide prose and review dates changed;
documentation navigation/audience/rendering rules are unchanged.


## Secondary department paths checkpoint (2026-09-04)

The Data Library now exposes history to admins of the selected Department as well
as Organization admins, with scope/legacy guidance and Department-specific cache
keys. Requests wait for matching server-confirmed Department context.
`DataLibraryPage.test.tsx` has six cases (five new): mock-mode behavior, Department
and Organization admins, ordinary-member denial, context-confirmation wait,
immediate old-row removal while the next request is pending, and role revocation.
All 13 focused Data Library/API-client/documentation tests passed across four
files. Frontend lint/typecheck passed. Documentation navigation/audience/rendering
rules remain unchanged; audience prose and review dates are current. Hosted
signed-in history, notifications, exports, and identity remain release gates.


## Department administration closeout checkpoint (2026-09-04)

`OrganizationInvitationDialog.test.tsx` adds four cases for required Department
intent and admin assignment, changed Department availability with preserved
inputs, unsaved dismissal, and Organization-admin scope. The full Portal unit
suite passed: 144 tests across 57 files. Frontend lint and typecheck passed.
New shared forms use RHF/Zod, the en-US catalog, visible required legends, pending
guards, accessible field errors, and explicit review after a stale response.
Organization-default inheritance and API enforcement are covered by backend
reference tests; their visible edit/conflict flow is covered in the E2E plan.


## Website UI polish checkpoint (2026-09-04)

The separate Astro Website's contact forms received required markers,
required semantics, error associations, and a consistent demo action.
Focused browser checks verified all nine controls, invalid-field focus,
legends, and the checkbox-style regression correction. No component suite was
added for these presentation changes or run against the Portal. Website build
and manual evidence are recorded in `WEBSITE-UI-POLISH-PLAN.md`.

Keep this file updated as frontend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

The Lab Operations workspace is implemented, linted, typechecked, and included
in a successful client/SSR build. Barcode encoding, scan-first lookup/batch
entry, and reasoned print-outcome behavior have focused component coverage.
The remaining connected-workspace coverage below and physical bench acceptance
remain incomplete production-activation gates.

## Created Tests

- [x] Existing CRM sidebar and browser expectations now use **People** instead
  of **Contacts**, preserving the compatible `/crm/contacts` route.
- [x] `src/api/client.test.ts` captures Department/Organization headers before
  delayed authentication and preserves explicitly supplied scope.
- [x] `LabJobDetailsDialog.test.tsx` verifies the staff-selected Department is
  included in Customer job initiation. Existing test assertions now use accessible
  required-field names and await asynchronous validation correctly.
- [x] The full frontend unit suite (140 tests) passed locally during the 2026-09-04 review;
  People/Department rendered interaction coverage is in the E2E plan.
- [ ] Remaining focused People and Departments coverage for invite/link/
  unlink review, identity-conflict display, Department CRUD and assignments,
  selected-Department persistence, service/data-grant scoping, keyboard use,
  reflow, and error recovery.
  The 2026-09-04 follow-up authorized review and local automated verification.

- [x] `frontend/src/api/pseq-order-to-cash.test.ts` - successful collection and
  command responses are unwrapped from the standard API envelope, while
  provider errors remain actionable request failures.
- [x] `frontend/src/api/organization-management.test.ts` - the derived
  operational-readiness response is unwrapped before the account checklist
  consumes its blocker collection.
- [x] `frontend/src/features/orders/PSeqOrderToCashPanels.test.tsx` - staged
  Customer blockers, attention-queue empty state, payment-independent result
  release, Billing Operator configuration controls, and Cash Reconciler
  controls.
- [x] `frontend/src/features/invitations/InviteUserForm.test.tsx` - invitation
  intent includes the selected access role and an explicit empty business-role
  set, then reports durable queuing.
- [ ] Remaining PSeq order-to-cash connected coverage - invitation delivery
  lifecycle and hard-bounce revoke/reissue; readiness loading/ready/blocked/
  stale/failure states; result correction/withdrawal/reissue; AR loading/
  failure, partial allocation and import preview/confirm; attention ownership/
  resolution; keyboard/focus/zoom/reflow; and automated accessibility checks
  remain dedicated-staging activation gates.

- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` accepts a valid invite payload.
- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` rejects invalid email addresses.
- [x] `frontend/src/features/organizations/OrganizationDetailPage.test.tsx` - the development sign-in-link dialog exposes the generated link and copies it with an announced status.
- [x] `frontend/src/components/navigation.test.ts` - Phaeno context shows Data
  provisioning and hides the tenant Data Library.
- [x] `frontend/src/components/navigation.test.ts` - Prospect, Customer, and
  Partner contexts show the Data Library and hide Phaeno provisioning.
- [x] `frontend/src/components/navigation.test.ts` - order navigation is scoped
  to Customer lab, Partner reagent/assembly, and Phaeno operations/configuration
  capabilities without leaking the other organization-kind surfaces.
- [x] `frontend/src/components/navigation.test.ts` - Samples & shipping appears
  as a standalone destination only for authorized Prospect contexts; Customer
  shipping remains inside Lab services and Partner contexts remain excluded.
- [x] `frontend/src/components/navigation.test.ts` - Documentation is available
  under Resources in the user dropdown, and absent from primary workspace
  navigation, in Prospect, Customer, Partner, and Phaeno organization contexts.
- [x] `frontend/src/components/navigation.test.ts` - frequent workspace routes
  remain in the desktop toolbar while Documentation, Data provisioning and
  other administration or resource routes move to the user dropdown without
  changing permission filtering; there is no separate Portal Accounts item.

September 9 navigation update: these existing assertions were revised for the
Documentation menu placement. Tests were not run for this change, per the
repository's requested-checks policy.

- [x] `frontend/src/components/application-branding.test.ts` - the selected
  Phaeno organization resolves to POMS, external organization kinds resolve to
  Portal, and the pre-selection fallback is Portal.
- [x] `frontend/src/features/documentation/documentation-registry.test.ts` - the
  maintained Prospect, Customer, Partner, and Phaeno registries expose unique,
  ordered, backend-indexable metadata, resolve slugs only within their audience,
  and keep Phaeno operational subtopics, including the complete CRM guide
  family, in one valid parent level.
- [x] `frontend/src/features/data-provisioning/DataProvisioningPage.test.tsx` -
  mock mode exposes the source surface without calling the secured API and the
  edge rail exposes all four Phaeno configuration sections with the active
  section identified.
- [x] `frontend/src/components/WorkspaceSidebar.test.tsx` - the shared
  viewport-edge sidebar remembers pin choices, switches sections, opens a
  non-modal rail from pointer hover or the accessible edge tab, restores the
  pinned rail on wide layouts, and omits pin controls on narrow layouts.
- [x] `frontend/src/features/data-provisioning/SourceSampleWorkspace.test.tsx` -
  draft discard requires a reason, sends the current optimistic version, and
  returns to the source registry after success.
- [x] `frontend/src/features/data-library/DataLibraryPage.test.tsx` - mock mode
  explains that connected tenant data is paused without presenting a false
  empty-grant state.
- [x] `frontend/src/features/data-library/GovernanceNoticePanel.test.tsx` - an
  organization administrator must provide remediation details and submits the
  current affected-organization concurrency version.
- [x] `frontend/src/features/organizations/LifecycleActionDialog.test.tsx` -
  organization deactivation names its access consequence, and entitlement end
  requires and submits a retained reason.
- [x] `frontend/src/features/organizations/EntitlementDialog.test.tsx` - the
  approved source-request selector includes only requests for the current
  organization and selected service while preserving a documented manual
  exception.
- [x] `frontend/src/features/organizations/EditEntitlementDialog.test.tsx` - an
  existing entitlement opens prefilled with immutable service identity and can
  submit Ready configuration plus an approved source request instead of
  creating an overlapping record.
- [x] `frontend/src/features/lab-operations/Code39Barcode.test.tsx` - POMS
  barcodes encode with Code 39 start/stop characters and unsupported
  characters are rejected rather than rendered ambiguously.
- [x] `frontend/src/features/lab-operations/LabBarcodeScanner.test.tsx` - exact
  container lookup presents the linked work context and scan-first batch entry
  rejects a non-library container without changing membership.
- [x] `frontend/src/features/lab-operations/LabLabelDialog.test.tsx` - the
  browser print action waits for explicit physical success confirmation, a
  failed attempt requires details, and success/failure outcomes are recorded
  separately.
- [x] `frontend/src/features/lab-operations/protocol-definition.test.ts` -
  structured definitions round-trip for resume/clone workflows, older empty
  definitions open as one editable step, and invalid JSON is rejected.
- [x] `frontend/src/features/lab-operations/protocol-execution.test.ts` - typed
  captures preserve zero, validate real dates/approved choices, require explicit
  QC and skip reasons, and prefill corrections while requiring fresh evidence
  confirmations.
- [x] `frontend/src/features/lab-operations/ProtocolApprovalDialog.test.tsx` -
  exact ordered review includes permitted choices and explicit approval
  attestation; unsupported historical definitions cannot be approved.
- [x] `frontend/src/features/lab-operations/MaterialLotCreateDialog.test.ts` -
  supplier-lot validation accepts date-only expiration, prepared reagents
  require structured component lots, and modal related-reference creation
  requires names.
- [x] `frontend/src/features/orders/configuration/OrderConfigurationPage.test.tsx`
  - the seven Order Configuration subjects, including Catalog and Sample shipping, use the shared viewport-edge
  sidebar, identify Defaults initially, and update the active subject when the
  user selects another panel.
- [x] `frontend/src/features/orders/ManualJournalEntryReport.test.tsx` - a
  Phaeno operator sees stable source rows, amounts and the non-posting warning,
  and can request a CSV for the selected date range.
- [x] `frontend/src/features/orders/operations/PlatformQuoteDialog.test.tsx` -
  the canonical PSeq Lab Service item is preselected and bound to the committed
  specimen count, a mismatched quantity is blocked, and missing canonical
  configuration pauses issuance. Proposal coverage starts the reviewer at the
  proposed unit price, approves it unchanged, and requires an internal reason
  before an amended price can be issued. PSeq tax is presented as
  system-calculated, the request cannot submit a staff-entered tax amount, and
  the live pre-tax total follows line quantity and price changes. Required and
  optional quote lines use user-facing pricing guidance without exposing
  internal catalog codes. Quote issuance fetches the latest record version at
  submission time; a later stale-record conflict preserves entered quote values
  and asks the operator to review them before issuing against the new version.
- [x] `frontend/src/features/orders/LabJobDetailsDialog.test.tsx` - an optional
  USD price per specimen and Customer-safe pricing note are submitted with the
  Job pricing profile.
- [x] `frontend/src/features/orders/CommercialOrderIntakePanel.test.tsx` - CRM
  handoffs and active pricing work share one intake queue, and a failed request
  is not simultaneously presented as an empty queue.
- [x] `frontend/src/features/orders/operations/customer-organization-state.test.ts`
  - mock, loading, failure, genuine-empty, and ready Customer-list states remain
  distinct so a failed or pending query is not presented as an empty result.
- [x] `frontend/src/features/organizations/RequestActionDialog.test.tsx` and
  `OrganizationListPage.test.tsx` - Company online-access approval and
  stranded-request recovery explicitly leave product and service entitlements
  unchanged and submit no ordering-authorization choice. Exact-name orphan
  recovery shows the preservation warning and submits the candidate scope ID
  only after the reviewer selects **Use existing access scope**.
- [x] `frontend/src/features/orders/configuration/SampleShippingConfigurationPanel.test.tsx`
  - current versioned destinations, sample types, and combination rules render;
  instruction preview submits exact revisions and presents resolved content;
  and destination changes open an immutable successor revision instead of
  editing the current record.
- [x] `frontend/src/features/dashboard/WebOpsDashboardContent.test.tsx` -
  the two-button selector shows one mailing-list or demo-request panel at a
  time; panels render their counts, contact context, technical-brief state,
  explicit mock-data identity, page-size-10 footer paginators, independent
  pagination actions, single-page paginator suppression, and isolated retryable
  API failures. Connected panels require confirmation before unsubscribe or
  demo completion, render the retained-intake explanation in the modal body,
  invoke the selected record action, and show contextual success feedback;
  mock panels do not expose persistence actions.

## Deferred Tests

- [x] `frontend/src/components/ui/dialog.test.tsx` - shared modal content ignores
  outside pointer interaction and remains open until the user invokes an
  explicit dismissal control; shared modal structure keeps direct and form-
  wrapped headers and footers outside the scrolling body; shared headers and
  footers inherit theme-safe muted surfaces and dividers; general feedback and
  direct destructive alerts render inside the fixed header; header-and-footer
  confirmations omit an empty scrolling-body band; all app dialogs inherit
  these behaviors.
- [x] `frontend/src/features/lab-operations/ProtocolIdentityDialog.test.tsx` -
  protocol identity editing prefills the current values, keeps the generated
  key read-only, and submits changed name/description values.
- [x] `frontend/src/features/lab-operations/ProtocolList.test.tsx` - an identity
  without a definition is labeled Setup incomplete without repeating its
  generated key; Draft and Approved state labels avoid internal Production
  terminology; lifecycle commands are grouped under the labeled Actions menu.
- [x] `frontend/src/features/lab-operations/protocol-list.test.ts` - protocol
  records remain visible until explicitly deleted, including never-approved
  records whose only draft was discarded.
- [x] `frontend/src/components/ui/searchable-select.test.tsx` - the shared
  searchable selector incrementally filters visible options and returns the
  selected record's stable identifier.
- [x] `frontend/src/components/ui/multi-select.test.tsx` - the shared searchable
  multi-select filters service options while retaining multiple selected
  stable values in one dropdown.
- [x] `frontend/src/features/crm/CrmCompanyRelationships.test.tsx` - the Company
  request modal groups online access, products and services, work, and
  relationship requests; online access omits product selection, the single
  summary is optional, single-type outcomes omit a redundant request-type
  control, and the modal progressively discloses only fields relevant to the
  selected outcome and type. Company request history links pending work to the
  central Requests queue instead of duplicating review actions.
- [ ] Customer laboratory draft workspace - cover Job pricing-details
  create/edit modal required name, biological-source composition,
  storage/safety, derived sample total, duplicate nonblank source validation,
  optional positive two-decimal USD unit-price proposal, calculated subtotal,
  Customer-safe pricing note, and optional Job-notes validation; duplicate-name feedback and
  dirty-dismissal; redirect after empty-draft creation; Job name,
  notes-before-updated header order, single breadcrumb Job number, and shared
  sample-profile display with one shared source or `Varies by sample`; the zero-sample detail empty
  state; Add/Edit sample modal helper text and only Customer sample ID,
  conditional per-sample biological source, and integer tube quantity as inputs;
  vertically aligned paired controls without reserved helper height when
  Quantity is unpaired; fixed extracted-RNA
  material type and tube unit without Customer inputs; absence of concentration,
  per-sample notes, storage, safety, and analysis/output inputs while preserving
  legacy nullable values on edit; empty analysis IDs for new samples with legacy
  values preserved on edit; and validation;
  confirmed sample removal including the last sample;
  fixed-header modal errors, automatic optimistic-version refresh that
  preserves dirty values, one safe retry only for unchanged editable server
  state, latest-Job reload plus reconfirmation for stale pricing submission,
  successful first-revision insertion, and the post-acceptance sample-list
  boundary.
- [ ] `frontend/src/features/dashboard/ExternalDashboardContent.test.tsx` -
  cover Customer, Prospect, and Partner card selection, connected summary and
  error states, organization switching, and complete absence of internal mock
  Accounts metrics from external dashboards.
- [x] `frontend/src/features/crm/CrmShell.test.tsx` - CRM Home, Companies,
  Contacts, Leads, Opportunities, Tasks, Requests, Reports, and Administration
  use the shared responsive workspace sidebar, group destinations as
  Relationships, Sales, Follow-up, Insights, and Administration, preserve the
  active section on a detail route, and navigate to the existing section
  routes.
- [x] CRM foundation components - cover the Company create/edit form's required
  fields and CRM/Portal warning, collapsed optional details, Website-derived
  domain, lifecycle confirmation consequences, CRM navigation placement,
  standalone Lead capture and conditional Company requirement, and controlled
  merge target/reason behavior. The focused CRM tests are maintained under
  `frontend/src/features/crm/`, with navigation placement coverage also maintained in
  `frontend/src/components/navigation.test.ts`.
- [x] `frontend/src/features/crm/CrmAssociationRecordCombobox.test.tsx` - cover
  incremental server-backed Company and Contact searches and selection of the
  stable record identifier used by the association request.
- [x] `frontend/src/features/crm/CrmCompanyContactEditDialog.test.tsx` - cover
  the shared relationship editor used from both Company and Contact detail
  workspaces, including title, controlled role, primary designation, and
  effective dates.
- [ ] Remaining first-party CRM components - Company primary-name navigation
  from the directory to its dedicated detail workspace is covered; add the
  remaining directory and detail query/mutation states, responsive table and
  pagination, authorization,
  then Contact identity editing, both entry points into Company-specific
  title/role association editing, relationship history display, Leads,
  Opportunities, pipeline table/board views, stage transitions, Activities,
  Notes, Tasks, reminders, ownership, CRM home attention states, saved views,
  reports, imports/exports, duplicate review, merge consequences, loading/empty/
  error states, authorization, field visibility, accessible interaction, and
  supported viewports.
- [ ] CRM-to-Portal lifecycle components - cover CRM Company access proposals,
  pending-request queues, exact proposed changes, readiness review,
  internal relationship-safe summaries and deep links, service-entitlement
  activation, Trial Project and custom-work handoffs, relationship/offboarding
  warnings, retryable projection failure, complete hiding of CRM context from
  external users, organization-kind filtering, validation, idempotency
  feedback, and successful refresh.
- [ ] Direct and Sales-assisted sales - cover configured prices for eligible
  Customer/Partner specimen and Partner assembly work, Partner service-specific
  action visibility, Request custom work, Request account change, no
  downstream-customer requirement, operational confirmation for newly won CRM
  Opportunity handoffs, and durable failure feedback.
- [ ] Global released-deliverable retention components - cover Phaeno-only
  global 30/5/5 default configuration, Customer/Partner/Prospect organization-
  level overrides with inherited-value presentation, validation, required
  reason, and audit history; release-time effective-policy and source display;
  warning, standard-deletion, conditional-grace, and final-deletion dates;
  organization-level rather than per-user download completion;
  tenant-safe undownloaded-package and grace banners; deleted bytes unavailable
  while package metadata/history remain; urgent Phaeno Operations work when no
  active organization administrator can receive a required notice; warning and
  grace emails linking to the authenticated package detail rather than directly
  to a file; suppression of a delayed stale warning before outbox creation and
  current package state when an already-queued warning link is opened; pre-grace
  warning clearance after all files are downloaded;
  activated grace remaining visible despite a later download; no daily-reminder
  state; immediate superseded-package unavailability with retained history and
  a clearly separate corrected package carrying fresh dates/download state; and
  deleted-package history with no restore action plus a separately linked
  authorized reissue when present; permanent receipt export for organization
  administrators before and after deletion; ordinary-member status without
  downloader identity; equivalent accessible Portal and printable-PDF receipt
  facts with generation time/state, labelled browser-local timestamps, UTC
  alongside local PDF timestamps, UTC fallback, and no CSV action;
  exact-deadline `Downloads closed` behavior, optional `Deletion processing`
  status without a download action, a pre-cutoff transfer's bounded `Download
  in progress` state after the cutoff with no resume/retry/range/archive action,
  and receipt start/completion timestamps and outcome identifying a successful
  post-cutoff completion as pre-cutoff authorized; higher-priority quarantine,
  withdrawal/correction, membership deactivation, and organization deactivation
  stopping an active transfer with a tenant-safe access-ended message, no retry,
  no confidential reason disclosure, and a non-counting revoked outcome;
  partial/abandoned transfers remaining undownloaded, restored access offering a
  fresh request only before cutoff, and preservation holds never displaying an
  extended or reset access deadline; and
  accessible states across supported viewports, keyboard, and screen-reader use.
  Verify clear sample-scoped customer-ID/tube-barcode/accession mapping, combined-file
  included-sample lists, and no internal derived-container identifiers.
- [ ] Prospect Trial Project components - cover Phaeno request review and dual
  approval with commercial-only CRM context, POMS-owned scientific scope,
  safe CRM milestones and deep link, CBO/COO defaults, domain-specific
  delegate designation/revocation, clear primary-versus-delegate authority,
  denial outside the assigned domain, retained reasons/dates, both decisions remaining required,
  same-person second-approval prevention with a clear different-approver
  requirement for initial and amended scope versions,
  frozen-scope preview/amendment, Prospect acceptance, prominent RUO language,
  current versioned no-PHI affirmation at project acceptance and shipment
  confirmation, safe prohibited-data feedback that does not redisplay the
  suspected value, bounded sample submission for extracted RNA, the project's
  approved allowance and deadline states,
  samples-and-shipping grouping, eligible destination selection, detailed
  instruction review, printable ship-to label/internal manifest packets,
  packet replacement and receipt/exception status, explicit sample-replacement
  approval, original-sample lineage, Phaeno-caused restored-slot status, and
  Prospect-supplied-problem exception status without a silent allowance change,
  frozen residual-material duration/disposition preview and terms, configured
  default versus project override, return destination/handling/shipping-payer
  presentation, post-shipment return denial, due-versus-operator-confirmed
  disposition, and no-reuse messaging,
  schedule-without-guaranteed-TAT messaging, configurable deliverable catalog
  and default selection with FASTQ/FASTA/BAM initially selected, approval-time
  frozen deliverable/version preview, immutable approved selections with an
  amendment path, effective global-plus-Prospect-organization retention values
  frozen only when the complete package is released rather than on a partial
  release or at project approval, no project-level override, conversion without
  new or extended deletion dates, unavailable files after byte deletion with
  retained authorized project history, continued organization access after
  package deletion, explicit Phaeno closeout
  deactivation with blocking active-trial/grant/relationship feedback and a
  required retained reason, Phaeno-only estimated retail value and anticipated
  internal cost reporting with no QuickBooks document or payment state, member
  view-only state, tenant-safe progress/results,
  complete-package-gated completion, required incomplete-close reason, distinct
  POMS operational and CRM commercial outcomes, owned/dated unresolved
  follow-up, explicit conversion with no automatic transition, terminal-state
  reasons, CRM summary retry visibility, and continued hiding of normal ordering
  actions.
- [ ] Remaining shared sample shipping and Customer freebie components - add
  focused component coverage for return-kit registration/fulfillment, external
  scan/manual tube assignment and correction reasons, retained CSV, packet
  confirmation, full-page print layout, record-shipped facts, packet-plus-tube
  comparison outcomes, and Lab supplier-barcode adoption without a print-label
  action. Also cover missing/incompatible setup, multi-destination and split-
  shipment behavior, packet reprint/void behavior, one-time promotional
  placement with explicit no-charge treatment, and preservation of order-
  versus-Trial terminology.
- [ ] Remaining connected Company access/user administration - cover embedded
  readiness persistence, request queue decisions, first-party CRM access-
  proposal relationship/service rules, CRM Company/Opportunity correlation,
  error and success feedback, queue refresh, pending-only review filtering,
  approve-and-enable-access confirmation, stranded access-scope recovery,
  Company-detail navigation, request completion language,
  prominent user management, CRM-designated Contact invitation messaging,
  completed-organization selection for other pre-organization requests,
  accessible request-action and Prospect-conversion dialogs that close after
  success, dated entitlement overlap validation,
  invitation create/list/resend/revoke, required invitee first/last name,
  membership role changes, unified user cards with pending-invitation status
  and accessible action menus, the connected Phaeno user list, consolidated
  invitation-time and accepted-user Platform
  administrator and additive laboratory-role editing, Platform-admin versus
  Lab Operations Administrator control visibility, profile updates,
  deactivation/reactivation, unsupported mock-role removal, Prospect
  conversion, organization lifecycle, optimistic concurrency, and durable
  refresh behavior against mocked APIs.
- [x] `frontend/src/features/admin/user-management-self-deactivation.test.tsx`
  - administrative action menus omit membership and global-account
  deactivation for the signed-in user while retaining deactivation for another
  user.
- [ ] Auth shell - cover missing Clerk config, the Phaeno-branded signed-out
  prompt with its brand lockup inside the sign-in container and without the
  authenticated header or Clerk vendor footer; verify Clerk initialization
  does not flash the local-access loading card before signed-out sign-in; cover
  local unauthorized state,
  disabled state, no-active-memberships state, ready state, and Clerk's pending
  required-MFA setup state. Verify the branded `setup-mfa` route does not render
  Portal navigation, does not request `/api/session` before the Clerk session
  becomes active, and returns to the dashboard after authenticator and
  backup-code enrollment.
- [ ] Organization switcher - cover auto-selecting one active membership, persisting selected organization, changing selected organization, and sending `X-Organization-Id`.
- [ ] Invite acceptance page - cover token capture, URL scrubbing, authenticated
  accept, authenticated decline, cleared token storage, the development-only
  first-time account entry, the production sign-in-only boundary, current Clerk
  email presentation, actionable API failures, and sign-out account switching
  without clearing the captured invitation. Cover the forced `/accept-invite`
  return after both Clerk sign-in and development account creation, plus the
  access-gate recovery action when a pending token is already stored and the
  post-acceptance session refresh before continuing into the application.
- [ ] Source-sample workspace - cover metadata/evidence validation, upload
  progress and scan state, complete readiness errors, immutable ready state,
  archive confirmation, and discard failure/concurrency states with mocked API
  responses.
- [ ] Curated catalog - cover snapshot, publish preview, atomic validation
  errors, eligibility separation, and exact-version display.
- [ ] Organization grants - cover purposeful empty state, idempotent success,
  existing-version conflict, exact-version upgrade, creation-flow package
  selection, retry history, and immediate revocation confirmation.
- [ ] Governance workspace - cover quarantine preview, internal/external content
  separation, investigation purpose, clear-versus-withdraw confirmation,
  affected-organization reminders, and Phaeno-recorded attestation.
- [ ] Tenant Data Library - cover granted package cards, metadata/manifest
  detail, job-scoped result-package and file downloads reached from Lab
  services, job/list return paths, error feedback, and organization-admin
  history isolation with mocked API responses.
- [ ] Order workflow components - cover resumable drafts, profile-driven
  metadata, the Customer Lab job's responsive `Samples & shipping`, `Quote &
  billing`, `Data & results`, and `Timeline` tabs, quote acceptance/expiry,
  Phaeno `New Customer order` selection and price-bearing profile entry,
  required no-PHI attestation,
  redirect to the new `Quote in preparation` operational detail, committed-
  quantity quote defaults, active-Customer and approver failures, effective
  `Ready` entitlement and active-offering action states for Customer and Phaeno
  paths, actionable eligibility errors without a manual bypass, no Customer
  notice during Phaeno quote preparation, the Phaeno operational detail's
  current quote value and neutral internal-context presentation,
  all-eligible-admin approval delivery,
  accepting-administrator ownership of later ordinary notices,
  upload and scan feedback, payment holds,
  substitutions, backorders, immutable-document downloads, operational queue
  filters, notification recovery, and stale-version/error recovery with mocked
  APIs.
- [x] Released-download status component - cover all-files-downloaded and active
  non-counting transfer messaging without downloader identity. The focused
  component tests were created on 2026-08-19 but were not executed because test
  execution was not requested.
- [ ] Released-result download interactions - cover Customer job-detail and
  Data Library individual-file and full-package ZIP actions, Partner outputs,
  pending-button state, completed query refresh, file/package completion
  labels, partial state, and tenant-safe failure feedback with mocked APIs.
- [ ] Remaining Lab Operations workspace - cover role-specific controls,
  the eight-section operational sidebar with access administration omitted,
  list/detail loading, return-kit and shipment lookup, receipt/accession,
  PSeq kit fulfillment, Data Assembly, protocol lifecycle,
  the Phaeno Order Operations single active intake queue combining CRM
  handoffs, commercial review, pricing, and quotes without a product-named
  `Lab` section, plus the linked Lab **Receipt & accession** handoff for placed
  lab orders,
  including blocked pre-placement states and navigation to the existing work
  order,
  system-assigned protocol/library/batch identifiers, required batch names, and
  the system-owned External sequencing type, the dedicated structured
  protocol-version builder's step ordering/duplication/removal, required,
  optional, and conditional rules, typed-capture validation, materials,
  including controlled definition/supplier/storage selection, prepared-reagent
  component rows, date-only expiration, material QC modal date and
  failed-reason validation, outputs, equipment creation with a full-width name,
  generated asset-code guidance, type/location selectors, date-only calibration
  validation, QC gates,
  batch status filtering, transition timestamp modal capture, and display of
  captured start/completion times,
  generated JSON preview, clone-from-controlled
  initialization, protocol name/description editing with an immutable key,
  discarded-only protocol deletion, draft resume/save/discard, formal
  independent approval with exact-definition review and attestation,
  never-approved protocol deletion, one-Draft action gating, unsaved-change warning, concurrency
  recovery, and return to the Protocols section,
  the canonical marketed-service workflow create flow, ordered workflow-stage
  builder, Required/Optional/Conditional validation, Production promotion,
  immutable Production terminology, job workflow pin display, and stage-only
  protocol assignment with earlier Required-stage gating,
  execution/material/equipment capture, library and batch actions, sendout and
  custody states, internal versus customer-action exceptions, scientific
  approval, ready-for-release messaging, concurrency recovery, and mock-mode
  boundaries with mocked APIs.
- [ ] Backend-indexed help search - cover authenticated audience filtering,
  Prospect/Customer/Partner locale filtering, indexed metadata and headings,
  canonical guide links, empty/error states, and stale-index recovery when the
  future search API is implemented.
- [ ] Prospect, Customer, and Partner help localization - add pseudolocale,
  text-expansion, locale-aware review-date, complete-corpus, and
  language-fallback coverage when a second external locale is implemented.
  Phaeno-only guides remain US English.

## Requested Execution Log

- 2026-08-29: the production signed-in smoke found that the new staged-order
  panel received the standard API envelope as if it were the Customer array.
  The PSeq order-to-cash client now unwraps every JSON read and command while
  leaving file downloads unchanged. The focused API-client and panel run
  passed 8 tests; lint, TypeScript validation, and the complete client/SSR/
  Nitro production build passed. The same smoke found and corrected the
  equivalent envelope mismatch in the Customer operational-readiness
  checklist, with focused API regression coverage. The final signed-in
  production smoke confirmed both views render from the live API; account-
  workspace failures now identify their owning data source.
- 2026-08-29: the focused invitation/schema/order-to-cash component run passed
  8 tests. `pnpm run lint`, `pnpm run typecheck`, and the complete client/SSR/
  Nitro production build passed. The full unit suite passed 54 tests and failed
  four assertions only in unchanged
  `src/features/dashboard/WebOpsDashboardContent.test.tsx`; all four reproduce
  when that file runs alone because the current Radix tab does not switch from
  a synthetic click in this test harness. This unrelated failure is not counted
  as passing evidence and its source was not changed by the order-to-cash work.
- 2026-07-18: one-open-protocol-candidate workflow verification passed focused
  ESLint, `pnpm run typecheck`, and the client/SSR production build. A live
  authenticated browser review confirmed that Draft v1 replaces Add version
  with Continue editing, restores its saved definition, blocks the direct new-
  version route, presents a history-preserving discard confirmation, and
  reflows at 390 pixels without horizontal overflow or browser errors. The
  confirmation was cancelled and no protocol data changed. Frontend tests were
  not requested and were not run.
- 2026-07-18: structured protocol-version authoring passed `pnpm run
  typecheck`, focused ESLint for the changed TypeScript sources, and the client
  and SSR production build. A live authenticated browser review verified
  required-field errors, the three-step library-preparation example, generated
  JSON, unsaved-change protection, return to the Protocols section, and a
  390-pixel layout without horizontal overflow. No draft was persisted during
  verification. Frontend tests were not requested and were not run.
- 2026-07-18: system-owned Lab identifier verification ran `pnpm run
  typecheck`, `pnpm exec eslint src`, and `pnpm run build`; type checking and
  source lint passed, and both client and SSR production builds completed. The
  broad `pnpm run lint` command traversed existing generated `.output` and
  `.vercel` bundles and failed on generated code; no source-tree lint failure
  remained. Frontend tests were not requested and were not run.
- 2026-07-18: Web Operations unsubscribe and demo-completion changes passed
  focused ESLint, `pnpm run typecheck`, and the client/SSR production build.
  The repository-wide lint command also traversed generated `.output` and
  `.vercel` artifacts and failed on those generated files; changed source files
  passed the focused check. Frontend tests were not requested and were not run.
- 2026-07-17: POMS dashboard sidebar and Web Operations verification ran
  `pnpm run lint` and `pnpm run typecheck`; both passed. A live mock-session
  browser review verified desktop and 390-pixel responsive layouts, sidebar
  counts and selection, Mailing List and Demo Requests content, and zero
  console errors. Frontend and Playwright test suites were not requested and
  were not run.
- 2026-07-17: the Order Operations navigation label changed from Reagents to
  PSeq kits. `pnpm run lint`, `pnpm run typecheck`, and the four-test
  documentation-registry suite passed.
- 2026-07-17: Order Configuration sidebar verification ran `pnpm run lint`,
  `pnpm run typecheck`, the focused Order Configuration component test, the
  full `pnpm run test`, and `pnpm run build`. Lint and typecheck passed, the
  focused test passed, all 42 tests in 17 files passed, and the client and SSR
  production builds completed. The existing advisory client chunk-size warning
  remains.
- 2026-08-18: the registered supplier-tube workflow passed `pnpm run lint`,
  `pnpm run typecheck`, and the client/SSR `pnpm run build`. The build retained
  only the existing advisory chunk-size warning. The completion pass then ran
  all 60 frontend tests in 22 files with no failures, including focused
  configuration, tube correction, and packet-replacement coverage. It also
  corrected narrow-layout workspace drawer persistence and the related unit
  and browser tests.
- 2026-07-16: barcode completion verification ran `pnpm run lint`, `pnpm run
  typecheck`, `pnpm run test`, and `pnpm run build`. Lint and typecheck passed,
  all 41 tests in 16 files passed, and the client and SSR production builds
  completed. The existing advisory bundle-size and plugin-timing warnings
  remain. Focused coverage verifies Code 39 encoding, scan lookup, batch
  context rejection, and explicit successful/failed physical-print outcomes.
- 2026-07-16: footer cleanup verification ran `pnpm run lint` and `pnpm run
  typecheck`; both passed. A live browser check confirmed the legal ownership
  line and temporary support/policy placeholder, and confirmed the former
  framework/vendor list is absent. Test execution was not requested and was not
  run.
- 2026-08-22: Customer Lab Service coverage must verify the Job specimen-count
  and dynamic source-group form with one shared visible column header and
  accessible row-specific control names, the derived read-only total with no
  separate sample-count input, helper text between each field label and control,
  shared field-description/error/textarea primitives, compact helper-sized
  validation text immediately below controls,
  source-total validation, nonblank duplicate-source validation on blur/submit
  that clears or returns as source text changes, absence of sample
  controls before price acceptance, post-acceptance manual sample CRUD, CSV
  preview/error/atomic-replacement states, no-PHI finalization confirmation,
  and multi-tube crosswalk labels and assignment payloads. TypeScript checking
  passed; component tests were not requested and were not run.
- 2026-07-16: the Accounts list and detail surfaces were aligned with the
  documented HubSpot-originated intake intent. `pnpm run lint` and `pnpm run
  typecheck` passed, and a live Phaeno mock-session browser check confirmed the
  intent panel, disconnected state, Accounts terminology, and absence of
  standard direct-account/manual-request actions. Component and Playwright test
  execution were not requested and were not run.
- 2026-07-16: Accounts navigation and directory verification ran `pnpm run
  lint` and `pnpm run typecheck`; both passed. Navigation and browser scenarios
  were updated for the Accounts label and for excluding the internal Phaeno
  organization from the external-account directory. Test execution was not
  requested and was not run.
- 2026-07-16: user-menu organization-context removal verification ran
  `pnpm run lint` and `pnpm run typecheck`; both passed. A live Phaeno
  mock-session browser check confirmed the organization search and act-as
  controls are absent while the remaining menu groups, Escape dismissal, and
  scroll restoration still work. Frontend test execution was not requested and
  was not run.
- 2026-07-16: context-sensitive POMS/Portal branding and dashboard copy
  verification ran `pnpm run lint` and `pnpm run typecheck`; both passed. The
  new focused branding test was not executed because test execution was not
  requested.
- 2026-07-16: Shared workspace-sidebar verification ran `pnpm run lint`,
  `pnpm run typecheck`, and `pnpm run build`; all passed. The existing advisory
  chunk-size warning remains. Component and E2E tests were updated but were not
  executed because test execution was not requested.
- 2026-07-16: Lab Operations completion verification ran `pnpm run lint`,
  `pnpm run typecheck`, and `pnpm run build`; lint and typecheck passed, and
  both client and SSR production builds completed. The existing advisory
  chunk-size warning remains. Frontend tests were not requested and were not
  executed.
- 2026-07-16: clean-baseline verification ran `pnpm run lint`, `pnpm run
  typecheck`, `pnpm run test`, and `pnpm run build`; lint and typecheck passed,
  all 28 tests in 11 files passed, and both client and SSR production builds
  completed. Existing bundle-size and plugin-timing warnings remain advisory.
- 2026-07-15: portal hardening verification ran `pnpm run lint`, `pnpm run
  typecheck`, `pnpm run test`, and `pnpm run build`; lint and typecheck passed,
  all 28 tests in 11 files passed, and both client and SSR production builds
  completed.
- 2026-07-14: system-documentation catch-up verification ran `pnpm run
  typecheck`, focused ESLint for the documentation registry, and the registry
  Vitest file; typecheck and lint passed and all 4 registry tests passed. Static
  checks also confirmed six portable MDX guides per audience and valid relative
  Markdown links.
- 2026-07-14: documentation implementation verification ran `pnpm run lint`,
  `pnpm run typecheck`, and `pnpm run test`; lint and typecheck passed and all
  24 tests in 9 files passed. The Vite client and SSR production build also
  completed with the MDX corpus compiled successfully.
- 2026-07-14: order-management implementation verification ran `pnpm run test`;
  all 16 tests in 8 files passed. `pnpm run lint` and `pnpm run typecheck` also
  passed, and the Vite client/SSR production build completed through the
  installed Node entry point.
- 2026-07-14: completion-slice verification ran `pnpm run test`; all 11 tests
  in 7 files passed.
- 2026-07-14: implementation verification ran `pnpm run test`; all 9 tests in 5
  files passed.
- 2026-08-27: Portal accounts terminology and restricted account-request
  verification ran `pnpm run lint:ci`, `pnpm run typecheck`, `pnpm run test`,
  and `pnpm run build`; lint and typecheck passed, all 103 tests in 40 files
  passed, and the client and SSR production builds completed. The existing
  advisory client-chunk warning remains.
- 2026-08-28: CRM relationship and Opportunity-to-Order verification ran
  `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run build`;
  lint and typecheck passed, all 108 tests in 44 files passed, and both client
  and SSR production builds completed. Focused coverage confirms incremental
  relationship search and that Order intake preserves the approved handoff as
  the locked Customer-order source. It also confirms the controlled Opportunity
  product selector and that the Owner control is width-constrained within its
  modal column. The existing advisory client-chunk warning remains.
- 2026-08-28: CRM card-header alignment verification passed `pnpm run lint`,
  `pnpm run typecheck`, and the 6 focused desktop/mobile `crm.spec.ts`
  scenarios. Geometry assertions confirm Company, Lead, and Opportunity card
  actions remain compact at the far right of the title row rather than
  stretching beneath the description. The existing `AcceptInvitePage`
  route-export warning remains.
- 2026-09-01: the Company-owned Portal-access and searchable Customer selector
  changes passed `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and
  `pnpm run build`; all 120 tests in 50 files passed and both the client and SSR
  production builds completed. The existing advisory client-chunk and
  `AcceptInvitePage` route-export warnings remain unchanged.
- 2026-09-03: the controlled service-workflow UI passed `pnpm run lint`,
  `pnpm run typecheck`, and the client and SSR production build. The existing
  advisory client-chunk and `AcceptInvitePage` route-export warnings remain.
  Frontend tests were updated but were not run because test execution was not
  requested.

### Released lifecycle closeout (2026-09-05)

`ReleasedDeliverableDetailPage.test.tsx` verifies complete receipt metadata,
frozen/historical lineage, member versus staff actions, and stale-version retry
with the entered hold reason retained and the refreshed version submitted.
File management's navigation test includes its new retained-package link.

## Guided protocol completion checkpoint (2026-09-05)

The six-file focused run passed **15 tests**: `protocol-execution.test.ts`,
`protocol-definition.test.ts`, `protocol-list.test.ts`, `ProtocolList.test.tsx`,
`ProtocolIdentityDialog.test.tsx`, and `ProtocolApprovalDialog.test.tsx`.
The installed Vitest Node entry point was used without changing dependencies.
Full TypeScript checking and focused ESLint for Lab Operations, the API types,
and the browser fixture/spec also passed. The Vite client and SSR production
builds completed. The updated Phaeno execution guide was regenerated into the
documentation version/corpus artifacts, and the generator's `--check` passed.
The existing client chunk-size advisory remains. Compatibility coverage also
verifies that explicit null optional fields from API definitions can be resumed
and reviewed without losing procedure content.

Guided execution now uses a view-first detail route and bounded step dialogs,
typed RHF/Zod inputs, explicit QC, saved progress, readable history, durable job
return navigation, and 409 recovery that retains values while reloading the
authoritative version. Desktop/mobile interaction and accessibility evidence
are in `E2E-TEST-PLAN.md`. This checkpoint does not close the remaining unrelated
Lab workspace coverage or hosted acceptance gates.

## Trial integration checkpoint (2026-09-05)

`TrialFormDialog.test.tsx` covers explicit RUO/no-PHI acceptance, required frozen
PSeq inputs and concurrency recovery preserving values while refreshing version
and idempotency identity. The documentation registry tests cover the maintained
Prospect/Phaeno Trial guides and Customer/Partner history guides. Backend-derived
capabilities control acceptance, submission, commercial closeout and release.
The staff review queue has URL-backed status and Sales owner filters. Dedicated
scope editing is the documented complexity exception; other actions use modals.
See `TRIAL-INTEGRATION-CLOSEOUT.md` for full checks and production gates.


## Portal consistency regression coverage (September 7, 2026)

New and updated focused coverage includes:

- `CommercialOrderIntakePanel.test.tsx`: held/history views, server filtering, 25-row pagination, preserved URL state and clear filters.
- `PSeqOrderToCashPanels.test.tsx`: Finance record navigation, role-appropriate actions, retained failed adjustments/allocations, error versus empty state, exact import review, stale in-flight preview rejection and same-batch confirmation retry, inline Finance validation/focus, unchanged-value restoration, billing approval-note checks and failed-draft retention.
- `resumable-draft.test.ts`, external list filter tests, and `LabJobSamplesPanel.test.tsx`: uncertain-create recovery, list state, CSV preview and explicit roster finalization.
- Company workspace/relationship/request tests: administrator invitation, preserved requested relationship, approved request completion and contextual person creation.
- `SystemConfigurationPanel.test.tsx`: legacy extra/duplicate setting rejection, normalization, pristine restoration, blur validation and failed-draft/focus handling.
- `ResultReleasePanel.test.tsx` and `StructuredQcFields.test.tsx`: package identity and permissions, release confirmation/concurrency, structured measurements and validation.

Suites are authored but not run, following repository scope. TypeScript, lint and browser findings are reported separately; these do not substitute for full populated Customer/Partner operational acceptance.

## Portal consistency second pass (September 7, 2026)

Focused regression sources cover CRM incremental association and merge lookup, failed reads versus empty collections, reviewed Contact lifecycle actions and protected drafts; Finance invoice/receipt/selected-invoice snapshots and conflict review, active-section query isolation and reconciliation scope; Trial dirty/pending guards and configuration refresh failures; shipment packet revisions and sample/tube counts; Lab return context; and global/Company retention snapshots with protected cancellation.

Final additions at implementation freeze:

- `CrmRecordEditSnapshots.test.tsx` (**4 cases**) covers Company edit fields and reviewed version surviving background refresh and failed save, fresh loaded details after reopening that editor, Contact communication preference and reviewed version retention, Company lifecycle confirmation retaining its original name/action/version, and Company ownership reassignment retaining its selected owner and reviewed version. The reopen assertions belong to the Company edit case.
- `CuratedCatalogDialogs.test.tsx` (**4 parameterized cases**) covers dataset creation, detail editing, deactivation and exact-version retirement. Every case exercises declined discard, pending disabled controls and Escape protection, failed-entry retention, header feedback and clean reopening; existing-record actions also assert the version captured before background refresh. Coverage is limited to these four catalog actions.
- `ExternalOrderDecisionDialogs.test.tsx` (**10 parameterized cases**) covers two scenarios across five dialogs: Customer Lab cancellation, Partner Assembly cancellation, Partner Reagent cancellation, Customer Lab quote acceptance and Partner Assembly quote acceptance. Dirty drafts survive declined Close, footer dismissal, Escape and navigation; browser reload protection is checked through the before-unload guard. Confirmed discard resets entries. Pending requests prevent duplicate submission, editing and dismissal; failed requests retain entries and a successful mocked retry closes the dialog and clears navigation protection.

See [the second-pass tracker](PORTAL-POMS-CONSISTENCY-SECOND-PASS-2026-09-07.md) for source and verification status. These suites are authored and **have not been run**. Static checks and direct browser observations are separate evidence; this entry claims no final verification or deployment. Synthetic component coverage does not establish populated Customer/Partner, financial or physical laboratory acceptance.

### Final unified-workspace validation - September 10, 2026

104 tests passed across 10 focused frontend suites; full TypeScript, scoped lint,
documentation freshness (56 guides, corpus `c43fb0c27b35`) and whitespace passed.
Signed-in DOM/accessibility checks confirmed the quote-heading actions and
source counts on 69SJN4PA, the combined 18/18 sample list on HS5Y7DB7, stage-relevant
section visibility, keyboard disclosures, and light/dark narrow-layout bounds.
Screenshot capture timed out; screenshot-based visual review and physical
printing/packing/dispatch/receipt remain separate pending gates. No operational
records, Git state, deployment or database schema was changed by these checks.
See the [walkthrough record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).

### Kit-order dialog spacing — September 10, 2026

The existing deep-link panel assertion excludes the dialog when checking that the background Transportation kits panel remains hidden; the dialog now has its own Transportation kits section heading. Existing ordering, adjustments, validation and pending-state tests remain the verification scope.

Verification: all 32 transportation-kit tests and scoped ESLint passed. The open dialog accessibility tree confirmed the selected delivery location and separate kit heading/actions; the owner closed the dialog before the screenshot check, so final visual acceptance remains with the next opening. Whitespace checks passed.

## Lab shipping and receiving tabs — September 10, 2026

Verify Kit requests, Prepare kits, Kits sent and Receive samples as
separate visible panels. Cover capability-aware defaults, shipment-specific
legacy links, valid/invalid tab parsing, lazy hidden queues, preserved scanner
drafts and unchanged packet/tube continuation. Exercise keyboard arrows, narrow
layouts, browser Back/Forward and refresh. Request and stock filters/pages must
survive tab changes and record detail return links. Existing kit fulfillment,
stock registration, receiving and location navigation suites remain applicable;
do not dispatch kits or record receipt merely to test navigation.

Verification: 41 focused tests across six suites passed, along with frontend
TypeScript, scoped ESLint, documentation generation/freshness (56 guides) and
whitespace checks. Signed-in local browser checks confirmed one visible panel,
request/stock filter retention, kit detail return, browser Back, refresh and
keyboard-arrow selection. At a 390 CSS-pixel viewport the tab strip scrolls within
the page with no horizontal page overflow. Screenshot capture timed out, so this
records DOM/accessibility and measured reflow evidence, not screenshot review.
The temporary review tab was closed and viewport restored; no operational writes,
commit or deployment were performed.

## Kit request next action — September 10, 2026

The owner approved replacing ambiguous Fulfill request / Open standard kits
controls with a state-based next step. Zero matching ready stock makes Prepare
kits primary and hides shipment entry. Preparation opens the existing guarded
stock form for missing requested sizes and returns through the created kit for
tube registration to the originating request. Matching ready stock exposes
Record kit shipment; shortages remain separately actionable and partial shipment
is retained. Missing quantities subtract ready stock as well as previous dispatch.
Closed requests expose neither action; stale request errors block new actions.
Existing dispatch concurrency, idempotency and saved-draft checks remain in scope.

Verification: all 23 focused request and stock-kit tests passed, plus frontend
TypeScript, scoped ESLint, docs generation/freshness (56 guides) and whitespace
checks. The signed-in local request showed Prepare kits, the missing one 10-tube
and one 20-tube kit, and no shipment action for zero ready stock. Opening Prepare
kits offered exactly those two sizes; the form was cancelled without saving.
Preparation-to-registration return context, partial-stock shipment and dispatch
retry/draft protections are covered by automated tests. No stock or shipment was
created during browser verification; no commit or deployment.

### Sent-shipment insert reprint follow-up — September 10, 2026

Manual acceptance pending: choose among sent containers from the Job, use the visible Reprint shipping insert action, verify the current nonvoid revision, cancel printing and check focus returns to the initiating button. Confirm permitted readers retain access and no insert issuance, dispatch, receipt or printed-and-packed acknowledgement occurs for a sent shipment. Missing or void inserts must not show the new action. Automated suites and physical printing were not requested for this follow-up.

### Receiving barcode clarity — September 10, 2026

Receive samples now directs staff to the PH-P- barcode at the top right of the existing shipping insert. The field is labeled Shipping insert barcode, with an explicit complete-code instruction. Expandable guidance distinguishes PH-S- shipment barcodes from SHP shipment references, PH-O-/PH-M- lookups, and physical KIT-/tube barcodes. The printed insert and accepted barcode behavior remain unchanged. Existing receiving test selectors follow the new accessible label. Static checks cover this wording change; automated suites and physical scanner acceptance remain unrun.

### Container receipt and accession separation — September 10, 2026

Regression coverage: each expected container has its own tracking row; PH-P- receiving is an explicit write; repeat scans preserve one receipt/event; unrelated identifiers and void/cancelled inserts cannot receive; container arrival leaves tubes unaccessioned; Accession samples uses read-only lookup and individually saves tube accession. Verify queue movement, permissions, multi-container Jobs, missing tracking, retry, tab navigation and final-tube removal. Backend reference journey and frontend navigation assertions updated; automated suites are unrun by request scope. Manual browser and physical scanner acceptance remain pending. No real shipment is received merely to verify this feature.

Verification: solution build passed with zero warnings/errors using a separate output folder because Visual Studio/IIS Express held the normal output files. Frontend TypeScript, scoped ESLint, documentation freshness (56 guides) and whitespace passed. Read-only signed-in local browser inspection confirmed the separate tabs, two expected container rows with distinct tracking numbers for 69SJN4PA, and a received HS5Y7DB7 container showing 0/18 tubes accessioned. Desktop screenshot review passed. The agent did not submit receipt or accession. Automated suites, narrow/dark layouts, physical scanner and completed tube-accession acceptance remain unrun. The existing shipping insert files have no additional working-tree diff from this work.

## Container accession loop — 2026-09-10

Coverage: PH-P opens complete container modal; each tube opens required freezer-box prompt; no accession before valid save; progress and scan focus repeat until completion; wrong tube blocked; same-tube/same-box replay creates one container/event; different-box replay rejected. Component and PostgreSQL coverage updated. Automated suites not run (not requested). Physical scanner, nested-modal keyboard behavior, partial resume and populated save journey remain manual acceptance gates.


### Minimal receiving sheet - September 10, 2026

Supersedes previous top-right barcode and full-manifest print assertions. Check
one receiving sheet per container, PH-P target in the body, 20 mm bar height,
separate container target with 14 mm block gap, readable identifiers and quiet
zones, frozen sample/tube counts and retained full Portal instructions/crosswalk.
`SampleShippingPacketPage.test.tsx` covers current-revision refusal, frozen split
counts, legacy identities and the minimal sheet/full-detail separation.
`ShippingInsertPrintFrame.test.tsx` covers validated identity, print return and
changed-document refusal; iframe cleanup now removes its portal first.
`shipping-insert-print.spec.ts` checks keyboard disclosure, desktop/mobile
bounds, print-only suppression, barcode spacing, and Letter/A4 PDF artifacts
using a synthetic 10-sample/20-tube fixture. Physical scanning, paper output and
populated production receipt remain separate acceptance gates.


### QR rendering update - September 10, 2026

The owner requested all Portal-generated barcode graphics use QR codes and
spacing be adjusted accordingly. This supersedes older Code 39/128 rendering
and linear-size assertions. Shipping inserts use 32 mm squares with four-module
quiet zones and a 14 mm gap between target blocks; ordinary displays and stock
kit prints use 28 mm squares. Lab labels keep 50 x 25 mm stock with an 18 mm QR
and rearranged human-readable identity/context. Values, checksum normalization,
manufacturer labels, receipt and accession semantics remain unchanged. No new
label or successful print is recorded merely by rendering the QR.

Verify exact decoding (including case/underscore), square undistorted rendering,
quiet zones, current-revision checks, frozen manifests, Letter/A4 one-page
receiving output and the lab-label print boundary. Preserve the full manifest
and preparation guidance in the Portal. Physical 2D scanner, printer/stock and
handling acceptance remain explicit gates; former Code 39-only hardware proof
cannot establish QR compatibility. The shared renderer is pinned qrcode.react
4.2.0; no backend model or migration change is required.


Release checkpoint (September 10): 87 focused backend cases pass in an isolated
PostgreSQL database; 315 frontend cases pass across 30 affected suites. Four
focused browser print checks pass with two intentional mobile-label skips.
Letter/A4 receiving sheets and 50 x 25 mm lab label output were visually reviewed
and independently QR-decoded. See
[release evidence](PORTAL-LAB-PROGRESS-RELEASE-2026-09-10.md) for local fixture
failures, artifacts and outstanding physical/production acceptance gates.


Wrapped required-marker follow-up (2026-09-11): shared marker uses inline flow with a nonbreaking separator. Live POMS exception checkbox verification confirmed the asterisk follows the final wrapped word and the checkbox retains 16px width. The existing accessible-name/marker assertion was updated, not executed. Narrow-width/theme coverage remains part of LAB-13.

## Global action-button rule — September 11, 2026

All Portal record action menus now use the shared ActionMenu: zero visible items renders no control; one visible item renders its named button/link; two or more retain Actions. Permission filtering occurs before counting; disabled items remain disabled and count as visible. Preserve confirmation dialogs, trigger refs, link destinations, destructive styling and accessible labels. Navigation/selection menus are unchanged. Six focused shared-component tests passed. Verify representative role/status variants, keyboard activation, modal return focus and narrow/light/dark layouts during UAT. This is not a full application acceptance pass.

Focused execution checkpoint: LabReceiptAccessionPanel, required-field and protocol-list passed 13 tests across three files. These precede the global ActionMenu's six additional passing tests. Full user acceptance remains incomplete; see the September 11 run record.

## Library prep and Results & review navigation — September 11, 2026

Implemented the first navigation slice: Library prep replaces the Lab work sidebar label (existing work URL retained); Results & review follows Sequencing batches and opens the existing job Review tab with section=results return context. Both queues retain received job visibility; no readiness is inferred from inclusion. Preserve the owner's three sidebar dividers and later groups. Shared job history and existing approval gates remain intact. This is not tray-based preparation or a new data-processing pipeline.

Manual verification: Results & review → HS5Y7DB7 opens Review, retains Processing and No scientific approval recorded, and its breadcrumb returns to section=results. Verify Library prep → Specimens and legacy work links, keyboard navigation and narrow layout. No operational writes for this change.

## Preparation-batch verification — September 11, 2026

Protocol-definition tests: 5 passing cases including explicit scope validation and legacy/scoped round-trip. Type checking and scoped lint passed. Five browser journeys run in desktop and mobile cover shared/exception entry, full-width QC, failed-tube exclusion, contextual output creation/selection, uncertain-response command reuse and nested resource entry with retained step values. Shared-entry accessibility scans passed, including dark/reduced-motion mobile. Existing single-action-button behavior is reused.

The owning [Library prep plan](LAB-WORK-JOURNEY-PLAN.md#verification-checkpoint) and LAB-14 manual journey retain remaining acceptance coverage: held/closed Trial races, all staff-role combinations, physical trays/scanners/labels, owner sign-off and production/provider gates. Historical TEST-008 work was not retrofitted or replayed. Customer-requested hold implementation remains blocked.


## Receipt and accession list contrast — September 11, 2026

Visual-only update across Kit requests, Prepare kits, Kits sent, Receive shipments and Accession samples: shaded bordered headers, search/filters grouped in the header, separate record rows and table column headers, and consistent empty-state spacing. TypeScript/scoped lint passed. Signed-in desktop inspection covered all tabs, populated requests/kit lists and empty shipment queues without operational writes or page overflow. Automated tests were not added or run for these class/layout changes. Retain narrow/dark and populated shipment-queue checks in manual acceptance; existing navigation, filter, receipt and accession tests are unchanged.

## Lab configurations and application-wide tabs — September 11, 2026

Lab configurations replaces Protocols & workflows in the last sidebar group and uses a cog icon. Protocols, Workflows and Tray formats use URL-backed selection; legacy section links still open Protocols. Tray-format management moved from Library prep, preserving configuration permissions and the existing preview/edit dialog. Library prep retains active format selection and direct setup links. The workflow builder returns to Workflows. Updated the Phaeno guides, generated help and LAB-14 manual steps.

The shared tab component now supplies the minimum height, padding, typography, gaps, rounded selected surface, focus and reduced-motion treatment. Audited all nine Portal consumers and removed local sizing overrides in Lab Operations, CRM, account and Web Operations screens. Responsive wrapping/grids retain readable labels rather than clipping them to a fixed height.

Verification: TypeScript, scoped ESLint and documentation consistency passed. Signed-in desktop inspection confirmed all configuration tabs, the format preview/cancel, Library prep's single create action and the setup link (keyboard activation). Receipt and configurations both render 42 px strips with 36 px triggers and 6 px/12 px padding. Browser inspection of the existing synthetic Web Operations fixture at 1440, 390 and 320 px found no page overflow or runtime errors; arrow-key selection and visible focus worked, including dark/reduced-motion coverage. Wrapped mobile tabs share their row height. No saved operational records changed. No automated test suite was added or run; populated tray-format editing and full role coverage remain in LAB-14.

## September 12 — Preparation batch identifiers

Preparation creation now asks for tray/workflow and optional notes, without Batch name; notes render in the detail workspace. Verify a second identical create intent gets a new request ID while an uncertain retry retains its request ID. Automated form coverage remains pending; TypeScript verification is separate.


September 12 LAB-14 follow-up: failed-output scan prompts removed while traceability links remain; terminal specimens use Processing outcome. Live saved-record inspection passed. Failed-output regression passed on desktop/mobile (2); all 11 preparation-domain tests passed, including new repeat reason/history coverage and existing correction invalidation. Manual correction/repeat remains separate and pending; see the active run record.

September 12 LAB-14: Complete stage confirmation has explicit batch/stage context and consequences, no Required legend for a fieldless confirmation. Desktop/mobile browser regression passed; cancellation sends no command. Signed-in correction/repeat evidence is in docs/testing/runs/2026-09-12-lab-14-preparation.md.

September 12 preparation resources: live expired/overdue rejection preserved forms; selectors corrected to exclude invalid dates. Desktop/mobile regression passed (2) for expired lot, overdue/retired equipment exclusion and due-today inclusion. Signed-in role variants remain open.

September 12 LAB-14 role visibility and keyboard: Operator/ScientificReviewer Supervisor-step controls denied (4 desktop/mobile cases); keyboard tab order, Escape and focus restoration passed (2). Live signed-in keyboard and incomplete-stage rejection passed separately; full signed-in staff-account matrix remains open.

September 12 preparation conflict recovery: definite conflict preserves form values and retries with new request/refreshed version; uncertain response reuses original request/version. Paired desktop/mobile tests passed (4). Signed-in multi-session fault injection remains separate.

September 12 LabBarcodeScanner.test.tsx: four cases passed for QC-passed success and specific non-library, Batched and QcFailed rejection. Rejected scans retain value/focus and send no add command. Signed-in duplicate scan now explains existing assignment instead of suggesting missing QC; membership unchanged. Guide and generated help updated.

September 12 release queue default: ReadyForRelease replaces ScientificallyApproved as the missing/invalid-filter fallback and first option. Scoped ESLint passed. Bounded reversible default change verified through signed-in UAT; no new automated test added. Existing explicit-filter behavior retained. Help corpus regenerated (56 guides).

September 12 release checkpoint: 53 selected frontend tests passed; two receipt tests failed because their mock dashboard omitted the newly consumed protocols array. Corrected the fixture only and reran both successfully. Frontend TypeScript check passed. See LAB-WORKFLOW-RELEASE-2026-09-12.md.

September 12 SYS-05 signed-in release workspace: OPEN UAT-20260912-02. At measured innerWidth 320 with a visible scrollbar, clientWidth 303 and body/scrollWidth 320 expose 17px overflow from styles.css body min-width. At 390, long identifiers/links reflow without overflow. Global-minimum correction and focused responsive retest remain pending. No source change or automated test added in this UAT checkpoint; exact measurements are in the active run.

September 12 correction supersedes the open status above: UAT-20260912-02 fixed and retested locally. Removed body min-width: 320px. Signed-in pending package detail now measures innerWidth 320/clientWidth 303/scrollWidth 303; queue and bounded release confirmation also fit. Settled 390 and 1440 detail checks have clientWidth equal to scrollWidth (373 and 1423 respectively). Confirmation initial Cancel focus and Escape return to Release to Customer passed; no confirmation submitted. Viewport override reset. Manual browser verification is appropriate for this one-line CSS change; no new automated frontend test or full suite. See [correction evidence](../testing/runs/2026-09-12-lab-14-preparation.md#uat-defect-corrections-and-focused-retest--september-12-2026).

## Connected help and header regression — September 14, 2026

WEB-06 closes on four actual Clerk audiences, including wrong-audience routes, search failure/retry, preserved navigation and delayed-response sign-out/sign-in. Fixed the shared sidebar's overlap with the taller narrow external header. Four sidebar/search component checks, TypeScript and scoped lint pass; the browser regression passes across 390/320/768px. All ten focused Documentation navigation desktop/mobile cases pass. Current guide corpus generation/check and signed-in search readback pass. FIN-06 also closes after the unavailable legacy connector comparison, with all financial records unchanged. [Full acceptance crosswalk](../testing/runs/2026-09-14-acceptance-closure.md).


September 14 Lead history: queue requests retained converted records so All statuses and Converted filters can reopen immutable history. Existing detail edit restrictions remain. TypeScript/scoped lint passed; no component suite added for this query-only correction. Focused desktop/mobile E2E coverage is in the E2E plan. [Execution record](../testing/runs/2026-09-14-acceptance-closure.md).

September 14 ten-case checkpoint: 18 pricing/location tests, 32 kit-dialog tests and 20 shipping-workspace tests pass. Extended readiness failure/retry coverage verifies refreshed setup enables the retained draft without submitting. New location return variants preserve setup intent for standalone/embedded routes while inventory return remains unchanged. Embedded kit review does not impose a parent route lock; its own dirty/pending guard remains. TypeScript and scoped lint pass; Customer shipping and Phaeno intake guides updated. [Full evidence and limits](../testing/runs/2026-09-14-ten-case-execution.md).

September 15 Company recovery correction: `CrmCompanyFormDialog.test.tsx` and `CrmRecordEditSnapshots.test.tsx` pass all 10 tests, including current-record read failure/retry, explicit conflict review preserving entered fields, pending dismissal/submission protection and existing reviewed snapshots. TypeScript and scoped lint pass. Phaeno Company/recovery guides and generated corpus check pass. Live two-session and committed-response-loss acceptance is recorded separately in the [Kit/system crosswalk](../testing/runs/2026-09-15-kit-and-system-recovery-uat.md).

September 15 specimen-attempt draft correction: `LabSpecimenPage.test.tsx` passes the focused regression for Escape discard confirmation, retained edited evidence, navigation/before-unload protection and no unintended write. TypeScript, scoped lint and generated help check pass. Live failure-before/fix-after evidence, keyboard focus and settled 390×480 light/dark screenshots are in the [LAB-09 continuation](../testing/runs/2026-09-15-lab-attempt-continuation.md). Whole LAB-09 remains incomplete.

## Shipping long-manifest and fulfillment access fixes — September 15, 2026

SHP-14 exposed an unbounded frozen manifest and a fulfillment queue hidden behind a laboratory dashboard role denial. The manifest component now pages 8/8/4 for 20 samples, retains full receiving totals and print behavior, and resets the range on revision replacement. LabOperationsPage renders independently authorized receipt/kit panels without a dashboard request and refreshes their queries. Both new regressions fail before their respective corrections; seven tests pass across the two focused files. TypeScript and scoped ESLint pass. Existing API permissions are unchanged. [Connected retest and complete case evidence](../testing/runs/2026-09-15-shipping-large-recovery-uat.md).

Kit preparation label update: both product selectors read **Product name**. StandardKits and KitRequests selectors updated; tests not run for this copy-only change.

September 16 standard kit product validation: added regressions for clearing stale required errors on manual selection in both product groups, restoring errors for blank selections, and clearing shipping supplier/product errors when a configured size prefills them after an invalid submission. Existing valid-payload and supplier-reset coverage retained. Tests not run (not requested).

September 16 container selection action: existing packing/inventory selectors now use **Change container selection**. The action appears at the right of **Choose shipping containers** with existing availability guards. Tests updated but not run (not requested).

September 16 assignment wording supersedes the earlier container-selection labels: **Assign shipping containers**, **Assign containers**, and **Confirm assignment** / **Confirm partial assignment**. Existing packing selectors now scope repeated Container and barcode field labels by the numbered container group. Tests updated but not run (not requested).

September 16 single-container allocation: show tube counts in a read-only text box for one container; retain editable inputs for multiple containers. Updated count locators and added coverage for recalculation after removal, capacity-capped partial submission, and return to editable counts when another container is added. Tests updated, not run.

September 16 sample ordering: digit-by-digit sample IDs, biological-source group order, numeric tube ordinals and scanner advancement now share the displayed order. Added focused ordering coverage and updated integrated scanner pagination expectations; tests not run. Manual check: mixed-length numeric IDs, multiple sources, multiple tubes, resume after saved matches and dirty-target preservation.

September 16 inline tube scanning: updated scanner and integrated Job regressions for one active row-local field, save/advance, inline errors, paging and collapse draft retention, remount focus and completion. Manual acceptance includes keyboard/scanner Enter, row scrolling, narrow screens and reduced motion. Tests updated but not run (not requested).

September 16 scan completion: verify Done scanning is absent before the final saved match, appears in the Samples and shipping header on completion, receives focus, and closes matching without losing the sample review list. Updated integrated completion and host-header coverage; tests not run.

September 16 sample row alignment: updated matching-status expectations for combined count/progress labels and preserved explicit loading/unavailable states. Fixed-width desktop ID column, wrapping IDs and stacked narrow layout are visual changes; no new tests added or executed.


## Reusable Lab steps and configuration preview - September 17, 2026

Added ConfigurationPreview.test.tsx for production-form validation, reset/disposal, direct conditional-step inspection, output-allocation isolation and action buttons that do not submit the enclosing editor. Updated protocol-definition roundtrips to retain occurrence/capture keys; added rename/reorder/provenance coverage. Tests are authored, not executed. Verify catalog search/paging, draft authoring, exact version adoption, independent approval/override, retirement/usage, and keyboard/focus/theme/reflow manually.

September 17 clarification: new preparation definitions/captures/QC default to batch; barcode fields remain tube-scoped. Existing missing-scope validation coverage explicitly clears scopes before asserting rejection. Tests remain authored, not executed.

Scientific entry controls: verify symbols at a caret and over selected text, keyboard menu selection/focus return, common and custom units, Unicode display in unsaved preview, and discard without changing saved configuration. Updated existing label expectations for Step record and batch entry terminology. Automated tests are not requested for this checkpoint.

PreparationStepDialog tests add required-file preview validation and explicit exclusion despite a QC gate. Automated tests remain unexecuted under repository policy.

Updated failure/coverage expectations for the read-only summary, automatic inclusion and exclusion after failure. Automated tests remain unexecuted under repository policy.

### Inline resource fields and sample exception disclosure (September 17)

PreparationStepDialog: batch-only hiding, optional shared exceptions, clearing unchecked overrides and mixed individual/shared visibility. preparation-resource-fields tests: manual material, invalid product/quantity, common output values, individual overrides and retained outputs. Updated; not executed. Preview browser acceptance covers batch/shared scope and product selection.

### Material identity at configuration

Configured vendor/product/material definition roundtrip, missing configuration validation, read-only runtime material and quantity-only payload coverage added/updated. Tests authored, not executed.

Material unit configuration follow-up: require authoring units, preserve them in save/reopen, show fixed runtime labels, reject tracked lots or submitted units that differ, and keep legacy definitions runnable. Regression cases added/updated; not executed. Manual preview checks cover symbol insertion and report placement after step-entry fields.

Attestation simplification: update form/preview cases to submit without a coverage checkbox; retain configured operator validation and verify its position after the report. Check disabled confirmation and skipped entries omit the attestation, and changed coverage clears operator confirmation. Tests updated but not run under repository policy.

### Material amount exceptions

Authored helper cases for common amounts plus sample overrides, unknown/zero amounts, required reason/outcome, aggregate available stock, and ignored unchecked overrides. Dialog regression covers hidden sample cards, explicit material override, required reason/outcome, zero quantity, unknown-only hold/fail choices and clearing discarded overrides. Existing configured units, final report/attestation and batch-only presentation remain covered. Tests authored and typechecked, not executed.

### Equipment selector requirement — September 18, 2026

`preparation-resource-fields.test.ts` adds coverage for required registered equipment despite legacy optional/untracked configuration: missing selection, free-text-only input and unavailable identity fail; a catalog selection records its identity and ignores supplied display text. Automated execution deferred under the owner’s no-tests-unless-requested policy.

## Jobs delivery deadlines — September 18, 2026

Authored `job-deadlines.test.ts`: URL filter/page parsing, invalid values and explicit cancellation. Typecheck and targeted lint cover Jobs, deadline detail/modal and additive commercial timing fields. Automated test execution not requested.

Jobs header follow-up: container lookup removed and Clear filters moved from pagination footer into header controls. Use targeted lint/typecheck; no new tests for this reversible layout change.

Required date at acceptance: removed Needs due date option/count, added a legacy URL parsing case and clarified Set/Adjust due date action, modal and deadline-panel guidance. Static lint/typecheck plus React review; automated tests not requested.

Active/Closed Jobs: updated URL-state coverage for independent per-tab filters/pages, clear-current-tab only, legacy links, supported filter values, calendar validation and local next-day boundaries including DST dates. Static type/lint and React review; suites not run.

## Progress-based completion forecast — September 18, 2026

Stage durations and CompletionForecast components added with RHF/Zod forms, TanStack queries, versioned holiday/duration configuration, read-only preview with explicit application, sample-driver details and Jobs forecast summaries. Type checking and targeted lint are implementation checks; no automated frontend suite was requested or run. Add/run interaction coverage for date typing, mixed basis/blank/zero validation, duplicate/out-of-coverage holidays, revision conflicts, preview page selection, permissions, unknown/blocked forecasts and responsive keyboard/focus behavior. Signed-in configuration navigation, real workflow/stage data loading and the unsaved holiday-calendar form were verified; persistence/preview/application remains pending requested acceptance.

Holiday calendar tab refinement: scoped lint and type checking passed. Manual signed-in inspection confirmed the year/revision header, date-only `MMM dd, yyyy` display and copied/sorted editor defaults; no automated suite was requested.

Settings navigation separation: updated existing tests for independent Order Settings, Lab Settings and File retention policies menu permissions/order; settings are absent from Operations sidebars and file retention is absent from the Order Settings sidebar. Scoped lint and TypeScript checks pass. Automated suites were not requested or run; restricted-account and standalone Lab Settings component interaction suites remain unexecuted.

## Separate sample-shipping settings — September 18, 2026

Updated navigation permission/order tests and Order Settings sidebar assertions for Sample Shipping Settings and Sample types. Adapted the existing instruction-preview and revision tests to isolated pages; added shared sample-type isolation and instruction-list/preview separation cases. Container detail URLs remain compatible. TypeScript and scoped lint checks pass; no automated suite was requested or run. The standalone preview sidebar item was subsequently removed in favor of rule actions.

Rule preview refinement: updated component coverage for automatic preview from Actions and added focused cases for current/future evaluation times, inactive/ended rules and legacy preview links. Actions has a chevron and a 192px menu so labels remain on one line. Sidebar and list now use Sample shipping instructions. Automated suites were not requested or run.

CRM Settings navigation (September 18, 2026): updated title-case navigation expectations and added permission/menu-selection assertions. CRM shell coverage now expects no Administration sidebar item, standalone settings rendering, and blocked direct access for Commercial staff. TypeScript and scoped lint pass. Automated suites were not requested or run.

Quote/workflow and submission guidance separation (September 18, 2026): updated existing sidebar/editor expectations; quote editor coverage retains instruction text while converting supported workflows. Added guidance-editor coverage for required validation and preserving quote/shipping values while omitting optional workflow fields. TypeScript and scoped lint pass. Automated suites were not requested or run.

User dropdown sentence case correction (September 18, 2026): navigation label expectations now capitalize only the first word, retaining CRM and PSeq. This supersedes the earlier title-case decision; menu placement and permissions are unchanged. Scoped lint and whitespace checks pass; automated suites were not requested or run.

## Full-suite release verification - September 18, 2026

The owner explicitly requested every UI/API/E2E suite and production release. The full Vitest run passed all 1,047 tests in 166 files. Updated older expectations for lexical sample IDs, shipping control accessible names, automatic preparation coverage, failed-tube inspection and the enabled preparation protocol example. Fixed pending-state protection against overlapping failure submissions and subscribed approval-override dirty state; existing tests prove both. Follow-up browser findings corrected the positioned CRM Tasks table header and email recovery focus on dialog close; final UI rerun is a release gate. No test was disabled to clear a failure.

## Evidence governance checkpoint — September 18, 2026

See [the governance verification record](../testing/runs/2026-09-18-evidence-governance.md) for executed scope and limitations. Coverage includes actual-person capture and preview isolation; independent review, self/stale/scope/retry rejection; retained original evidence; scientific profile requirements and explained exceptions; private evidence preservation versus customer-byte deletion; and desktop/mobile proposal/review accessibility. Production, real producer/bench and hosted recovery acceptance remain separate.

## Staff scientific capture and delivery history — September 19, 2026

The [capture/history verification record](../testing/runs/2026-09-19-scientific-capture-history.md) records 19 backend, 13 frontend and 12 browser passes, including sample-scoped commercial/Trial history, immutable report snapshots, staff sequencing/analysis capture and linked corrections, unchanged retries, exact manual-upload attribution, access limits, error recovery, keyboard focus and light/dark mobile accessibility. TypeScript, focused ESLint, EF model consistency and documentation checks pass. No new migration; no production activation. Browser evidence is simulated, and real producer/bench/hosted recovery acceptance remains separate.

## Database baseline and preservation release — September 19, 2026

The [reset execution record](../operations/database-rebase-20260919.md) records the completed production release: all 930 backend cases have passing evidence across the full run and focused follow-ups, 1,061 UI unit tests passed, and the final browser run passed 176 cases with two intentional mobile print skips. Signed-in hosted acceptance remains separate. The baseline-only discovery assertion replaces the retired additive-migration assertion; downgrade still must refuse loss of commit evidence. The legacy scientific-review gate fixture explicitly selects legacy evidence policy, while enforcement suites retain current defaults. Browser keyboard coverage includes the added performer and performed-time controls. Export/import probes cover wrong targets, transactional rollback, replay conflicts, source preservation and drift detection. Production identity, physical scientific evidence and real provider delivery remain separate from automated fixtures.

### Request checklist copy follow-up (September 19)

Updated the existing CrmRequestCard manual-completion regression source for the concise checklist reminder and absence of repeated blocker text; disabled/enabled completion and failed-refresh checks remain. Suites were not run, per repository policy.

### Automatic sample-type references (September 19)

Added SampleShippingConfigurationPanel regression sources for automatic reference generation without a code input, preservation across failed-save retry, and retention of the legacy reference when a revision changes Name. The same coverage verifies Whole RNA as the only new material choice, its extracted_rna payload, and preservation of previously saved material values on revisions. Suites were not run, per repository policy.

### Sample-type unit helper (September 19)

Added a regression source for choosing tube through the shared Lab Steps helper, replacing the prior value, inserting µ at the cursor, and returning focus without saving a sample type. Suites were not run, per repository policy.

Quantity layout follow-up: updated existing sample-type regression queries to use Unit within the Quantity card. No suites run.

Quantity numeric-entry follow-up: added regression sources for invalid values on blur, Min/Max range revalidation, decimal values and whitespace-only limits saved as null. Suites not run under repository policy.

Submission-count follow-up: updated sample configuration regressions to check the submission-only picker, absence of symbol insertion, Min default 1, fractional-count rejection, optional Max, and selected-unit focus restoration. These supersede the prior decimal-count and scientific-symbol expectations for this field. Suites not run.


### September 19 repeated-sequencing release coverage

Repeated sequencing: scientific capture requires a positive whole purchased run number and explicit new-preparation/existing-library choice. Tests also cover the revised commercial run labels and preserved quantity submissions. CRM menu mocks forward DOM refs and attributes so keyboard focus is tested correctly. Release checkpoint: 1,094 tests passed across 174 files, with lint, TypeScript and the production build passing. See the [release record](../operations/repeated-sequencing-release-20260919.md) for source identity, final backend results and production activation.

## September 20 operational gap closure

Added upload resume API tests and specimen-hold component tests; eight focused tests passed with the existing file-picker suite. Covers retained offsets, lost completion acknowledgment, request capability and safe-boundary confirmation. See OPERATIONAL-GAP-CLOSURE-20260920.md.

Final release rerun: all 177 test files and 1,102 tests passed. Full lint, TypeScript, production build and documentation consistency checks passed. The tube-receipt test isolates the unrelated hold child, whose interactions have dedicated coverage.

## September 21 samples and shipping screen review

Updated regression sources for approved-procedure prerequisites, revised field
labels, and the Send packing-review-before-print path, including retained focus,
revision acknowledgment, frozen regular-ice/no-cooling content and shared-step
deduplication. Read-only packing review must not issue or record a shipment.
Manual local desktop/mobile configuration review is recorded in
[SAMPLE-SHIPPING-PACKING-REFINEMENT-PLAN.md](SAMPLE-SHIPPING-PACKING-REFINEMENT-PLAN.md).
The subsequent deployment request authorized verification. All 1,110 tests across
177 files pass, including the actual packing-dialog and exact printed-revision
acknowledgment cases. Full lint, TypeScript, production build and 56-guide
documentation consistency pass. The first full run found a stale Order Settings
sample-navigation assertion and a load-related destination-form timeout; the
corrected full rerun passes with bounded worker concurrency.

### Container supplier dropdowns follow-up (September 21)

Updated `ShippingContainers.test.tsx` regression sources for active supplier and
shipping-container product filtering, supplier-dependent product clearing, optional
reference removal, unchanged legacy references, and catalog failure/retry with
draft retention. Hidden-field validation now uses earlier notes because supplier
references are dropdowns. These follow-up cases have not been run; the full-suite
results above cover the preceding release.

Navigation expectations now use Samples & shipping settings for Phaeno administration; the Prospect operational workspace retains Samples & shipping. Page and sidebar headings, CRM handoff guidance and Phaeno help use the settings label. TypeScript and scoped lint pass; no new test suite was requested.

September 23 barcode follow-up: library and sequencing tube assignment tests require and submit the selected active manufacturer with a manufacturer scan; generated codes omit it. Tray selection binds the scanned value to the selected eligible source tube. Tube movement requires both scans and confirmation, and saved scan results show readable text without a duplicate QR. The label-dialog tests cover scan-back success, failed-attempt recording before retry, and blocked closure during an unresolved print. Tube-detail coverage verifies that a supervisor can correct intake while a POMS label is pending. The full frontend suite passed 1,214 tests across 189 files with bounded worker concurrency; focused label-dialog tests passed again after the final closure change. Lint and TypeScript checks passed.

September 24 storage/material follow-up: supplier-lot form validation no longer requires Material. The date submission case now creates a supplier lot without a material selection. Storage locations are a Lab settings tab with search, create, edit-unused and status confirmation. The later reagent change moved prepared-lot creation into Reagent manufacturing, where staff select a reagent identity and record component uses during the run. The initial storage tests were updated but not run at that checkpoint; subsequent focused frontend tests passed as recorded below.

September 24 reagent manufacturing follow-up: the purchased-stock form presents only Supplier lot; prepared reagents start from the new Reagent manufacturing workspace. Lab settings → Workflows has distinct Library preparation and Reagent manufacturing views. Static typecheck and scoped lint cover the new forms and route. The two existing MaterialLotCreateDialog files pass all six focused tests. Focused component cases remain to be authored for approved-workflow selection, immediate-use wording, step order, stale-version error retention, supervisor-only abandonment and completed-run read-only state. No browser or full frontend suite was run for this change.

September 24 inventory-unit follow-up: the supplier-product editor requires an inventory unit; purchased lot entry displays that unit read-only after product selection. The focused MaterialLotCreateDialog and SupplierCatalog runs pass 15 tests across three files, including automatic unit population and required catalog entry. Frontend typecheck and lint pass. Browser and full-suite verification remain open.

September 24 release verification: the complete unit/component suite passed 1,214 tests across 189 files with bounded workers. Full lint, TypeScript, documentation consistency for 56 guides, and the production build passed. The browser result is recorded in the E2E plan. Dedicated component coverage for the new reagent workspace interactions remains a follow-up; connected API tests cover its source-use and lot rules.
### September 24 Phaeno reagent product follow-up

The supplier catalog component now covers two Phaeno reagent products and
creation with a fixed Reagent type. Product-type coverage now treats the
seeded Reagent type as a built-in read-only category. The workflow editor now selects a saved
Phaeno product and displays its inventory unit; creation of a reagent identity
inside the workflow editor was removed. The focused component test was added
but not run because this follow-up did not request tests. Static TypeScript
checking passed.

### Transportation kit workspace and assembly (2026-09-24)

Focused tab-resolution coverage now expects Kit requests, Inventory and Kits sent under Transportation kits while Receipt & accession contains only arrival and accession work. Supplier catalog and built-in product-type tests cover the Phaeno product-type selector and fixed categories. The shipping settings, shipping specification, and standard-kit group passed 70 tests after updating create and dispatch cases for named products and physical tube verification. The separate Lab tabs/catalog/product-type group passed 22 tests; lint and typecheck passed. Browser coverage remains needed for product → approved workflow/BOM → paired shipping specification → physical assembly and source-lot use → complete tube rescan → corrected roster → dispatch, including keyboard, narrow screen and stale-version feedback.

### September 24 review-remediation scope

Cover same-author approval denial for a non-platform Protocol Administrator, current-only workflow selection in shipping setup, whole-item tube/shipper use, a fixed source tube lot after first use, and visible reagent procedure revision history. Focused UI tests have not been added or run in this turn; typechecking and lint are the local static checks for the touched components.
