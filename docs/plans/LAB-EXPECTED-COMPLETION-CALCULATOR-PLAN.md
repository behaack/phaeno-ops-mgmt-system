# Progress-based expected completion calculator

Status: implemented locally September 18, 2026; local migration applied. The owner subsequently authorized production deployment and required EF migrations. See [release evidence](PORTAL-JOBS-SETTINGS-RELEASE-2026-09-18.md).

Owning area: Lab operations / Jobs. Related plan: [Jobs workspace and deadline tracking](LAB-JOB-DEADLINE-TRACKING-PLAN.md).

## Product need and success criteria

Phaeno laboratory operators, supervisors and Operations need a credible estimate of when a job's results will be available to the customer. The estimate must reflect where each sample is in the process, when it entered its current state, and the expected time still required to finish.

Before this implementation, expected completion was an acceptance-plus-turnaround baseline, optionally overridden by staff. The Jobs forecast now uses progress and configured stage durations, while retaining the original baseline, customer commitment and deliberate staff adjustments as distinct facts.

Success means an operator can see the samples determining the job's expected completion, explain the remaining days, identify stalled work, and distinguish a reliable estimate from missing information. Every displayed calculated date must be traceable to current sample evidence and a versioned timing policy. Measure forecast coverage, overdue-stage frequency, and forecast error against actual Portal delivery after implementation; establish accuracy targets from observed data rather than promise unvalidated precision.

## Confirmed scope and initial defaults

Confirmed by the owner:

- Track each sample's current process state and its entry time.
- Store configurable estimated durations for each stage in a stage-duration table. The owner's examples are Sequencing: 5 days, Data assembly: 2 days, and QC: 1 day; these illustrate the configuration and are not yet approved production defaults.
- Provide a **Stage durations** sidebar page under **Lab settings** for maintaining duration estimates.
- Each workflow stage independently selects **Calendar days** or **Business days**; a workflow may mix both. Business days exclude weekends and configured holidays.
- When an unfinished stage exceeds its estimate, use its actual elapsed duration plus one additional day for that stage, rather than requiring a replacement estimate.
- Calculate expected days remaining using that progress information.
- Completion means results for all samples under the job are available to the customer through the Portal, not merely laboratory completion or scientific approval.
- Keep the committed delivery due date separate from expected completion.
- Jobs currently have one phase. Future phases may have separate deadlines under one contract.
- Partial sample failure does not yet have an agreed whole-job closure rule; this plan must not invent one.

Initial implementation defaults:

- Use configurable, service/workflow-specific stage durations with the owner-confirmed per-stage day basis. Include normal queue/wait time explicitly; do not use hands-on laboratory time alone.
- Use a deterministic calculation first. Statistical estimates, workload/capacity scheduling, staffing calendars and machine learning are later scope.
- Show calculated forecasts internally in Phaeno Jobs first. Do not automatically change customer-visible expected dates, commitments, or send delay notifications.
- Preserve existing manual expected-completion adjustments and their history. Show a staff estimate separately from the calculated estimate; never silently overwrite either.
- Require duration configuration before claiming a progress-based forecast. Missing durations are unknown, not zero. Zero is allowed only when explicitly configured as immediate.

## Current implementation evidence

- `backend/modules/PSeq.Operations.Laboratory/Domain/LabWorkOrder.cs`: `RefreshAcceptedSpecimenTargets` takes the latest original sample target as `ExpectedCompletionAtUtc` unless `HasTimingOverride` is set. The delivery commitment is frozen separately; adjusting it does not recompute the expected completion.
- `backend/modules/PSeq.Operations.Laboratory/Domain/LabSpecimen.cs`: acceptance, receipt and processing timestamps already exist. `SetOriginalTarget` freezes acceptance plus the quoted maximum turnaround. `UpdatedAt` is not proof of state entry.
- `backend/modules/PSeq.Operations.Laboratory/Domain/LabPreparationBatch.cs`: batch start/completion and preparation records provide dated evidence. A batch event applies only to samples actually included in that event.
- `backend/app/Features/LabOperations/Services/LabJobQuery.cs`: current sample progress is derived from intake, attempts/executions, library states and output packages; job status uses the earliest outstanding sample stage. It does not retain a complete duration-bearing sample state history. Portal release evidence already defines delivery coverage, including withdrawal handling.
- `backend/app/Features/LabOperations/Controllers/LabOperationsController.Timing.cs`: manual commercial timing changes have authorization, concurrency, audit and notification behavior. Automatic internal forecasts must not invoke this endpoint or reuse its notification side effects.

Before implementation, inventory the exact authoritative transition and timestamp sources across preparation, sequencing, data processing, review and release. Reuse retained evidence; add explicit transition capture where the evidence is insufficient. Do not treat the current broad queue status as a complete scientific workflow model.

## Sample progress and history

Maintain an authoritative sample progress projection backed by durable transitions. Each transition identifies the job, sample, workflow/version, stage occurrence, attempt or rework cycle where applicable, previous/new state, effective entry time, recorded time and originating evidence. Preserve source IDs for traceability and idempotent replay.

- Track process stage separately from hold/block state. A hold must not erase which work the sample was doing.
- Distinguish waiting to start from actively processing where those have different timing expectations.
- Enter a new stage occurrence only on a real transition. Editing notes or repeated updates to the same state must not restart its clock.
- Retain both effective and recorded timestamps for delayed entry or corrections, with actor and reason. A correction supersedes evidence; it does not delete history.
- Rework creates another occurrence of the relevant work, retaining previous attempts and any still-required downstream stages.
- Do not advance every sample because a batch advances. Respect membership, tube-level exceptions, sample exclusions, failed attempts and partial output completion.
- If a sample has several required libraries or processing branches, calculate all required branches and take the longest remaining dependency path to that sample's delivery. Do not add parallel durations together or treat one released branch as complete sample delivery.

Initial reporting stages should map to the existing Jobs vocabulary:

| Reporting stage | Timing evidence and remaining work |
| --- | --- |
| Awaiting receipt | Shipment/handoff evidence and a known arrival estimate, when available; receipt and all subsequent work remain |
| Awaiting acceptance | Actual receipt/entry into scientific acceptance queue; acceptance and downstream work remain |
| Ready for preparation | Scientific acceptance plus readiness prerequisites; preparation queue and downstream work remain |
| Library preparation | Included sample's preparation/execution occurrence; remaining preparation, library QC and downstream work remain |
| Sequencing | Library queue/batch/send-out evidence; sequencing turnaround and downstream work remain |
| Data processing | Actual data readiness/processing transitions; remaining processing and downstream work remain |
| Quality review | Entry into review, including requests for correction and rework |
| Awaiting delivery | Scientific approval/release readiness; publication time still remains |
| Delivered | Authoritative Portal availability for all required results; no remaining work |

The display stages are summaries. Calculation follows the job's pinned workflow and required dependencies; skip genuinely inapplicable stages and retain conditional-stage uncertainty until resolved. Do not force every service through library preparation or sequencing.

## Timing policy

Create a versioned timing policy linked to the applicable service/workflow version. Store expected durations for waiting and active work where supported, effective date, author and change reason. Use the existing configuration authorization model rather than introduce a new role.

### Stage-duration table

Persist one duration row per configured workflow stage occurrence within a timing-policy version. Maintain these values in a **Stage durations** sidebar page under **Lab settings**, using a view-first list and bounded edit action. Keep **Lab steps** as the default tab. Group/filter rows by workflow and show Stage, Estimated duration, and Day basis. The edit form requires Estimated duration and a clearly labeled **Calendar days / Business days** selector for each stage. Expose missing configuration clearly; values are entered here rather than requiring the owner to supply every duration before building the feature. The calculator reads these rows; durations must not be hard-coded in application logic.

Illustrative configuration supplied by the owner:

| Stage | Estimated days | Day basis |
| --- | ---: | --- |
| Sequencing | 5 | Configurable per stage |
| Data assembly | 2 | Configurable per stage |
| QC | 1 | Configurable per stage |

Each row retains a unique identifier, timing-policy version, stable workflow stage reference, estimated days as a nonnegative decimal, required day basis (Calendar or Business), and explanatory notes. The policy supplies service/workflow scope, version/effective date and audit history. Enforce one row per stage occurrence per policy version. Identify stages by stable references rather than display names; QC may occur at several points, so a QC duration belongs to its specific workflow occurrence rather than every stage containing that label. Map Data assembly to the actual work performed for that service, not automatically to every data-processing activity.

The configured duration covers the documented entry-to-exit interval, including normal waiting unless a separate wait duration is explicitly modeled. Require an estimate for every remaining required stage, including publication; a missing row is unknown, never an implicit zero. Repeated/rework occurrences reuse the applicable estimate for each newly required occurrence. Use the existing pinning and audited policy-change rules below to preserve prior forecasts when an estimate changes.

Pin the policy used for a job's calculation. New defaults apply to new jobs; applying a revised policy to in-flight jobs must be an explicit, audited operation with a preview of forecast changes. Commercial quoted turnaround is not automatically the sum of these durations and must remain independently retained.

Store durations with enough precision to represent partial days. Retain event timestamps in UTC; evaluate day boundaries using a fixed laboratory timezone carried by the timing policy, not the viewer's browser timezone. The business calendar counts Monday through Friday except configured holiday/closure dates. Shift/working-hour calendars remain deferred. Recommended initial laboratory timezone: America/Los_Angeles. Make these assumptions visible in the configuration screen before use.

Calendar stages accrue every day, including holidays; business stages accrue only on eligible weekdays that are not excluded by the configured holiday calendar. Specify one consistent day-addition/elapsed-time helper for fractional days and local daylight-saving boundaries; a business day is an eligible date, not implicitly an eight-hour shift. When work is forecast on a weekend or excluded holiday, resume the business-stage clock on the next eligible day. Include weekend and holiday delays in the projected delivery date. Apply downstream durations sequentially on their own day basis; do not simply sum mixed calendar/business durations. Show the job's total time until delivery as elapsed calendar days and label each stage's own basis. Round only display values, never intermediate calculation steps.

Known scheduled batch start, provider return or release dates may replace a configured wait estimate when authoritative and linked to the sample. Record the source and avoid counting the same wait twice. Never infer those dates from free text.

### Holiday exclusions

Include a **Holiday calendar** section under **Lab settings → Holiday calendar**. Authorized configuration users maintain a view-first list with year filtering and bounded add/edit actions for named holiday or laboratory-closure dates. Use the same permissions, required-field presentation, concurrency and audit rules as stage-duration configuration.

Persist a versioned business calendar with its laboratory timezone, coverage dates and explicit excluded local dates. Each exclusion records a name, date and optional note; prevent duplicate excluded dates within a calendar version. These are local dates, not UTC-midnight instants. Link the applicable calendar version to the timing policy so a forecast can be reproduced. Start with a shared laboratory calendar; separate provider/location calendars are later scope unless required during workflow inventory.

- Staff configure the actual observed closure dates. Do not automatically assume that Phaeno observes every public/federal holiday or move a weekend holiday to Friday/Monday without a configured observed date.
- Support consecutive holidays and additional laboratory closure days. A holiday falling on a weekend is excluded only once; it does not subtract an extra weekday.
- Apply exclusions consistently to elapsed business time, future stage durations, remaining business time and the actual-plus-one-business-day overrun allowance. Calendar-day stages are unaffected, and the committed job due date is not changed.
- For example, one remaining business day from Friday at 10:00 forecasts Tuesday at 10:00 when the following Monday is an excluded holiday, assuming no timezone-offset change. It forecasts Monday when there is no Monday exclusion.
- Staff confirm calendar coverage for the period being used, including a year with no excluded holidays if that is intentional. Warn before coverage expires; if the projected path extends beyond confirmed coverage, flag incomplete calendar configuration instead of silently assuming there are no future holidays.
- Calendar edits create a new version and retain history. Use the same explicit preview/apply process as duration-policy changes for in-flight jobs; do not silently rewrite their pinned calendars or historical forecasts. Recompute affected forecasts after authorized application without sending customer notices.

No external holiday API or automatic recurring holiday rule engine is required initially. Named observed dates provide direct control and avoid dependencies on a jurisdiction's default holiday list.

## Calculation rules

At evaluation time `now`, for each outstanding sample:

1. Resolve its current required stage occurrence and entry timestamp from authoritative evidence.
2. Load the pinned duration policy and required remaining workflow path, including publication.
3. Compute current-stage elapsed time from its entry time using that stage's Calendar/Business day basis. Retain wall-clock age separately and exclude explicitly recorded holds only where the policy pauses active work during holds.
4. While below the configured estimate, project the current stage's exit from its original entry time plus its estimated duration. Once the duration is exhausted and the stage is still unfinished, use `projected total stage duration = actual elapsed stage duration + 1 stage day`. Thus its remaining allowance is one day on that stage's configured basis. Treat the exact exhausted boundary as an overrun for this purpose so unfinished work does not temporarily receive a zero-day allowance.
5. Starting at that projected exit, add each subsequent serial stage's duration using its own day basis. For parallel work use the latest required dependency completion, including joins and known waits.
6. The final projected completion of all required work is `sample expected delivery`. Calculate the displayed remaining calendar days from that timestamp and `now`. Store the evaluated time, policy version, evidence version and explanatory breakdown.

As time passes normally within a stage, remaining time decreases while its projected exit stays anchored to entry plus duration. After overrun, the owner's actual-plus-one rule deliberately keeps one stage day ahead of the evaluation time until a real transition is recorded. Repeated evaluation must derive this from actual elapsed time, not add another day to the previous forecast. Preserve the configured estimate and actual stage entry; do not overwrite either with the rolling allowance.

Example, assuming Calendar days for all three illustrative stages: a sample entered a five-day sequencing stage two days ago, followed by two days of Data assembly and one day of QC. Remaining time through QC is `(5 - 2) + 2 + 1 = 6 calendar days`. Add any remaining publication or other required stage time to obtain the expected Portal delivery date; the six days alone is not a complete delivery forecast unless no further time remains. These values are not approved production defaults.

Exceptions must be explicit:

- **Stage overrun:** continue forecasting with actual elapsed time plus one stage day. For example, sequencing estimated at five calendar days and still active after seven uses eight days as its projected total, leaving one day of sequencing plus all remaining stages. If it is still active after eight days, use nine; never add the full elapsed duration to `now` again. A business-day stage gets one eligible business day, so weekends and configured holidays may extend the wall-clock forecast. Show **Stage estimate exceeded — using one additional day** and retain the original target/overrun age. An overrun alone does not require staff to enter a replacement estimate or make the forecast unavailable; explicit holds, missing information and unresolved failures remain separate conditions.
- **Hold/block without a reliable release date:** show Blocked / completion not currently predictable. Keep the hold reason, stage age and known remaining work. If a reliable resumption date is supplied, include the wait once and retain its source.
- **Missing entry time, duration or required branch decision:** show Insufficient information with the specific missing fact. Do not fabricate a timestamp or substitute the turnaround baseline without labeling it.
- **Failed sample or exhausted material:** require an explicit resolution/rework decision. Do not silently exclude it, mark the job delivered, or invent a failed-job terminal state.
- **Not yet received:** do not claim a reliable end-to-end date without a supported arrival estimate and applicable workflow. A provisional baseline may remain visible with its existing label.

For the job, take the latest expected delivery across all outstanding required samples, not their average or sum. Show the sample(s) and stage(s) driving that date. Delivered samples have zero remaining work; job completion still requires the existing authoritative all-samples release rule.

If any required sample has an unknown/blocked estimate, the job has no reliable calculated completion date. Show forecast coverage (for example, 8 of 10 samples estimated) and the unresolved samples. Never present the latest known subset date as the whole-job forecast. Cancelled jobs are Closed with no operational completion prediction. Explicit release withdrawal must re-evaluate affected delivery coverage and remaining work.

## Jobs experience and deadline risk

- In the Jobs list show Calculated expected completion, remaining calendar days, and a concise explanation or Needs review/Blocked/Insufficient information state.
- In job detail show sample, current stage, entered date/time, time in stage, remaining days, expected delivery, timing source and reason for uncertainty. Identify the samples determining the job date. Keep the record view-first and use the existing Actions pattern for corrections and staff estimates.
- Keep original turnaround baseline, calculated forecast, staff estimate and committed delivery due date visibly distinct. Record why a staff estimate differs and when it was last reviewed.
- A current calculated forecast later than the due date makes the job At risk. Display stage overruns even when the rolling forecast remains within the delivery commitment; stage overrun alone is not proof of a missed job deadline. Existing holds/blocking conditions remain At risk. Missing timing information needs visible attention without pretending a deadline miss has been predicted.
- Keep Overdue ahead of At risk, and Due soon as the existing 72-hour warning. Do not change these labels or windows as an incidental part of the calculator.
- Retain the existing manually adjusted expected date as a risk signal; a more optimistic automatic forecast must not silently clear a staff-recorded risk. An explicit staff forecast later than the commitment remains a risk signal even when the automatic calculation is earlier; the turnaround baseline alone is not a progress forecast. Automated stale-estimate review is deferred.
- Meet existing accessibility, responsive, semantic-token and keyboard standards. Explain forecasts in plain language, not confidence percentages unsupported by evidence.

## Engineering work and delivery sequence

1. **Evidence map and approved timing values:** document each state transition's authoritative source, gaps, required branches and duration configuration. Use the confirmed decisions below; enter operational duration values through configuration.
2. **Durable tracking:** add only missing transition/history, timing-policy and versioned holiday-calendar persistence; update the database ERD and create migrations. Apply only to a verified local database within authorized implementation; shared/staging/production migrations require explicit approval. Capture new state transitions atomically with source writes; enforce concurrency and unique source-event identities.
3. **Calculator and projections:** implement a deterministic domain service with an injected clock. Produce versioned per-sample and per-job snapshots with coverage, drivers and reasons. Recompute after relevant transitions, holds, schedules, release/withdrawal, membership or explicit timing-policy/calendar changes, plus read-time refresh of elapsed time and a bounded periodic refresh for unattended stage overruns. The scheduler is not required to obtain a current forecast when viewing Jobs. Reads must not write history or send notifications. Superseded calculations must not overwrite newer evidence.
4. **Internal API and Jobs UI:** expose additive, authorized internal forecast fields; use the same projection for list, detail, sorting and risk classification. Avoid per-job/per-sample query fan-out; index source and current-state lookups. Keep customer/partner responses and notifications unchanged during the initial rollout.
5. **Historical coverage:** produce a read-only assessment of reconstructable state entry times. Backfill only supported facts in an authorized, audited, idempotent operation; leave uncertain timestamps explicitly unknown. Preserve effective historical time separately from backfill time.
6. **Verification and rollout:** compare calculated forecasts with existing baselines in an internal preview before promoting them in Jobs. Preserve a fallback to the labeled baseline if the calculator is disabled. Update Phaeno help when behavior ships; keep this proposal out of current-behavior guides until then.

Preserve tenant scoping, existing roles, optimistic concurrency, centralized audit stamping and API envelopes. Keep work in the existing Laboratory domain and LabOperations feature. No new dependencies or automatic customer communication are part of this plan.

## Acceptance and verification plan

- Same state plus a notes edit does not restart the clock; a genuine transition does.
- The illustrative six-days-through-QC example calculates correctly and adds remaining publication work; staggered and parallel samples produce the latest required delivery date.
- A batch progressing or a library completing does not advance excluded or unresolved samples.
- Delivered samples stop contributing; partial publication does not finish the job; withdrawal restores the affected work.
- A hold, missing timestamp/duration or unresolved failure produces the right explanation without a false confident date. An unblocked stage overrun continues forecasting with the labeled actual-plus-one allowance.
- A five-day stage at seven days elapsed forecasts eight total stage days; at eight forecasts nine. Repeated reads at the same instant do not accumulate extensions. Completing the stage removes that allowance and advances to actual downstream work.
- Mixed Calendar/Business stage paths, Friday/weekend entry, one-business-day overrun, fractional days, and daylight-saving boundaries produce consistent dates regardless of the viewer's timezone.
- Holiday checks cover observed weekday holidays, weekend holidays without double exclusion, consecutive closures, cross-year paths, elapsed business time and actual-plus-one overrun. Calendar-day stages remain unaffected.
- Missing/unconfirmed calendar coverage is visible. Duplicate exclusion dates are rejected; calendar version changes preserve historical calculations and affect in-flight forecasts only through explicit application.
- Stage durations and Holiday calendar are separate sidebar pages in Lab settings; Lab steps remains the default. Each stage has its own duration and day basis, saved together in a versioned timing policy under existing permissions and concurrency rules.
- Rework creates a new occurrence and accounts for repeated required work without double counting prior completed work.
- Repeated/out-of-order events, delayed entry, corrections, retries and concurrent updates preserve valid history and deterministic forecasts.
- Policy changes preserve pinned in-flight calculations unless explicitly reapplied. Manual estimates and customer-facing dates are not silently overwritten.
- Tests cover exact stage boundaries, fractional days, UTC/local display, daylight-saving changes, future/invalid entry times, missing samples and cancellations.
- Verify queue risk, counts and detail agree; collapsed filter summaries and existing queue behavior remain intact.
- Verify internal permissions, read-only safety, paging/query performance and no duplicate notifications.
- Update BACKEND-TEST-PLAN.md, FRONTEND-TEST-PLAN.md and E2E-TEST-PLAN.md when implementation adds or changes coverage. Run checks and requested suites at a logical checkpoint; distinguish software evidence from scientific timing validation.

## Decisions and remaining configuration

The owner has resolved the requested product inputs: maintain estimates through Stage durations in Lab settings, choose Calendar/Business days per workflow stage, use actual-plus-one-day when a stage overruns, and exclude configured holidays from business days. These supersede the earlier calendar-only and Needs review-on-overrun proposals. Holiday calendar is its own sidebar page.

Initial durations and their day bases will be supplied through the configuration screen; the illustrative 5/2/1 values are not automatically seeded as production policy. Missing configuration prevents a claimed complete forecast but does not prevent implementing the screen and calculator.

Use the documented Monday-Friday business calendar and fixed laboratory timezone as explicit initial assumptions. Holiday exclusions are included in scope through the configurable calendar; the actual observed dates will be entered there. Retain the proposed internal-only rollout and separate manual estimate history; no customer communication is authorized by these planning decisions.

Deferred: capacity-aware scheduling, empirical duration/residual models, forecast accuracy thresholds, multi-phase contract forecasting, and partial-failure job closure policy. Preserve identifiers and evidence so these can be added later without redefining historical events.

## Implementation record — September 18, 2026

- Added versioned business calendars/observed dates, workflow timing policies and per-stage durations, append-only job policy assignments, source transitions, and forecast snapshots. Migration: `20260918191923_AddLabCompletionForecast`; the complete database ERD is regenerated.
- Stage durations uses each actual workflow-stage identifier plus acceptance, library QC, sequencing, data assembly, scientific review and Portal publication. A policy explicitly indicates whether library QC/sequencing is part of that service. Configurations are versioned as a whole, edited in a bounded modal, and displayed view-first in the configuration tab; no separate detail route is needed for this settings surface.
- Protocol administrators and supervisors maintain policies/calendars. Existing Jobs reader roles can read forecasts. New jobs pin the latest configured policy for the Trial-approved or current production service workflow; new sample attempts pin an as-yet-unassigned workflow policy without replacing existing revisions; existing jobs require a read-only, paged before/after preview and an explicit version-checked application with a reason. Configuration alone never changes an existing commitment or customer notice.
- Live reads calculate from one repeatable-read evidence snapshot; the hourly worker stores append-only internal evaluations. New source state changes are captured atomically with their existing writes. Reads do not write snapshots; there is no customer reminder or immediate event-triggered snapshot dispatcher. Source tracking plus live reads provides immediate visibility; unattended snapshot history is hourly.
- The current ordered workflow supplies the serial protocol path. Commercial jobs need not have a job-level workflow pin: current sample attempts select their own workflow version, and each job retains separate policy assignments for those versions. Policy previews include service-compatible commercial jobs, preserve explicit Trial scope, and apply only to the selected workflow. Current attempt stage decisions and executions exclude prior attempts; restarted attempts use their new occurrence rather than original acceptance. Independent outstanding libraries are calculated separately and their latest required completion drives shared downstream work. An early result package overlapping unfinished preparation/library work is explicitly unresolved, rather than a false complete path. Arbitrary future workflow dependency graphs and multi-phase contracts remain deferred.
- Existing trustworthy receipt, acceptance, execution completion, package creation and scientific approval timestamps are used. Library QC/completion and package review transitions are captured going forward. Historical missing transition times remain unknown; no timestamp is inferred from generic `UpdatedAt`, and no history backfill was performed.
- Holds, failures, unresolved conditional decisions, missing duration/entry evidence, and business-calendar coverage gaps prevent a complete date and explain why. Known provider sequencing dates may extend the estimate. Delivered/cancelled samples do not contribute to remaining work. The current required release rule remains authoritative.
- Calendar/business arithmetic is in America/Los_Angeles. Fractional business days count eligible local-day time, with closure/weekend starts advancing to the next eligible midnight. Zero downstream duration is immediate; an unfinished current stage at its exhausted boundary still receives the one-day overrun allowance. No shift-hours model is implied.
- Queue counts and risk filtering use the same calculated forecasts as detail; source queries are batched, followed by server-side deadline classification and pagination. The query currently evaluates all matching candidates, so large-volume performance acceptance remains pending rather than claiming a materialized queue optimization.

### Verification and operational setup

- Local database identity verified as `localhost:5432/phaeno_ops`; migration applied and zero pending migrations confirmed.
- Read-only coverage assessment: four existing queued jobs were calculated without business-data writes; three lack timing policies and one is blocked by existing sample/attempt conditions. No example durations or holiday dates were seeded.
- Backend build, frontend type checking and targeted accessibility/lint checks are used as implementation checks. Automated test suites are not run because repository instructions require an explicit request. Authored clock and PostgreSQL projection regressions are tracked in the living test plans.
- Signed-in browser verification confirms Stage durations loads its real workflow/stage data and the new holiday-calendar dialog exposes coverage, observed dates, names and revision reason with the required-field legend. The Jobs queue also displays the four real jobs with calculated forecast coverage and explicit Blocked/Insufficient information states. Job detail exposes the sample stage/entry/age and missing-policy explanation, and the narrow viewport check found no horizontal overflow. The unsaved form was cancelled; no operational timing policy or holiday calendar was created merely to verify a screen. Full configuration-save, preview/apply and scheduled-worker acceptance remains pending requested execution.
- Initial setup: create a holiday calendar with confirmed coverage, configure each workflow’s durations/day bases, then preview/apply the chosen policy to existing jobs. Existing baselines/manual estimates remain visible separately while configuration or history is incomplete.
- Customer commitments, customer/partner help and notifications are unchanged. No dependency or authentication change is included; the subsequent release authorization is recorded above.


### Stage durations header refinement

The workflow-version selector and timing-policy/calendar setup messages now sit inside the Stage durations card header. Stage rows remain in the card body. Existing selection, permissions and actions are unchanged. Existing help instructions remain accurate; no guide update is needed for this placement-only change.

### Holiday calendar tab refinement

Holiday calendar has its own Lab settings sidebar page, following Stage durations. Its revision/coverage message, coverage warning and year filter are in the card header. Display dates use `MMM dd, yyyy` without timezone conversion; saved holiday rows open in ascending observed-date order in the editor. New rows stay where added while editing so date typing does not reorder the focused field. Lab steps remains the default. Phaeno help updated in the same change.

Verification: frontend type checking and scoped lint passed. Signed-in browser confirmed the standalone tab, header placement, formatted dates, absence of the calendar from Stage durations, and all 15 existing editor rows in ascending observed-date order. The editor was cancelled without saving.
