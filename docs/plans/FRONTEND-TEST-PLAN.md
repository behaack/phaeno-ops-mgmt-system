# Frontend Test Plan

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

[LAB-07](../testing/06-laboratory.md#lab-07--protocol-retirement-workflow-invalidation-and-revalidation) adds retirement impact loading/error/retry, named active-job blockers, affected-workflow warning, queued-job Proceed anyway warning, cancellation, stale-impact refresh, retained reason, default retired hiding, Invalid and historical Invalidated workflow display, removed retired-stage verification, Review workflow and Revalidate and approve, unchanged and edited recovery, empty recovery error, and queued-job invalid-workflow banner. Include keyboard/focus, narrow view and themes. New cases are Not run until evidence is recorded; previous retirement UI checks do not prove the revised workflow behavior.

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

**Remaining acceptance: Not run.** Keyboard Enter/Space and visible focus on sample/QC disclosures; 320/375 px reflow, zoom, touch and dark theme; numeric sample sorting in the connected browser; the 7-sample detail of 69SJN4PA; entitled Partner and Department/member views; real partial/mixed stages; and missing/failed progress responses on full pages. Responsive classes and `aria-current` are implementation evidence, not completed browser acceptance. Follow [ORD-07](../testing/04-lab-orders.md#ord-07--customer-laboratory-stages-and-mixed-sample-progress).

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
[SHP-09 reset variant](../testing/11-transportation-kits.md) remains Not run;
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

The owning [Library prep plan](LAB-WORK-JOURNEY-PLAN.md#verification-checkpoint) and [LAB-14 manual journey](../testing/06-laboratory.md#lab-14--preparation-trays-shared-evidence-and-sequencing-handoff) retain remaining acceptance coverage: held/closed Trial races, all staff-role combinations, physical trays/scanners/labels, owner sign-off and production/provider gates. Historical TEST-008 work was not retrofitted or replayed. Customer-requested hold implementation remains blocked.


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
