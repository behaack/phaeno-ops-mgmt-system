# Jobs workspace and deadline tracking

Status: implemented locally. On September 18, 2026 the owner authorized documentation reconciliation, commit, push, production deployment and required EF migrations. See [release evidence](PORTAL-JOBS-SETTINGS-RELEASE-2026-09-18.md).
Decision date: September 18, 2026.
Owners: Product Owner for deadline meaning and commercial commitments; engineering for implementation.

Implemented locally: [Progress-based expected completion calculator](LAB-EXPECTED-COMPLETION-CALCULATOR-PLAN.md) tracks sample stage entry and configured remaining work. Calculated forecasts drive internal queue risk while the turnaround baseline, manual estimate and customer commitment remain separate. Its owning plan records setup and verification boundaries.

## Product need

Laboratory operators, supervisors and Operations need to track open jobs, see which commitments require attention and understand why a deadline may be missed. Historical lookup remains available but is not the primary purpose of the page.

The owner requested a better name than Job and specimen history, job due dates and early warning of missed deadlines. Initially each job has one phase. Future jobs may have multiple phases, each with a deadline, under a single contract.

Implemented name: **Jobs**, immediately above Library prep. Specimens remain accessible within each job; the Jobs list no longer includes container lookup. Active jobs and Closed jobs replace Show complete. Preserve each tab's filters and list state when returning from a record.

## Pre-implementation behavior and gaps (historical)

- `LabWorkOrder` already retains quoted turnaround, OriginalTargetAtUtc, ExpectedCompletionAtUtc, CompletedAtUtc and override state. `LabWorkTimingChange` records timing changes. Reuse these facts rather than introduce competing dates.
- Each accepted specimen receives a target using its acceptance time plus the quoted maximum turnaround in calendar days. The job currently takes the latest specimen target. Additional acceptance can change that aggregate; it is not an independently frozen contract deadline.
- ReadyForRelease currently stamps laboratory completion. It does not prove customer delivery. The current schedule-health method also calls Cancelled complete, although cancellation is not successful delivery.
- Current schedule health marks an unfinished job delayed after its expected date and at risk when held or forecast later than the original target. It has no approaching-deadline warning and can label an undated job OnTrack. Blocking exceptions also influence projected health.
- Timing changes are available from the Commercial order. Moving expected completion later queues customer communication under the existing controlled workflow. Internal forecasting must not accidentally introduce a second notification path.
- The Lab dashboard list does not expose these dates or risk reasons and loads only the most recently updated 250 jobs. It cannot be the authoritative open-job deadline queue as volume grows.
- Existing product policy calls published turnaround an operating target unless a contract explicitly makes it a guaranteed commitment. Preserve that distinction.

Relevant sources: `backend/modules/PSeq.Operations.Laboratory/Domain/LabWorkOrder.cs`, `LabSpecimen.cs`; `backend/app/Features/LabOperations/Controllers/LabOperationsController.Timing.cs`, `LabOperationsController.Helpers.cs`, `LabOperationsController.cs`; `backend/app/Features/OrderManagement/Services/LabServiceTimingService.cs`; `frontend/src/features/orders/LabServiceTimingPanel.tsx`.

## Confirmed product decisions

1. **Deadline endpoint:** data for **all samples under the job** is made available to the customer through the Portal. The owner explicitly confirmed this definition. Customer download or acknowledgement is not required. Laboratory completion / ReadyForRelease remains a separate milestone and does not complete the job for this workspace. When implemented, Show complete follows this all-samples delivery rule, so jobs awaiting any sample's data remain open.
2. **Deadline source:** start with a configurable standard turnaround time (TAT), then allow an authorized Phaeno employee to adjust the job's due date. Reuse service-specific turnaround configuration and the existing acceptance-based clock unless the owner changes that policy. Standard TAT must cover delivery of results, not only laboratory processing.
3. **Adjustment history:** retain the original TAT-derived due date, the current adjusted due date and a reasoned change history. Changing the forecast is distinct from deliberately adjusting the due date. An authorized employee may make an operational adjustment without an additional approval workflow; an explicit governing contractual restriction still applies.

These decisions were confirmed by the owner on September 18. They settle the endpoint and source questions; execution was subsequently authorized with “Okay, please implement.”

### Remaining design assumptions

- Proposed initial Due soon window: three calendar days. Keep the existing calendar-day turnaround convention; business-day calendars and holidays are separate scope.
- Implement the confirmed delivery rule against authoritative Portal release/access records and the job's sample roster. Partial releases may accumulate; completion is recorded when data for the last outstanding sample becomes available and all samples are covered. File upload or an email attempt alone is not delivery. Reuse existing authorization and release gates; do not infer accessibility from a laboratory status or require a customer download.
- A failed sample must not silently disappear from the completion denominator or count as delivered without an actual customer-visible deliverable. Preserve explicit approved scope changes and existing failed-sample reporting rules. If those rules cannot satisfy the all-samples definition, surface the specific case for product review rather than inventing an exception. Handle withdrawal and later restoration using retained release history; do not rewrite the original delivery event.
- Keep the published standard TAT and any contractual guarantee distinguishable. A configurable operational target does not itself create a guaranteed SLA.

## First delivery: one phase per job

### Jobs list

- Use one compact, shaded header: Jobs, brief purpose, search, deadline-status filter, Show complete and Clear filters. Preserve the current permissions and record-first navigation.
- Each row shows job identifier/name, customer or submitting organization where authorized, operational status, due date and its basis, expected completion, and deadline status with a short reason. Show specimen counts as secondary information.
- Default to unfinished work, sorted by overdue, at risk, due soon and then remaining dated jobs by due date. Require a delivery date at acceptance. Any historical accepted job missing a date remains visible as At risk with a correction reason. Use stable sorting and retain user filter/page state.
- Include an Awaiting acceptance category when the turnaround clock has not started. Do not manufacture a deadline from a missing acceptance date or exclude all pre-acceptance work from a page intended to track open jobs. Keep the receipt workflow as the action destination.
- Show complete includes jobs whose data for every sample has been made available through the Portal, with actual delivery and whether they finished on time or late. Jobs with completed laboratory work or partial delivery but any sample's data still outstanding stay open. Keep Cancelled distinct from successful completion and provide an explicit way to find cancelled records; do not count them as on-time successes.
- Replace the capped dashboard-derived list with an authorized, paginated jobs query. Filter and sort server-side so old open/overdue jobs are not missed beyond 250 records. Return full-query counts rather than page counts.

### Dates and controlled changes

- **Standard TAT:** configurable by service using the existing controlled offering/turnaround configuration. Retain the applicable value and version for each job. Changes apply prospectively; changing the standard must not silently move existing job deadlines. An employee adjusts an existing job explicitly.
- **Due date:** initially calculated from the applicable standard TAT and acceptance-based start, with source/basis retained. Preserve both the original calculated date and the current employee-adjusted date. Do not relabel ExpectedCompletionAtUtc as the due date or a contractual guarantee.
- **Expected completion:** the current operational forecast. Initially an automatically derived target is only a baseline, not a reviewed forecast or evidence that work is progressing on time. Show whether the forecast was reviewed and when if such review is introduced.
- **Actual completion:** the time data for all samples under the job becomes available to the customer through the Portal. Retain the underlying per-sample release coverage and completion timestamp separately from existing laboratory completion; do not reinterpret historical ReadyForRelease timestamps as proof of delivery.
- If due dates are date-only promises, define their cutoff in the lab's agreed operating timezone. Preserve UTC instants for existing event-based turnaround calculations; display dates and overdue boundaries consistently, including daylight-saving changes.
- Holds and revised forecasts do not silently move the due date or reset its clock. Provide **Adjust due date** to Phaeno employees with the existing appropriate operational permission, using a bounded form with the new date and required reason. Retain previous/new dates, original baseline, actor and timestamp; reforecasting is a different action. Do not broaden access to customers or every employee role merely because the user is internal. Preserve any separately agreed contractual restrictions.
- Deliberate due-date adjustment recalculates current deadline risk while preserving performance against the original baseline. A later date must not erase the fact that an earlier commitment was missed. Align customer-visible dates and existing timing notifications once, without duplicating notices or conflating adjustment with internal forecast review.
- Preserve existing per-specimen targets. A latest job-level target must not conceal an earlier overdue unfinished specimen. Show the next unfinished specimen deadline/risk where applicable, without presenting specimen deadlines as job phases.
- Avoid guessing dates for historical records. Reuse reliable retained dates with their provenance; otherwise show Awaiting acceptance before acceptance or At risk for historical accepted records. Migration/backfill design follows the confirmed deadline meaning.

### Deadline status

Operational status and deadline status are separate. Every warning is explainable using retained facts.

| Deadline status | Proposed rule |
| --- | --- |
| Awaiting acceptance | No explicit deadline and the acceptance-based clock has not started. |
| Missing required deadline | Included in At risk if historical accepted work has no date; new acceptance is blocked without configured turnaround or an explicit due date. |
| Overdue | The relevant deliverable is unfinished and its due cutoff has passed, regardless of a later forecast. |
| At risk | Not overdue, but the forecast exceeds the due date, a blocking hold/exception prevents progress, or an authorized user has recorded a reasoned risk. |
| Due soon | Within the proposed warning window and unfinished, without stronger recorded risk. This is a time warning, not a prediction. |
| No known risk | Dated, unfinished and outside the preceding warning rules. Do not imply a statistically validated forecast. |
| Complete on time / Complete late | Compare actual completion with the retained applicable deadline. Preserve the original baseline after agreed revisions. |
| Cancelled | Retain dates and history without labeling cancellation a successful completion. |

Evaluate time-based warnings on read/refresh, not only when a job is edited. Keep one server-owned rule set for the new queue and job detail; reconcile existing commercial projections explicitly rather than silently changing their public enum meanings. Initial alerts are visible in POMS. New email reminders, scheduled notifications, escalation policies and predictive duration models are separate scope.

The job detail exposes dates, basis, risk reasons and timing history. Reuse existing authorized timing-change controls and customer-safe/internal note boundaries. Maintain version checks, audit trails, notification history and tenant isolation.

## Future delivery: multiple phases under one contract

The conceptual hierarchy is **Contract → Job → Phases**. The current job is treated as one logical phase; do not add a phase-management screen or fabricate phase records merely to show a due date.

- A future phase has a stable identity, name/order, agreed scope or deliverable, due date/basis, expected completion, actual completion and status, plus timing/risk history.
- Each phase retains its own deadline and performance baseline. The job summarizes the next unfinished phase due and the strongest actionable risk; a later final-phase deadline must never hide an earlier missed phase.
- One completed phase does not complete the job. Completion requires all required phases or explicitly agreed cancellation/waiver outcomes, preserving scientific and release gates.
- Phases do not automatically create new contracts, quotes, invoices or unrelated jobs. Map them to the existing commercial commitment and approved amendments; determine any new contract entity only when the actual contract relationships are confirmed.
- Protocols, workflow stages, preparation batches and sequencing batches describe execution. They are not automatically contractual phases. Multiple protocols or batches may satisfy one phase, and a batch may include work for multiple jobs.
- Dependencies, overlapping phases, phase-specific specimen membership, partial delivery and phase billing are deferred. Do not assume every phase is sequential or has the same samples.
- Later migration maps existing single-phase jobs without losing their dates, audit history, specimens, outputs, financial lineage or performance baseline. Scheduling calculations should accept a deadline scope so phase support can reuse them without requiring a generic workflow engine now.

## Implementation sequence after approval

1. Apply the confirmed customer-delivery endpoint and configurable-TAT-plus-employee-adjustment policy. Verify authoritative delivery evidence and document cutoff rules, authorized date changes, and treatment of cancelled/undated jobs.
2. Audit existing timing and completion facts and the order/contract relationship. Define additive read contracts for the paginated jobs query and reusable schedule calculation. Plan any needed persistence or notification-contract changes before implementation.
3. Expose dates, reasons, filters and counts; rename Jobs consistently; remove the Jobs container scanner and retain list-return context. Add the job timing/detail actions within existing Actions menus.
4. Verify calculations and permissions, then carry out representative local acceptance. Update Phaeno guides and affected Customer/Partner timing guidance only when behavior is implemented.
5. Release separately after validation. If persisted fields change, include EF migration and ERD updates. Do not apply shared/production migrations or deploy during planning; confirm the applicable authorization for that release.

## Acceptance and success measures

- An operator can identify the next due job, every overdue/at-risk job and each risk reason from the list without opening records.
- Unknown dates are explicit; no record receives a guessed deadline or false on-track claim. More than 250 jobs cannot hide older open work.
- Check exact cutoff, calendar-day and timezone boundaries; missing acceptance, staggered specimen acceptance, a held job, forecast beyond due date, overdue despite reforecast, completion before/after cutoff, cancellation and partial/withdrawn delivery under the selected endpoint.
- Verify permissions, concurrent date changes, original-date retention, audit reasons, customer-safe projections and no duplicate delay notifications. Page load and risk refresh must not themselves send messages.
- Verify a standard TAT change affects future jobs only; an authorized employee can adjust a single job with a required reason while unauthorized users cannot. The original TAT/date and adjustment history survive later changes. ReadyForRelease without delivered results remains open; delivery closes the job under the agreed evidence rule.
- Verify a multi-sample job stays open after partial publication, closes only when all samples' data is customer-accessible, and closes without a customer download. Validate both one package covering all samples and several releases covering the complete roster; duplicate publication must not double-count a sample or create a second completion event.
- Verify Show complete, risk filters, ordering, pagination, deep links, record-return state and header Clear filters at desktop/narrow widths and with keyboard navigation.
- Measure deadline coverage for open jobs, overdue count, at-risk count with reasons and on-time completion against the retained baseline. Establish targets from observed operations rather than inventing numeric success goals. Cancellations and missing deadlines remain separate from the on-time denominator.
- Record focused backend/frontend/E2E cases in the living test plans during execution. Focused regression cases are authored; automated execution follows the repository’s requested-test policy.

Related plans: [Lab operations](LAB-OPERATIONS-PLAN.md), [Order management](ORDER-MANAGEMENT-PLAN.md), [Customer/Partner Job progress](LAB-JOB-PROGRESS-AND-SHIPPING-WORKSPACE-PLAN.md). The last owns the external progress experience; this plan primarily owns the internal Jobs workspace and its deadline semantics.

## Implementation decisions and evidence (September 18, 2026)

- Added an independently paginated Phaeno-only `GET /api/platform/lab-operations/jobs`, deadline detail read and version-checked due-date adjustment. Search, status, ordering, counts and paging execute in PostgreSQL; the dashboard’s 250-row limit is not used. Page size defaults to 25, capped at 100. Counts cover the complete search result before status/completion filters.
- Added nullable original/adjusted delivery dates and first retained Portal completion/deadline snapshots to the existing work order. The original delivery deadline freezes on the first acceptance refresh that establishes a TAT target. Later acceptance retains specimen targets and may update the existing forecast; it does not move the frozen delivery deadline. Existing reliable original targets are copied once by the migration. No date is inferred from creation, laboratory completion or an absent TAT.
- The quoted offering’s already-snapshotted maximum calendar-day TAT is reused. Offering configuration remains the owner of prospective standard changes. Manual/Trial jobs with no quoted TAT can receive a reasoned explicit due date. Dates are UTC instants; input/display use the explicitly shown browser timezone, including the exact time cutoff. No midnight or holiday convention is invented.
- The new query owns deadline semantics. Existing Commercial `ScheduleHealth` enum/forecast behavior remains unchanged; additive delivery fields expose the separate date to the existing timing panel. Adjustment queues exactly one customer-safe `lab-deadline-changed` notice for a commercial job using existing timing recipients. It does not invoke reforecasting or duplicate delay notices. Reads send no messages. Trial dates are tracked internally; no new Trial notification flow is introduced.
- Delivery coverage uses published commercial sample releases and released Trial packages with their published file bindings. Cancelled-before-receipt specimens are excluded as explicitly cancelled scope; rejected/failed specimens remain outstanding until they have an actual published deliverable. No failed sample is silently treated as delivered. No new failure-waiver workflow is introduced.
- First full-delivery time and the applicable due date are retained atomically by the existing governed, manual and payment-hold release actions, plus Trial publication. Partial publications are combined and each specimen counted once. Withdrawal removes live coverage and returns the job to the open queue; the retained first-delivery date is not rewritten by reissue. Normal expiration of an agreed download period does not undo completed delivery.
- Historical current publication coverage can prove a job complete without proving its first full-delivery timestamp. These records explicitly show **Complete — timing unverified**, with the date by which the currently published coverage was established; they are excluded from on-time/late classifications until reliable first-delivery evidence exists. No laboratory completion date is reused as customer delivery.
- Release actions explicitly call the delivery recorder before their existing save; it updates the work concurrency token so simultaneous partial releases cannot silently lose a completion transition. No database-wide save hook was added. Existing release authorization, scan/scientific/retention gates and atomic save remain authoritative.
- Due-date changes require the existing Operator/Supervisor permission and optimistic version, retain customer-safe reason/actor/time and never overwrite the original baseline or forecast. Completed/cancelled jobs cannot have their deadline history rewritten. Internal job pages expose the current timing and history through a bounded modal in the existing Actions menu.
- One logical phase remains; no phase entity, phase editor, new commercial agreement or billing change is introduced.
- Migration: `20260918153728_AddJobDeliveryDeadlines`; reviewed and applied only to verified `localhost:5432/phaeno_ops`. ERD updated. Production migration/release remains separate.
- Initial verification: backend build and frontend typecheck/lint passed; generated SQL for paginated filters and aggregate counts translates and executes on the local database. Local retained records currently show one Awaiting acceptance job and three Needs due date jobs, consistent with absent saved turnaround values. No historical dates were guessed. Final UI and documentation checks are recorded below when complete.

### Verification checkpoint

- Backend solution build: passed, zero warnings/errors, including the new regression cases. Frontend typecheck and targeted ESLint: passed. Documentation generator and freshness check: passed (56 guides, corpus `4ca7c5be292d`). Whitespace diff check: passed.
- Local database: migration applied to `localhost:5432/phaeno_ops`; direct read-only queue/count query succeeds. Existing undated records remain explicitly undated.
- Browser: authenticated POMS renders the Jobs navigation and new header controls. The still-running API responds 404 at the new endpoint; API restart requested. Populated list/detail/modal and responsive acceptance remain pending that restart.
- Authored backend unit/query-translation, rollback-scoped PostgreSQL and frontend URL-state regressions. Automated test suites were not run, following the repository’s requested-test policy. No actual publication, due-date change, customer notice, Git operation, shared migration or deployment was performed for verification.

### Authorized local delivery-date backfill — September 18, 2026

The owner requested a backfill and supplied **14 calendar days from first sample acceptance** after inspection established that these jobs had no retained TAT, quote-derived date or active standard offering. Applied only to verified `localhost:5432/phaeno_ops`, in one serializable transaction with work-version updates and per-job audit/work events (`DeliveryDeadlineBackfilled`). This establishes a one-time operational delivery baseline; it does not invent historical quote terms, change global offering configuration, alter processing forecasts, or send customer notices.

| Job | First acceptance (UTC) | Backfilled original delivery due (UTC) |
| --- | --- | --- |
| HS5Y7DB7 | 2026-09-11 19:44:37.234746 | 2026-09-25 19:44:37.234746 |
| FEZQ75G3 | 2026-09-16 17:09:51.801053 | 2026-09-30 17:09:51.801053 |
| 2TNXN7PB | 2026-09-16 23:29:55.228374 | 2026-09-30 23:29:55.228374 |

All three dates were verified against acceptance + 14 days before commit. The fourth job, 69SJN4PA, has no accepted specimen and remains awaiting acceptance. No existing due date or adjustment was overwritten.

### Jobs queue refinement - September 18, 2026

The owner narrowed Jobs to work whose specimens have been sent. Queue eligibility requires a non-packing shipment containing specimens in Shipped, Delivered or Received state, or a recorded non-cancelled specimen receipt for historical/manual intake. Preparing, Ready to ship and cancelled shipments alone do not qualify. Apply this before search, counts, status filtering and pagination. Direct job details and delivery recording remain available independently of queue eligibility. Clear filters moves into the list header and the container lookup is removed from Jobs.

Refinement checks: backend solution build passed with zero warnings/errors; frontend typecheck and targeted Jobs lint passed; help corpus regenerated and freshness check passed (56 guides, c541339df755); whitespace check passed. Regression cases authored and compiled, not executed under the requested-test policy. Browser acceptance remains pending. No database changes or deployment.

### Authorized historical acceptance backfill - September 18, 2026

For Job **69SJN4PA** (`1dfe715e-a315-437c-93a2-9ffea167e6a8`), the owner confirmed that accession preceded the acceptance feature and requested backfill. Verified only local `localhost:5432/phaeno_ops`: seven received/accessioned specimens, 26 available stored tubes with no intake decisions, no started attempts, no executions and no blocking exceptions. In one serializable transaction, accepted all 26 tubes and refreshed each specimen's acceptance using its earliest retained registered-tube accession timestamp on September 10. Correction/review timestamps remain the actual backfill time, with null maintenance actor, explicit historical-correction notes and no claim of a newly performed scientific review. Updated concurrency and job projection versions; preserved shipment/receipt/accession records, storage and operational status.

Completed the previously authorized 14-calendar-day delivery baseline for this remaining job: first acceptance `2026-09-10T21:35:58.727675Z`, original delivery due `2026-09-24T21:35:58.727675Z`. No quote turnaround, processing forecast, global offering, customer notification or publication was changed. Retained seven `HistoricalAcceptanceBackfilled` work events, one `DeliveryDeadlineBackfilled` work event and 34 audit records under request `local-69SJN4PA-acceptance-backfill-20260918`. Fresh post-commit read verified 7 accepted specimens, 26 accepted tubes, the due date and queue status `NoKnownRisk`. This supersedes the earlier note that this job remained awaiting acceptance. Temporary maintenance source removed after completion; no product code or migration required.

### Required delivery date at acceptance - September 18, 2026

The owner confirmed the date becomes mandatory at acceptance, not before shipment. Reuse the configured maximum calendar-day turnaround to calculate the date on first acceptance. When no turnaround exists, require an operator/supervisor to save an explicit date with the existing versioned, reasoned deadline action before accepting samples. The shared tube-intake path checks this before refreshing specimen acceptance; all intake writes remain in their existing transactions. The domain target refresh also rejects accepted work lacking both turnaround and due date. No schema, new API contract or default TAT change. The prior 14-day backfill was not a new global default.

Remove Needs due date from the counts, filter and classification. Historical accepted records without dates remain visible as At risk rather than being hidden or falsely treated as on track. Preserve pre-acceptance Awaiting acceptance and immutable historical completion classifications. Job Actions and its modal distinguish Set due date from Adjust due date; the deadline panel explains the requirement. Manual dates retain existing permissions, audit history and customer notifications.

Verification for required acceptance dates: backend solution build passed with zero warnings/errors; frontend typecheck and targeted ESLint passed; React review confirmed existing query/state and Actions-menu patterns; help corpus regenerated and freshness check passed (56 guides, 26db6eee4de1). Regression cases authored and compiled, not executed. Browser and integration acceptance remain pending. No database migration, data write, Git mutation or deployment for this change.

### Active and Closed queue - approved September 18, 2026

Replace Show complete with Active (default) and Closed tabs. Active retains sent/received eligibility and excludes cancelled or fully delivered jobs; Closed contains delivered and cancelled jobs, including cancellations before shipment. No failed-job terminal state is introduced. Active filters: Job or organization, inclusive local-calendar due-date From/To, deadline All/Overdue/AtRisk/DueSoon, and job status. Closed filters: Job or organization, original order creation From/To, outcome All/Delivered/Cancelled. Trial creation is the order-date equivalent; legacy work without an originating record falls back to its retained creation date.

Use separate URL filter/page fields per tab, preserve on switching and record return, and clear only the selected tab. Date controls accept either endpoint; convert local day boundaries to UTC instants with an exclusive next-day upper bound. Validate ranges on API and UI. Filter, count, order and paginate on the server. Warning counts reflect Active search/date/job-status filters before deadline selection.

Job statuses: Awaiting receipt, Awaiting acceptance, Ready for preparation, Library preparation, Sequencing (including waiting in a sequencing batch), Data processing, Quality review, Awaiting delivery, On hold. Derive sample-attributed progress from retained intake, executions/attempts, libraries and output packages. Use earliest outstanding sample stage; use job milestones as a fallback only without attributed processing evidence, and never infer full-job Awaiting delivery merely from partial publication. Explicit job hold overrides stage. No schema/auth change; extend the existing Phaeno Jobs API only for these approved filters and stage/date fields.

Verification: backend solution build passed with zero warnings/errors, frontend typecheck and targeted ESLint passed, and documentation generation/freshness passed (56 guides, 138d8069cb6f). A read-only transaction against verified localhost:5432/phaeno_ops exercised materialized Active pages, warning counts, all nine stage/date filters, Closed date paging and both outcomes. Four retained Active jobs returned; no Closed records currently exist locally. New test cases compile; suites were not run under the repository's requested-test policy.

Browser check in an isolated signed-in Edge tab confirmed Active default, separate Active/Closed filter controls, preserved search/outcome on switching, clear-current-tab behavior, and inverted date-range feedback through keyboard date editing. The running API still serves the previous response contract, so populated new-filter browser acceptance requires its restart. Added response validation and a distinct query-cache key to avoid displaying old API rows as Closed or showing blank stages during that transition. React review retained shared accessible tabs, labeled controls, immediate range errors, debounced search, query-owned server state, responsive filter grid and existing detail links. No database writes, migration, Git mutation or deployment. Temporary query-probe source removed after verification.

Layout refinement: label the tabs Active jobs and Closed jobs and arrange them in two equal columns across the list width, preserving shared tab sizing and keyboard behavior.

Closed jobs filter layout: Job or organization and Outcome share the first row; Order date From and To share the second row. The inclusive-day timezone note sits below the dates, with underscores replaced by spaces for display. Clear filters remains in the header beside the note. Controls stack on narrow screens; filter behavior is unchanged.

Jobs filters now sit in a collapsed-by-default Filters disclosure on both tabs, with a visible chevron, keyboard focus, applied-filter count and invalid-range indication. Expanding preserves the existing field layout and top-aligned date note/Clear filters row; collapsing does not reset URL filters. Active deadline count links are inside the disclosure (updated by the later layout refinement). Guide updated; no new automated tests for this bounded presentation change.

Clear filters now sits beside the Filters disclosure trigger on both tabs and remains visible when collapsed. The disclosure and clear action are separate keyboard-accessible controls; clearing preserves the expanded/collapsed state and resets only the selected tab.

When Filters is collapsed, display one sentence describing the current tab’s search, inclusive date bounds, deadline/job status or outcome; with no criteria, state that all jobs in that tab are shown. Keep the summary hidden when expanded and wrap long search text.

Date-entry correction: native date fields retain their browser-managed draft during segmented typing instead of routing each keystroke through strict URL date validation. Commit a complete date (or an intentional clear) on blur/Enter, show an inline error for incomplete dates, and retain existing applied filters until a valid commit. External URL values and Clear filters reset the inputs, including unfinished drafts.

Manual Edge verification: typed month/day and the first year digit in both date fields; month/day remained intact (0002-09-18 and 0002-12-31) without changing URL filters. Completed 2026, verified From committed on Enter and To on blur, then verified Clear filters emptied both fields and removed date parameters.

Active filter layout now groups Job or organization, Job status and Deadline status in the first responsive row, followed by a separate two-column Due date From/To row and the timezone note. Overdue, At risk and Due soon count links are grouped directly below the Deadline status selector inside the collapsible content. The first-row fields align at the top. Closed jobs retains its search/outcome and order-date rows.

Added All before the deadline count links; it clears only deadline status and resets the current page, preserving search, job status and due-date bounds.
