# Frontend Test Plan

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
| KIT-F01 | Unknown inventory offers Order transportation kits without claiming verified zero; the explicit existing-kit path remains available only when preparation is permitted. | Automated: [Customer kit tests]. Browser evidence: unknown-stock fixtures. |
| KIT-F02 | Confirmation shows recommended sizes/quantities, the default delivery location and included delivery/no additional charge; nothing is ordered before confirmation. | Automated: [Customer kit tests], including submitted location/shipment versions and recommended quantities. Browser evidence: order modal. |
| KIT-F03 | With no locations, Add a delivery location provides recovery; returning to the shipment reopens confirmation without placing an order. | Automated: [Customer kit tests] cover the setup link and auto-open behavior separately. Gap: real-router save, return context and refreshed location must be verified together in the guided journey. |
| KIT-F04 | Multiple locations without a default still allow opening confirmation; blank submit shows the required error and focuses the chooser. | Automated: [Customer kit tests]. Browser evidence: no-default fixtures and keyboard selection. |
| KIT-F05 | Changing the delivery location refreshes the recommendation and submits that location's displayed version, not the prior default. | Automated: [Customer kit tests]. Gap: full route/query-cache refresh after location editing and a stale-location rejection through the order flow. |
| KIT-F06 | A failed order retains the draft and reuses the same retry key; busy state prevents duplicate submission/dismissal; success shows Kits ordered. | Automated: [Customer kit tests]. Gap: simultaneous browser tabs and sibling-shipment ordering require server/integration evidence; component mocks do not prove deduplication. |
| KIT-F07 | Pending and dispatched requests suppress another order; tracking is visible; kits on the way do not enable preparation. | Automated: [Customer kit tests]. Browser evidence: pending and in-transit fixtures. Gap: authoritative reload after a real dispatch. |
| KIT-F08 | Partial receipt leaves undelivered kits On the way and permits preparation only for the server-authorized available portion. | Automated: [Customer kit tests]. Browser evidence: partial-receipt fixture. Gap: actual packing/scanning with only acknowledged physical kits. |
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

## Manual major-workflow companion — September 8, 2026

The [major-workflow acceptance pack](../testing/README.md) adds 60 human-run
cases covering audience-specific forms, list/detail return paths, approval and
release controls, failure/draft recovery, and keyboard/responsive checks.
See the [owning plan](MAJOR-WORKFLOW-ACCEPTANCE-PLAN.md) and
[run record](../testing/RUN-RECORD.md). These are authored manual scripts, all
initially Not run; no frontend tests were added or executed for this documentation
task, and existing automated coverage/results remain unchanged.

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
- [x] `frontend/src/components/navigation.test.ts` - Docs navigation is
  available as a primary workspace destination in Prospect, Customer, Partner,
  and Phaeno organization contexts.
- [x] `frontend/src/components/navigation.test.ts` - frequent workspace routes,
  including Docs, remain in the desktop toolbar while Data provisioning and
  other administration or resource routes move to the user dropdown without
  changing permission filtering; there is no separate Portal Accounts item.
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
