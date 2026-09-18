# Playwright E2E Test Plan

## September 18 jobs/settings release checkpoint

Prior signed-in local checks below remain scoped manual evidence. The current dropdown uses sentence case; Lab settings uses sidebar pages, and shipping instruction preview opens from each rule's Actions menu. Automated E2E suites were not requested or run. Production smoke checks and exact deployment identities are recorded separately in [release evidence](PORTAL-JOBS-SETTINGS-RELEASE-2026-09-18.md); they do not imply complete operational acceptance.

## Material lot identity matching (2026-09-17)

Connected local manual checkpoint after API restart: supplier-filtered product creation choices, resetting product on supplier change, existing lot's supplier-filtered Assign product modal, and exact-product fictional preview passed. Preview automatically used the lot unit, calculated 10 µL × 2 samples = 20 µL and validated without saving. Temporary configuration edits were discarded. No operational records changed; no console errors observed. Prepared-reagent catalog was empty, so populated prepared-lot UI acceptance remains pending along with actual write/rollback acceptance. No automated tests were run.

See [implementation plan](MATERIAL-LOT-PRODUCT-LINK-PLAN.md). Added domain/Postgres regressions for exact product/definition matching, unlinked and wrong-supplier assignment, immutable assignment, stale versions, configured prepared identity, and rejected wrong-lot consumption with no stock change. Updated material creation fixtures for required products and added frontend helper/schema checks for same-vendor wrong products, unlinked lots, prepared identity and unusable stock. Automated tests are authored/compiled but not executed. Build, typecheck, scoped lint, migration review and local read-only UI checks form this checkpoint; populated operational writes remain unverified.


## Material lot detail navigation (2026-09-17)

Manual acceptance: open a material lot by its linked identifier, inspect identity/stock/storage/dates and QC (including failed reason), refresh/direct-load the detail URL and return to Materials. Inspect prepared-reagent source lot links when populated. Permission, mock-session, error/retry and missing-record rendering reviewed in source. No automated tests added or executed for this read-only detail view; typecheck and scoped lint at the checkpoint.


## Shared output acceptance checkpoint (2026-09-17)

Pending signed-in acceptance: from Shared evidence create outputs for all participating tubes with shared unit/location and one override, verify per-tube barcodes and retained step draft, retry an uncertain response without duplicates, verify existing/failed tubes are not recreated, and confirm each physical output before final protocol completion. Do not use synthetic evidence as physical or scientific acceptance.

## Preparation report acceptance - September 17, 2026

Pending connected acceptance: save a preparation step with and without an optional PDF, verify required materials/equipment/output barcodes remain enforced, download from history and tube evidence, reject invalid/unclean files without saving evidence, and retry without duplicate reports. No operational data written for verification.

## Automatic conditional-review skips — September 17, 2026

Pending after API restart: all-active-pass/no-prior-hold skips the established review and moves Next step to stage completion; history identifies automatic skip and exact coverage. Any current/historical Hold/Fail, missing or stale evidence, unknown condition, no continuing tubes or missing step permission prevents automatic skipping. Failed tubes stay visible and excluded. Refresh/retry/concurrent operators must not duplicate skips or overwrite evidence. Existing eligible batches reconcile without changing data during GET. No operational batch write was used for verification.


## Optional preparation QC reports — September 17, 2026

Pending connected acceptance after restarting the local API: save a performed QC step without a report; select/cancel/remove a PDF without a write; save an approved test PDF with exact tube coverage; refresh and download from history and effective tube evidence; reject invalid/oversized files and unavailable/rejected scanning without evidence changes; retry uncertain responses without duplicates; deny customer and wrong-batch downloads; verify keyboard labels, errors and light/dark layout. Include attachment references in isolated backup/restore verification. No real batch evidence, protocol definitions or user draft were changed to verify this feature. These acceptance cases are not claimed passed.


## Workflow-based preparation progress (2026-09-17)

Inspect the Prepare libraries information panel for saved step and protocol totals across the pinned workflow. Confirm counts are independent of tube quantity; Complete batch retains tube-outcome counts. Keep any open evidence draft intact and make no operational writes for verification. Disposable-fixture acceptance should cover partial entries, QC holds, corrections that stale later evidence, explicit stage completion and permitted skips. Automated tests not executed.

## Retained failed tubes (2026-09-17)

Browser inspection verified the existing failed B2 remains visible in the reopened step modal with saved reason, read-only identity and disabled coverage. Tray retains B2 and displays four active / one failed. No operational records were written. Pending disposable-fixture acceptance: fail a tube with a populated draft, verify its read-only card remains in position, preserve surviving values, submit only surviving member IDs, and verify failed output cannot supply a successful library. Check all-failed and optional-step skip states. Automated tests not executed.

## Sample card headers and identity explanations (2026-09-17)

Inspect one Values and exceptions heading above the sample cards, failure actions at the right end of each header, separate disclosure/failure controls, and no redundant reason field for the standard identity check. Preserve draft values through collapse/expand. Retain reason fields for steps with shared exceptions or tube QC. Do not save operational evidence for presentation verification; automated tests remain unexecuted.

## Fail a tube from step entry (2026-09-17)

Safe browser inspection verified the per-tube action opens a named confirmation in the same dialog with required reason/evidence, Back to step, and a destructive save action. No failure or step evidence was saved. Pending authorized disposable-fixture acceptance: preserve entered date/barcodes on Back, failed request and successful failure; require a reason; prevent duplicate saves; exclude the failed tube from further evidence coverage and sequencing eligibility; preserve other tubes; require renewed coverage confirmation. Verify keyboard focus return and read-only permissions. Automated tests not executed.

## One identity check date per entry (2026-09-17)

Check the identity step contains one shared date and no per-tube date copies; confirm the coverage explanation and unchanged barcode fields. Saving a disposable fixture should retain the shared date on each covered execution. Failure remains an explicit tube action with a required reason, available in step entry and Tray, not a text-note side effect. No operational writes solely for verification.

## Automatic preparation specimen references (2026-09-17)

Pending connected acceptance: upgraded API shows per-tube customer sample/type/accession and no editable accession capture. Verify source scans and confirmations remain required; save on an authorized disposable fixture and check each execution retains its own canonical accession. Check new-tab specimen links preserve the form. Keep the currently open operational form unsaved; no evidence is recorded merely to verify UI.

## Tray collapse after preparation starts (2026-09-17)

Check started batches open with Tray collapsed, header identity and printing remain available, and pointer/keyboard toggles expose the positions and selected tube details. Draft trays remain open. Review library outputs must expand the tray. Starting a live batch solely for verification is out of scope.

## Direct start within library preparation — September 17, 2026

Inspect four progress steps and a confirmed draft with Prepare libraries current. Verify the visible explanation accompanies Start preparation and the extra confirmation modal is absent. Direct start failure/retry and success acceptance require a disposable fixture; do not start the saved operational batch solely to verify this change. Retain hover/focus/tap help, responsive layout and persisted tray locking checks.

## Preparation specimen declarations — September 17, 2026

After rebuilding the API, select occupied positions and compare Specimen type and Declared safety information with the matching submitted specimen's current authorization, including mixed-job trays and amendments. Check missing data shows Not recorded, long/multiline values wrap, and existing evidence/actions remain accessible. Do not mutate specimen declarations for visual verification. Automated suites remain unexecuted without request.

## Tray confirmation checkbox — September 17, 2026

Inspect Confirm tray dialog: inline required checkbox starts unchecked, Space toggles it, unchecked submission shows an associated error, and Required legend stays in footer. Cancel without saving to preserve the operational batch. Persisted confirmation acceptance remains covered by the existing guarded lifecycle scenario; no test suite execution without request.

## Combined preparation step and help panels — September 17, 2026

Verify five progress steps, Prepare tray current for loaded but unconfirmed drafts, scan/load/confirm guidance and no automatic completion of partial trays. Check each information panel by hover, focus and tap/click; pointer movement into the panel must keep it open, Escape/outside interaction closes it without workflow writes, and visible next actions remain available. Check narrow layout and theme contrast. Automated suites are not run without request; do not advance the saved operational batch for presentation verification.

## Restore saved tray identity — September 17, 2026

Check assigned draft reload shows the saved read-only barcode, immediately offers Confirm tray for a populated tray and never requests another Verify tray scan. Review tray shortcut is absent. Unassigned drafts still require acknowledged Save tray before tube entry. Empty unconfirmed drafts may Change tray; cancellation/failure preserves the saved identity. Existing confirmation/start locks remain. Do not perform operational writes for this visual check. Automated tests remain unexecuted.

## Guided preparation journey — September 17, 2026

Pending acceptance after rebuilding/restarting the local API: verify the physical tray, assemble a partial or full tray, confirm its contents, reload and verify the saved lock, reopen with reason, reconfirm, then Start. Confirm a stale second client cannot edit or bypass the saved lock. Check current progress step and direct next action through required evidence, Hold/repeat/correction, output scanning, stage advancement and batch completion. Handoff stays hidden before completion and for all-failed/cancelled batches; passing libraries show individual assignment actions and destinations. Check read-only/operator/protocol-role differences, focus after modal saves, narrow/dark layout and keyboard navigation. Do not mutate the owner's saved operational fixture for a visual check. Automated tests not executed without request.

## Eligible tubes inside Tray — September 17, 2026

Manual acceptance pending: Find eligible tubes appears inside Tray immediately after the Required legend; its compact chevron row starts collapsed and opens with pointer or keyboard. Expanded filters and pager remain within Tray; closing/reopening preserves their state. Selected-tube details and physical tray/tube scanning remain separate controls. Check narrow layout and focus visibility. No tests executed for this presentation change.

## Collapsible eligible tubes — September 17, 2026

Manual acceptance pending: Find eligible tubes starts collapsed; pointer and Enter/Space on its header toggle the filters/results/pager; the chevron follows open state; keyboard focus is visible. Collapse and reopen after filtering and paging to confirm values and page remain. Check narrow layout and dark theme. No automated tests run for this presentation change.

## Eligible tube pagination — September 17, 2026

Pending manual acceptance: more than 10 eligible tubes show 10 per page with matching total/page counts; Previous/Next retain both filters; either filter and Clear filters reset to page 1. Check no matches, loading/error recovery, keyboard focus on page controls, narrow layout and page clamping when a final-page tube is added to the tray. Verify matches beyond the former 200-candidate limit and preserve ineligible-tube exclusions. API must be rebuilt/restarted for the paged response. No automated test execution requested.

## Physical preparation trays — September 17, 2026

Pending connected acceptance: scan a physical tray into an existing populated draft without changing tubes; reopen and reconfirm; reject wrong tray/batch/tube labels; race two batches for the same tray and verify one winner; close/cancel then reuse while retaining history. Select cells with keyboard/pointer and confirm one complete details/action area, visible selection, preserved tube actions, compact QR readability and narrow/dark layout. Print/scanner qualification and operational writes are separate gates. Existing batch-label-only confirmation assertions must now use physical tray identity. Tests are not run for this implementation checkpoint.

## Eligible tube freezer-box filter — September 16, 2026

Manual acceptance pending: scan/type a recorded freezer-box barcode in Find eligible tubes; confirm all returned tubes match both the box and any tube/job search; clear filters and recover the list; verify no-match, loading and error feedback, keyboard operation and stacked narrow layout. Filtering must not save a scan or change eligibility. No automated test execution requested.

## Inline tray scanning — September 16, 2026

Inline tray scan acceptance: verify a matching batch label enables fields and focuses the first empty cell; a wrong label leaves scanning disabled. Scan into A1, verify server save before focus advances past occupied/unavailable cells; reject duplicates without advancing. Check network failure/retry and concurrent-position conflict retention, numeric layouts, partial/full tray, keyboard scrolling, narrow screen, printed label readability and actual scanner behavior. Physical scanning/printing and persisted tube-save acceptance remain pending; do not alter the owner’s tray merely for UI inspection.

Signed-in desktop inspection completed: batch confirmation by Enter enabled the fields and focused A1; B3 remained unavailable; the label preview displayed the matching batch identity and QR. No tube membership or batch status was changed. This is UI evidence only; the saved-scan, error recovery, responsive and physical checks above remain pending. Automated tests were not run.


## Service-based commercial jobs — September 16, 2026

Manual acceptance pending: open the v2 preparation batch, find accepted tubes from the same-service v1 historical job, scan one into a position and verify its attempt/stage uses v2; confirm other-service and rejected/unreviewed tubes are unavailable; start and confirm promotion cannot redirect that attempt. Check retirement against actual queued/started attempts and standalone source selection after promotion. Do not duplicate the user’s saved operational scans for verification.


## Administrator approval override — September 16, 2026

Administrator approval override manual acceptance: as a platform administrator with protocol-management permission, review your own Draft protocol/workflow, verify required reason and confirmation, cancel without mutation, save and reload the labeled reason/time. Verify a non-admin cannot invoke override through UI or API, stale versions preserve form/error, workflow withdrawal retains audit and removes current override, and production promotion recognizes recorded overrides without changing prior job pins. Existing strict scientific/release checks remain. No real approval or promotion is performed as a verification fixture; populated acceptance is pending.

## Catalog row actions — September 16, 2026

Pending manual acceptance: supplier/product/type Actions menus, Edit modal identity, Deactivate confirmation/cancel, hidden inactive rows, Show inactive and Activate, stale-update failures, restored focus, keyboard operation and narrow layouts. Component coverage updated; no test execution requested.

## Supplier catalog tab navigation — September 16, 2026

Product types now lives under Suppliers & Products as a tab, with route-backed selection, legacy-link compatibility and return-to-tab links from details. Manual navigation acceptance remains pending; no automated test run requested for this navigation-only change.

## Managed product types — September 16, 2026

Pending manual acceptance: create a reagent vendor/product, create/rename/inactivate/reactivate a type, preserve inactive references, and confirm reagent products never appear in transportation selectors. Verify keyboard navigation, narrow layout and both themes. No end-to-end run requested.

## Supplier and product catalog acceptance — September 16, 2026

Manual acceptance pending: open Suppliers & Products beneath Lab configurations, create a supplier with Tube and Shipping Container products and descriptions; select them in kit preparation, change supplier and confirm the product resets; verify inactive records cannot be selected; prepare a kit and edit catalog details, verifying the kit retains its original details. Check keyboard focus, required errors, 390px and both themes. No browser end-to-end test run requested.

## Complete roster review and clear details — September 16, 2026

Pending Customer/Partner acceptance: finish an accepted roster, verify CSV actions/import advice disappear and both primary review buttons open the same confirmation. Cancel review without writes. Cancel Clear sample details without changes; confirm it and verify the source/count is retained, ID is blank, tubes default to one, focus moves to entry and finalization is blocked. Re-enter and save; verify review returns. Finalize explicitly, then verify finalized samples cannot be cleared. Cover keyboard, narrow layout and permission boundaries. Scenarios not executed (not requested).

## Sample identification — September 16, 2026

Pending acceptance: for Customer and entitled Partner users with ten accepted samples, verify ten rows grouped by source, one tube prefilled, keyboard ID entry, save/discard and partial save recovery. Check CSV preview/import on untouched placeholders, unique-ID/source/total guards, reserve tube edits, leaving with unsaved IDs, completed-roster pagination and exact finalization confirmation. Verify Sample identification in the progress strip at desktop and narrow widths. `bundled-orders.spec.ts` now expects the generated Sample ID row after placement instead of an Add button. Scenarios documented and selectors updated but not executed (not requested).

## Lab request submission and pricing review — September 16, 2026

For Customer and entitled Partner administrators, submit a lab request and verify Pricing review / Waiting for pricing, one saved submitted request, no separate custom-work action, and Edit/Withdraw under Actions. Modify scope while waiting and verify preserved prior revision and refreshed pricing work; issue a quote and verify Confirm pricing, acceptance/decline and no direct scope edits. Check mobile footer readability and keyboard focus. Do not send real requests as a UI smoke test. Scenarios not executed (not requested).

## September 16, 2026 — Production invitation onboarding repair

Release checks must verify the exact backend and frontend revisions, health/database connectivity, and anonymous rejection of an invalid authentication-handoff token with no-store headers. Real first-time acceptance remains a recipient-performed gate: reopen the original valid invitation, continue with its fixed email, complete password/MFA setup, explicitly accept, and verify intended access. Existing recipients must retain sign-in; expired/revoked links must not prepare account setup. Do not create an invited person's identity, send another email, or accept on their behalf as a smoke test. Automated component/provider/disposable-database checks are separate from this live provider acceptance gate.

## Combined settings navigation — September 16, 2026

Existing navigation, settings-sidebar, retention-panel, and browser selectors follow **Order & retention settings** and its **File retention** section. Verify one menu entry, independent section permissions, the old retention URL redirect, policy history and Edit/Cancel, and sidebar return without changing saved policy. Automated tests were not requested and were not run. Signed-in local browser checks confirmed the legacy redirect, one combined menu entry, the selected retention sidebar item with its divider, policy history, and Edit/Cancel without saving. TypeScript, scoped lint, and documentation checks passed.

## September 16, 2026 — Clear Home attention states

Review Home with all visible counts zero and with a positive count. Confirm explicit No items need attention, neutral zero cards, descriptive highlighted nonzero categories and matching Review links. Recent changes must appear as a separate reference section. Failed/loading dashboard states must not imply all clear. No business writes are required.

Signed-in local browser DOM verification confirmed all five zero counts, the No items need attention heading, explanatory rules and zero attention links. Screenshot capture timed out; populated/loading/error regression cases were updated but not executed. TypeScript, scoped ESLint, documentation consistency and whitespace checks pass. No business data changed.

## September 16, 2026 — Combined pipeline summary

Only multiple available active pipelines expose the Pipeline selector and All pipelines option, independently of the 30-day filter. One pipeline is automatically selected and its selector stays hidden. All pipelines displays one noninteractive All opportunities total from the paginated queue response's full matching count, not the current page length; the existing pipeline/stage context remains visible in each desktop/mobile queue row. Choosing a specific pipeline restores selectable stage summaries. Switching pipeline scope resets stage and pagination atomically. Saved views/export keep an empty pipeline filter for combined scope; the URL uses an explicit all selection so default initialization cannot overwrite it. Search and stale-work filtering apply to both count and queue. Older all-pipeline stale links remain supported. No API or database changes.

Verification covers one pipeline with/without stale filtering, combined count beyond a page, specific/all switching and hidden-stage reset, filtering and queue pipeline/stage context. Automated tests are not run unless requested.

Verified manually in a disposable local preview of the real page with 36 records across two pipelines: the combined total stays 36 on page 2, search reduces it to 1, stale filtering reduces it to 18, specific pipeline restores stage cards, selecting All clears a stage filter, and combined rows show pipeline/stage context. With only one pipeline, the selector stays hidden with stale filtering on/off and an existing All selection normalizes to that pipeline. Unpriced counts remain visible when qualifying records remain (15 with stale filtering versus 30 without). TypeScript, scoped ESLint, documentation consistency and whitespace checks pass. Preview data was local only; no business records were created or changed. Preview files/server were removed.

## September 16, 2026 — CRM Actions menus

Review lead, pipeline and stage Actions menus using keyboard and pointer. Open Edit and Cancel without saving; verify focus restoration and existing disabled/hidden actions. No live status changes or deletions are part of this presentation verification.

Verified in the signed-in local Portal: pipeline menu contains Edit, disabled default Deactivate and Add stage; stage menu supports keyboard Edit; lead menu contains Edit, Qualify and Disqualify for a Working lead. Pipeline/stage edit and lead qualification dialogs opened and cancelled without writes, restoring focus to their Actions buttons after closing. TypeScript, scoped ESLint, documentation consistency and whitespace checks pass. Automated tests were not run.

## September 16, 2026 — Empty pipeline deletion

Connected acceptance remains deferred: delete a disposable empty active/inactive pipeline, cancel without changes, reject stale or newly populated pipelines, and preserve defaults plus active/inactive stages and Opportunity history. Verify keyboard focus and error recovery. No live deletion or automated E2E execution was requested.

## September 16, 2026 — Opportunity summary and queue

Browser acceptance should cover a populated multi-page pipeline: summary counts
stay complete on page/stage changes; summary buttons are the sole stage selector;
search/pipeline/stale filters and saved views update both surfaces; detail-return
restores filters/page; failures provide Retry; desktop/phone and light/dark layouts
remain usable. No live business data writes or automated E2E run are requested.
A disposable 36-record preview verified desktop/phone and light/dark rendering,
full summary totals across queue pages, stage selection resetting page, All stages,
Clear all and the absence of a Stage dropdown. Summary labels show numbers only,
no empty-stage sentence, and configured probability. Connected data, error/retry,
saved-view and detail-return acceptance remain deferred.

## September 16, 2026 — Missing conversion Company name

Connected/browser acceptance is deferred: a named Lead displays its recorded
name; an unnamed Lead creating a Company must enter a name. Verify whitespace
rejection, switching choices without losing the draft, duplicate-name recovery,
existing-company linking and contact-only conversion. No live conversion run.

## September 16, 2026 — Lead conversion Company dropdown

Browser acceptance is deferred: select Create company, an existing Company and
No company; verify the proposed name and Opportunity prerequisite update and
that Contact-only conversion remains available. Check Company/Individual
defaults and keyboard selection. No live conversion or automated tests run.

## September 16, 2026 — Task editing and rescheduling

`crm-task-editing.spec.ts` covers queue Actions > Edit task, pristine Save,
rescheduling with reminder review, unchanged status/recurrence/record links,
dialog width and return focus in desktop/mobile projects. Tests added, not run.
Manual follow-up should include related-record entry, light/dark themes,
keyboard dismissal, stale edits, newly terminal tasks, and an edited task leaving
the current overdue filter. No production records or shared data are required.
An isolated sample preview verified desktop/phone editor layout, light/dark
themes, keyboard date changes, pristine/reverted Save state, invalid-reminder
feedback and closing focus restoration. Connected persistence and conflict
journeys were not executed.

## September 16, 2026 — CRM Requests navigation

`customers.spec.ts` now opens `/crm/requests` for the approval journey and checks
the CRM main-menu and Requests sidebar active states. A legacy `/customers`
redirect case checks preserved request ID, Approved / needs work tab, canonical
URL and active navigation. Existing legacy Company-detail coverage is retained.
These scenarios were added/updated but not run; test execution was not requested.

## Final Change-quote acceptance - September 15, 2026

`e2e/change-quotes.spec.ts` passes four scenarios: 320/1440 pixels, each light/dark. It exercises real form issuance and acceptance with explicitly intercepted APIs, required PO/affirmation, keyboard checkbox interaction, request bodies, axe and horizontal reflow. Phone screenshots were visually inspected. These form fixtures complement actual PostgreSQL controller journeys; they do not claim production or scientific acceptance. [Final-three evidence](../testing/runs/2026-09-15-final-three-acceptance.md).

## Final-three live acceptance — September 15, 2026

ACC-06 closes for isolated software scope: real private authenticator enrollment and sign-in, actual invitation/role administration, fresh capability reads, controlled session revocation, expired draft POST returning 401 with zero persisted rows, and an empty form after reauthentication. The final controlled session was signed out. Email delivery used the local test transport; this is not production delivery acceptance. No automated browser suite was rerun for this continuation. [Complete crosswalk and remaining ORD-03/SYS-06 gaps](../testing/runs/2026-09-15-final-three-acceptance.md). This supersedes the earlier MFA/browser prerequisites below.

## Remaining-case review — September 15, 2026

Five remaining-acceptance browser scenarios pass: cancellation/completion at 320/1440 pixels in both themes with keyboard/draft recovery, no overflow and axe checks, plus fresh signed-out root/Job/Trial destinations. Form API writes are intercepted. Actual provider MFA and independent recovery remain blocked. [Evidence](../testing/runs/2026-09-15-remaining-case-acceptance.md).

## September 15 scientific and workflow acceptance

Two new scenarios in bundled-orders.spec.ts render actual Customer/Partner Job pages with three samples and partial output. Numerical ordering, Enter/Space disclosures, 320/375/1440 widths, both themes, 200% CSS scaling, page overflow and accessibility pass. The final 16-check run includes Trial result/history/handoff and protocol evidence/recovery. APIs are explicitly simulated, not connected sign-in/provider acceptance. [Evidence](../testing/runs/2026-09-15-scientific-ten-software-acceptance.md).

## September 15 ten-case shipping and accession acceptance

The existing shipping print fixture now includes application chrome and checks the approved paged manifest (16 then four tube graphics), hidden chrome, white print background and exactly one receiving PDF page on Letter/A4 in light/dark. Three Chromium print tests pass, including stock-kit and laboratory label regression. Separate real Customer/fulfillment/member sessions verify two unchanged packets, 390x480 layouts, 13-request paging/return and staff-queue denial. Independent PDF page counts and visual inspection pass. Raster QR decoding and actual printer/scanner acceptance remain open. [Complete case crosswalk and limits](../testing/runs/2026-09-15-shipping-ten-software-acceptance.md).

## September 15 session and role acceptance continuation

ACC-06 gained 17 passing backend and seven passing component checks for session/privacy, pending and edited roles, denied persistence and observed draft behavior. No browser/E2E run occurred. Required live root/deep-link, private MFA enrollment, controlled session expiry and administration role screens remain explicitly open; no whole-case pass was added. [Exact continuation and evidence](../testing/runs/2026-09-15-session-role-acceptance.md).

## September 15 simulated account lifecycle acceptance

ACC-05 uses actual backend lifecycle endpoints in disposable PostgreSQL databases and actual React components with mocked API responses. The 23 backend and 14 component checks cover preserved history, access suspension/restoration, membership isolation, reviewed consequences/cancellation and employee self-protection. No live browser/E2E run, identity-provider operation or deployed rendering acceptance is claimed. [ACC-05 crosswalk and remaining gates](../testing/runs/2026-09-15-account-lifecycle-software-acceptance.md).

## September 15 simulated invitation acceptance and recovery

ACC-01/02 use the approved simulated acceptance boundary in this continuation: actual backend journeys in disposable PostgreSQL databases plus actual React components with mocked identity/API transport. No full browser/E2E suite was run and no screenshots or live multi-profile/MFA/inbox evidence are inferred. Company People review, fixed recipient, Research intent, explicit acceptance/session reload and failure/recovery states are covered by the 39 component checks; live provider/recipient and deployed rendering remain open. [ACC-01/02 crosswalk, results and limits](../testing/runs/2026-09-15-invitation-software-acceptance.md).

## September 15 simulated Website intake and delivery acceptance

The bounded `tmp/uat-closure-identities/web-intake-simulated.mjs` harness waits for actual Astro form hydration, intercepts every form write/CAPTCHA transport, and checks required fields, request/captcha failures, retained entries, corrected retry, duplicate-specific errors, optional brief opt-in and non-binding demo confirmation at 1440/390 pixels. It follows the exact captured sender document URL through a local-only interception, verifying the same-path PDF's content type/signature, 292,851 bytes and hash. All three PDF pages were visually inspected. The rendered receipt is explicitly simulated; actual Mailgun template/inbox and deployed link remain open. Two browser runs pass with no tested-form automated WCAG violations/overflow. No standard E2E suite or production Website source changed. [Full WEB-02/04 crosswalk and limits](../testing/runs/2026-09-15-website-intake-recovery-software-acceptance.md).

## September 15 approved simulated Kit batch

The existing authenticated local harness exercises actual `/reagent-orders/:id` and `/data-assembly/:id/edit`/detail routes with intercepted, visibly simulated responses at 1440/light and 390/dark. It verifies two independent cases, frozen profile/output controls, one retained upload after interruption, the saved-draft link, retry with the same remaining-file key and one submission containing both files. It checks no page overflow, keyboard focus for the fulfillment scroll region and zero automated WCAG violations on recovery screens. This is actual-route simulated-data evidence, not a real shipment/scanner/approval/provider journey. No standard E2E suite was rerun or changed. [Run and screenshots](../testing/runs/2026-09-15-kit-batch-software-acceptance.md).

## September 15 approved simulated seven-case completion

The Product Owner approved simulated evidence for DAT-03–06, ACC-04, SYS-03 and WEB-03. The actual Portal receipt route rendered simulated retained-release data at 1440/light and 390/dark, preserved member history privacy and full manifest/checksum text, and produced print PDFs. This uses the current React route with intercepted API data, not the static receipt HTML fixture. Backend and component evidence plus retained connected steps close the seven for software testing; real scientific/provider, received attestation and Google reCAPTCHA acceptance remain open. [Full crosswalk](../testing/runs/2026-09-15-seven-case-software-acceptance.md).

## September 15 connected files, grants and recovery

Signed-in UI/API/database crosswalk closes DAT-01, DAT-02 and SYS-02 using real managed files, ClamAV, three scoped external audiences, Company setup/lifecycle, source scan retry and actual failed durable CRM projection. Governance lifecycle, investigation checks and Web Operations administration/control/failed attempts also ran. These are resumable connected acceptance scripts under ignored local evidence, not mocked-suite passes. DAT-03 external attestation, WEB-03 configured public intake, and the five operational-release-dependent cases remain blocked. See [full ten-case report](../testing/runs/2026-09-15-files-access-ten-case-batch.md).

Continuation verifies SYS-03 current-scope replay and saved Department draft return (steps 4–5), refreshes ACC-04 operational record/denied-edit readback and cross-references existing purchase-role evidence, and verifies DAT-05 invalid policy requests preserve the complete revision history. No new broad suite or duplicate purchase was run. Operational file/stream, approved release, external attestation and public reCAPTCHA prerequisites remain open; total remains 39/81.

## September 15 connected completion control

The isolated signed-in Commercial Operator sees Complete Job and cannot confirm the retained empty-roster billing fixture; P-ADMIN without CommercialOperator cannot see the action. Existing Job readback is unchanged and no business write was attempted. Dialog screenshots at 1440/390/320 px in both themes show no page overflow, and Escape closes the dialog. This is a manual connected check, not successful FIN-01 issuance. [Evidence](../testing/runs/2026-09-15-job-completion-control.md).

## SYS-05 connected interface acceptance — September 15, 2026

The [SYS-05 run](../testing/runs/2026-09-15-system-ui-uat.md) records twelve connected representative surfaces, desktop/tablet/phone/320-pixel reflow, light/dark, keyboard draft recovery, failed-save/no-results distinctions and native 200%/400% zoom. The new tablet navigation regression checks 768 and 1024 pixels, one visible navigation location, no page overflow and focus return in both browser projects. It waits for the hydrated application before keyboard activation.

Four invitation and four navigation desktop/mobile checks pass. Invitation regressions now submit an invalid Department selection and verify focus plus zero requests before supplying valid access. The old disabled-submit policy discrepancy is resolved. These mocked browser checks support the separately journaled connected evidence; they do not establish invitation delivery or physical/scientific acceptance.

September 14 ten-case connected UAT uses the actual scoped Customer, Partner and Prospect accounts with journaled writes and controlled lost responses. It reproduced Department reset on refresh, Trial lifecycle routing 404 and zero-tube roster HTTP 500. Focused regressions reproduce each defect; live retests use the isolated corrected API. No broad mocked suite substitutes for case coverage. See ../testing/runs/2026-09-14-ten-case-execution.md.

## Guided evidence and retirement closure — September 14, 2026

Actual Clerk Operator, Supervisor and independent Protocol Administrator sessions complete LAB-04/07 on dedicated TEST ONLY records. Coverage includes all capture types, QC Fail/Hold, allowed skips, role-bound correction/history, successful ordered attempt completion, active/queued/held retirement impacts, all workflow states, empty/edited recovery, independent revalidation/promotion, stale impact, six concurrent-operation pairs and phone keyboard/themes. An empty recovery's duplicate-stage bug was reproduced, fixed, covered by a failing-then-passing component regression, and retested in the actual UI. Independent database readback and fresh authenticated checks confirm preservation of all 33 pre-existing jobs/definitions/roles. [Complete crosswalk, synthetic boundary and cleanup](../testing/runs/2026-09-14-guided-evidence-retirement-uat.md). No new mocked E2E suite or physical/scientific acceptance claim.

## Connected tube-intake closure — September 14, 2026

Actual Operator/Supervisor/admin/Customer sessions complete LAB-10 and LAB-13 on new isolated TEST ONLY records. Coverage includes destroyed/held/missing/accepted tubes, controlled reasons and correction history, atomic stale/invalid batches, dropped-success retry, simultaneous reviews and review-versus-start, used-source/historical locks, planned-execution eligibility, privacy/scope, keyboard and 390px light/dark layouts. Two discovered UI defects (delayed focus and silent bulk-draft discard) were reproduced, fixed and retested. Independent read-only PostgreSQL confirms one batch receipt, no duplicate accession, unchanged first acceptance/target and exact audit counts. [Complete crosswalk and runtime](../testing/runs/2026-09-14-tube-intake-uat.md). Physical/provider acceptance remains separate; no broad mock suite was substituted.

## Connected material/equipment closure — September 14, 2026

Actual Operator/Supervisor sessions complete LAB-03: supplier-lot creation/QC, reagent preparation with exact deductions and atomic rejections, material-use recovery, calibration validation, one equipment use and retired/overdue denial. The insufficient-stock 500 was corrected; actual UI now retains the failed value and permits one valid save. Fresh read-only PostgreSQL confirms quantities, one consumption and one equipment use. No new mocked E2E suite; the focused full backend operator journey fails before and passes after the fix. [Complete case crosswalk](../testing/runs/2026-09-14-lab-resources-uat.md).

## Connected laboratory versioning closure — September 14, 2026

Actual Clerk Protocol Administrator A/B, Operator and platform-admin sessions complete LAB-01 and LAB-08 on isolated 3016/7116. Coverage includes author denials, reviewed approvals, draft save/resume/discard, UI promotion/cancel/confirm, legacy and retired-protocol denials, simultaneous promotion with one 200/one 409, and real provider authorization preserving null/v1/v2 job pins. Original records remain unchanged; disposable workflow/catalog are retired/deactivated. This is connected software UAT using explicitly staged test data, not a new mocked suite or scientific/physical acceptance. [Full crosswalk and runtime evidence](../testing/runs/2026-09-14-lab-versioning-uat.md).

## September 14, 2026 — Commercial intake access

Commercial intake UAT uses the existing P-PRICE, P-ADMIN and Customer identities to check queue entry, Customer/Department/readiness, order return, and denied configuration/external access. Evidence belongs to the next-ten UAT report; no case is passed from the authorization regression alone.


## Connected ten-case batch — September 14, 2026

Actual Clerk sessions/API persistence close CRM-06 and SHP-01; SHP-02's location validation/default/stale/role/retirement and phone controls pass, while shipment-return confirmation remains unrun. The corrected local public Website completes WEB-01 navigation, actual public search result destination, injected outage/delay/retry, readable seven-page PDF, 390px keyboard/menu/metrics/anchors, no-JavaScript content and metadata/discovery checks. These are journaled connected acceptance scripts under ignored `tmp/uat-closure-identities`, not new mocked-suite counts. Six order/shipping cases retain current setup/access gates. [Crosswalk and baseline](../testing/runs/2026-09-14-next-ten-uat.md). No broad browser suite, real order/dispatch/receipt or production Website deployment.


## Company association draft protection and CRM-01 closure — September 14, 2026

The connected Company/Contact case exposed silent loss of an Add existing person draft on a second Escape. The dialog now applies the established unsaved-navigation and dismissal guard, preserves a declined dismissal, blocks closing during save, and resets discarded local selections when reopened. The first Escape still closes search choices. The Company workspace regression covers decline/discard/reopen and existing recovery paths (8 passed); real signed-in desktop/tablet/phone checks confirm the nested Escape behavior without writes. TypeScript, scoped lint and generated-help consistency pass. The staff guide and review date are updated. Actual Company/relationship, outreach validation/reset, immutable history, legacy restrictions and suppression-preserving admin merge/export complete CRM-01 on the isolated baseline. See the [complete step crosswalk](../testing/runs/2026-09-14-acceptance-closure.md). No broad test suite was substituted for acceptance.

## Connected CRM closure and table reflow — September 14, 2026

CRM-03 and CRM-04 now have complete actual Clerk-session step crosswalks in the [acceptance run](../testing/runs/2026-09-14-acceptance-closure.md): pipeline/history/currency reporting, restricted activity, task completion/recurrence and populated attention links. These checks used the real isolated API/database, exact write guards and persistent journals; no broad mock suite was substituted. A backend save-then-error defect was corrected and separately regression-tested. The only frontend changes keep Opportunity/Reports column headings together in their existing scrolling containers. Actual populated layouts passed at desktop 1440, tablet 768 and phone 390 pixels, without page-level horizontal overflow or page errors. TypeScript and scoped lint pass. No new UI test file or dependency was added for this small reversible style change.

## Connected Finance closure — September 14, 2026

Actual Clerk/API/database continuations close FIN-02, FIN-04 and FIN-05 with step crosswalks; source evidence, retained invoice selection across real pagination/search, distinct draft-editor exclusion and independent closeout download. Actual role-scoped attention links and narrow view also passed for FIN-06, whose legacy connector comparison remains open. No mock counts substitute for case closure. [Evidence](../testing/runs/2026-09-14-acceptance-closure.md).


## Finance rules and Web Operations checkpoint — September 14, 2026

10 desktop/mobile cases passed unchanged across home and web-ops-recovery. Internal/external navigation, exact-recipient stale-version recovery, independent tab mounting and queue pause/resume reason preservation exercised. Existing accessibility and responsive assertions passed. All email/worker requests mocked; no actual sends or worker control. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-finance-rules-and-web-operations-recovery-slice).

## CRM, people and account access checkpoint — September 14, 2026

12 distinct desktop/mobile cases passed across crm, crm-company-recovery and people-departments (initial 6/12 followed by six passing retests). Updated post-create Company section expectation, no-department disabled invitation gate and the recovery fixture synthetic administrator context. Permission, no-write, recovery, accessibility and responsive assertions retained. The prior generic submit-validation discrepancy stays open. No actual invitations or access writes. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-crm-people-and-account-access-slice).

## Documentation, access and provisioning checkpoint — September 14, 2026

22 distinct desktop/mobile checks passed across documentation, documentation-search, customers and data-provisioning. Updated current Company request routing/action/empty-view expectations and Partner included-assembly guide labels/headings. Initial 16/22 plus six successful focused retests; no skips. Mocked API approval is not real access provisioning or Customer download acceptance; scoped lint passed. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-documentation-access-and-provisioning-slice).

## Commercial, Trial and department browser checkpoint — September 14, 2026

40 distinct desktop/mobile cases pass across Trials, order-management, bundled-orders, department self-service/history and dialog-actions suites. Updated stale mock notice/sample-action selectors and invitation expectation; initial 22/28 plus 10/12 became all passing after six and two focused retests. Invitation check preserves current disabled no-department gate and asserts no request, then reviewed payload and draft recovery. Its difference from the generic submit-validation guideline remains documented, not silently approved. Three test specs changed; scoped lint passes. Separate mocked 3019 server stopped; no real invitation/payment/access write. See [run evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-commercial-trial-and-department-browser-slice).

## Grouped laboratory, shipping and retention browser run — September 14, 2026

46 distinct cases passed across seven existing suites on desktop/mobile; two mobile label-print variants are intentionally skipped. Preparation/execution 28 passed; release/retention/print 10 passed; transportation inventory eight passed after repairing fixture HTML delivery and adding the standard React refresh preamble. Host restriction and mocked API boundaries retained. Existing accessibility, reflow, keyboard, dark/reduced-motion, uncertain-save and stale-version assertions passed. No product change, real operational writes or physical-print claim. Scoped lint passed and temporary server stopped. See [browser evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-desktop-and-mobile-browser-workflow-slice).

## Kit feedback correction retest — September 14, 2026

UAT-20260914-01 fixed locally. Signed-in reviewer Kits sent now shows role denial without false empty-queue text; readable at 390px. Right/Left arrows select Receive shipments/Kits sent and update route; viewport reset. No business writes. Four new component regressions and broader 72 backend/107 frontend checks are supporting evidence, not physical or complete UAT acceptance. See [shipping checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-shipping-packing-and-accession-grouped-continuation).

## Reviewer shipping views — September 14, 2026

Live reviewer-only inspection at local 3016: Receive shipments withholds receipt controls and explains Operator/Supervisor access; Accession samples has an empty queue and distinguishes insert lookup from arrival. Kits sent displays role denial alongside misleading empty-queue text, recorded as open low-severity UAT-20260914-01. No lookup, receipt, print, accession or role write. Grouped 66 backend and 162 frontend checks are supporting software evidence, not signed-in end-to-end acceptance. See [the run](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-grouped-handoff-shipping-and-trial-verification).

## Laboratory closeout Customer read boundary — September 12, 2026

Separate Chrome 3014 tab reused the existing Customer session; original Customer Job tab remained untouched. Lab index denies access. Direct known preparation route exposed a disabled-query loading defect, corrected as UAT-20260912-07; live retest now shows role guidance without batch data and keyboard return reaches the Customer dashboard. Direct Phaeno guide is unavailable with Customer navigation. No business writes, role changes or new E2E suite. Four focused component access/cache tests pass; remaining Customer write/fault/held-state and full scientific/provider gates remain in the [closeout ledger](../testing/runs/2026-09-12-laboratory-uat-closeout.md).

## Phaeno documentation UAT recovery — September 12, 2026

WEB-06/SYS-05 bounded live checks passed: explicit stale-corpus warning and browse fallback; local API corpus reload recovers scientific approval search with 17 guides and the correct first result; Enter opens the guide, active topic auto-expands, one topic remains expanded, and Back restores query/results. No-match feedback differs from an error. At measured 390px, no page overflow; non-modal rail opens with Enter and closes with Escape/focus restored. Current corpus 9e7fac7318fd (56 guides). No new automation/full suite or external-audience claim. Original scientific packages unchanged/unpublished. See [help UAT evidence](../testing/runs/2026-09-12-lab-14-preparation.md#phaeno-help-search-and-recovery--september-12-2026).

## Checksum failure presentation — September 12, 2026

Signed-in local package detail for d14354fb-36ef-4801-8184-adf6cde706e2 shows Failed/version 4, checksum-mismatch attention text, and two 158-byte files with Clean/Rejected statuses after actual scanner/API testing. No approval/release or publication control. Original clean package restored for handoff. Bounded manual UI check; reviewer rejection and complete scientific/provider acceptance remain separate gates. No new E2E automation. See [checksum rejection evidence](../testing/runs/2026-09-12-lab-14-preparation.md#multi-artifact-scan-validation-and-checksum-rejection--september-12-2026).

## Retained result artifact scan handoff — September 12, 2026

Signed-in Edge readback after real local ClamAV scan/callback shows package 3c42f211-a219-421d-a7bc-dd07c6dba5e7 Ready For Review with its Clean 158-byte artifact and no recorded scientific approval/release. Current session is Bill Haack; following View scientific review correctly displays the assigned-laboratory-role requirement. No identity/role changes or publication. Returned to the preserved package. This is bounded browser evidence, not a new E2E test or full-case pass; work remains AwaitingSpecimens with zero specimens/approvals. See [retained scan evidence](../testing/runs/2026-09-12-lab-14-preparation.md#real-scanner-callback-and-scientific-access-boundary--september-12-2026).

## Billing approval and completion handoff - September 12, 2026

Actual signed-in FIN-01 billing validation, approval, approval reset after a terms change, reapproval and reload passed on the existing marked Customer A. Saved profile is version 4/configuration 3, Net 45 with a synthetic 10% tax rate. All invoice readbacks stayed identical; receipt totals remain 8/$108 unapplied. Settled desktop/390px billing screenshots inspected. FIN-01 remains partial: neither saved InProgress Job has terminal Commercial samples, governed release does not advance those statuses, the current Job UI has no completion action, and this isolated runtime lacks CommercialOperator. No completion, invoice issuance, PDF, role change or production action was performed. No automated tests were added or rerun; this checkpoint is signed-in acceptance and code/read-only record tracing. [Evidence and next implementation slice](../testing/runs/2026-09-12-lab-production-verification.md#billing-approval-and-completion-handoff---september-12-2026).

## Real scanner and receipt evidence - September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied. [Exact runtime and saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#real-scanner-and-receipt-evidence--september-12-2026). No deployment, migration, auth change or Git mutation. Remaining legitimate issuance/PDF, scientific independence and production/physical/provider gates stay open.

## Finance role separation - September 12, 2026

Owner approved one additional development-only CashOperator + CashReconciler login. Actual signed-in UAT passed second-operator import ownership rejection (preview and direct confirm), with retained input and no receipt created. The combined-role user then imported a separate $7 receipt; a different Cash Operator created/submitted its reconciliation. Approval by the receipt contributor returned 409 and left the batch Submitted/version 2 with no approval/report. This isolates contribution exclusion from creator/submitter exclusion. Existing approved reconciliation and all previous receipt readbacks remained identical. Outstanding invoices remain $645; seven receipts now have $107 unapplied. No product defect, code, production role, provider policy, migration, Git or deployment change. [Evidence and saved records](../testing/runs/2026-09-12-lab-production-verification.md#finance-role-separation--september-12-2026). Scanner-backed upload, legitimate issuance/PDF, and production/physical/provider acceptance remain open.

## Finance aging boundaries - September 12, 2026

Actual signed-in Billing verification passed all eight aging boundaries (0, 1, 30, 31, 60, 61, 90 and 91 days) using separately marked isolated fixtures. At UTC date 2026-09-13, bucket totals are $391 current, $6 at 1-30 days, $24 at 31-60, $96 at 61-90 and $128 over 90: $645 outstanding. Aging CSV has 12 open rows; all-invoice CSV has 14 rows, including Paid and WrittenOff. Customer filtering leaves the labeled all-Customer aging/export scope unchanged. Existing receipts, allocations, adjustments and reconciliations were preserved; unapplied cash remains $100. Desktop and fresh 390px page screenshots inspected. This is synthetic arithmetic/export evidence, not legitimate issuance/PDF or production acceptance. [Saved evidence](../testing/runs/2026-09-12-lab-production-verification.md#finance-aging-boundaries--september-12-2026). No product code or new automated suite changed. Remaining role-combination, scanner, issuance and production gates stay open.

## Finance exceptions and receipt upload — September 12, 2026

Real local sessions/API checks passed duplicate reversal, unauthorized adjustment, Customer/currency/amount rejection, two-session stale adjustment with deliberate review, one-receipt/two-invoice and several-receipt/one-invoice allocations, reasoned draft cancellation and controlled read-failure recovery. Multipart serialization and false-success validation envelope defects were fixed; live malformed upload and unavailable-scanner rejection now show correct errors, retain entries and create no receipt/artifact. Latest fixture totals: $390 outstanding, $100 unapplied; original Approved $75 reconciliation preserved. Positive real scanning/issuance, additional role-combination cases and overdue buckets remain open. [Evidence and exact saved states](../testing/runs/2026-09-12-lab-production-verification.md#finance-exceptions-and-upload-correction--september-12-2026).

## Finance closeout, corrections and exports — September 12, 2026

Actual local Reconciler verified readable saved closeout, downloaded text, Tab/Enter disclosure and no overflow at 320/1440px in both themes. Cash reversed the remaining $100 allocation then the $250 receipt; Billing applied separate credit $10, debit $15 and write-off $100. Database readback confirms main invoice $220, adjusted balances $90/$115/$0, retained histories and disabled terminal actions. Real downloads plus independent CSV parsing verify $625 current/outstanding across five open invoices, six all-invoice rows including the write-off, two retained receipts including the reversed one, $75 unapplied and distinct reconciliation actors. Customer filters do not narrow all-Customer exports. Report presentation is fixed locally; 44 focused regressions and static checks pass. No production result or complete FIN case is claimed; [saved state and remaining cases](../testing/runs/2026-09-12-lab-production-verification.md#finance-closeout-and-corrections--september-12-2026).

## Populated Finance browser checkpoint — September 12, 2026

Actual Billing/Cash/Reconciler sessions passed invoice review/filter return; invalid/reviewed/confirmed/duplicate CSV import; $100 + $120 allocation and UI over-allocation gating; reasoned $120 reversal; reconciliation imbalance, correction, submission and independent approval. Database readback confirms balances/actors. Uses synthetic invoices and supported import, not legitimate issuance/PDF or scanned upload. Main receipt retains $100 active allocation for remaining reversal coverage. See [saved state, evidence and remaining cases](../testing/runs/2026-09-12-lab-production-verification.md#populated-finance-acceptance--september-12-2026). No product code or automated suite changes; prior 63-test result remains the latest focused suite result.

## Approved Finance identities — September 12, 2026

Three owner-approved Clerk development identities now have isolated LAB-06 Phaeno/General memberships and single BillingOperator/CashOperator/CashReconciler roles, no administration or Lab roles. This closes the missing-identity blocker. Actual separate browser sessions pass password/test-email verification, allowed Finance navigation/actions and fallback from unauthorized Intake bookmarks. UAT-20260912-06 fixed the newly reproduced role-only home dashboard commercial query; the real role dashboard now passes without API failures. All three dashboards fit 320px; settled Billing dark screenshot inspected. Sixty-three focused tests plus TypeScript/scoped lint/docs check pass. No operational writes; invoice/receipt/reconciliation counts remain zero. Populated FIN-01–06 and deployed tests remain unrun. See the [identity and acceptance record](../testing/runs/2026-09-12-lab-production-verification.md#approved-finance-identities-and-role-acceptance--uat-20260912-06).

## Finance identity boundary checkpoint — September 12, 2026

Live Bill at 3016 has no Finance assignment: Finance bookmark falls back to commercial intake; Finance sidebar is absent; all-zero direct invoice probe shows unavailable without financial controls. No existing invoice/API bypass result is claimed. Read-only isolated inventory confirms no active Billing/Cash/Reconciler identities, so their signed-in tests are Blocked pending the owning plan's proposed development-only account setup. UAT-20260912-05 fixes unconditional invoice Open order using existing commercial access; two component regressions plus related tests pass (57 total). Original Scanning/Pending package restored. No role/account changes, financial writes or deployment.

## Result detail responsive continuation — September 12, 2026

UAT-20260912-04 reproduced long-identifier overflow in actual package detail and confirmation components. After scoped wrapping correction, isolated browser checks pass at 320/390/1440px in light/dark for ready detail, expanded evidence, release dialog and disabled detail. Tab remains in the dialog; Cancel/Escape restore opener focus; withdrawal requires a reason. No confirmation submitted and no real API used. This closes isolated direct-detail narrow coverage, not signed-in/full-shell or publication acceptance. Screenshots and measurements: [result detail checkpoint](../testing/runs/2026-09-12-lab-production-verification.md#result-package-narrow-layout--uat-20260912-04). All 23 focused regressions, TypeScript and scoped lint pass; production retest remains open.

## Signed-in disabled-capability acceptance — September 12, 2026

Passed in existing LAB-14 localhost:3014/API 7114 as Bill Haack, without configuration changes: disabled result queue hides filters/actions; direct package link shows the neutral notice and keyboard return to the queue; dashboard shows Attention queues not enabled without retry/shortcut. Actual queue light/dark computed styles and desktop 2124px non-overflow passed, System theme restored. This closes the earlier signed-in disabled queue/detail/dashboard gate, not role-enforced Finance or deployed acceptance. Package ID in the disabled direct link is a gate probe, not a claimed record in that database. Original LAB-06 fixture/tab untouched. No application edits, operational writes or suite rerun. See [local disabled-feature evidence](../testing/runs/2026-09-12-lab-production-verification.md#signed-in-disabled-result-release--local-lab-14-continuation).

## Local administrator continuation — September 12, 2026

Bill Haack on localhost:3016 passed commercial intake, corrected dashboard (six orders; no unauthorized Attention count/retry/shortcut), independent CRM sale-summary recovery empty state, and the result-package commercial-order link. Administrator status alone does not grant operational Attention under business-role enforcement; the UI now observes the existing capabilities without changing backend access. Original Scanning/Pending ingestion package preserved, no operational submission. Twenty-three focused tests plus TypeScript/scoped lint/documentation check pass. This supersedes the earlier administrator handoff; populated CRM recovery, Finance-role browser checks, signed-in disabled result queue/detail and deployed acceptance remain open. Evidence: [administrator checkpoint](../testing/runs/2026-09-12-lab-production-verification.md#administrator-acceptance-completed-locally).

## Production signed-in checkpoint — September 12, 2026

Responsive supplement: actual dashboard/Attention/result queue components passed isolated Playwright browser checks at 320/390/1440 in light and dark themes with full application styles, no horizontal overflow, and visible keyboard focus. Simulated disabled responses suppress unusable controls; simulated 503 retains error alerts/filters/retry. Screenshots reviewed and zero page errors captured. Temporary adapter prevents backend writes and no existing signed-in session changed. This closes component-level responsive evidence only; authenticated disabled routes, direct-detail narrow layout, other-role and production checks remain open. See [responsive browser evidence](../testing/runs/2026-09-12-lab-production-verification.md#isolated-responsive-browser-verification).

Result-package related links retested locally: William's View commercial order initially reproduced the platform-capability denial. After extending UAT-20260912-03's existing gate to that link, it is absent while View scientific review opens the same Job's Review tab successfully. The synthetic ingestion Job remains Awaiting Specimens with zero specimens and no approval; package remains Scanning/Pending, not ready for publication. Original package checkpoint restored. Two additional component cases bring the focused total to 21 passing. No role, record, backend permission, Git or deployment changes.

UAT-20260912-03 corrected and retested locally: William's Order ops toolbar link opens Result release with Ready For Release and the retained independently reviewed candidate. Sidebar contains Trial projects, Attention and Result release only. Old `orderSection=intake` bookmark falls back to Result release without commercial permission alerts. Explicit Attention keyboard selection still opens its neutral disabled state. Seven role-navigation automated cases passed (19 total with related regressions); no production deployment or role/record change. Other-role live retest and wider UAT gates remain open.

Local browser continuation: actual disabled Attention status/filter suppression passed as William on 3016; light/dark computed styles and desktop non-overflow passed at 2124px. Enter/Escape menu dismissal and settled opener focus passed; System theme restored. Enabled Ready For Release queue retained its independently reviewed candidate. Narrow viewport and disabled result/dashboard browser checks remain pending; viewport CLI could not attach. New OPEN UAT-20260912-03: reviewer/release-manager is offered Order intake, but its CRM-backed queries deny this account. Align navigation/default selection with commercial permissions without granting broader access. Original ingestion URL restored; no operational submission. Details in the [production/local follow-up record](../testing/runs/2026-09-12-lab-production-verification.md#signed-in-local-browser-continuation).

Follow-up UI correction is implemented and component-tested locally (12 checks), not deployed. Pending manual acceptance: with Attention disabled, dashboard shows neutral status and no Attention retry/shortcut; Attention retains its sidebar entry and explains Not enabled without a filter. With governed results disabled, result queue and direct package route explain Not enabled without stale rows/actions. Confirm genuine outages still show errors, independent CRM recovery remains available, enabled queues retain their filters/actions, and keyboard/narrow/light/dark presentation works. Do not activate production features or publish packages merely to perform this check.

Bill Haack account confirmed. Bounded read-only checks passed for laboratory navigation, preparation empty state, configuration tabs and result queue default Ready For Release. Production governed results and operational attention are disabled; their exposed error states are an open UX finding. Populated tray/review, role matrix, physical/provider/scanner and publication acceptance remain open. No production operational writes, feature activation or automated suite. See [production verification run](../testing/runs/2026-09-12-lab-production-verification.md#signed-in-follow-up).

## Signed-in saved-lineage trace — September 14, 2026

Independent Reviewer followed the completed resource tray through its specimen, completed execution, output and parent source. Cancelled attempt 1/reason and successful attempt 2 remained distinct; workflow v2, locked execution, named evidence/authors, one material use and three equipment uses were visible. Specimen/execution linked back to preparation; source/output retained reciprocal lineage and stored locations. No operating actions, record writes or scientific approval. Separate grouped runs passed 168 distinct backend checks after a stale mapping-test correction and 48 frontend checks; no Playwright suite was run. These supplement rather than close manual/physical/provider gates. See [grouped checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-grouped-software-verification-and-saved-lineage-trace).

## Reviewer operational boundaries — September 14, 2026

Existing ScientificReviewer at isolated 3016 could read protocols/workflows/tray formats, materials, equipment and sequencing records, with authoring/operating controls withheld. Receipt explained the Operator/Supervisor requirement and withheld the scan input. Direct protocol/workflow new-version URLs returned explicit Protocol Administrator role denial and no form; Lab ops navigation recovered to the workspace. Configuration Right Arrow selected Tray formats and updated the route. Database retained original protocol/workflow versions and reviewer-only roles; no writes or new revisions. These are live UI boundaries, not mutation-endpoint rejection or the full role matrix. No automated tests/product changes. See [access evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-reviewer-configuration-and-operational-control-boundaries).

## LAB-06 signed-in review dialog reflow — September 14, 2026

Existing Independent Reviewer tested the preserved failed-package work at 3016: Approval fit 320 × 740 and 320 × 568 light layouts, with internal content scrolling and accessible Cancel/footer at the short height, plus 390 × 668 dark layout. Document widths matched viewport widths without horizontal overflow. A long TEST ONLY summary survived resize, was discarded on keyboard cancellation, and was empty on reopening. Tab/Shift+Tab stayed within the dialog, disabled Save was skipped, and Cancel/Escape restored opener focus. Package gate remained explicit and Save disabled throughout. Keyboard End selected Review; reload retained `tab=review` and no approval. System theme/default viewport restored; database remained ScientificReview/version 1 with zero approvals/events and reviewer-only access. No submission, application change or automated test. Exact contrast, reduced motion and positive scientific lineage remain separate. See [dialog evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-scientific-review-dialog-on-narrow-and-short-screens).

## LAB-14 signed-in read-only reflow — September 14, 2026

Independent Reviewer inspected preserved completed resource preparation at 3016. Keyboard expansion reached tube/effective evidence and all 18 history entries; menu Escape restored focus. Document scroll/client widths matched at 390 px light (375/375), 320 px dark with expanded evidence/history (305/305), 320 px light (320/320), and 1440 px light (1425/1425). At 320 px dark, the tray alone scrolled horizontally by keyboard (280 px content/241 px region), with a visible evidence-disclosure focus outline. Mobile/desktop navigation switched without duplicate Workspace links. System theme and default viewport restored; database remains Complete/version 18/history 18, reviewer-only access retained. No writes, application changes or automated suite. Live reduced motion, writable forms/nested actions and exact contrast audit remain unperformed. See [read-only continuation](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-completed-preparation-keyboard-and-reflow-continuation).

## LAB-14 signed-in checkpoint — September 12, 2026

See the [run record](../testing/runs/2026-09-12-lab-14-preparation.md). Numeric preview/cancel, all-unavailable rejection, saved 2×3/B3-unavailable format and refresh persistence passed. Saved a separate preparation-enabled three-step test protocol draft. Live approval review initially omitted scopes; after correction it shows Batch/Tube/Shared captures, QC scopes and selected-source matching before attestation. Three focused frontend tests passed; no E2E suite was rerun for this display fix. Full LAB-14 is Blocked at independent protocol approval; execution steps remain Not run. No older job, tube, execution or sequencing membership was changed.

## Latest UI acceptance alignment — September 11, 2026

Verify **Library prep** uses the existing work route and opens preparation batches plus the job-history lookup. Verify **Lab configurations** is the last sidebar item with a cog icon and the **Protocols**, **Workflows**, and **Tray formats** tabs. Shared Portal tabs use 36 px minimum triggers and 42 px single-line strips, with consistent padding, selected styling and keyboard focus; wrapped rows may grow. LAB-14 records the connected preparation-batch journey. Verify the shared required marker stays with the final wrapped word and long confirmation checkboxes retain first-line alignment and full width. LAB-13 carries these checks alongside accession behavior; build/read-only evidence is recorded separately from unrun full acceptance. Earlier chronological screenshots describe historical labels, not current expected text.


### Accession before storage and bulk acceptance (2026-09-11)

See LAB-13 in `docs/testing/06-laboratory.md`: mixed accepted/held/rejected/missing shipment, unscannable broken expected tube with no fake location, atomic acceptance of the identified remainder, retries and concurrent changes, stored tube details and supervised correction. Customer-requested holds remain Blocked. No persisted acceptance or physical inspection is claimed from builds or read-only UI checks. Automated suites remain Not run.


## Specimen attempt acceptance — September 11, 2026

Use the detailed [LAB-09 operator script](../testing/06-laboratory.md#lab-09---specimen-tube-attempts-and-reserve-fallback) and plan acceptance matrix. Cover order authorization, source selection/start, permitted QC repeat, multi-stage failure and reserve restart, successful lineage, terminal exhaustion, pending material, concurrency, stale retries and original Planned execution adoption. Do not mark implementation/build proof as a passed journey. Automated suites not run; connected read-only specimen/navigation evidence is narrower.

## Tube review before execution - September 11, 2026

Before pressing Start, a Planned execution lacking accepted available input must show Tube acceptance required. Open tubes opens the same job's Tubes tab, which precedes Execution. Preserve return section/shipment context. On a separate synthetic fixture, complete intake for an identified eligible tube during accessioning, return and verify Start becomes available without automatic processing; repeat with unavailable and foreign-specimen tubes and a concurrent eligibility change. Automated and persisted-transition cases Not run.

## Planned specimen failure and customer holds - September 11, 2026

Future attempt coverage must distinguish terminal failure with confirmed material exhaustion (specimen processing Failed, intake history preserved) from pending receipt or resolvable tube review (explicit temporary blocker). Verify an accepted tube plus a held reserve leaves specimen intake Accepted. These attempt cases are Not run. [Customer-requested hold coverage](CUSTOMER-SPECIMEN-HOLD-PLAN.md#future-acceptance-coverage) is planned only and **blocked from implementation by Product Owner direction**; existing generic milestone controls do not satisfy it.

## Tube-level acceptance journey - September 11, 2026

Verify accepted tube + rejected reserve leaves specimen Accepted, reason validation and resolution notes, no automatic historical acceptance, review lock after processing, old specimen action absent, same-tube accession retry and rejection of execution start without accepted available input. Automated journey Not run.

## Proposed multi-tube specimen journey - September 11, 2026

Follow the proposed [tube-attempt acceptance matrix](SPECIMEN-TUBE-ATTEMPT-PLAN.md#acceptance-matrix): order policy through receipt, Tube 1 attempt, repeat/Hold, explicit failure, Tube 2 restart, success/exhaustion and lineage; include real concurrent requests and bypass attempts. Preserve the existing HS5Y7DB7 Planned execution. All new cases Not run.

## Workflow promotion and action menus - September 11, 2026

Verify Draft, Invalid and Approved version Actions menus, keyboard dismissal and confirmation Cancel without state changes. Approved and Invalid menus manually checked locally. Promotion acceptance: independently approve each protocol and workflow; permit either author to promote with ProtocolAdministrator role; reject missing/self approvals, unauthorized roles and stale state; confirm new-job workflow use and unchanged existing pins. Promotion journey remains Not run after the policy change.

## Discarded drafts in history only — September 11, 2026

Working-list acceptance now requires no Show discarded drafts control and no standalone discarded-only records in either Show retired state. Confirm an approved protocol with a discarded revision remains visible with that revision labeled Discarded and no revision-specific edit/create actions. New empty identities remain visible as Setup incomplete. Connected Edge verified the control removal and discarded-only exclusion; mixed approved/discarded history remains a manual acceptance check. No data mutation or automated suite was used for this UI correction.

## Revised retirement lifecycle journeys — September 11, 2026

The manual [LAB-07](../testing/06-laboratory.md#lab-07--protocol-retirement-workflow-invalidation-and-revalidation) journey covers no workflow, active samples, queued-only samples with cancel/Proceed anyway, multi-workflow invalidation, immutable history, removal in recovery revisions, revalidation without edits and with edits, empty workflow rejection, independent approval/promotion, flagged queued jobs and blocked starts, stale confirmation and concurrency. Use separate synthetic fixtures; preserve the original library-preparation walkthrough. Prior successful retirement tests used the old dependency-blocking rule; new journey outcomes remain Not run until separately evidenced. No automatic repinning or database repair is part of acceptance.

## Protocol retirement local acceptance — September 11, 2026

Used a separate synthetic approved protocol and Draft service workflow. Retirement required a reason and was refused while the workflow referenced it, naming that workflow. Discarded only that workflow draft through UI, then successfully retired only the verification protocol. Confirmed default hiding, Show retired inclusion, preserved version approval and reason/date after refresh, and DB actor/time/version. Kept the two library-preparation walkthrough protocols intact. Automated tests were not run. Approved/Production dependencies, unfinished-job blockers, cross-role denial, concurrent requests, and stale direct creation paths remain acceptance gates.

## Equipment retirement local acceptance — September 11, 2026

Through connected Edge, created a separate TEST ONLY retirement verification asset, confirmed a blank reason prevents retirement, retired it with an explicit synthetic reason, verified default hiding and Show retired inclusion, then refreshed and checked retained reason/date. Database corroborated actor/timestamp/version and preservation of the active preparation asset. No operational execution or physical calibration was asserted. No automated suite was run; cross-role denial, concurrent retirement/use and populated usage-history scenarios remain unrun.

## Protocol management tab checkpoint — September 11, 2026

Focused connected Edge verification confirmed Protocols is selected by default, discarded-only Test 1-2-3 is hidden, Show discarded restores it, clearing the filter hides it, and ArrowRight/ArrowLeft selects the Service workflows/Protocols panels. Each selected panel exposes its own creation action. No automated E2E suite was run or new test added; full responsive/theme coverage remains deferred. No protocol approval or workflow write occurred.

## Protocol capture layout — September 11, 2026

Connected local Edge observations verified the owner-reported capture spacing correction at phone/native/wide sizes, Required-to-remove keyboard focus, and preservation of the 19 unsaved fields across hot reload and responsive checks. No capture was removed and the partial Draft was not saved or advanced. Number/Choice interaction variants, dark theme and full controlled protocol acceptance remain unrun. The [run record](../testing/runs/2026-09-11-protocol-preparation.md) preserves the paced authoring checkpoint. No automated suite was run.

## Laboratory Work tab reflow — September 11, 2026

Focused connected Edge verification passed for the tab-layout correction at 375/950/1280px: bar heights 122/82/42px, targets contained, visible panel separated by 8px, and no phone horizontal overflow. ArrowRight changed Execution to Lineage with visible focus. Inspection used a separate temporary Work tab, which was closed; the protocol draft retained every unsaved field and original browser size. Dark-theme verification remains unrun. The [paced protocol walkthrough](../testing/runs/2026-09-11-protocol-preparation.md) records the checkpoint. No Playwright suite or full LAB acceptance is claimed.

## Customer laboratory stages — September 10, 2026

**No automated Playwright run is claimed for this change.** The [local stage record](../testing/runs/2026-09-10-customer-laboratory-stages.md) establishes a narrower signed-in Customer check: both list rows show Received; HS5Y7DB7's header, all six stages, nine Received samples and expanded sample disclosure were inspected on desktop. The 69SJN4PA detail, keyboard/mobile/theme variants and Partner session remain **Not run**. Backend fixtures establish mixed-stage rules but are not full-browser acceptance.

Run [ORD-07](../testing/04-lab-orders.md#ord-07--customer-laboratory-stages-and-mixed-sample-progress) alongside [LAB-02](../testing/06-laboratory.md#lab-02--receipt-multi-tube-accession-and-physical-lineage). Preserve separate evidence for UI, persisted facts, provider activity and physical handling. A test environment without a prerequisite is **Blocked**, with an owner and next action; it is not a pass. Hosted acceptance is blocked pending an authorized matching API/UI deployment and test accounts. No deployment is authorized by this plan update.

## Intake progress synchronization — September 10, 2026

The [local correction record](../testing/runs/2026-09-10-intake-progress-correction.md) records the completed one-time repair: both Jobs are in Work, all 16 samples are Accessioned, and all 44 tubes/locations and scientific intake records were preserved. Do not rerun that repair or re-accession those tubes as test setup. Its historical Customer In Progress display is superseded by the current Received label; the Commercial lifecycle remains InProgress.

On disposable fixtures, verify first container arrival makes Work/Customer Received, per-tube receipt counts, sample Accessioned only after every expected tube across active shipments, no loss from Work after leaving the accession queue, repeat-scan stability, and unchanged acceptance/turnaround. Recovery, held/terminal variants and failure/retry assertions require their own evidence. Physical hardware and hosted acceptance remain separate gates. Use existing owner Jobs only for read-only regression checks.

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


## Lab Job customer workspace acceptance — September 10, 2026

The approved implementation provides horizontal iconic **Ordering and shipping**
steps and a separate **After you send** area. Signed-in read-only inspection on
HS5Y7DB7 initially confirmed the seven-step variant, combined header Actions,
container-scoped scanning and preserved 18/18 ReadyToShip state. The subsequent
Product Owner refinement merges insert preparation into Send: six icons, five
preparation checks and Send still requiring customer work. The compact strip
omits redundant Complete/Waiting text; detailed hover/focus panels retain status.

Pending acceptance (no automated E2E suite run for this change):

1. Standard/manual pricing, Member/administrator access, expiry and corrections
   show the correct next actor. Missing projections do not become completed steps.
2. With one/multiple containers, deliberately select the work target, restore its
   URL after refresh/Back, reject unrelated IDs and offer a deliberate return
   from retired history. Inventory management returns to that Job and container.
3. Add/import/finalize through paginated samples; scan through expanded sample rows across sample pages,
   browse without changing the active target, cancel dirty navigation, and verify
   failed or pending writes preserve their entries and cannot be unmounted.
4. Review/confirm/correct/print and record the selected shipment on the Job. Print
   cancellation retains URL, focus and matches; no print dialog marks physical
   printing complete. When Send has a current insert, **Your next step** directly
   offers **Print shipping insert**. After printing, verify that only explicit
   confirmation that the current insert was printed and placed in its container
   changes that card action to **Record shipment**. Dismissal, print cancellation
   and errors leave it unacknowledged. Reprint stays in Actions. Test both review and active matching in the same sample list; acknowledgement alone must not dispatch or receive
   anything or complete Send.
5. A partial dispatch keeps remaining preparation active while sent shipments,
   actual partial receipt, lab progress and released results appear after send.
   Post-send customer action remains prominent; sent tubes cannot be rescanned.
6. Verify completed/incomplete icons open detail information without navigation;
   only the next-step action opens work. Verify hover, keyboard focus, touch
   disclosure and Escape dismissal. Verify narrow horizontal step scrolling,
   stacked rows, both themes and no page-level horizontal overflow. Verify existing
   standalone shipment/insert bookmarks, Trial and staff receiving paths.
7. In an isolated fixture, retain the acknowledgement across a reload of the same
   browser tab and exact user/organization/shipment/insert revision. Confirm it is
   not inherited in another tab or changed user/organization/shipment scope and
   that a corrected insert revision requires fresh printing/packing acknowledgement.
   Missing identity or unavailable storage must not invent acknowledgement.
8. With multiple containers, require deliberate selection before the direct print
   or record action. Switching the selected container must target its own current
   insert and acknowledgement. No command silently acts on the first remaining
   shipment. Preserve the sole-container selection convenience and existing
   Member/administrator action permissions and pending-operation guards.

Physical/device, dispatch and receipt cases remain in the saved manual test
journey. Do not advance the HS5Y7DB7 checkpoint or create duplicate kit orders,
insert revisions, shipments or receipts merely to satisfy a browser assertion.

## Sample receipt and external shipping history — September 10, 2026

The bounded accepted implementation puts actual per-sample received-tube counts
in finalized Lab Job sample rows, separate from lab status/accession/reason.
Verify the **Receipt: X of N tubes received** line using server-provided counts
across split shipments, without multiplying repeated tube-slot values. Loading
must display **Receipt: Checking…**; unavailable/error counters must display
**Receipt: Not available** rather than imply zero receipt.

Verify the Lab Job no longer duplicates those sample rows under **Sample receipt
progress**, while Trial shipping retains that disclosure. Normal external
shipping panels hide retired configurations; staff history remains available and
record/audit retention is unchanged. Check organization/Department/source isolation
and read-only access together with the unchanged shipment and Job receipt totals.

These are pending browser acceptance checks, not a passing live or synthetic
journey. Do not create another receipt or alter the paused HS5Y7DB7 fixture to
demonstrate them. The saved 18/18 ReadyToShip checkpoint and pending print-cancel
confirmation remain intact. The broader order-progress/checklist and shipping
consolidation discussion remains a plan, not delivered behavior.

## Location inventory browser verification — September 9, 2026

The [revised workflow](TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md) assigns
received location stock through physical container barcodes. The persistent
`transportation-inventory.spec.ts` fixture passed **8/8** cases across desktop
Chromium and Pixel 5. It uses the real location-inventory, shipment, packing and
scanner components with intercepted synthetic APIs on an isolated port.

- Location receipt requires a selection, sends exact kit IDs/versions and an
  idempotency key, and shows Available inventory independently of an origin Job.
- Packing submits the scanned physical container and departure location; a
  conflict and a subsequent inventory-refresh failure preserve the barcode and
  block confirmation. Successful retry opens the prepared container's scanner.
- Members retain assigned-container and sample history without mutation actions.
- Wrong-container tube rejection preserves the entered barcode for correction.

The location screen passed light/dark accessibility checks with no horizontal
overflow. The open packing error/refresh state passed axe checks at both sizes;
screenshots were visually reviewed. No unexpected network requests occurred.
Evidence is under `frontend/test-results/transportation-inventory-*`; reproduce
with `node node_modules/@playwright/test/cli.js test --config playwright.transportation-inventory.config.ts`
from `frontend/`. The first run found only a missing landmark in the synthetic
fixture header; it was corrected before the final 8-case pass.

These browser cases simulate API outcomes. Real concurrency, cancellation,
isolation, reset release and first-scan locking are verified separately in the
backend plan. The connected HS5Y7DB7 walkthrough remains unconsumed after receipt:
one unused TRANS-20 and all 18 tubes awaiting preparation. Resume from the
[run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md) after local
migration/runtime verification; this is not production or physical acceptance.

Staff dispatch and container-barcode dialogs also passed **6/6** bounded browser
cases at 1280×835 light, 390×835 light and 390×550 dark. Validation, saved-address
display, keyboard/Escape and dirty dismissal, fixed actions and overflow checks
passed with zero API writes or page errors. A print-only pagination issue was
fixed; the resulting barcode PDF is exactly one A4 page and its rendered barcode
and readable identifier were visually reviewed. Evidence:
`artifacts/staff-location-inventory-review/review.json`, screenshots and
`container-barcode-render.png`. Disposable staff fixtures/server were removed.
This verifies rendering, not physical label/scanner qualification.

## September 9 production release boundary

Matching API/UI source `11699745825e17f6f16d67be1a678e78ea3b3578` is deployed after
the separately approved location-reservation migration. The
[release record](PORTAL-SHIPPING-RELEASE-2026-09-08.md#september-9-location-inventory-and-shipping-insert-release--completed)
records successful API workflow `34431957400`, promoted UI deployment
`dpl_DzwKyZ5yiw3Zb69B3nBzeF8ZXWGP`, verified encrypted backup/isolated restoration,
API/Portal HTTP 200, database ping HTTP 204, matching prepared/live CSS/JS assets
and empty 15-minute runtime-error/5xx queries. These checks do not complete authenticated or physical acceptance, and
no automated suite was rerun for this release. The existing local walkthrough
remains paused at ReadyToShip, 18/18 matches and insert revision 1, with print
cancellation/recovery, physical output, paging and other variants outstanding.
No local synthetic data was copied to production. Earlier `f06f4530` deployment
evidence remains historical in the same release record.

## September 9 connected walkthrough resume

The latest [run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md#manual-plan-resumed--september-9)
supersedes the receipt checkpoint below: the owner completed 18 synthetic tube
matches, reviewed confirmation for nine samples across 18 tubes, and supplied
a screenshot of the same shipment's post-issuance actions. The owner later
confirmed the document page opens, showing **SP-20260910-TJHAQYMGKQ, revision 1**
for the same 18-tube shipment. Complete document/print review and sample-return
dispatch remain unreported.

The requested shipment-header refinement groups all header actions into one
**Actions** menu when more than one is visible; one stays direct and none renders
no action control. Connected Portal verification confirms the three actions
**Print shipping insert**, **Download tube list (CSV)** and **Record shipment**,
with no standalone replacement entry. Escape closes the menu and restores focus
to Actions. Record shipment opens with Carrier focused; Cancel without entry or
submission returns focus to Actions and preserves ReadyToShip and 18/18 matches.
Zero/one-action states, download behavior, the final print behavior and narrow/theme
coverage remain pending. The change applies to the shared shipment detail page across permitted audiences.
Existing permissions and disabled/pending states must remain intact. No automated
browser suite is added or run for this presentation change. The subsequent
**Actions → Print shipping insert** refinement must preserve the existing
revision and scans; do not record dispatch as part of menu verification.

The owner subsequently reported that **View packet** does nothing; opening the
existing packet was initially an unresolved manual acceptance issue. Source
inspection found that the registered packet child route's parent did not render
its outlet. The owner's later revision-1 screenshot verifies that navigation
correction. A further screenshot
explicitly shows ReadyToShip with a misleading inactive-selection reset reason.
The local explanation correction must retain the disabled reset action while
explaining that a shipping insert has already been issued for the Job. Verify
the corrected reset reason after the fix is active. The CSV action is clarified
to **Download tube list (CSV)**.

The owner later reported the old reset reason remains because the active Visual
Studio API still runs older code. A frontend presentation fallback now targets a
current issued insert with server reset eligibility already false. Verify the
issued-insert reason appears while reset stays disabled; unrelated server reasons
must remain intact. Connected DOM verification now confirms **Containers cannot
be changed because a shipping insert has already been issued for this job.**
on the same shipment URL with 18/18 matches. The backend fix's runtime activation
and excluded-state variants remain separate.

The Product Owner chose to remove standalone **Replace packet**. Verify that the
issued-document manager menu contains **Print shipping insert**, **Download tube
list (CSV)** and **Record shipment**, with only the first two for read-only users.
The final print action must validate the current document before opening the
browser print dialog while leaving the shipment route, page content and scan
state unchanged. Retain same-page retry recovery on validation failure, prevent
stale/void printing and avoid issuing a new revision when reprinting. These checks
are pending; the document-page screenshot is not same-page print or physical print
evidence. Print-dialog cancellation must leave the original shipment available;
refreshing must not open printing automatically. **Print shipping insert** should
allow another attempt without navigating the parent page.
Existing permitted tube corrections retain
automatic corrected revisions and history. Menu verification must not submit a
correction, issue a replacement or record dispatch.

The connected **Actions → Print shipping insert** attempt was followed by a
browser-inspection timeout. A blocking native print dialog is a possible cause,
not verified evidence of the dialog or its contents. The owner is checking
cancellation, the same shipment with 18/18 matches and the print action becoming
available again. Keep this attempt pending manual confirmation; physical output
and complete print review remain unverified. Final scoped ESLint, frontend
TypeScript and a zero-warning/error backend Release build passed; no automated
browser or application suite was run for these final changes.
Subsequent read-only Chrome tab inventory confirms the exact shipment URL is
retained without `/packet` navigation. This is narrow URL-preservation evidence;
dialog contents, scroll and matches after cancellation, and the restored print
action remain pending the owner's report.

Continue from the
[Customer receipt checkpoint](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md#current-checkpoint--september-9-customer-kit-receipt).
For Job HS5Y7DB7 / Request D20018AA, the receipt-validation screenshot displays
**Select the kits that have arrived.** The owner reported selected cancellation
and cleared selection on reopening, followed by successful simulated one-kit
receipt and a POMS refresh. A Customer screenshot shows **Kits received** and
the kit **Received**. Fresh read-only backend verification confirms Request v3,
one requested/sent/received kit, and one unbound available TRANS-20. Receipt
was recorded at **07:47:28 PDT**; the kit is version 5. A later independent staff
screen read still showed its older cached Dispatched state before reload;
explicit reload showed **Received, 1 requested · 1 sent · 1 received**. Refreshed
views agree; automatic cross-browser updates are not established.

The same screenshot still shows the contradictory generic footer **Confirm
which kits have arrived before configuring containers or scanning tubes.**
The fallback is now removed locally: a connected Chrome check on the same
cancelled predecessor found **Kits received** and no stale instruction. The
existing 29 transportation-panel component tests passed. Further preparation
is paused for the location-inventory correction above. Full SHP-08 is not Pass:
partial receipt, replay/idempotent
confirmation, other-stock/Job/location and remaining role/recovery variants
are untested in this connected run. Split shipments remain separate fixtures.
Do not repeat the kit order, dispatch, reconciliation or receipt merely because
the stale footer remains. This local synthetic continuation does not prove
physical delivery, production fixture readiness or deployment; this documentation
update ran no tests or business actions.

## SHP-07-001 dispatch synchronization recovery — September 8, 2026

The already-sent walkthrough kit was reconciled once through the signed-in local
**Update kit request** confirmation. A fresh Request D20018AA detail shows
**Dispatched: 1 requested, 1 sent, 0 received**, with the existing kit and dispatch
facts. Read-only before/after hashes confirm the original dispatch facts and all
20 permanent tube identities/barcodes are preserved. Request-line/location links
are saved, with one dispatch event/notice; receipt and sample-shipment binding
remain unset. See the [run record](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md).
This completes the connected incident recovery only. New direct-dispatch,
missing-request, concurrency and Customer receipt variants remain separately
unexecuted in the connected walkthrough; backend/component passes are not their
physical acceptance evidence.

Seven actual recovery-dialog synthetic browser cases passed desktop/phone,
short-height, light/dark and error presentation, including one original-facts
adapter submission and dismissal without a write. Evidence:
[`kit-request-sync/review.json`](../../artifacts/kit-request-sync/review.json).
The Customer supply changes separately passed 28 actual-component synthetic
browser cases for no-order/cancelled/pending/in-transit/received/partial/unbound
states at 1280 and 390 pixels, light/dark; evidence:
[`job-kit-gating-review/review.json`](../../artifacts/job-kit-gating-review/review.json).
These synthetic cases used no nonlocal requests or real data writes and had no
page errors. Temporary fixtures and the isolated server were removed.

## Required Customer Job kit supply — September 8, 2026

The current Customer sequence is kit order for this Job → Phaeno fulfillment →
Customer receipt → configure containers/scan the same Job's supplied tubes.
There is no **I already have kits** or general-stock bypass. New acceptance
variants in SHP-03/08/09/10 are **Not run**: general stock, legacy unlinked kits,
another Job's received kits and same-location stock must not unlock preparation,
including direct-route/API attempts. Pending/dispatched supply stays unavailable;
partial receipt allows only its acknowledged portion. Verify order/setup/retry
recovery and completion using the actual current-Job request and physical-kit IDs.
After receipt, **Choose shipping containers** appears directly: no separate
**Prepare samples** toggle. Size/quantity choices use received same-Job supply.
An old unbound container route with no active order offers the required order
confirmation instead of bypassing supply. Staff registration alone leaves a
request Pending; **Fulfill request → Record dispatch** supplies it. The kit's
**Record dispatch** entry must also link its matching open Job request and update
both records together. Missing-request rejection and new direct-dispatch
synchronization remain unrun SHP-06/07 connected variants. Reconciliation of the
walkthrough's older already-sent kit, preserving its saved dispatch facts without
a second physical dispatch, was verified in the incident checkpoint above; other variants remain
Not run. Customer receipt remains separate; Trial/Partner workflows stay unchanged.

Trial and Partner flows remain unchanged. Broader cross-Job reuse is deferred.
Earlier fixtures that allowed Customer preparation without a Job kit order are
historical evidence for the preceding behavior, not passes for this restriction.
The subsequent implementation and connected recovery evidence are recorded above.

## SHP-03-001 kit-order error layout — September 8, 2026

Seven synthetic actual-dialog browser cases passed at 688×835, 390×835 and
390×480 in light/dark themes, plus a long specific error. Alert and form bounds
match exactly; no horizontal overflow or unreachable fixed actions was found.
Evidence: `artifacts/kit-order-error-review/review.json`. There were no writes,
nonlocal requests or page errors. Temporary fixtures and the isolated server
were removed. This proves error presentation, not a saved live kit request;
the later connected Customer retry is separately recorded as saved, with a
fresh signed-in Phaeno queue and read-only database corroboration.

## Reset container configuration before scanning — September 8, 2026

Final synthetic detail review passed **6/6 cases** at 1280×835, 390×835 and
390×480 in light/dark themes. **Reset container configuration** appears beside
Shipping container, above scanning. Review verified selector order, an unsaved
scan retained after cancelled navigation, successful subsequent switching, one
synthetic reset POST returning to the pool, a visible scan-history lock, and no
horizontal overflow, browser errors or nonlocal network calls. Evidence:
[`artifacts/container-controls-review/review.json`](../../artifacts/container-controls-review/review.json)
and settled screenshots. These are synthetic component journeys, not signed-in
Customer or physical-shipment acceptance.

Connected acceptance still needs Customer/Partner Lab/Trial role variants,
whole-family before/after evidence and real server concurrency. With usable
same-Job supply, physical-container pages omit the general Transportation kits
ordering card, retaining Kit delivery status/receipt actions for outstanding
delivery and its scanning gates. The later required-Job-order rule adds ordering
recovery for unbound container links without usable supply; the earlier six
synthetic cases do not verify that new variant.

The [SHP-09 reset variant](../testing/11-transportation-kits.md) owns the connected
before/after evidence for the whole family, preserved sample/tube identities,
cancelled shipment history and destination/handling separation. Verify a scan
starting after confirmation opens, and historical scans whose current fields
were cleared: neither permits a reset. The manual status remains Not run despite
the synthetic passes. Use disposable fixtures for destructive-path
testing, preserving the owner's current walkthrough plan.

## Individual shipping-container rows — September 8, 2026

Final synthetic browser review passed **6/6 cases** at 688×835, 390×835 and
390×480 in light/dark themes. Evidence is
[`artifacts/smart-container-review/review.json`](../../artifacts/smart-container-review/review.json).
It verified aligned size/tube controls (0px vertical offset), no overflow,
keyboard focus and the 3/18/30-tube size-selection edges. The Summary grid had
0px pending-to-resolved reflow. An immediate actionable shortfall message adds
52px or 72px depending on viewport; this is not an asynchronous preview jump.
No real Customer write was performed. **Containers to use** retains one editable
row per physical container. In [SHP-09](../testing/11-transportation-kits.md),
review desktop/phone and light/dark layouts, size selectors with SKU/capacity,
compact tube inputs, row-specific Remove names, and keyboard focus after Add
or Remove. Long lists must remain navigable; validation must reveal and focus
the affected row without resetting other entries. There are no manual availability
fields or disclosure; recorded-stock and receipt gates remain automatic.

Exercise 20+10 and six 5s. Three remaining tubes must offer only 5 with sizes
5/10/20; for 30 with 10+5, Add chooses 10 then 5, preserving existing rows' validity.
Add stops when capacity covers the total. Two 20s/15+15 for 30 is no longer a
current editor alternative. Changing/removing one row preserves the others;
**Use recommendation** deliberately rebuilds all rows. Verify one compact Summary
grid, no duplicate breakdown/prose or spacer bands, and an in-grid Updating
indicator while the current preview is pending. Confirmation must await that
preview without hiding the totals. Retain stock, capacity, exact-total and empty-row checks,
dirty dismissal, busy/error recovery, and Customer/Partner/Trial scope. Use
synthetic fixtures for browser checks; any connected physical fulfillment
remains in the guided journey. SHP-09 stays Not run; these six synthetic layout
cases do not prove physical fulfillment or the new Reset container configuration reset.
Earlier screenshots show the preceding editor.

## Delivery-location action layout — September 8, 2026

Signed-in local Phaeno review verified the Main laboratory detail's full-width
address card and page-header Actions menu. Edit location opens the existing
populated modal; Cancel closes it without saving. No address or kit-order write
was performed. This desktop check does not complete the Customer/phone variants
of SHP-02; those remain in the guided walkthrough. Customer-specific helper
copy and unchanged permissions are reflected in the frontend implementation.

## Active transportation-kit acceptance sequence — September 8, 2026

The executable human steps now live in
[11 — Transportation kits and sample shipping](../testing/11-transportation-kits.md)
as **SHP-01–14**, with prerequisites, role handoffs, expected results, negative
variants and cleanup. All new manual cases are **Not run**. This documentation
update runs no application tests or business workflow. Dated checkpoints below
retain historical evidence; their older "next step" and draft-configuration
notes do not supersede the module's current resume instructions.

| Stage | Manual cases | Required connected evidence |
| --- | --- | --- |
| Configuration and destination | SHP-01/02 | Effective 20/10/5-tube definitions; Customer/Department delivery location; save-to-shipment return without ordering. |
| Order and fulfillment handoff | SHP-03–06 | Reviewed included-cost request, one logical order/notice, staff queue, full-capacity registered physical stock. Queue, provider and inbox receipt are distinct. |
| Kit dispatch and Customer receipt | SHP-07/08 | Per-SKU partial dispatch, tracking and provisional On the way counts; only acknowledged kits become available. |
| Packing and identity | SHP-09–11 | Permitted alternatives such as 20+10 or six 5s from this Job's ordered, fulfilled and received kits; residual capacity; exact saved tube scans; branded split-sample manifests. |
| Sample return and Lab intake | SHP-12/13 → LAB-02 | Separate shipment facts per container; current packet comparison; per-tube receipt with correct sample/Job totals and no duplicate accession. |
| Access and recovery | SHP-04/14 | Department/member boundaries, stale/failed retries, duplicate protection, long lists, keyboard/phone/theme behavior. |

Resume HS5Y7DB7 from the latest
[local run entry](../testing/runs/2026-09-08-hs5y7db7-local-walkthrough.md), using
its recorded nine finalized samples and 18 tubes. Kit dispatch is already
reconciled; the one-kit simulated receipt is reported successful and visible
in the Customer screenshot, with backend confirmation pending. Resume container
configuration after the stale footer correction; do not repeat the order,
dispatch or receipt. Use separate 30-tube/split/failure fixtures from
[TEST-DATA.md](../testing/TEST-DATA.md); preserve the accepted quote and finalized
roster. Record observations and stock/request/shipment identities in
[RUN-RECORD.md](../testing/RUN-RECORD.md), rather than promoting prior screenshots
or a synthetic browser result to a live journey pass.

The [backend KIT-B matrix](BACKEND-TEST-PLAN.md#reusable-transportation-kit-scenarios)
and [frontend KIT-F matrix](FRONTEND-TEST-PLAN.md#reusable-transportation-kit-frontend-scenarios)
identify exact current tests and remaining regression gaps. General cross-Job
balances, warehouse reservations, loss/damage corrections and automatic
replenishment are planned scope; they are not implemented acceptance claims.

## Customer transportation-kit ordering and fulfillment — September 8, 2026

At the implementation checkpoint, actual-component browser review passed **48 cases**: 24 Customer cases and 24
staff/location cases, using synthetic records. Coverage spans 1280px desktop and
390px phone widths in light/dark themes, plus short-height staff dialogs. The
Customer cases cover unknown stock, missing delivery locations, multiple
locations without a default, pending orders, in-transit kits and partial receipt.
The staff cases cover the request queue/detail, delivery-location list/detail/
editor, dispatch selection, empty stock and location states. Keyboard review
checks required-field focus, bounded modal scrolling, fixed action footers,
dirty dismissal and quantity limits. Customer axe checks passed; neither suite
recorded live data writes or external calls. Temporary harnesses and servers
were removed, leaving the existing local Portal server running.

Evidence is in `artifacts/transportation-kit-customer-review/review.json` and
`artifacts/kit-request-staff-review/review.json` with settled screenshots. Root
visually reviewed representative phone and desktop captures. After the local
migration/API restart, the signed-in Phaeno Receipt & accession page loaded the
new empty Kit requests queue and retained HS5Y7DB7 with nine expected specimens.
API health returned 200. The Customer session is not exposed to this browser
automation surface; populated signed-in Customer acceptance, mailbox delivery,
and physical kit delivery/receipt remain user walkthrough gates.

The final bounded visibility correction (additional ordering after a completed
request with uncovered tubes, and removal of the empty Customer packing-pool
Return kit card) was checked by the focused component suite and TypeScript/lint.
The browser fixtures were not recreated for that final correction.

## Container-size editor layout — September 8, 2026

Six actual-component cases passed at 688x835, 390x835 and 390x480 in light/dark
themes. All core controls fit the desktop-sized example with optional details
collapsed. Paired inputs align despite wrapped helper text; phones retain a
single column and bounded body scrolling with fixed header/footer. Optional
details can be expanded, and a hidden invalid Supplier field reopens with
focus and its entered value retained. Review also covers dirty Escape and
access to Availability at short heights. Nineteen settled captures and results
are in `artifacts/container-editor-layout-review`; temporary fixtures and the
isolated server were removed. No save or operational write occurred.

Root visually verified the final editor in the signed-in local Portal, then
cancelled the pristine form. The three previously authorized transportation-kit
drafts remain the only configuration records created during this walkthrough.

## Standard containers, stock kits and physical shipments — September 8, 2026

The synthetic checkpoint passed 44 cases: 12 Customer and 32 Phaeno cases.
Actual-component synthetic browser review covers Customer packing, inline tube
scanning and split manifests at 1280/390px in light/dark themes. It verifies a
15 + 15 allocation (historical; superseded in the current editor), rejected scan retention, save-before-advance focus, explicit
other-shipment/unallocated references, and bounded responsive layouts. Phaeno
review covers the catalog and stock lists/details, create/prepare/register/
dispatch/preview modals, dirty Escape, duplicate validation, fixed modal
header/footer at short heights, keyboard scrolling and create-to-detail return.

Evidence lives under `artifacts/sample-shipping-customer-review` and
`artifacts/shipping-container-staff-review`. These fixtures intercept API calls;
they do not prove a signed-in populated API journey or a physical scanner.
No real stock, Customer sample or shipment was created or changed. Manifest
review includes a generated Letter PDF and rendered-page inspection; physical
barcode readability remains an operational acceptance step.

Root also verified the signed-in local Phaeno navigation through **Order
configuration > Sample shipping**, with the real API returning the empty
container catalog and the existing destination/type/rule records. The live
screen exposes **Add container size** and **Preview recommendation** correctly.
This read-only check did not create configuration or stock. The local API
health endpoint returned HTTP 200; the frontend returned HTTP 200 after its
development server was refreshed. These are local checks, not a release.
The signed-in **Lab ops > Receipt & accession** workspace also loaded the
empty Prepare kits list. Entering the walkthrough Job's order barcode
resolved HS5Y7DB7 and SHP-20260908-7437F875A7D as Preparing with no confirmed
manifest; lookup left receipt and custody unchanged. The Portal was returned
to container setup for the next walkthrough.

After the owner separately requested configuration and approved the identifiers,
root used the real signed-in create flow to save TRANS-20, TRANS-10 and TRANS-05
as revision-1 drafts with capacities 20/10/5 and the approved transportation-kit
names. Each save opened its detail page with the expected Draft status, SKU,
capacity and existing RNA/receiving compatibility. Return-to-list showed exactly
three sizes in display order. No activation, physical stock creation or Customer
shipment change was performed. This authorized configuration evidence is
separate from the earlier read-only and synthetic checks.

The final branded two-tube manifest fits one Letter page. A 26-tube manifest
with three samples spans three pages; physical tube rows keep their barcode
and caption together, include the sample ID, and repeat packet/shipment
identification in each page footer. Rendered pages were visually inspected.

The local migration independently preserved the walkthrough Job's exact nine
samples and 18 tubes; before/after snapshots are byte-identical. Continue the
populated walkthrough only after Phaeno supplies actual supported container
SKUs, common names, capacities and compatible packing requirements. Customer
location balances, reservations and automatic kit-shortage fulfillment remain
the additional planning scope, not claims of current end-to-end acceptance.

## Finalization review sorting and completion — September 8, 2026

Eight final actual-component cases passed: a mixed six-sample/13-tube roster
and a long 36-sample/70-tube roster, each at 1280/390px in light/dark themes.
The review preserves accepted source order, naturally sorts IDs such as TEST-1,
TEST-2 and TEST-10, shows exact group/overall counts and tube quantities, and
does not reorder the input data. No-PHI confirmation still gates finalization
and resets on reopen; Cancel/Escape restore the opener without a save.

The first long-list review found off-screen initial checkbox focus. Focusing
the visible summary inside the scroll body corrected it. All eight final cases
verified initial scrollTop zero and visible focus, PageDown scrolling, Tab
bringing the checkbox into view, fixed header/footer and usable actions at
480px viewport height. No horizontal overflow, browser errors, API adapter
calls, network attempts or real writes occurred. Temporary fixtures and the
server on port 3153 were removed. Evidence is in
`artifacts/sample-finalize-review/review.json` and 16 final screenshots;
`initial-long-390-light.png` is a
pre-fix diagnostic, not final evidence.

The owner's Firefox screenshot independently confirms the approved 9-sample/
18-tube grouped review. After the owner finalized, a guarded read-only query
of local HS5Y7DB7 confirmed nine unique records/IDs, exact 1/5/3 source counts,
18 tubes, finalized timestamp 3:53:25 PM PDT and Preparing shipment
SHP-20260908-7437F875A7D with nine items and 18 unassigned tube slots. No return
kit has been registered and no shipping/receipt dates are set. Phaeno kit
preparation and the resulting user-facing shipment walkthrough remain next.

## Grouped samples, completion and bounded scrolling — September 8, 2026

The final actual-component browser review passed 24 synthetic cases, with
55 captures and `review-final.json` under `artifacts/sample-source-capacity-review`.
Empty, partial, excess and complete rosters ran at 1280px and 390px in both
themes. Read-only long details, long group names, an incorrect 9-of-9 source
mix and a 36-row roster received focused desktop/light and phone/dark checks.

Verified + Add placement beside each group count, full-group blocking,
inherited Add source with no source control, source-capacity edit recovery,
populated-list Import disabling with visible help, available CSV template,
group and overall completion icons only for exact counts, retained excess and
unmatched rows, accessible pencil/trash labels/tooltips, and keyboard/focus/
dirty/busy behavior. The bounded scroll region supports End/Home navigation,
keeps opaque group bands sticky and leaves overall controls and shipment
content outside. No horizontal overflow or browser errors occurred.

One intercepted in-memory save was held/rejected to examine busy behavior;
there were no real network operations or persisted writes. Root visually
reviewed representative desktop/phone and long-roster captures. The temporary
fixture files and review server on port 3152 were removed. Browser proof is
synthetic; the owner's Firefox screenshots remain separate manual evidence.

## Compact sample rows, icons and Expected status — September 8, 2026

Sixteen synthetic cases checked editable/read-only rows at 1280/390/360/320px
in light/dark themes using the actual Lab Job grid and samples panel. Ordinary
desktop rows fit on one line; narrow screens wrap as needed. Long sample IDs,
sources, accession details and customer-visible reasons remain readable.
Keyboard/hover tooltips identify the sample; pencil opens the right sample,
Cancel restores focus, and cancelling the named removal confirmation makes no
API call. Singular/plural tube labels and role-based action visibility passed.

The owner then approved hiding Expected before finalization. Twenty-four
additional cases checked that final state across the same widths/themes:
preparing Expected hidden, finalized Expected visible, and Received visible
before finalization. Root reviewed final desktop/phone captures under
`artifacts/sample-list-row-review`; `review-final-status.json` and `final-*`
images supersede the earlier normal-row Expected screenshots. No overflow,
runtime errors, API attempts or real mutations occurred. Disposable fixtures
and port 3151 were removed. The owner's saved TEST-001 remains the only observed
real sample in the guided walkthrough, and Edit sample is the next manual step.

## Sample entry layout and discard protection — September 8, 2026

The owner's Firefox screenshots confirm HS5Y7DB7 quote revision 1 was accepted
at USD900 pre-tax and individual sample entry became available at 0 of 9.
Opening Add sample exposed the layout issue addressed in this checkpoint.

Final synthetic browser review of the actual `LabSampleDialog` passed 20 cases:
Add with multiple sources, Add with one source, populated Edit, three field
errors, and a long single source, each at 1280/390px in light/dark. Every case
also ran at a short viewport (420px desktop / 480px phone height), producing
40 screenshots under `artifacts/lab-sample-layout-review` plus `review.json`.
Checks covered single-column alignment, compact tube input, default/edit
values, single-source context, validation focus, keyboard source selection,
dirty-discard cancellation/confirmation and restored opener focus. Header and
footer remain fixed while the body scrolls. No overflow, browser errors, API
attempts or real sample saves occurred. Root reviewed representative desktop,
phone and short-height error captures; the disposable fixture and port 3150
server were removed.

The first synthetic run discovered that dirty dismissal did not ask before
discarding values. Subscribing to dirty state during render corrected it;
all final browser cases and four focused component regressions passed. The
owner's next Firefox step is to refresh and reopen Add sample before entering
the first test sample. Sample creation/finalization remains unverified manually.

## Quote decline reason dropdown — September 8, 2026

Four synthetic browser cases passed with the actual `LabQuoteDeclineDialog`
at 1280/390px in light/dark themes. The available installed Playwright runtime
was used because agent-browser was unavailable. Checks covered the initial
blank selection, native keyboard selection, Other's conditional required field,
validation focus, hidden-text retention, trapped dialog focus, cancelled and
confirmed dirty discard, focus restoration, and canonical serialized values.
There were no browser errors, horizontal overflow, or external/API requests.
All submissions used a synthetic callback; no real quote was declined.

Twenty captures and `review.json` are retained in
`artifacts/quote-decline-reason-review`; root reviewed desktop blank, mobile
Other validation and dark Other-filled layouts. The disposable fixture and
port 3149 server were removed. Owner Firefox acceptance remains the next
guided step: choose Other and inspect the required multiline field without
submitting a real decline.

## Quote expiration and extension review — September 8, 2026

Synthetic browser review exercised the actual Customer Job detail and Phaeno
commercial controls through in-memory HTTP responses: 20 scenarios across five
states, desktop/phone widths (1280/390), and light/dark themes. Checks covered
expired and pending states, Member guidance, valid acceptance, extension and
reissue dialogs, keyboard focus/trapping/Escape/return focus, dirty values,
mobile pricing scroll and fixed-footer clearance. No horizontal overflow or
browser errors were observed, and no real Clerk, API or email operation ran.
Screenshots and `review.json` are in `artifacts/quote-extension-review`.
The temporary fixture and isolated port 3142 server were removed.

Those captures precede the final action-row grouping. A separate synthetic
review used the shared Button/Card components and actual row markup at seven
widths (320–1440px). All three actions fit at 1280px and above; the download
wraps below the decision actions on narrower cards, with no overflow or browser
errors. Root visually reviewed desktop and phone captures under the same
artifact folder (`final-actions-*`). These captures precede the approved
Withdraw-to-Decline wording refinement, covered by focused component checks.
Live Firefox acceptance of
expiration/request/reissue is still pending. Do not modify HS5Y7DB7's actual
October 4 expiration merely to simulate expiry in the guided walkthrough.

## Guided quote download checkpoint — September 8, 2026

The owner's Firefox walkthrough confirmed ordinary Member access to Lab services
and job HS5Y7DB7, with quote revision 1, 9 specimens at USD100 each, and a USD900
pre-tax total. The original **Download quote** returned the internal JSON object.
The authorized local correction replaces it with a branded **Download quote PDF**.
The owner saw the new retryable error while the old API was still running;
that is not successful PDF acceptance. Focused component/HTTP and PostgreSQL
checks cover the download contract separately. Resume with the same button after
the local API restart and verify the downloaded file in Firefox; no quote
acceptance, order mutation, or fresh invitation is required for this step.

The owner's subsequent Firefox screenshot confirms that the branded PDF opens
with Johns Hopkins University, General, HS5Y7DB7, revision 1, and the expected
9 x USD100 = USD900 pre-tax price. Download/render acceptance is now observed.
The owner requested a follow-up to balance PDF spacing; its visual approval is
the next checkpoint before resuming the request-revision snapshot test.

## Account menu and dashboard polish — September 8, 2026

The existing `home.spec.ts` scenario **keeps workspace navigation concise and
groups the user menu** passed on desktop Chromium and mobile Chrome (2 cases)
on the isolated mock server at port 3108. It covers navigation placement,
radio selection, keyboard traversal, focus distinction, Escape, and background
scroll locking. Desktop screenshots confirmed the updated identity hierarchy,
grouped display controls and neutral session-exit row. No real account action
was taken. The owner's Firefox screenshots independently confirmed dashboard
entry and the ordinary member menu; the resized two-card layout was approved,
with a follow-up to strengthen the bottom outline.

Final synthetic Customer verification rendered the actual Header, UserMenu and
DashboardPage with preseeded summaries and no Clerk or API requests. At 1280px,
two equal 566x179px cards fill the row; at 390px, both cards are 358px wide and
stacked. Desktop/phone light/dark screenshots verified the complete semantic
card outline, the separate wrapping mobile organization row, and a long menu
email within the viewport. No horizontal overflow or browser errors occurred.
The temporary fixture and isolated server were removed. Screenshots and the
geometry report remain under artifacts/user-menu-dashboard-polish. This proves
presentation only; the live owner walkthrough remains the account evidence.

## Owner Firefox acceptance — September 8, 2026

The owner completed sign-in in Firefox, resumed the saved invitation with
**Continue invitation**, reviewed Joe Blow's fixed identity, and selected
**Accept invitation**. The resulting header showed Johns Hopkins University
and General; the administrator's Company People view independently confirmed
**Portal active**, the linked Contact/Portal user, and General access.

The confirmation page incorrectly changed to **Open your invitation email**
when session refresh selected the initial organization and department. A local
fix preserves invitation completion across that transition. Automated provider
regression evidence is separate from a fresh Firefox replay of the corrected
confirmation, which remains unverified; Joe's accepted invitation must not be
reissued merely to repeat this check. Dashboard entry is the next guided step.
The earlier post-sign-in access-gate detour remains an observed follow-up.

## Invitation acceptance UX checkpoint — September 8, 2026

Local browser verification used a temporary Alex Review invitation and Clerk's
reserved `+clerk_test` email address. The branded page loads recipient and
organization before sign-in, removes the token from the visible URL, and goes
directly from Continue to the verification-code field with no editable email.
The temporary record is separate from Joe Blow's pending owner walkthrough.
The temporary local invitation was deleted after verification; no Portal user
or membership was created for it. The test did not complete password/MFA setup.
No real email delivery or organization membership was requested by this check.
The owner observed the subsequent new-password prompt: current Clerk
development settings require password and authenticator setup for new accounts,
while ordinary sign-in uses email codes. Removing the password requirement is
a separate product decision. The owner chose to keep it and clarified first-time
copy: **Create your password**, with a **Password** field. **New password** is
reserved for a reset. No provider settings changed in this checkpoint.

Desktop presentation and 390px reflow were checked (390px page, 358px card,
no horizontal overflow); keyboard progression and visible focus were inspected.
No browser console errors were observed. Focused component tests cover existing
account, first-time transfer, wrong-account and failure paths. Full real-account
password/MFA completion was outside this synthetic check. The later owner
acceptance checkpoint above supersedes the previously pending invitation step.
No broad E2E suite, deployment, or migration was run.

## Mailgun invitation walkthrough — September 8, 2026

The owner confirmed receipt of Joe Blow's local Portal invitation after adding
the development network to Mailgun's IP allowlist. Sending never grants access;
the invitation was pending at this earlier checkpoint. The
legacy Portal delivery label incorrectly remains Not sent after provider
acceptance; this display defect is not a failed-send signal and is a follow-up.
Domain-template consolidation and automatic unsubscribe-footer removal were
verified through Mailgun readback. The rebuilt local API sent the branded domain
template at 11:06 AM Pacific; Mailgun accepted and delivered events were verified
for the exact provider message ID, and the invitation remained Pending.
Mailgun message-body retrieval is disabled for this domain; that privacy setting
was preserved. Branded-email inbox appearance is a separate owner checkpoint
from the original email receipt. No broad Playwright suite was run.

Invitation readiness follow-up: signed-in desktop verification confirmed General unchecked immediately shows the required-Department explanation and disables Send invitation. The fixed footer remains intact; General is left unchecked for user review. Automated checks cover re-enabling valid selections. No invitation was sent.

## Invitation clarity — September 8, 2026

Visually verified the signed-in local Invite Joe Blow to Portal dialog: recipient name/email/Company summary, Access after acceptance, explained role choices, compact Department spacing and indented administrator option. Restored Member plus General with Department administrator unchecked. No invitation sent. Mobile acceptance and actual invitation receipt remain unverified.


## CRM outreach decisions — September 8, 2026

Manual CRM-01 now includes outreach evidence, invalid inputs, legacy values,
directory/detail/export/history, email changes, and suppression after merge.
These populated acceptance variants remain Not run. The guided ACC-01 session
is paused at Joe Blow's unsaved email edit. Local signed-in recovery and the new
editor were visually verified at the user's desktop size; the email draft was
restored with outreach Not established without saving the business record or
sending an invitation. Automated form and transactional database checks are recorded in
the frontend/backend plans. External outreach delivery is not implemented;
physical receipt and enforcement at future enqueue/dispatch remain unverified.

## Manual major-workflow companion — September 8, 2026

The [major-workflow acceptance pack](../testing/README.md) now provides 74 human-run
scripts (the original 60 plus SHP-01–14), reusable role/data prerequisites, connected journey sequences, expected
results, cleanup/handoffs and a [run record](../testing/RUN-RECORD.md).
The [owning plan](MAJOR-WORKFLOW-ACCEPTANCE-PLAN.md) distinguishes connected
application, intercepted browser, provider, destination receipt, physical bench
and restore evidence. All new manual cases start Not run. No Playwright tests or
business workflows were executed, and existing automated results remain unchanged.

## Configured Lab and Partner Kit journeys — 2026-09-08

The permanent isolated bundle fixture exercises Customer and Partner standard final-price review/placement/sample handoff, purchased Kit case preparation with interrupted-upload recovery and same-case resubmission, offering version configuration, and staff timing/deadline dialogs. Five journeys passed on desktop and mobile (10 cases), including keyboard-accessible controls, Axe checks, no horizontal overflow, no page errors and rejection of unexpected API requests. This is populated browser evidence using intercepted synthetic responses, not Clerk sign-in, production transactions, scientific-provider receipt or physical Lab acceptance. The owning [completion plan](PORTAL-OPERATIONAL-COMPLETION-2026-09-08.md) records separate persistence and release gates.

The illustrated Word guide contains 32 pages, 17 screenshots and three tables. All pages were visually reviewed after rendering. Six new screenshots cover offering configuration, final-price commitment, timing changes, purchased cases and included input preparation; narrower recaptures preserve print readability. Synthetic images are labeled. This verifies document presentation and navigation, not production workflow acceptance.

## Portal completion browser and document checkpoint — 2026-09-07

A temporary local fixture used the actual Trial detail/scope components with synthetic API responses and rejected all unrelated requests. Desktop and narrow-layout browser review confirmed partial Save draft, shared last-editor/time, Resume draft with retained values, busy-state controls, and preservation of approval-requested status without creating a proposed approval scope. Empty numeric input remains empty instead of becoming zero. No browser console errors were observed. No production API/business request was made.

Evidence: `artifacts/portal-completion-20260907/trial-draft-controls.png` and `trial-draft-mobile.png`. The fixture files, server and review tab were removed and the temporary browser viewport was reset. This is synthetic component/browser evidence; the full Playwright suite, connected multi-role Trial/CRM/Finance journeys and target storage/scanner acceptance were not run at this checkpoint.

The updated `docs/Phaeno-POMS-Order-to-Cash-Guide.docx` contains 26 pages and 11 screenshots, including the new Trial save/resume controls. All final pages were visually reviewed. The ten prior screenshots and three tables were retained. This is document presentation verification, not production workflow acceptance.

## Intake consolidation - 2026-09-07

Updated the Order operations sidebar expectation to exclude Order staging. Old orderSection=staging resolves to Intake. Synthetic browser review covers blocked versus pricing-ready Customers, department switching, later quote/invoice requirements, failure recovery, and narrow layouts. Connected order creation remains unverified; no real orders were submitted.

## Trial dialog choice scrolling - 2026-09-07

Updated the existing Trial request Escape scenario to locate portaled choices at page scope and verify input focus with arrow navigation. The list must be outside the dialog DOM subtree. The automated suite was not run. A temporary synthetic fixture with 40 users verified desktop/light and 390x600 dark layout, one active scroll area, arrow-key scroll visibility, filtering, pointer selection, blank-note save, first Escape, focus return, and Tab between fields. A resize-observer warning reproduced while resizing an open list; animation-frame positioning resolved it, and a clean desktop-to-phone resize reported no window errors. Live assignment was not exercised; the temporary fixture was removed.

## Optional Trial assignment note - 2026-09-07

A temporary local synthetic fixture verified the actual Assign primary approver dialog labels Note (optional), submits an empty reason value, closes after success, and returns focus to Assign primary. No live authority was assigned and no automated suite ran. The fixture was removed after review.

## Trial list local browser review - 2026-09-07

Reviewed actual components with a temporary synthetic local fixture, without a
real session or business submissions. Desktop/light and 390-pixel phone/light and
dark review confirmed aligned labeled controls and no phone horizontal overflow.
Confirmed the active Order ops menu and Trial sidebar selection, navigation to
Order intake and back, search/status/owner selection, distinct empty states,
Clear all resetting filters and focusing Search, narrow sidebar Escape, and Start
Trial dialog open/Escape with focus restored to its invoking button. The narrow
sidebar tab has clearance above the page heading.

An initial fixture-only Order configuration response mismatch was corrected before
navigation review; it was not a production API finding. Automated Playwright suites,
populated list/detail journeys, signed-in API acceptance and deployment remain
unrun for this presentation slice. Temporary fixture files are removed after review.

## Hosted signed-in acceptance and CRM corrections — 2026-09-05

The signed-in production session on release `541c875` exercised all three Web
Operations tabs using the keyboard, with one panel visible at a time. The live
queue was Running with queued/sending/failed `0/0/0`; opening Pause review and
cancelling preserved that state and returned focus. This did not exercise an
actual pause/resume transition.

The user explicitly approved one test technical brief for intake `54194c95` to
`bhaack@cadexgenomics.com`. It recorded staff-requested first-attempt provider
acceptance, and the queue returned to `0/0/0`. The user's received email and
independent Spark destination Inbox message `87697` confirm receipt at
`16:43 PDT / 23:43 UTC`, with minute precision. The exact email link returned a
valid PDF. Its three-page length conflicts with the email's two-page description;
that external Mailgun-template finding remains open. Detailed byte/hash evidence
is in the closure plan. This single approved delivery does not establish every
recipient or notification path. Evidence is retained in
`artifacts/review-gap-closure/acceptance-email-proof.json`.

Existing CRM Company list/detail, People, empty Sales and applied onboarding
request views loaded. The session exposed association-selector Escape dismissal
and misleading Edit Company access copy. Their local corrections passed eight
focused component tests, scoped lint, typecheck and production build. Trial list
and Start Trial
had no Trials/eligible requests; the empty selector preserved its form on first
Escape and Cancel worked. Configuration showed three default deliverables and no
displayed approval authorities. Order intake had no eligible Customers or active
work, so accepted Trial, quote, sample/shipping and Trial-download workflows were
not exercised. External alert routing and production pause/recovery remain
separate acceptance work. The public Website was not promoted.

The narrow Portal correction is now deployed as
`dpl_D272h4HEkZGM7NmTeS94sFNYzvCx` (READY), alias `portal.phaenobiotech.com`,
exact source `505c9eb350426e78e8949b67b766fe4a7872c6fd`. A fresh signed-in
Company Edit showed the corrected wording. In Associate Contact with empty
results, first Escape closed choices while retaining the modal and focusing
Contact. Repeating the action with a temporary Job title draft preserved it;
second Escape dismissed the dialog, and no association was submitted. Portal
root, Portal API-proxy health and direct API health each returned **200**; the
browser warning/error log was empty. These are hosted checks of the reported fixes,
not populated scientific/commercial workflow acceptance. The API remains at
`541c875`. A bounded 50-entry server error query for the new UI deployment since
creation at `2026-09-05T23:54:33Z` returned zero entries; this does not establish
the absence of every runtime error. Evidence in `artifacts/review-gap-closure/`:
`acceptance-ui-final.json`, `acceptance-crm-production-check.json`,
`acceptance-final-health.json`, `acceptance-ui-runtime-summary.json` and the empty
`acceptance-ui-runtime-errors.jsonl`.

## Combined API/Portal release checkpoint — 2026-09-05

The Product Owner authorized a combined commit/push and production API/Portal
release with the bounded parent-tab correction. The browser fixture now mounts
the actual Web Operations parent around the delivery panel. Both existing
recovery journeys exercise mailing/demo/email switching and ArrowRight tab
selection; one also switches away and back after successful recovery. Integrated
single-panel visibility, keyboard and responsive/accessibility checks now pass.
This replaces the isolated-panel composition that missed the original gap.

The release browser checkpoint passed **18 distinct cases** across an initial
17/18 run and a 1/1 desktop pause/resume rerun. Its initial Axe failure observed
a button's disabled-to-enabled opacity transition. The test now waits for the
enabled state and actual CSS animation completion before scanning; no fixed
sleep, source color change or rule suppression was added. Rerun evidence is in
`artifacts/review-gap-closure/release-processing-recheck`. This targeted rerun is
part of the 18-case set, not another distinct case. Earlier browser results
remain historical checkpoints below.

Final desktop/light and mobile/dark Web Operations screenshots were visually
reviewed. They show the third Email delivery tab, one selected panel, clean
label/count wrapping and no horizontal overflow.

Local verification was complete at this pre-deployment checkpoint; migration
approval and production deployment outcomes were not yet recorded then. The
closure plan records the subsequent release identity, health and signed-in
acceptance evidence. The hosted follow-up above records the later observations
and remaining gates. Local synthetic
browser responses do not prove hosted authorization, real email acceptance or
inbox delivery, external alert routing, or real Trial/storage transfers. The
separate public Website is not being promoted under this request.

## Option-focused Escape correction and release review — 2026-09-05

Six distinct focused Trial cases passed across desktop Chromium and mobile
Chrome: sample recovery, exact Company handoff, and the new create-dialog keyboard
journey. The latter uses real Tab focus on an option: first Escape closes choices
and restores the input without losing the selected request or invoking discard;
second Escape reaches the existing dirty-discard confirmation. It also checks
ArrowDown/Enter, pointer selection, declined and confirmed discard, no submission,
and no page errors. Mobile uses dark mode and reduced motion; dialog Axe scans
passed. The initial new test missed the existing count label's final period;
after correcting that test selector, both new cases passed.

This validates the bounded keyboard correction using synthetic API responses.
It did not independently assemble or validate a release artifact. At that review
checkpoint, Website email release was held until its parent Web Operations tabs
matched the documented selectable Email delivery panel. Integrated tab/keyboard/
responsive coverage was deferred with the correction; the earlier tests mounted
the email panel alone and could not establish parent composition. The current
combined-release checkpoint above tracks the subsequent correction and checks.

## Follow-up: review gap closure and Website processing controls — 2026-09-05

All **14 distinct targeted Trial/WebOps browser cases** passed across the
follow-up runs. The initial run passed 12/14: all four WebOps cases passed, while
two Trial sample-reload cases exposed a keyboard-scroll accessibility gap with
disabled inputs. After adding named focus targets available only while busy, the
affected sample-reload and pause-controls journeys passed **4/4** across desktop
and mobile. This rerun includes Tab/PageDown access to the sample scroll region
and Axe checks while busy. These four cases overlap the 14-case set and are not
additional distinct cases. The earlier review checkpoint remains recorded below.

The WebOps journey exercises pause and resume with queued work retained, required
reason entry, stale-version recovery with the exact reason preserved, delayed
reload with editing and dismissal blocked, explicit interrupted labels, active
sending counts, and failed/expired attention filtering with queued rows excluded.
The fixture includes separate failed and interrupted records, and asserts that
interrupted attempts are excluded from Sending. It verifies the submitted
versions/reasons, keyboard behavior, page errors, overflow, and Axe WCAG
2/2.1/2.2 AA checks in the relevant busy, recovered, and paused states. The existing
recipient/resend/history journey remains part of the four-case WebOps set.

The Trial follow-up targets preserved sample entries and scope state through
failed reloads, busy states, and renewed acceptance. Browser responses and contact
identities are synthetic; backend tests separately exercise actual local
PostgreSQL admission, pause, and retirement races. No shared deployment,
production identity, real email, or provider-delivery result is claimed. Automated
accessibility checks supplement keyboard/reflow review and are not a full
conformance claim. External alert collection and routing are not exercised by
these browser fixtures and remain separate deployment checks.

## Review gap closure — 2026-09-05

The Trial suite exercises acceptance and atomic two-row intake with conflict
recovery, dirty Cancel/navigation, changed-scope terms with failed reload and
renewed acceptance, superseded/closed result controls and parsed transfer errors,
and exact Company request handoff beyond configuration choices. It runs in
desktop Chromium and mobile Chrome, with dark/reduced-motion mobile coverage.
All ten Trial cases passed after restricting a test URL matcher to API paths so
it could not intercept source imports. Subsequent focused roster and handoff
checks passed 2/2 each after label and cache/navigation refinements.
`web-ops-recovery.spec.ts` passed in both viewports, including exact recipient
review, stale-version recovery, attempt history and focus return. Fourteen
synthetic public Website scenarios (six preserved-entry failures and one success
per viewport) passed using the actual built contact form. The browser found a
dark-theme delivery badge contrast issue; the scoped status styling was corrected
and its Axe check passed. `crm-company-recovery.spec.ts` passed **2/2** against
the live People/Sales components, verifying independent people/contact/opportunity
retry, no false empty records, guarded association and keyboard recovery. Its
desktop and mobile screenshots were inspected; no writes, page errors, overflow
or Axe violations occurred. These suites total **14 distinct Portal browser cases**.

The local Portal passed agent-browser startup, meaningful-content, screenshot and
page-error checks using the installed Chromium executable. Trial desktop scope
and mobile detail screenshots were inspected for spacing, readable required
fields and overflow. Workflow Axe WCAG 2/2.1/2.2 AA scans supplement keyboard and
responsive checks; they are not a full conformance or hosted acceptance claim.
All browser API responses and contact identities are synthetic. No real inquiry,
email, production file transfer or identity-provider operation is exercised.

## Portal documentation search — 2026-09-05

All 14 relevant Playwright cases passed across desktop Chromium and mobile Chrome:
the existing four documentation journeys plus three search journeys per viewport.
`documentation-search.spec.ts` verifies the dedicated endpoint and context headers,
corpus fingerprint, no audience override or Website requests, debounced input and
focus preservation, metadata filter counts, safe text highlighting, rendered
heading anchors, browser-back search/filter restoration, topic browsing, no-match
versus outage, retry, refresh and one-character suppression.

Desktop/light and mobile/dark screenshots were inspected. Checks passed for
horizontal overflow, focus, reduced motion, framework overlays/page errors, and
Axe WCAG 2/2.1/2.2 AA rules on the changed main workflow. The mobile sidebar tab
initially overlapped the search label; the label now reserves that space. Initial
hydration/context changes also briefly disable the input to prevent lost typing.
The skill's agent-browser CLI was unavailable; the installed repository Playwright
runtime performed browser verification. API response fixtures were synthetic;
separate backend tests exercise the real index and HTTP controller.

Hosted authenticated Clerk/org admission, real production volumes/restarts,
production latency/load and human assistive-technology acceptance remain release
checks. Automated accessibility scans are not a full conformance claim.

## General retention notice acceptance (2026-09-05)

No browser suite was rerun for this backend/help-prose slice. Before shared
activation, verify actual Customer Lab and Partner Assembly notice links open
their current authenticated workflow, all current Organization admins receive
notices, Department-only and inactive members do not, and provider failure/retry
is recoverable through Retention notices and the notification workspace. Verify
both processing families independently and expired final-claim recovery. Local
synthetic sender/concurrency checks do not prove mailbox or hosted acceptance.


## General Lab release rendering (2026-09-05)

`managed-retention.spec.ts` passes desktop/light and mobile/dark for the real Lab
release component rendered with synthetic release data. Checks cover visible
standard/grace/cutoff states, file and ZIP disabled after closure, keyboard focus,
long filenames without horizontal overflow, Axe WCAG checks, no console/overlay
errors, and inspected screenshots. Playwright uses the repository runtime; the
browser-verification skill CLI was unavailable. This does not claim full Assembly
page rendering, authenticated hosted execution, real provider delivery, or shared
configuration. Add both real Lab/Assembly file/ZIP paths and cross-instance ZIP
revocation to the signed-in staging acceptance run before activation.


## Commit-time retention acceptance (2026-09-05)

Actual delayed COMMIT behavior now has local independent-connection controller/
PostgreSQL proof for standard/final cutoff, recovery, and rollback. No browser
suite was rerun for this backend-only slice. Hosted acceptance must confirm commit
tracking before enabling governed results, process/database restart and failover
recovery, current authorized result pages, and transfer behavior through the real
proxy/storage path. Existing signed-in Organization/Department gates remain open.


## Durable retention acceptance boundary (2026-09-04)

The added recovery-queue option is covered by a focused component test; no new
browser suite was run for this single selector addition. Previous rendered
retention/Department fixtures remain local evidence. Independent database
connections plus a real MVC response now verify a blocked stream stops on
revocation; this does not substitute for a hosted browser/proxy/storage journey.

Pending signed-in staging checks: Organization admin versus two distinct
Department admins; warning and grace links opening current authorized package
state; missing-recipient recovery through Retention notices and notification
retry; withdrawal/deactivation during a large transfer; interrupted delivery and
expired-claim retry; exact commit/deadline ordering; and provider/storage evidence.
Approved staging URLs and an available two-department test organization were
requested. Do not mark these checks passed from synthetic sessions or local tests.


## Governed retention reconciliation (2026-09-04)

`governed-retention.spec.ts` passed for desktop/light and mobile/dark. The
browser-only fixture renders the actual governed result component with standard,
completed-during-grace, and closed states. Both available states retain download
actions; closed state removes them. Keyboard focus, Axe WCAG 2.2 AA checks, no
horizontal overflow/error overlay/console errors, and screenshots were verified.
This is rendered contract proof, not signed-in Clerk, real transfer, or storage
provider acceptance. Those hosted gates and automatic notices remain open.


## Secondary department paths checkpoint (2026-09-04)

`department-history.spec.ts` passed twice: desktop/light and mobile/dark. The real
Data Library component renders current Department-admin history, sends the
selected Department header, clears old rows while the next response is delayed,
and hides history after admin rights are removed. Axe WCAG 2.2 AA checks found no
violations; screenshots were inspected, no horizontal overflow/error overlay or
browser console errors were present. These use the browser-only
`e2e/fixtures/department-history.*` entry and intercepted synthetic API responses;
no Clerk session or real provider is used. The initial fixture intercepted source
module paths as API calls; narrowed interception to the API URL prefix and both
cases passed. This complements 68 backend and 13 focused frontend tests; it does
not close hosted signed-in two-department/identity acceptance.


## Department administration closeout checkpoint (2026-09-04)

- New `department-self-service.spec.ts`: eight desktop/mobile instances cover
  assigned-Department admin settings/member access without a tenant-wide people
  query or Organization-default access, Organization admin structure controls,
  explicit invitation intent and dirty dismissal, and Organization-default
  conflict recovery preserving inputs until deliberate resubmission.
- Existing `people-departments.spec.ts`: four desktop/mobile instances passed
  for Company People/Sales separation, invitation intent, settings/conflicts,
  focus restoration, and Department lifecycle review. Twelve distinct cases
  passed across the focused runs; this was not the full Portal E2E suite.
- Axe WCAG 2.2 AA checks ran on the affected settled dialogs. One initial scan
  caught a button's disabled-to-enabled color transition; the helper now waits
  for finite animations, and the complete new eight-case suite passed again.
  Inspected desktop/light and mobile/dark screenshots, body scrolling, fixed
  footer, no horizontal overflow, and focus restoration.
- The actual `/departments` page ran with the existing mock session and API
  fixtures. The legacy invitation panel uses a test-only HTML/TSX fixture since
  its production route rejects mock authentication. No real invitation was sent.
  Browser evidence does not replace signed-in multi-tenant staging acceptance.


## Website UI polish checkpoint (2026-09-04)

Follow-up on 2026-09-07: 20 focused local Chromium checks verified the
Clear-Signal Architecture anchor-spacing correction at 1540/768/390/320px.
Click, refresh, direct heading URL, section URL, and keyboard activation with
reduced motion preserve panel offsets and zero internal scroll, with no page
overflow or JavaScript errors. Desktop/phone screenshots were reviewed.
No automated suite was added or run. After authorized Website deployment
`dpl_DgmU8XF3biL7Cx8FuoFUywaDSyUC`, the same 20 checks passed on the public
domain, both aliases were verified, and error/5xx scans returned no entries.
See `WEBSITE-CLARITY-AND-POLISH-PLAN.md` and ignored
`tmp/website-anchor/` for evidence.

Focused local inspection covered the homepage at 1280px, 390px, and 320px;
comparison expansion/collapse and keyboard focus; contact required markers
and empty-form errors; the real technical-brief checkbox; white-paper part
labels/filtering; long banner titles; empty Blog navigation; and `mailto:`
links. Checks passed without sending a valid form. No new automated suite or
full Portal E2E run was needed for this bounded Website change.
JavaScript-disabled browser verification, real delivery, and full accessibility
certification remain unperformed. The owner subsequently authorized commit,
push, Website/API deployment, and needed EF migrations. Local evidence and
release verification requirements are in `WEBSITE-UI-POLISH-PLAN.md`.

Keep this file updated as Playwright e2e tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

The internal Lab Operations journey is implemented in the application but its
database-backed browser proof remains deferred below. Feature completion does
not satisfy this production-activation gate.

Public Website PDF-backed publication search has focused backend coverage and
static Website build verification. Browser proof remains intentionally deferred
until an authorized Website/API release because acceptance requires the
deployed landing page, Vercel PDF headers, durable scheduled index rebuild, and
public search endpoint together. That future proof must cover desktop and
narrow landing layouts, abstract and PDF-only queries returning one landing
result, the `Match in linked PDF` source label, rejection of ordinary-page
hidden-metadata-only matches, result navigation, and the PDF action opening the
derived asset.

Private team Preview search browser proof is also deferred until its authorized
API and Vercel Preview deployments. That proof must show Vercel Authentication
denying an anonymous visitor, an authenticated team member searching newly
available Media content through the same-origin proxy, direct API denial
without the proxy key, Preview-origin result navigation, and unchanged
production search results.

Arabic Website browser proof is authorized for the protected Preview deployment
as of 2026-08-07. Automated generated-HTML parity now covers all 19 route pairs,
including RTL document metadata, core semantic structures, minimum translated
content coverage, and the corrected home-page source alignment. Deployed proof must
cover direct `/ar` deep links, `lang="ar"` and `dir="rtl"`, desktop and narrow
navigation, keyboard/focus behavior, browser-language suggestion and dismissal,
stored explicit preference, equivalent-route switching, Arabic form labels and
validation, English-PDF disclosure, reciprocal alternates, Arabic-only search
results, bidirectional scientific text, zoom, reduced motion, and unchanged
English URLs and behavior.

Spanish, Simplified Chinese, Japanese, German (Germany), Italian, and French
now have complete protected-Preview route sets and generated-HTML parity
coverage. Their browser proof remains deferred and must include native-language
copy review, CJK and long-German line breaking, responsive navigation and
all three localized blog articles, locale-scoped listings and feeds,
same-article language switching, localized series navigation,
language-picker fit, keyboard/focus behavior, locale-isolated search, and
unchanged English production output before any locale is published.
Local browser regression checks on 2026-08-08 cover the multi-omics
introduction at 1392 px for Spanish, French, German, Italian, and Japanese:
the headline and copy columns do not overlap, and the principle-card heading
and paragraph remain contained. Spanish also stacks at 1024 px without
horizontal overflow. This is component-level evidence only and does not replace
the protected deployed-Preview acceptance above.

## Created Tests

- [x] `frontend/e2e/people-departments.spec.ts` - desktop/light and mobile/dark
  Department forms: unchanged-save prevention, inline validation, preserved
  entries/latest version after 409, focus restoration, dirty-close confirmation,
  lifecycle confirmation, People/Sales separation, and explicit invitation
  department payload. Dialog scans found no WCAG A/AA axe violations and no
  viewport overflow. These use mocked HTTP responses, not signed-in acceptance.
  Together with `crm.spec.ts`, all 10 desktop/mobile cases passed on 2026-09-04.
- [ ] Multi-Department signed-in acceptance must create two Departments and
  differently assigned users, then prove that detail pages, lists, search,
  counts, exports, downloads, audit views, and notifications do not disclose
  the other Department. It must also cover Organization-admin all-Department
  access, Department-scoped service entitlements and curated-data grants,
  default General continuity, explicit Contact/User linking, and the People/
  Sales Company navigation on desktop and narrow layouts.
- [x] The existing CRM navigation scenario now expects **People** while keeping
  the `/crm/contacts` route compatible. It was updated but not executed on
  2026-09-04 because test execution was not requested.

- [ ] `frontend/e2e/pseq-order-to-cash.spec.ts` - dedicated-staging-only
  acceptance for CRM/account handoff, internal staging before administrator,
  invitation delivery/acceptance, derived readiness, quote/acceptance, sample
  intake and Lab execution, governed package/scientific approval/release and
  Customer download, job completion/invoice, receipt/import/allocation,
  independent reconciliation, and Paid. The same journey must cover bounce,
  failed QC, rejected specimen, correction/withdrawal, notification outage,
  duplicate commands, partial payment, overpayment, reversal, and
  reconciliation mismatch on desktop and narrow layouts with Axe, keyboard,
  focus, zoom/reflow, and explicit loading/empty/blocked/stale/failure states.
  The executable operator checklist is
  `scripts/acceptance/pseq-order-to-cash-staging.ps1`; no dedicated staging
  environment or cross-functional signoff is available in this local task.
- [x] `scripts/acceptance/pseq-order-to-cash-staging.ps1` - executable
  operator checklist for the approved happy path, exception matrix, evidence
  capture, and Commercial/Lab Operations/Scientific/Finance/security/
  accessibility signoffs. Local parsing passed; execution remains
  dedicated-staging-only.

- [x] `frontend/e2e/home.spec.ts` - internal Phaeno context uses POMS in the
  browser title, header, and dashboard while external organization context uses
  Portal; both contexts retain the Phaeno Inc. legal footer and omit framework
  vendor promotion; the POMS dashboard exposes a keyboard-operable
  viewport-edge sidebar for Order Operations, Lab Operations, Customer access, and
  Web Operations mock intake with a two-button selector showing one
  mailing-list or demo-request panel at a time, independent page-size-10 footer
  pagination, no persistence controls on mock records, and one dashboard
  section visible at a time while external contexts omit it. External context
  instead shows its role-appropriate organization workflow cards, labels
  connected summaries as paused in mock-session mode, and never renders the
  internal Customer access metrics. Customer context keeps Data Library and Lab
  services as separate starting points while omitting a peer sample-shipping
  card because shipping is part of each lab job.
- [x] `frontend/e2e/home.spec.ts` - desktop keeps frequent workspace routes in
  the toolbar, while Documentation and Data provisioning appear under Resources
  in the user dropdown on desktop and mobile;
  desktop and mobile omit the retired Portal Accounts destination and expose
  the remaining grouped administration/resources in the user menu,
  and the three display choices share one compact row directly
  after user identification with a raised selected surface distinct
  from active navigation and a separate focus-ring treatment;
  the user menu omits organization-context search and act-as controls, Arrow
  Up/Down traverses the remaining menu items, Escape closes the menu, and the
  open menu locks background scrolling.
- [x] `frontend/e2e/documentation.spec.ts` - Prospect, Customer, Partner, and
  Phaeno guide journeys enter through the single Documentation user-menu item
  using the keyboard, without a toolbar duplicate, before checking their existing
  audience-specific content and cross-audience denial on desktop and mobile.

September 9 navigation update: these existing scenarios were revised for the
Documentation menu placement. Browser tests were not run for this change, per
the repository's requested-checks policy.

- [x] `frontend/e2e/home.spec.ts` - shared modal dialogs lock background page
  scrolling and restore it when closed.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Phaeno mock context exposes the
  source registry, curated catalog, organization-grant, and governance surfaces
  through the pinned wide-screen rail or accessible edge tab on narrow screens.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Prospect mock context exposes
  the Data Library without exposing connected data in mock mode.
- [x] `frontend/e2e/order-management.spec.ts` - Customer mock context exposes
  laboratory services; Request lab service opens the bounded Job details modal
  with required Job name, shared-versus-mixed biological-source choice, storage
  requirements, and safety declaration plus optional Job notes, without
  embedding per-sample fields; outside clicks do not dismiss it, and connected
  creation remains clearly paused in mock-session mode.
- [x] `frontend/e2e/order-management.spec.ts` - Partner mock context exposes
  reagent ordering and data assembly.
- [x] `frontend/e2e/order-management.spec.ts` - Phaeno mock context exposes
  Commercial Order intake, one Orders list, and Accounting through the pinned
  wide-screen rail or accessible edge tab on narrow screens; PSeq Lab Service,
  PSeq Kit, and Data Assembly appear as order types rather than peer modules;
  Order Operations exposes the bounded `New Customer order` modal with Customer
  selection, Job pricing-profile fields, and a disabled connected save in mock
  mode; Order
  Configuration uses the same rail for Defaults, Catalog, Analyses, PSeq kits,
  Assembly, and Credit instead of an in-page tab row.
- [x] `frontend/e2e/documentation.spec.ts` - Prospect, Customer, and Partner
  contexts are offered their own guide set, Phaeno is offered only Phaeno
  guides, the sidebar omits redundant audience controls and headings, every
  topic has an icon, CRM, Data Provisioning, Order Ops, and Lab Ops expose one
  keyboard-operable accordion subtopic level that auto-opens for the active
  guide and keeps only one subject expanded, cross-audience routes are denied
  for every context, and substantive MDX content renders on guide routes.
- [ ] `frontend/e2e/customers.spec.ts` - update desktop and mobile coverage for
  the CRM Portal-access review queue and Company-embedded access administration.
  Confirm there is one Company identity, no standalone account creation, and accessible
  consequence dialogs for access,
  membership, and entitlement lifecycle actions; focus returns to the invoking
  control, ended entitlements retain their reason, and the entitlement source
  selector excludes an approved onboarding request that did not request the
  selected service. Confirm an existing non-ended entitlement can be edited to
  Ready with an eligible approved source request without creating an
  overlapping record. Serious and critical Axe violations are checked in the
  dialogs.

## Manual Acceptance Evidence

- 2026-07-15: a real-Clerk local browser journey proved manual request review,
  creation and readiness persistence, designated-administrator invitation,
  Prospect-to-Customer conversion with the organization identifier preserved,
  association and application of the original request, and one usable PSeq Lab
  Service entitlement. The rollback-only PostgreSQL reference journey now also
  automates the service-source and entitlement-end integrity rules; the full
  authenticated HTTP/browser journey remains deferred.
- 2026-07-16: a rollback-isolated controller/PostgreSQL journey passed the
  database-backed Lab workflow from accepted Customer quote through assigned
  roles, accession, protocol execution, resources, library/batch/sendout,
  exception resolution, scientific approval, customer-safe projection, and
  proof of no file publication. Barcode completion additionally proved
  automatic submitted/derived identifiers, normalized exact lookup, reasoned
  initial/reprint/failure history, and duplicate-safe scan-first batch entry.
  This is API/controller/database evidence; it does not exercise Clerk
  middleware, HTTP hosting, a real browser, or physical hardware.

## Deferred Tests

- [ ] Real-Clerk authentication policy journey - verify the Phaeno-branded,
  invite-only sign-in surface without Clerk vendor branding in the paid
  instance; password recovery; required authenticator-app enrollment for a new
  and an existing invited user; one-time backup-code display and sign-in; no SMS
  option; incomplete MFA setup remaining outside Portal navigation and APIs;
  and Phaeno-admin reset, active-session revocation, and required re-enrollment
  when both authenticator and backup codes are lost.
- [ ] Clerk Production cutover acceptance - verify the production frontend and
  API use the same production instance, Preview remains on development, the
  prior development session no longer grants production access, the relinked
  bootstrap administrator reaches a ready POMS session, MFA and backup-code
  policy are active, and the browser emits no development-key warning.
- [ ] Local-development invitation shortcut - create a fresh sign-in link from
  an authorized external-account invitation, copy it into a private browser,
  create a first-time Clerk development identity with the exact invited email,
  accept the invitation, and verify that the account membership becomes active.
  Verify that Clerk returns to `/accept-invite` after account verification rather
  than entering the application before Portal acceptance has completed. If the
  user reaches the access gate first, verify **Continue invitation** resumes the
  stored invitation.
  Start once with a different Clerk account already signed in and verify the
  page identifies that email, explains the mismatch, signs out without losing
  the invitation, and continues with the invited identity. Confirm that the
  development shortcut control and endpoint are absent from Production.
- [x] First-party CRM Company create boundary journey - on desktop and narrow
  layouts, cover the shared grouped CRM sidebar and its route-backed subjects,
  current-section identity, list rendering, the no-access-yet warning, accessible
  create dialog with optional details collapsed, Website-derived domain,
  normalized create payload, detail navigation, and proof that Company creation
  makes no Portal write. Confirm card-scoped actions remain
  compact and right-aligned with their title row on Company, Lead, and
  Opportunity detail workspaces. Confirm Company detail separates Overview,
  People, Sales, Requests, Departments & services, and Activity. Confirm the
  Company request entry point uses outcome-aware progressive disclosure,
  suppresses redundant request-type controls, and links pending history to the
  central Requests review queue while Opportunity order handoffs remain in the
  Opportunity workspace. Maintained in
  `frontend/e2e/crm.spec.ts`.
- [ ] Remaining first-party CRM Company journey - cover search, view, edit,
  deactivate, reactivate, tabbed Company navigation, embedded online-access
  administration without duplicate request decisions, central request review,
  and submitting the searchable requested-products-and-services multi-select,
  plus the documented effects each lifecycle action has on access,
  entitlements, and work.
- [ ] Remaining first-party CRM journey - cover Contact, incremental Company
  and Contact association search, Company-specific title/role and effective
  dates, equivalent relationship editing from both record workspaces, Lead,
  qualification,
  Opportunity, configurable Pipeline/Stage, Activity, Note, Task, reminder,
  ownership, search, table/board views, reporting, duplicate review/merge,
  import/export boundaries, authorization, field visibility, and scientific/
  protected-data exclusion across desktop and narrow layouts.
- [ ] CRM-to-Portal lifecycle journey - cover a Company with no Portal access,
  approved evaluation that enables Prospect access, won Opportunity to pending
  direct Customer/Partner onboarding, designated-admin invitation, selective
  Partner services, Trial Project and custom-work handoffs, existing-
  organization service change, Customer/Partner reclassification, pending
  offboarding, idempotent replay, retry, and relationship-safe summary
  reconciliation without creating access or executable work from intake alone.
- [ ] Direct/custom sales and CRM visibility journey - cover configured-price
  Customer and Partner specimen placement, Partner reagent and assembly sales,
  ineligible work routed to Sales, won Opportunity operational handoff, one CRM
  sale summary per commitment with payment summary, no routine Opportunity, no
  scientific or downstream-customer data in CRM, and two-tenant isolation.
- [ ] Released-deliverable retention journeys - cover the global 30/5/5
  defaults, authorized Customer/Partner/Prospect organization override and
  partial inheritance, release-time effective-policy snapshot, and a later
  default or override change affecting only future releases; exact 24-hour UTC
  calculations without midnight rounding across a daylight-saving boundary;
  labelled browser-local display with UTC fallback; and local plus UTC values
  in the PDF. Prove the all-
  downloaded path has no warning and closes access plus queues package-byte
  deletion at the standard deadline; the partially or never-downloaded path
  sends the advance warning to all active organization administrators, activates
  and announces the full grace period at the standard deadline, and closes
  access plus queues atomic package-byte deletion at the final deadline;
  download authorization closes at the exact applicable deadline even when
  asynchronous byte deletion is delayed or fails, Operations receives the
  failure, and the receipt preserves both timestamps; a file and complete-
  archive transfer started under valid pre-cutoff authorization may finish
  within its bounded timeout and counts only after successful completion while
  every request whose lease would commit exactly at/after cutoff, including a
  new, retry, range-resume, or archive request, is denied; partial file/archive,
  failed, cancelled, disconnected, timed-out, and restart-abandoned streams do
  not count or gain resume authority; an incomplete standard-deadline lease
  activates grace despite later completion; deletion waits for all simultaneous
  eligible leases only until they complete or reach their unchanged original
  expiries, without reopening access or changing grace/final dates; a lease-
  duration configuration change affects only newly issued leases; the receipt
  preserves lease start/completion/outcome and
  identifies a post-cutoff success as pre-cutoff authorized; emergency
  quarantine, withdrawal/correction, membership deactivation, and organization
  deactivation each stop a matching active response stream, record a non-
  counting revoked attempt, expose only a tenant-safe access-ended state, and
  cannot recall bytes already delivered; concurrent completion/revocation uses
  the first durable terminal transition rather than client time, and restored
  access allows only a fresh pre-deadline request; a complete archive counts
  every file while individual downloads count only their files; one
  authorized member's download satisfies the
  organization without requiring every member to download, and a later
  membership change preserves that history; a grace-period download does not
  shorten grace; holds preserve bytes without extending access or resetting the
  clock/notices, and releasing an overdue hold immediately queues deletion; no
  active administrator produces urgent
  Phaeno Operations work without changing a deadline; warning and grace links
  require sign-in and current tenant authorization at the package page and never
  grant direct file access; exactly two scheduled emails are possible with no
  daily reminders; delayed processing suppresses a stale warning before outbox
  creation, while an already-queued message remains and opens current state;
  the pre-grace warning clears after complete download while activated grace
  remains visible through deletion; a correction immediately withdraws the old
  package and creates a new release with a fresh effective-policy snapshot,
  full clock, independent download tracking and notices while old-package bytes
  follow their prior policy/hold; deletion exposes no customer restore action;
  an authorized regeneration, when source material exists, creates a new linked
  immutable reissue with fresh policy/dates/download state while the deleted
  release remains unchanged; and metadata, notification, download, and deletion
  history remain after bytes are unavailable, including a permanent tenant-safe
  receipt with member-level download details for organization administrators,
  status-only visibility for ordinary members, prohibited-field exclusion, and
  matching Portal/PDF facts with generation time and represented state, no CSV
  receipt action, sample-scoped non-PHI Customer-ID/original-tube-barcode/
  accession mapping, complete included-sample lists for combined files, no
  derived-container leakage, and two-tenant denial across Trial, Customer, and
  Partner flows.
- [ ] Prospect Trial Project journey - cover a commercial-only CRM-originated
  request, POMS-owned scientific scoping, relationship-safe CRM milestones
  and deep link, commercial and scientific/operations approval using default and
  delegated coverage, delegate revocation and wrong-domain denial, actual
  approver and authority-source audit, rejection when one dual-authorized user attempts both
  approvals, successful two-person approval for initial and amended scope
  versions, both decisions remaining required, Prospect invitation and
  acceptance of versioned RUO/no-PHI terms, shipment-confirmation affirmation,
  non-PHI sample identifiers, prominent RUO result labeling, prohibited-data
  rejection or restricted quarantine without propagation followed by authorized
  disposition, bounded sample submission through the project's approved
  extracted-RNA sample allowance,
  over-allowance and wrong-type
  denial, eligible destination and detailed-instruction resolution, Phaeno
  return-kit preparation with an exact registered-tube inventory, Prospect
  tube-to-sample assignment/correction and retained CSV, printable frozen
  shipment packet/crosswalk and barcode, Phaeno packet-plus-tube comparison
  scan without implicit receipt, matched receipt/accession that adopts the
  permanent supplier barcode without a second label, derived-container POMS
  label verification, an approved replacement linked to the original sample,
  exactly one restored slot after a Phaeno-caused processing failure, no
  automatic restored slot for a Prospect-supplied sample problem, and an
  explicit Phaeno exception path that does not rewrite the frozen allowance,
  the configurable 30-day residual-material default and a project override,
  frozen destruction versus pre-first-shipment return with identified shipping
  payer, post-shipment return denial, retain-until work without automatic
  disposition, operator-confirmed destruction or separate tracked return, and
  no reuse without separate written authorization,
  Phaeno processing, configurable FASTQ/FASTA/BAM default selection, exact
  deliverable/version snapshot at approval, a later configuration change that
  affects only future projects, and amendment/reapproval for changing an
  approved project's deliverables,
  the effective global-plus-Prospect-organization retention policy beginning
  only with release of the project's complete frozen package and no project-
  level override, POMS `Completed`
  versus reason-required `Closed incomplete`, final Customer conversion,
  Partner conversion, and closed-without-conversion CRM outcomes,
  nonterminal follow-up with an owner and date, explicit Customer or Partner
  conversion without an automatic transition or a reset or extension of the
  frozen Trial package deletion dates, byte deletion with preserved project and
  audit history, continued organization access for a non-converting Prospect,
  blocked deactivation while another active Trial Project, grant, or commercial
  relationship exists, explicit audited Phaeno closeout deactivation, normal-
  order denial before conversion, retained POMS estimated retail value and
  anticipated internal cost, no QuickBooks transaction or payment gate even
  during a QuickBooks outage, and two-tenant isolation for project metadata,
  samples, files, and results.
- [ ] Customer promotional freebie and shared shipping journey - cover a named
  Customer's one-time no-charge placement, zero amount due without a payment
  gate, the same return-kit/tube-crosswalk/packet/comparison-scan/Lab-adoption
  path, multiple active destinations, compatible multi-type grouping,
  mandatory incompatible split shipments, immutable reprint/replacement
  behavior, and two-tenant non-discovery.
- [ ] Database-backed organization and user administration journey - verify
  Phaeno and external administrator scope, invitation delivery and acceptance,
  unified active and pending-invitation user cards, accessible action menus,
  required invited names, invitation-time Phaeno role intent with no pre-accept
  access, atomic role activation on acceptance, resend/revoke, role and
  membership lifecycle, omission of administrative self-deactivation actions,
  direct API self-deactivation denial, Prospect conversion with stable
  identity, readiness, internal access-scope creation limited to eligible
  Company approvals, CRM Company/Portal-access review separation, removal of an
  associated approved request from the review queue, atomic first-party CRM
  approval, stranded approved-request access-scope recovery, access-enable
  ordering authorization default-on and explicit opt-out with the
  resulting entitlement state, Customer new-Job blocking when authorization
  is absent, Phaeno eligible-Customer filtering and pricing initiation without
  an active administrator, quote-issuance blocking until an approver is active,
  quote-recipient fanout, and
  workspace request completion, and details-page navigation,
  Phaeno-controlled designated-contact invitation and membership management,
  consolidated Phaeno profile, Platform administrator, and additive
  laboratory-role editing on one durable User management record rather than a
  separate Lab access panel or the Lab Operations sidebar,
  other pre-organization request association, action-dialog close behavior,
  service-entitlement boundaries, global disable/reactivation, refresh
  persistence, and cross-tenant denial.
- [ ] Database-backed Web Operations lifecycle journey - verify platform-admin
  authorization, unsubscribe and demo-completion confirmations, pending and
  durable error feedback, actor/time audit persistence, immediate count and
  page refresh, removal from active queues after reload, retained original
  Website intake, and external/non-admin denial.
- [ ] Automated WCAG AA accessibility check on the dashboard.
- [ ] Mobile primary navigation moves into the user menu.
- [ ] Source-sample draft discard - verify destructive confirmation, required
  reason, managed-file cleanup, registry return, and stale-version conflict
  through the authenticated browser/API path.
- [ ] Database-backed synthetic reference journey - upload, ready, snapshot,
  publish, eligibility, explicit Prospect grant, tenant list/detail, file and
  archive download, download history, cross-tenant denial, and revocation. The
  controller/PostgreSQL journey now passes; this remaining item is the full
  browser, Clerk authentication middleware, and HTTP API-host path.
- [ ] Database-backed advanced provisioning and governance journey - exact
  version upgrade, retirement with preserved access, catalog removal, optional
  creation grant, quarantine denial, unchanged clearance, unsafe withdrawal,
  administrator notice/activity, and tenant attestation.
- [ ] Database-backed order-management journeys - execute the approved Customer
  admin/member, Partner admin/member, Prospect denial, Phaeno operations,
  payment hold, manual accounting report, two-tenant isolation, keyboard, and narrow
  viewport scenarios through real authentication and API persistence. Include
  required and duplicate Job-name validation, required storage and safety
  persistence, biological-source composition with derived sample total,
  duplicate-source validation, optional Job-notes persistence, generated
  eight-character Job-number, fixed modal save feedback, concurrency refresh
  with preserved entries, pricing submission with no sample records, and
  post-acceptance manual and CSV sample-list preparation. Include a Phaeno user
  working sales handoffs, pricing, and quotes from one **Order intake** queue
  without a product-named `Lab` section, then following accepted authorized
  work into **Lab Operations** rather than operating receipt or execution from
  Order Operations. Include distinct Customer-list loading, failure/retry,
  genuine-empty, and ready
  states; initiating a Customer-owned Job with and without a proposed USD unit
  price; finding that proposal in the intake queue; reviewing it beside the
  catalog price, scope, difference, and subtotal; approving it unchanged or
  amending it only with an internal reason; enforcing proposer/reviewer dual
  control when enabled; issuing the immediate POMS quote with
  the visible canonical `pseq-lab-service`/`specimen` line and exact committed
  quantity; proving a Finance-approved billing profile includes and freezes tax
  in the quote while an incomplete profile produces an explicitly pre-tax quote
  and defers tax until invoicing; switching to that Customer; accepting as an organization
  administrator; and proving that neither Phaeno initiation nor quote issuance
  creates samples or Lab work. Prove Customer and Phaeno order actions require
  an effective, `Ready` PSeq Lab Service entitlement and active offering; an
  ended entitlement blocks a new Job without cancelling an accepted one; quote
  preparation sends no Customer notice; quote issue/revision reaches all active
  eligible administrators and is blocked when none exists; the accepting
  administrator receives later ordinary notices; and high-impact fan-out stays
  organization-wide. Confirm an unexpected pre-acceptance package cannot enter
  the Job receipt or Lab-authorization journey. Include an interrupted
  notification claim that becomes recoverable after its lease without repeating
  the underlying order transition.
- [ ] Database-backed Lab Operations journey - accept a Customer quote, prove
  the visible Lab Operations **Receipt & accession** queue and commercial-order
  handoff to the already-linked
  work order, then prove the already-passing controller/PostgreSQL workflow
  through real Clerk
  authentication, the hosted HTTP API, and a browser. Include equipment
  registration with no manual asset-code input, full-width name entry,
  type/location selectors with focused missing-value creation, and date-only
  last-calibration/due-date validation. The controller/database
  portion already proves atomic Lab authorization, additive Lab roles,
  receipt/accession, barcode allocation/scan/print-outcome history,
  PSeq kit fulfillment and Data Assembly manufacturing through the Lab API
  aliases without exposing those mutations in the Order Ops UI,
  system-assigned protocol/library/batch identifiers, named batches with a
  system-owned External sequencing type, structured protocol
  authoring from editable protocol name/description and immutable protocol key
  through ordered steps, typed captures,
  resources, QC gates, draft creation and resume, parallel-candidate rejection,
  discard history with discarded-only protocols omitted from the working list,
  approval withdrawal, controlled-definition cloning, approval
  and Production promotion through the canonical marketed-service workflow;
  ordered Required/Optional/Conditional stages; exact workflow, stage, and
  protocol version pinning; prior-Required-stage gating; Production protocol
  immutability; and controlled execution with material identity,
  supplier/storage references, date-only expiration/retest, structured
  prepared-reagent component lineage, QC-approved material and calibrated
  equipment, scan-first library batching with status filtering and transition
  timestamp modal capture, sendout/custody, exception resolution, scientific approval, the
  Customer-safe projection, and no file publication at Ready for release.
  Physical printer/scanner qualification remains a manual bench gate.
- [ ] Released-package completion-aware download journey - through authenticated
  Customer and Partner sessions, download one full file and one full-package
  ZIP, confirm package/file state refresh, interrupt a transfer and confirm it
  remains undownloaded, allow a synthetic short lease to expire, and prove a
  different tenant cannot discover or download the release. Retention warnings,
  cutoff, and byte deletion remain outside this journey until their worker is
  implemented.

## Requested Execution Log

- 2026-08-29: the PSeq order-to-cash dedicated-staging operator script parsed
  without errors. It was not executed because this task had no authorized
  dedicated-staging environment, configured providers, authenticated roles, or
  cross-functional signoff participants. No production browser or data was
  touched.
- 2026-07-18: a live authenticated browser review verified the material-lot QC
  workflow without recording a decision. Pending rows show `QC: Pending` and
  one `Record QC` action. The modal identifies the lot, defaults the required QC
  date to today, prevents future picker dates, explains Pass and Fail outcomes,
  and reveals a required failure reason only for Fail QC. Empty failure
  validation cleared as the reason was entered, Cancel restored focus to the
  invoking row action, the refreshed migration-aware API loaded successfully,
  and no browser errors were produced. The Playwright suite was not requested
  or run.
- 2026-07-18: a live authenticated browser review verified clearer list
  hierarchy in the Lab Operations Protocols and Materials sections. Each
  section title, description, and create action now occupy a muted header band
  with a divider; protocol and material records render as separately bordered
  rows on the content surface. The distinction remained visible in light and
  dark themes, actions stayed associated with the correct record, and no
  browser errors were produced. The Playwright suite was not requested or run.
- 2026-07-18: a live authenticated browser review verified the redesigned
  material-lot form without submitting data. Supplier lots expose controlled
  material, supplier, and storage selections with related-record modal creation,
  omit manual material-key entry, and use a date-only expiration/retest field.
  Supplier and storage selectors span the form width. Prepared reagents hide
  supplier, expose structured component-lot rows, and explain when no
  QC-approved source lot is available. New material, supplier, and storage
  names are collected in a focused modal and returned as the selected option in
  the parent form without submitting data. The parent dialog stayed within a
  390-pixel viewport with no horizontal overflow, and the desktop related-record
  modal review produced no browser errors. The Playwright suite was not
  requested or run.
- 2026-07-18: a live authenticated browser review verified the open-candidate
  protocol lifecycle without changing data: Draft v1 exposed Continue editing,
  omitted Add version, restored the saved structured definition, and blocked a
  direct new-version URL. The history-preserving discard confirmation opened
  and was cancelled. The Protocols surface had no horizontal overflow at 390
  pixels and produced no browser errors. The Playwright suite was not requested
  or run.
- 2026-07-18: a live authenticated browser review covered the structured
  protocol-version builder on desktop and at 390 pixels, including blank-form
  validation, loading the three-step example, inspecting generated JSON,
  confirming the discard-changes dialog, and returning to the addressable
  Protocols section. No draft was persisted. The database-backed approval and
  activation journey remains deferred, and Playwright tests were not requested
  or run.
- 2026-07-18: a local production preview reached the expected
  authentication-not-configured boundary because the preview had no Clerk
  publishable key; the active port-3000 development listener returned an empty
  response. The connected protocol, library, and batch dialogs therefore
  remain covered by the deferred authenticated Lab Operations browser journey.
  Playwright tests were not requested and were not run.
- 2026-07-17: the POMS home scenario was updated for the shared dashboard
  sidebar and Web Operations mock intake. A live in-app browser review verified
  the desktop and 390-pixel layouts, sidebar selection, visible counts, bounded
  Mailing List and Demo Requests panels, and zero browser console errors. The
  Playwright suite was not executed because E2E execution was not separately
  requested.
- 2026-07-17: the Phaeno Order Operations mock scenario now requires the PSeq
  kits sidebar label. The Playwright suite was not executed because E2E
  execution was not separately requested.
- 2026-07-17: the Phaeno Order Configuration mock scenario was extended to
  require the five shared-sidebar subjects and Defaults as the initial active
  selection. The Playwright suite was not executed because E2E execution was
  not separately requested.
- 2026-08-18: the registered supplier-tube workflow was implemented and its
  browser coverage plan was expanded. The completion pass ran the existing
  mock-session Playwright suite on an isolated port with the required test-only
  session setting: all 30 desktop/mobile tests passed. This suite verifies the
  surrounding responsive/navigation baseline; it does not substantiate the
  still-unimplemented authenticated Trial Project or Customer promotional
  shipping journey, nor physical tube/shipper/scanner acceptance.
- 2026-07-16: the barcode software slice passed its full 41-test frontend
  regression suite and 113-test backend/database suite. No mock Playwright
  scenario can substantiate an authenticated hosted scan or physical
  printer/scanner outcome, so the database-backed browser and hardware
  journeys remain explicitly deferred above.
- 2026-07-16: the home scenario was updated for the shared `Copyright © [year]
  Phaeno Inc.` footer, the temporary support/policy placeholder, and removal of
  framework/vendor promotion. A live browser check confirmed the rendered
  footer; the Playwright suite was not executed because E2E execution was not
  requested.
- 2026-07-16: the Accounts scenarios were updated for the HubSpot-originated
  intake posture, explicit disconnected state, external-account-only directory,
  and removal of direct account/manual request entry points from the standard
  list and detail pages. The Playwright suite was not executed because E2E
  execution was not requested.
- 2026-07-16: the home and account-administration scenarios were updated for
  the Accounts menu/page label and to prove that the internal Phaeno
  organization is absent from the external-account directory. The Playwright
  suite was not executed because E2E execution was not requested.
- 2026-07-16: the home scenario was updated to prove that the user menu omits
  organization-context search and act-as controls while preserving keyboard
  traversal, Escape dismissal, and scroll locking. A live Phaeno mock-session
  browser check confirmed the simplified menu and scroll restoration. The
  Playwright suite was not executed because E2E execution was not requested.
- 2026-07-16: the POMS home scenario was updated for the mock Order Operations /
  Lab Operations / Accounts panel selector, single-panel visibility, and
  external-context omission. The Playwright suite was not executed because E2E
  execution was not requested.
- 2026-07-16: the home scenario was updated for POMS in the Phaeno context and
  Portal in external contexts. A live mock-session browser check verified the
  title, header, dashboard, and footer while switching from Phaeno to a
  Customer organization; the Playwright suite was not executed because E2E
  execution was not requested.
- 2026-07-16: Phaeno documentation topic groups were changed to an accordion
  that collapses the open subject when another subject expands. The browser
  scenario now covers the transition. The suite was not executed because E2E
  execution was not requested.
- 2026-07-16: Phaeno documentation scenarios were updated for expandable Data
  Provisioning, Order Ops, and Lab Ops subtopics with independently routed guide
  pages. The suite was not executed because E2E execution was not requested.
- 2026-07-16: Documentation scenarios were updated for automatic
  current-organization audience filtering and topic icons. The suite was not
  executed because E2E execution was not requested.
- 2026-08-22: add a connected Customer administrator journey that submits a
  100-sample Job pricing profile without sample records, accepts the issued
  price, downloads and previews a CSV, atomically confirms the roster,
  finalizes only after exact count/source compliance, and matches registered
  barcodes across repeated `Tube N of N` crosswalk rows. Also assert members
  remain view-only, pre-acceptance sample/API attempts are rejected, the first
  immutable submission revision is inserted successfully, and a genuine stale
  submission reloads the latest Job and requires reconfirmation. E2E execution
  was not requested and was not run.
- 2026-07-16: Data provisioning, Order operations, and Documentation scenarios
  were updated for the shared pinned/edge sidebar on desktop and narrow
  layouts. The suite was not executed because E2E execution was not requested.
- 2026-07-16: Lab Operations browser scenarios and their production-activation
  gates were added to this plan. E2E execution was not requested and was not
  run for the completion slice.
- 2026-07-16: the first clean-baseline run inherited the developer's real-Clerk
  local setting (`VITE_USE_MOCK_SESSION=false`) and correctly failed the suite's
  mock-session precondition. The test-only rerun used
  `VITE_USE_MOCK_SESSION=true` and `PLAYWRIGHT_PORT=3100`; all 28 desktop/mobile
  Chromium scenarios passed. The pre-existing `AcceptInvitePage` route-export
  warning remains unchanged.
- 2026-07-15: portal hardening verification ran `PLAYWRIGHT_PORT=3100 pnpm
  run test:e2e`; all 28 desktop/mobile Chromium scenarios passed. The connected
  organization cases exercised keyboard activation, focus return, narrow
  layout, light/dark themes, and serious/critical Axe checks. The pre-existing
  `AcceptInvitePage` route-export warning remains unchanged.
- 2026-07-14: documentation verification ran `PLAYWRIGHT_PORT=3100 pnpm run
  test:e2e -- documentation.spec.ts`; all 8 desktop/mobile Chromium scenarios
  passed. A separate Playwright gut-check loaded the Customer help landing page
  with meaningful content, 11 links, no Vite error overlay, and no console or
  page errors. The pre-existing `AcceptInvitePage` route-export warning remains
  unchanged.
- 2026-07-14: order-management implementation verification ran
  `PLAYWRIGHT_PORT=3100 pnpm run test:e2e`; all 12 desktop/mobile Chromium tests
  passed. A separate Playwright gut-check loaded `/order-operations` with HTTP
  200, meaningful content, 19 interactive controls, no Vite error overlay, and
  no console errors. The pre-existing `AcceptInvitePage` route-export warning
  remains unchanged.
- 2026-07-14: completion-slice verification ran `PLAYWRIGHT_PORT=3100 pnpm
  run test:e2e`; all 6 Chromium and mobile-Chromium tests passed. The existing
  TanStack warning about the exported `AcceptInvitePage` route component remains
  unchanged.
- 2026-07-14: implementation verification ran `PLAYWRIGHT_PORT=3100 pnpm
  run test:e2e` to avoid an unrelated local port-3000 process; all 6 Chromium
  and mobile-Chromium tests passed. The existing TanStack warning about the
  exported `AcceptInvitePage` route component remains unchanged.
- 2026-06-01: User ran `pnpm test:e2e`; Playwright could not launch because Chromium was not installed locally.
- 2026-06-01: User ran `pnpm test:e2e`; mobile navigation test failed because the user menu did not open after `tap()`. Updated the test to activate the menu with `click()` and wait for the menu before asserting menu items.
- 2026-06-01: User ran `pnpm test:e2e`; dashboard accessibility test failed on light-theme color contrast, and the mobile user menu still did not open reliably. Darkened light-theme muted and primary colors, and made the user menu open state controlled.
- 2026-06-01: User ran `pnpm test:e2e`; muted foreground contrast was still just below AA at 4.48, and mobile menu activation still did not open the menu. Darkened muted foreground further and added an explicit touch-end open fallback to the user menu trigger.
- 2026-06-01: User ran `pnpm test:e2e`; mobile menu still did not open. Replaced the touch-end fallback with a controlled touch pointer-down toggle to avoid the follow-up click closing the menu.
- 2026-06-01: User ran `pnpm test:e2e`; mobile menu still did not open through the emulated tap path. Restored Radix native menu state and changed the e2e test to use keyboard activation before asserting mobile menu items.
- 2026-06-01: User requested environment setup only. Reduced e2e coverage to one smoke test and moved the accessibility and mobile navigation checks to deferred tests.
- 2026-06-01: User requested no Playwright HTML report server. Set Playwright reporter to terminal `list` only.
- 2026-08-27: Portal accounts and Home verification ran the focused
  `home.spec.ts` and `customers.spec.ts` suite with
  `VITE_USE_MOCK_SESSION=true` on isolated port 3101; all 12 desktop/mobile
  Chromium scenarios passed, including the restricted request submission and
  consistent Portal accounts labels. An initial run reused the developer's
  real-Clerk port-3000 server and did not reach the application shell; the
  isolated mock-session rerun resolved that harness condition. The existing
  `AcceptInvitePage` route-export warning remains unchanged.
- 2026-08-28: focused CRM browser verification ran `crm.spec.ts` with the mock
  session on isolated port 3104; all 6 desktop/mobile Chromium scenarios
  passed. The new journey opens a Won Opportunity detail route, shows its
  approved Customer order handoff, opens the source-aware pricing dialog, and
  verifies that the approved Customer is locked. The Opportunity journey also
  confirms the generated number is visible, the product-interest field uses
  the PSeq Lab Service/PSeq Kit domain, and the Owner control stays within the
  modal bounds on desktop and mobile. The run also repaired stale detail-route
  mocks, confirms a Lead identifier opens its dedicated detail workspace,
  confirms its Lead details and simplified Qualification record use equal
  full-container widths on desktop and mobile, confirms compact right-aligned
  card-header actions on Company, Lead, and Opportunity detail workspaces, and
  confirms the standalone Company journey without browser errors. The existing
  `AcceptInvitePage` route-export warning remains unchanged.
- 2026-09-01: the complete mock-session browser suite ran in CI mode on
  isolated port 3102; all 34 desktop/mobile Chromium scenarios passed.
  Coverage includes CRM Portal-access review, legacy access-link resolution
  into Company detail, current CRM and order navigation, the searchable
  Customer selector, and modal scroll locking. The existing `AcceptInvitePage`
  route-export warning remains unchanged.
- 2026-09-03: a read-only check reached the active local Portal session, but
  the application stopped at `Access check failed` before Lab Operations could
  render. No E2E tests were requested or run; signed-in workflow acceptance
  remains pending after the local API session is restarted.

### Released receipt closeout (2026-09-05)

`release-receipt.spec.ts` renders the real receipt with 35 long Unicode filenames,
checks desktop/light and mobile/dark reflow, Axe, complete manifest, console
errors, and printable PDF output. These are synthetic UI fixtures, not hosted
sign-in or physical deletion acceptance. The full browser suite explicitly uses
mock sessions and a same-origin intercepted API so local Clerk/API configuration
cannot send test traffic to a connected environment.

The full-suite closeout refreshed legacy CRM expectations to the current Company
People and Departments/services tabs and online-access-only approval payload.
The removed embedded Users-tab flow is no longer asserted on that legacy route;
reviewed People invitations and Department access are covered by their dedicated
journeys. Order operations checks its current Attention section. Receipt printing
uses A4 while named Lab-label pages keep their 50 mm by 25 mm size; dark display
mode prints receipts on white paper.

## Guided protocol completion checkpoint (2026-09-05)

- [x] `e2e/lab-protocol-execution.spec.ts` uses the real job/execution components
  with synthetic session/data and intercepted APIs. It covers job-to-execution
  navigation, start, typed required captures, saved progress after leaving and
  returning, QC Hold and supervisor correction with retained history,
  conditional skip, completion, and return to the job's Execution tab.
- [x] Stale writes reload the current execution version, preserve the entered
  barcode, and submit the refreshed version only on the operator's retry.
- [x] Keyboard opening, dirty Escape dismissal, and accepted cancellation retain
  values or restore trigger focus as appropriate. Axe finds no WCAG 2/2.1/2.2
  A/AA violations in tested states; page errors and horizontal overflow are
  checked. The mobile journey uses dark mode and reduced motion.

The focused run passed all **six** desktop/mobile scenarios:

```powershell
$env:PLAYWRIGHT_PORT = '3337'
node node_modules/@playwright/test/cli.js test e2e/lab-protocol-execution.spec.ts --workers 1 --max-failures=1
```

Desktop/light and mobile/dark screenshots of the
typed step and completed execution were reviewed. The isolated Vite server
also passed its initial page-load check without a runtime overlay or page error.

These are browser fixtures and separate local PostgreSQL controller proof;
the signed-in, database-backed full laboratory browser journey and physical
bench acceptance remain open. No external API or production protocol state was
changed by these browser tests.

## Trial integration checkpoint (2026-09-05)

`e2e/trials.spec.ts` exercises desktop and mobile Prospect scope review in the
visible dialog body, RUO/no-PHI acceptance, coded-RNA submission and a 409 retry
that preserves inputs and submits the refreshed version. A Phaeno scenario
checks the existing selected PSeq analysis/workflow/deliverable revisions and
submits scope for approval. Both scenarios check WCAG 2.2 AA automated rules,
page errors and horizontal overflow; mobile also uses dark mode and reduced
motion. Synthetic route fixtures are isolated from normal application auth.
These checks do not substitute for signed-in production or physical lab UAT.
See `TRIAL-INTEGRATION-CLOSEOUT.md` for full results and activation gates.


## Portal consistency browser checkpoint (September 7, 2026)

The authorized 20-item implementation retains regression scenarios for Trial notes/portal choices, Company recovery, and renamed kit-order placement. Added frontend/domain regression tests are not an executed E2E suite. No test suites were requested or run.

Manual signed-in local review checked reachable Service catalog and Sample shipping, structured defaults, Finance Customer list/detail return navigation, receipt validation, billing unchanged-value restoration, connected dashboards and single dialog scrolling. Finance was also inspected at 390 × 844 with no horizontal overflow. Isolated synthetic Company fixtures checked access/request dialogs and contextual editors. Retained import previews, populated held-order filtering, cash writes and external shipping were covered by source review and authored regression cases, not executed browser journeys. The final per-surface results and limitations are in `PORTAL-POMS-CONSISTENCY-IMPLEMENTATION-PLAN.md`. Synthetic fixtures use an explicit adapter; no invitations, actual receipts, order transitions or production changes are performed as browser tests.

Release acceptance still requires the newly built backend to be running, the relevant role sessions, current data and configured scanner/storage. Real laboratory, shipping, mailbox and financial operations remain external acceptance tasks.

## Portal consistency second pass (September 7, 2026)

`e2e/dialog-actions.spec.ts` and its isolated shared-component fixture cover a single physical click on Cancel/Close while blur validation could resize the dialog, opener focus, ordinary Tab validation, full Submit validation, successful synthetic submission, Escape and Enter dismissal, and a mobile tap. The mobile project also requests dark mode/reduced motion and both projects include an automated accessibility check. The authored suite has not been executed.

Direct browser observations separately reproduced the Receipt Cancel problem and verified the shared fix, keyboard validation/focus and a measured 390 × 844 layout with one scroll region and no horizontal overflow. This does not establish touch-device or automated accessibility acceptance. Further local observations and final checks are recorded in [the second-pass tracker](PORTAL-POMS-CONSISTENCY-SECOND-PASS-2026-09-07.md).

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

## Kit-request next action — September 10, 2026

Verify zero ready stock offers Prepare kits directly for missing sizes; after stock preparation and tube registration, Back to kit request restores the originating request. Matching ready stock offers Record kit shipment, including partial stock. Verify stale-refresh errors disable changes. Local signed-in navigation and preparation opening passed without operational writes; saved preparation and shipment behavior were verified in the focused unit suites.

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

## Global action-button rule — September 11, 2026

All Portal record action menus now use the shared ActionMenu: zero visible items renders no control; one visible item renders its named button/link; two or more retain Actions. Permission filtering occurs before counting; disabled items remain disabled and count as visible. Preserve confirmation dialogs, trigger refs, link destinations, destructive styling and accessible labels. Navigation/selection menus are unchanged. Six focused shared-component tests passed. Verify representative role/status variants, keyboard activation, modal return focus and narrow/light/dark layouts during UAT. This is not a full application acceptance pass.

## Library prep and Results & review navigation — September 11, 2026

Implemented the first navigation slice: Library prep replaces the Lab work sidebar label (existing work URL retained); Results & review follows Sequencing batches and opens the existing job Review tab with section=results return context. Both queues retain received job visibility; no readiness is inferred from inclusion. Preserve the owner's three sidebar dividers and later groups. Shared job history and existing approval gates remain intact. This is not tray-based preparation or a new data-processing pipeline.

Manual verification: Results & review → HS5Y7DB7 opens Review, retains Processing and No scientific approval recorded, and its breadcrumb returns to section=results. Verify Library prep → Specimens and legacy work links, keyboard navigation and narrow layout. No operational writes for this change.

## Preparation-batch verification — September 11, 2026

frontend/e2e/lab-preparation.spec.ts: 10 passing checks (five journeys × desktop/mobile Chromium). Covers exact shared/exception payloads and accessibility, exclusion of failed tubes, contextual output identity, retry after lost response retaining the original command/version, selected resource coverage with unfinished step retention, and selecting an existing output without retyping relationships/quantities. Route fixtures are deterministic; they do not claim a signed-in persisted bench journey. Separate PostgreSQL tests cover two persisted journeys. Signed-in local inspection covered the batch landing page and tray-format preview/cancel.

The owning [Library prep plan](LAB-WORK-JOURNEY-PLAN.md#verification-checkpoint) and [LAB-14 manual journey](../testing/06-laboratory.md#lab-14--preparation-trays-shared-evidence-and-sequencing-handoff) retain remaining acceptance coverage: held/closed Trial races, all staff-role combinations, physical trays/scanners/labels, owner sign-off and production/provider gates. Historical TEST-008 work was not retrofitted or replayed. Customer-requested hold implementation remains blocked.


## Receipt and accession list contrast — September 11, 2026

Visual-only update across Kit requests, Prepare kits, Kits sent, Receive shipments and Accession samples: shaded bordered headers, search/filters grouped in the header, separate record rows and table column headers, and consistent empty-state spacing. TypeScript/scoped lint passed. Signed-in desktop inspection covered all tabs, populated requests/kit lists and empty shipment queues without operational writes or page overflow. Automated tests were not added or run for these class/layout changes. Retain narrow/dark and populated shipment-queue checks in manual acceptance; existing navigation, filter, receipt and accession tests are unchanged.

## Lab configurations and shared tab acceptance — September 11, 2026

The [LAB-14 journey](../testing/06-laboratory.md#lab-14--preparation-trays-shared-evidence-and-sequencing-handoff) now starts format configuration in Lab configurations → Tray formats, then returns to Library prep to assemble a batch. Verify default Protocols, Workflows, Tray formats, direct-link/refresh and builder return behavior, the last sidebar position/divider/cog icon, read-only versus configuration roles, and active-only format selection. Library prep must not offer format create/edit controls.

Signed-in local inspection covered the three tabs, initial direct-link loading, preview/cancel, the single preparation-batch creation action and keyboard activation of the missing-format setup link, without saved writes. Receipt and configuration tabs both measured 42 px strips/36 px triggers. A read-only browser render check used the existing Web Operations fixture at 1440, 390 and 320 px, including dark/reduced motion: no overflow/runtime errors, matching tab dimensions within each row, and working arrow-key selection with visible focus. Responsive content may increase a row's height. These checks do not claim every account/CRM role journey or persisted tray creation/editing. No E2E suite was added or run for this navigation/style follow-up; existing suites and broader LAB-14 gates remain unchanged.

## September 12 — Preparation batch identifiers

LAB-14 naming follow-up: verify no required name field, automatic PSeq UTC timestamp heading, optional notes after reload, two separate identical creates, uncertain-create retry and unchanged historical names. These new naming cases are Not run; prior mixed-tray UAT evidence does not cover them.


September 12 naming follow-up: both focused PostgreSQL preparation journeys passed, including name/notes/retry assertions. Signed-in UI verified removal of the name field, two distinct identical-choice creates, persisted notes and unchanged historical names. Reserve exhaustion confirmation produced terminal specimen Failed. See the LAB-14 run record; unrun variants remain open.


September 12 LAB-14 follow-up: failed-output scan prompts removed while traceability links remain; terminal specimens use Processing outcome. Live saved-record inspection passed. Failed-output regression passed on desktop/mobile (2); all 11 preparation-domain tests passed, including new repeat reason/history coverage and existing correction invalidation. Manual correction/repeat remains separate and pending; see the active run record.

September 12 LAB-14: added stage completion confirmation context/cancel regression in lab-preparation.spec.ts; passed Chromium and mobile Chrome (2). Signed-in Hold/repeat/correction/fresh-QC/completion passed separately in isolated POMS; wider variants remain open.

September 12 lab-preparation.spec.ts resource choices regression passed on Chromium/mobile Chrome (2): expired lots and overdue/retired equipment absent, due-today resources present. Persisted signed-in rejection and unchanged inventory evidence recorded separately in LAB-14 run.

September 12 lab-preparation.spec.ts: added Supervisor-only step visibility for Operator/ScientificReviewer and keyboard cancellation/focus restoration; six desktop/mobile cases passed. Live active batch retained at seven history entries after keyboard cancel and rejected premature completion. See LAB-14 run.

September 12 lab-preparation.spec.ts: added definite stale-save case; new and uncertain-response cases passed on Chromium/mobile Chrome (4). No fake mutation on rejected save; reviewed retry creates one output. See LAB-14 run for distinction from signed-in network/concurrency acceptance.

September 12 signed-in LAB-14: two Edge tabs on the same Bill account verified stale output save rejection, entered-value retention, subsequent duplicate-output rejection, and one persisted output retaining the winning values. Active batch now has output PH-L-ZC3W65F9DT-9. This is not distinct-user role testing or lost-response injection; see active run.

September 12 signed-in LAB-14: wrong output barcode, missing resource coverage, excessive stock quantity, and missing tube-exception reason rejected; nested equipment cancel preserved unfinished shared/tube values. History remained eight and inventory unchanged. Manual evidence in active run; no automated tests added.

September 12 signed-in LAB-14 draft cancellation passed: missing reason blocked, justified cancellation closed draft/released reservation, same source accepted into a fresh draft. Exact records and pending Operator-only account question in active run. No automated tests or application changes.

September 12 signed-in LAB-14 Operator checkpoint: William saved routine shared preparation, one material use and two equipment uses on the preserved resource batch. Correction controls absent; individual QC requires Supervisor; premature stage completion rejected with history unchanged at 12. See active run for the exact handoff and database-readback limitation. Supervisor-only signed-in completion and broader role variants remain open; no new automated tests.

September 12 signed-in LAB-14 Supervisor checkpoint: after the owner changed William's role, Supervisor QC became available and Operator steps were restricted. Existing output confirmation, fluorometer coverage, individual 12/Pass QC, required stage completion, justified optional skip and batch closure passed. Reopened batch remains Complete with 18 history entries and one eligible, unassigned library; QC reused. This is same-person role-transition evidence, not independent-person review. Overall acceptance remains partial; see active run. No new automated tests.

September 12 signed-in LAB-14 handoff: resource library added once to the existing LAB-14 draft sequencing batch (now two libraries). Duplicate scan rejected with retained barcode/focus and unchanged count; corrected misleading QC feedback to identify an existing assignment. No sequencing start or sendout. Focused scanner unit coverage passed; no new browser fixture tests. See run for exact preserved identities.

September 12 signed-in LAB-14 step 6 passed: edited and retired the isolated test tray format; new batch choices excluded it, while existing draft retained B2 available/B3 unavailable and its original member/history. Restored original Active format with five usable positions afterward. No new batch, code change or automated tests; exact checkpoint in the run record.

September 12 signed-in completed-route check: resource specimen and execution link back to the preparation tray, retain evidence/authors/resources and withhold individual processing controls. Execution explicitly locked. Corrected tray resource guidance and verified live. No new automated test for the text-only fix; this does not replace direct API bypass coverage. See LAB-14 run.

September 12 signed-in tray validation: numeric 2 × 3 preview showed 1–6; all-unavailable, duplicate and out-of-range positions blocked Save while retaining values/focus. Cancelled corrected form and refreshed; no new format. Original Active format unchanged. Manual evidence in LAB-14 run; no code or automated-test changes.

September 12 Supervisor review boundary: completed resource preparation did not create scientific approval or advance the job beyond Processing. Review and Actions expose no approval/release control for Supervisor; the Batched library has no second QC entry. Read-only signed-in evidence only; Scientific Reviewer missing-result validation and direct API/customer visibility gates remain unverified. No records changed.

September 12 Scientific Reviewer session: resource job still Processing, so milestone prerequisite hides approval before missing-result validation. Preserved Draft tray has no operating controls; fixed false closed-state wording for read-only Draft and verified live with unchanged two-entry history. Scoped lint passed; no new automated tests for copy. Missing-result validation remains pending a suitable ScientificReview fixture, not passed from hidden controls.

September 12 server supplement: scientific-approval PostgreSQL regression passed four rejection cases with governed validation/dual control enabled only in test context and rollback afterward. This does not close the signed-in governed review gate; current runtime flags unchanged. See BACKEND-TEST-PLAN and run for scope.

September 12 server supplement extended: seven controller rejection cases, three package transition rejections and independent positive approval passed in the rollback-only PostgreSQL journey. Positive approval leaves the package ReadyForRelease with no release timestamp/user. Signed-in governed review, actual package ingestion/scanning and customer publication remain open; automated evidence does not replace these UAT steps. Saved LAB-14 trays, sequencing membership and running configuration remain unchanged.

September 12 independent reviewer live navigation: completed resource execution exposes retained authors, QC and resource evidence without edit controls; linked completed tray retains 18 history entries and one assigned output. Sequencing list retains two-library LAB-14 Draft and one-library TEST-008 Draft without New/Start controls. Results queue contains eight Processing/Received jobs, none review-ready. No records changed. Signed-in governed approval remains pending separate fixture/runtime setup; see active run.

September 12 governed signed-in checkpoint: separate localhost:3016/7116 runtime uses cloned phaeno_ops_lab06_uat on an owned loopback PostgreSQL cluster at port 5436 with commit tracking on and governed/dual-control flags enabled. Independent Reviewer missing-package form disables Save; synthetic ready-package Save records one approval and ReadyForRelease, with database readback showing null release timestamp/user. Original LAB-14 environment untouched. Bounded legacy-compatible synthetic fixture excludes full tube lineage and actual ingestion/scanning; release-manager/customer visibility gates remain open. Exact fixture IDs and startup prerequisites are in the active run.

September 12 release boundary: Independent Reviewer direct navigation to the known synthetic package detail on 3016 displays Result package unavailable and no publication controls. Database retains ReadyForRelease/null release fields. UI denial only; direct HTTP denial not exercised. No ResultReleaseManager exists in the cloned test DB; owner permission requested for William's test-copy role assignment before positive handoff acceptance. No role or package changes.

September 12 owner-approved setup: William Agnew now has active ResultReleaseManager in 127.0.0.1:5436/phaeno_ops_lab06_uat only. Domain/audit helper verified assignment and Independent Reviewer release-role count zero; existing lab roles unchanged. Positive handoff awaits William's 3016 sign-in. No package publication or original-environment access change.

September 12 William release-manager handoff passed on 3016: ReadyForRelease filter finds synthetic approved package, detail shows independent approval/file metadata, release confirmation is populated and focuses Cancel, cancellation returns to preserved filter without release. Database confirms null release fields. LAB-06 launcher required BusinessRoles plus test-only pipeline configuration; only its API restarted. Follow-ups: default ScientificallyApproved filter hides newly ready candidates, and inconsistent rollout flag combination hides role navigation. Publication/Customer visibility not tested. See active run.

September 12 release default fix verified live on 3016: opening Result release without resultState selects ReadyForRelease and displays the approved synthetic candidate immediately. Selecting Released and reloading preserves Released with its empty state. Returned to ReadyForRelease for next UAT. No publication or record writes.

September 12 signed-in contributor guard passed: William (ScientificReviewer + ResultReleaseManager) submitted approval for a separate ready synthetic package with an explicitly synthetic prior contribution. API rejected with independent-review requirement; package selection/summary preserved. Database status/version/events unchanged and zero approvals. Cancelled, no publication. Bounded fixture lacks real tube lineage/scanning; see active run for exact IDs.

September 12 production deployment smoke: Portal root 200; Portal API proxy 200/healthy; direct API health 200; database connectivity 204. Production UI dpl_3EJvA2hr3qVj3H1eZCN8mhWeYkXv matches release source 5365a38 rebuilt from its verified preview. This is deployment/runtime evidence, not signed-in or physical production acceptance. See LAB-WORKFLOW-RELEASE-2026-09-12.md.

September 12 continued LAB-06 signed-in UAT: Uploading, Scanning and Failed packages were excluded from approval selection with Save disabled. A separate synthetic ready package with an open blocking exception reached the real API, which rejected approval while preserving form inputs. Cancelled all dialogs. Before/after PostgreSQL readback was identical: no approvals, events, version changes or releases; the original independently approved package remains unpublished. Four bounded variants passed on retained isolated 3016/7116 runtime; overall LAB-06 remains partial. No automated test/source changes. Exact IDs, runtime limitation and next checkpoint are in [the active run](../testing/runs/2026-09-12-lab-14-preparation.md#signed-in-package-state-and-blocking-exception-gates--september-12-2026).

September 12 LAB-06 continuation: six signed-in negative approval checks passed on retained isolated 3016/7116 runtime: unfinished execution, no specimens with policy enabled, unresolved sibling, all-failed specimens, failed package target despite successful sibling, and unmatched package target. Actual API rejection retained entered summaries; dialogs cancelled. Before/after PostgreSQL output matched for status/version, specimen outcomes, execution evidence, approvals, events and release fields. Synthetic saved-state fixtures do not establish complete scientific lineage or actual file/scanner/provider processing. Overall LAB-06 remains partial; full positive lineage and publication gates stay open. No automated suite or product source changes. See the [active run](../testing/runs/2026-09-12-lab-14-preparation.md#signed-in-execution-and-specimen-outcome-approval-gates--september-12-2026).

September 12 signed-in ingestion handoff: William opened real-byte package 3c42f211-a219-421d-a7bc-dd07c6dba5e7 at 3016. Detail shows Scanning, one of one files, TEST-ONLY-ingestion.txt / 158 bytes / Pending, no reviewer/approval/release, no Release to Customer action. No mutation from the browser. PostgreSQL confirms one package, Pending artifact, no approval/release; local stored bytes and hash independently verified. Ten loopback HTTP ingestion checks are separate engineering evidence; remote transfer/actual scanner/full positive lineage remain Blocked. Preserve the pending package/file. See the [active UAT run](../testing/runs/2026-09-12-lab-14-preparation.md#real-byte-storage-and-pipeline-http-ingestion-acceptance--september-12-2026).

September 12 SYS-01/SYS-05 continuation: concurrent identical pipeline registration exposed UAT-20260912-01 (200/500, one persisted package, retry recovers); measured 320px page reflow exposed UAT-20260912-02 (17px overflow from global minimum width). Both remain Open. Passed bounded keyboard checks: mobile menu Enter/Escape with opener focus restoration; release confirmation initial Cancel, Tab/Shift+Tab order, Escape cancellation and restored release-button focus. Confirmation fits narrow viewport; no publication. Normal viewport restored; original packages unchanged. No complete WCAG or full-case pass claimed. See [active run](../testing/runs/2026-09-12-lab-14-preparation.md#concurrent-registration-and-release-screen-keyboardreflow-uat--september-12-2026).

September 12 focused correction checkpoint supersedes both open statuses above: UAT-20260912-01 and UAT-20260912-02 fixed/retested locally. Concurrent HTTP requests and retry return 200 with one package; live signed-in 320/390/1440 reflow checks pass after removing the global body minimum. Release confirmation cancellation preserves the approved candidate and returns focus. Retained local API 7116 now runs the fixed build with healthy response; 7114 is unchanged. No E2E suite, release/withdrawal, production deployment or scanner verdict. SYS-01/SYS-05 and LAB-06 remain partial beyond these bounded checks. See [correction evidence](../testing/runs/2026-09-12-lab-14-preparation.md#uat-defect-corrections-and-focused-retest--september-12-2026).

September 14 reviewer continuation: owner-requested sign-in completed in a separate in-app browser with the existing Independent Reviewer test account. Live package routes (Failed and ReadyForReview) deny reviewer-only access with release/file-management guidance. The associated laboratory work is readable but remains AwaitingSpecimens with zero specimens and no approval action; Review shows no scientific approval. Saved package states/versions/approval remain unchanged, all unreleased. Login prerequisite resolved; approval eligibility on otherwise complete scientific work remains open. No role grants, scientific writes or automated suite. See [reviewer checkpoint](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-reviewer-sign-in-and-access-continuation).

September 14 Independent Reviewer keyboard check: on saved TEST-LAB06-GATE-UNCLEAN, Approval excludes the Failed package, explains missing complete/clean output and disables Save. Focus starts at package selector; Tab reaches optional summary then Cancel; Escape closes and restores Record scientific approval focus. Work/package versions and zero approvals preserved. UI prevention only, no submitted approval request or full accessibility matrix. Trial preparation command coverage in the same checkpoint is controller/PostgreSQL evidence, not live browser acceptance. See [continuation evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-trial-preparation-guards-and-reviewer-keyboard-check).

September 14 signed-in saved-response retry passed on one new empty preparation tray in isolated LAB-06. An owner-approved temporary Operator grant allowed cancellation through a loopback proxy that dropped the first successful API response. The reason remained in the open dialog; an unchanged retry retained the original request ID/version/payload, returned the same Cancelled/version 2 result and left exactly one persisted history record. The exact temporary assignment was immediately deactivated; reviewer-only access and preserved older trays were checked. Test proxy/UI stopped. This closes the bounded empty-cancellation lost-response variant, not populated saves, uncertain creation, physical work or the full acceptance case. No new automated tests or product changes. See [recovery evidence](../testing/runs/2026-09-12-laboratory-uat-closeout.md#september-14-saved-response-recovery--passed-with-temporary-access-removed).

## Connected help closure and shared-header regression — September 14, 2026

Four actual Clerk audiences pass WEB-06, including 12 direct audience denials, real search/guide/workspace return, controlled 503/retry, delayed Phaeno response across real sign-out/Customer sign-in, and keyboard/touch/reduced-motion narrow views. Fixed the header covering the Documentation tab. Added the resize/navigation regression in documentation.spec.ts; all ten focused desktop/mobile navigation cases pass, using deterministic sessions only for this regression suite. Current corpus was reread with actual sessions. FIN-06 is also closed after one genuinely unavailable local legacy-connector operation and unchanged financial readbacks. [Evidence and limits](../testing/runs/2026-09-14-acceptance-closure.md).


September 14 connected Department continuation: real Customer Organization admin/Research admin/member completed structure/defaults, PO override/inheritance, exact-email reviewed access, seven boundary/stranding denials and deactivate/reactivate with explicit access restoration. Original defaults and Research-only membership restored; 44 quote and 14 shipment rows unchanged. ACC-03 still needs its affected-organization accepted snapshot fixture; do not replace that with pending arithmetic quotes. No new mocked suite run. [Evidence](../testing/runs/2026-09-14-acceptance-closure.md).


September 14 Lead history: new realistic inactive Converted fixture fails to appear unless the queue requests retained records. Tests cover All statuses, Converted filtering, detail/history read-only actions and return. New and existing Lead navigation tests passed on desktop/mobile (4 passed). Actual Clerk CRM-02 conversion/retry/terminal tests remain separately recorded. [Execution record](../testing/runs/2026-09-14-acceptance-closure.md).

September 14 ten-case checkpoint: actual Clerk-connected journals complete ACC-03, ORD-01/02/04, TRI-01/02/03/04, LAB-14 and SHP-02, with full step/variant crosswalks and independent PostgreSQL evidence. Total 29/81. Controlled local faults and deliberately staged negative fixtures are labeled separately from actual UI writes. Address-return default/no-default, retained pricing draft, Trial dual-person denial and amendment/replacement flows passed. Temporary delegation/configuration cleaned up; no new mock suite is substituted for connected acceptance. [Full evidence and limits](../testing/runs/2026-09-14-ten-case-execution.md).

## Shipping recovery acceptance — September 15, 2026

SHP-03/04 now pass complete isolated connected acceptance: included-cost stock/location review, committed-response loss with retained identity, second-session duplicate/conflicting details, stale address/shipment review, deliberate cancellation/reorder and post-dispatch denial. PostgreSQL confirms one logical notice per intentional request, frozen commercial scope, zero extra invoices and preserved original walkthrough. Synthetic stock and logging-only notices do not prove physical/provider delivery. Temporary purchase/default configuration restored; no application source changed. [Full crosswalk and continuation point](../testing/runs/2026-09-15-shipping-recovery-uat.md).

September 15 KIT-01/SYS-01 connected acceptance: real Partner Department/Organization sessions cover draft, all quantity/required-field gates, reviewed purchase, lost response and changed-price/profile reaffirmation. Real Company sessions expose and retest the conflict-recovery correction; CashOperator recovers one committed $3 allocation without duplication. New scenarios combine with retained Trial/quote/finalization evidence in the complete [six-workflow recovery crosswalk](../testing/runs/2026-09-15-kit-and-system-recovery-uat.md). PostgreSQL independently verifies IDs, versions, counts, balances and audit attribution. Temporary Kit configuration retired; synthetic invoice/PDF and physical/provider limitations remain explicit. No broad mock suite substitutes for these connected checks.

September 15 LAB-09 continuation finishes eight targeted groups: Supervisor legacy adoption, competing selections/start, historical/policy protection, operational hold/resume, same-attempt QC Hold/Fail/Pass repeats, retirement between stages, 12 held/cancelled concurrent denials, and keyboard/draft/narrow-theme recovery. A live Escape data-loss defect is fixed and retested. Independent PostgreSQL readback corroborates exact source, attempt, execution and evidence counts. [Remaining variants and retained checkpoint](../testing/runs/2026-09-15-lab-attempt-continuation.md); no additional whole-case Pass.

September 15 policy/history and shipping access continuation: actual Customer confirmation on an isolated older unfinalized order retains original snapshots and creates one authorization for one-/three-tube specimens. Actual Supervisor UI/API preserves a Completed source-less legacy record. Shipping Member, unrelated Customer, other Department and non-admin Phaeno checks deny 13 writes and seven distinct reads while retaining saved histories. Settled unavailable-record UI verified. [Crosswalk and remaining gates](../testing/runs/2026-09-15-policy-history-and-shipping-access-uat.md). LAB-09 now needs only positive independent scientific approval; SHP-14 remains partial. No new automated tests or application source changes.

## SHP-14 connected recovery and larger workflows — September 15, 2026

Actual scoped Customer and fulfillment administrator sessions complete the SHP-14 crosswalk with retained scope/stale/order recovery and new independent recommendation/dispatch/receipt/scan failures/delays. A 30-sample, two-container fixture supplies 14-kit, 13-request and long sample/tube/manifest paging checks, keyboard and desktop/phone/short-height light/dark/reduced-motion checks. The unbounded manifest and dashboard dependency defects are fixed and retested in the same authorized sessions. Independent database readback proves one actual request, exact transition/notice counts, 30 unique tube assignments and two frozen revisions. This is connected isolated software evidence; no new broad mocked E2E suite or physical/provider claim. [Full crosswalk, fixture boundaries and continuation](../testing/runs/2026-09-15-shipping-large-recovery-uat.md).

## SHP-09 alternate packing and whole-order reset — September 15, 2026

Actual scoped Customer/Member/fulfillment sessions complete the ten primary steps and five reset steps. New coverage includes six-five and mixed-size choices, delayed-current preview, invalid allocation/stock claims, partial supply and one additional order, cancelled-origin stock, Member history, retained drafts during inventory errors, two-Job reservation races, stale/open and competing resets, distinct historical handling/destination pools and every sibling/history lock. Independent readback conserves all 248 slots across 15 authorized isolated Jobs and all frozen order fields. Staged milestone/physical prerequisites are explicitly labelled; no broad mocked suite or physical/scientific claim. [Complete evidence and continuation](../testing/runs/2026-09-15-packing-reset-uat.md). No application or automated regression test changed.

September 16 container selection action: existing packing/inventory selectors now use **Change container selection**. The action appears at the right of **Choose shipping containers** with existing availability guards. Tests updated but not run (not requested).

September 16 assignment wording supersedes the earlier container-selection labels: **Assign shipping containers**, **Assign containers**, and **Confirm assignment** / **Confirm partial assignment**. Existing packing selectors now scope repeated Container and barcode field labels by the numbered container group. Tests updated but not run (not requested).

September 16 sample ordering: digit-by-digit sample IDs, biological-source group order, numeric tube ordinals and scanner advancement now share the displayed order. Added focused ordering coverage and updated integrated scanner pagination expectations; tests not run. Manual check: mixed-length numeric IDs, multiple sources, multiple tubes, resume after saved matches and dirty-target preservation.

September 16 inline tube scanning: updated scanner and integrated Job regressions for one active row-local field, save/advance, inline errors, paging and collapse draft retention, remount focus and completion. Manual acceptance includes keyboard/scanner Enter, row scrolling, narrow screens and reduced motion. Tests updated but not run (not requested).

September 16 scan completion: verify Done scanning is absent before the final saved match, appears in the Samples and shipping header on completion, receives focus, and closes matching without losing the sample review list. Updated integrated completion and host-header coverage; tests not run.


## Reusable Lab steps and configuration preview - September 17, 2026

Configuration authoring acceptance: create a fictional Lab step; draft scoped captures/QC/attachment/resources; preview unsaved values, invalid and valid entries, direct step selection, skip/repeat/correction, reset and return without saving configuration. Check no operational API request on all preview controls, including file selection, resources and outputs. Independently approve; compose a protocol containing two occurrences; approve protocol separately. New step version/adoption/retirement must leave approved protocol and existing batches unchanged. Verify low-role write denial, stale edits, usage, list-state restoration, narrow/light/dark layouts, Escape and focus return. No automated E2E run was requested; these scenarios are not represented as passed.

September 17 local manual checkpoint: restarted API catalog read, TEST ONLY identity creation, version-1 draft save and saved preview passed. Batch capture default, all fictional tubes selected, shared optional QC report and local successful validation observed. Editor child-route navigation fixed and rechecked. Approval/adoption/retirement, race/role variants remain pending; no operational batch was modified.

Scientific entry controls: verify symbols at a caret and over selected text, keyboard menu selection/focus return, common and custom units, Unicode display in unsaved preview, and discard without changing saved configuration. Updated existing label expectations for Step record and batch entry terminology. Automated tests are not requested for this checkpoint.

Report configuration acceptance: inspect hidden, optional and required settings in unsaved preview; verify new uploads are required on performed repeats/corrections, allowed skips remain file-free, and API rejects missing required files. Live API acceptance requires the rebuilt local API. Automated tests remain unexecuted under repository policy.

Verify all-tube automatic coverage in preview and live recording; inspect exclusion reasons and confirm failure updates coverage without clearing other entries. Partial/stale submissions must be rejected by the API. Automated tests remain unexecuted under repository policy.

### Inline resource fields and sample exception disclosure (September 17)

Manual configuration preview: batch-only has no sample cards; shared starts with Record exception unchecked; toggle shows collapsed cards and turning off drops hidden overrides. Material product/manual entry, optional tracked lot/equipment selection and per-sample quantity totals; output defaults and overrides. No operational writes during preview. Live save with inventory/output rollback and receipt replay remains a separate connected acceptance gate.

### Material identity at configuration

Preview acceptance now requires vendor/product assignment in configuration, read-only identity at runtime, and optional lot selection with configured-vendor filtering. Verify no runtime material/vendor/product controls or operational mutations in preview.

Material unit configuration follow-up: require authoring units, preserve them in save/reopen, show fixed runtime labels, reject tracked lots or submitted units that differ, and keep legacy definitions runnable. Regression cases added/updated; not executed. Manual preview checks cover symbol insertion and report placement after step-entry fields.

Attestation simplification: update form/preview cases to submit without a coverage checkbox; retain configured operator validation and verify its position after the report. Check disabled confirmation and skipped entries omit the attestation, and changed coverage clears operator confirmation. Tests updated but not run under repository policy.

### Material exceptions acceptance

Use only unsaved configuration preview for connected screen inspection: shared per-sample material scope; batch quantity and fixed units; Record exception reveals collapsed cards; zero or unknown, required reason and disposition; clearing overrides. Operational acceptance is separate: failed-tube consumption, unknown lot unavailable across all use paths, stale/unauthorized reconciliation rejection, supervisor reconciliation and hold resolution, idempotent replay and transaction rollback. No operational records may be changed merely to claim preview acceptance. Automated E2E and populated operational write checks remain unexecuted unless authorized.

### Equipment selector requirement — September 18, 2026

Manual acceptance pending: Equipment used has no Include equipment barcode or Required toggle in the builder; preview and Library prep require selection of eligible equipment, retain the selected name/barcode, and reject a missing selection. Existing recorded evidence and corrections stay readable. No automated E2E run requested.

### Jobs and specimens navigation — September 18, 2026

Manual acceptance pending: Jobs & specimens appears immediately above Library prep; its addressable `section=jobs` view contains container lookup and the received-job/specimen list. Library prep shows preparation batches only. Verify job → specimen/tube/execution → job → list returns preserve Jobs & specimens, Results & review and receipt origins, while preparation links continue to Library prep. Confirm reload/direct navigation and narrow sidebar navigation. Static TypeScript/lint checks are used for this change; automated E2E execution is not requested.

Jobs & specimens follow-up acceptance: verify completed (`ReadyForRelease`) jobs are hidden by default and restored by Show complete; checkbox state survives reload and job/specimen/execution round trips. Results & review remains unfiltered. Scan a container is collapsed within the list header, has an expanding chevron, preserves typed values when toggled, and keeps existing successful/error lookup behavior. Automated execution remains unrequested.

## Jobs delivery deadlines — September 18, 2026

Jobs deadline acceptance: verify Jobs sidebar above Library prep; shaded header search/status/Show complete/scanner; counts/paging beyond 250; record-return state; desktop/narrow/keyboard; exact-time adjustment with reason and concurrent-version conflict; customer-safe due-date visibility; partial/all-sample Portal publication, withdrawal/restoration and ReadyForRelease still open. Do not require download. Local authenticated browser results are recorded in the owning deadline plan; full automated E2E execution not requested.

Jobs queue follow-up supersedes the earlier scanner checks: no container lookup on Jobs; Clear filters is in the header and resets search/status/completion/page. Verify preparing/ready shipments stay out, dispatched/delivered/received jobs appear, historical receipt qualifies, and counts and paging use the same eligible set. Manual and automated browser acceptance pending.

Required date at acceptance: verify standard-turnaround single/bulk acceptance sets a due date; missing-turnaround acceptance rejects atomically without saving receipt/accession/intake mutations, then succeeds after an authorized explicit date; held/rejected intake remains available without a date. Check deadline history, unchanged forecasts, customer-safe notice, stale-version rejection and preserved earlier dates. Verify no Needs due date control, historical missing dates remain At risk, and Set/Adjust controls work by keyboard and narrow viewport. Execution pending.

Active/Closed Jobs acceptance: tab defaults and keyboard operation; independent search/date/status/outcome/page state across tab switching and record return; clear current filters only; single-day/open/inverted dates and daylight-saving boundaries; cancellation before shipment appears only in Closed; partial delivery stays Active at earliest outstanding stage; four Active deadline options; no Show complete or Failed outcome. Automated E2E execution not requested.

Jobs date filters (September 18, 2026): manual Edge check passed for segmented month/day/year typing without resets, Enter/blur commit and Clear filters. Automated browser regression deferred under the requested-test policy; preserve this keyboard path when adding coverage.

## Progress-based completion forecast — September 18, 2026

Pending requested acceptance: configure confirmed holiday coverage and independently mixed stage durations; inspect latest-sample forecast through Portal publication; verify weekend/holiday/overrun and missing coverage; preview before applying revisions to existing jobs; preserve due dates/manual forecasts and send no customer notices; no-op edits retain entry time; rework and parallel libraries retain required dependencies; blocked/unknown samples prevent a complete job date; read-only roles cannot save; stale saves fail; preview paging, focus, mobile and default Lab steps remain correct. No E2E suite run or production operational timing validation is claimed.

Holiday calendar navigation/formatting checkpoint: signed-in local browser confirmed the new standalone tab, header year/revision controls, formatted display dates, separate Stage durations content and ascending observed-date order for all 15 saved holiday rows in the unsaved editor. Cancelled without data writes. Full automated E2E execution remains unrequested.

Settings navigation separation: signed-in local inspection confirmed Administration menu order: Order Settings, Lab Settings, File retention policies. Order Settings is absent from the Order operations sidebar. Standalone retention shows the existing policy and history. Lab Settings shows six sidebar subjects with no tab strip; Lab steps, Protocols, Workflows, Stage durations, Holiday calendar and Library tray formats each load their existing content. The old combined retention URL redirects to /file-management. No records or policies were saved; automated E2E and live restricted-role journeys were not run.

## Separate sample-shipping settings — September 18, 2026

Signed-in local browser verified the new menu order after Lab Settings; separate container, destination, instruction and preview pages; existing sample types on their Order Settings page; shaded list headers and header filters; and container search, detail, and return preserving TRANS-10. Old combined shipping links redirect to the new list with filters. Preview resolved the existing synthetic reference destination/sample definition without saving records. Narrow-screen sidebar navigation worked with no horizontal overflow; added small-screen heading clearance for the edge navigation trigger. Automated suites and restricted-role runtime journeys were not requested or run; no definitions, policies or operational records were changed.

Rule preview refinement: local signed-in browser verified Sample shipping instructions in the sidebar and list heading, the wider Actions menu with single-line labels, automatic resolved preview for the existing reference rule, collapsed Add sample types and its empty state, and focus returning to Actions after closing. Create revision still opened the correct existing definition and was cancelled without saving. Combined additional-sample, future/inactive rule and narrow-screen dialog acceptance remain unexecuted; no automated suites were run.

CRM Settings navigation (September 18, 2026): signed-in local browser confirmed CRM sidebar no longer lists Administration; user dropdown order is Order Settings, Lab Settings, CRM Settings, Sample Shipping Settings, File Retention Policies, User Management. Resources and Sign Out use consistent title case. CRM Settings opens existing pipelines, fields, duplicate review, saved views and import/export tools without the operational sidebar. No records changed. Automated suites, restricted-role browser journeys and mobile runtime checks were not run.

Quote/workflow and submission guidance separation (September 18, 2026): signed-in local browser confirmed the Quote & workflow sidebar/header, quote-only editable field with supported workflow review, removal of submission text from Order Settings, and the Default submission instructions sidebar page under Sample Shipping Settings. Dedicated modal showed required guidance, disabled pristine Save, and inline validation on blur. Editors were cancelled without saving. Persistence/conflict, restricted-role and mobile acceptance were not executed; no automated suite was run.
