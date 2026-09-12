# Library preparation batches and connected workflow

Status: implemented and focused local verification complete, September 11, 2026. Owner/physical acceptance and production release remain pending. Preparation batches, tray configuration, scoped execution, outputs, QC reuse and sequencing handoff are implemented locally. Verification details and remaining physical/production gates are recorded below.

## Outcome and users

Laboratory Operators assemble tubes into a tray and perform library preparation as one batch. Supervisors handle exceptions and review QC where the approved method requires it. Scientific Reviewers retain the separate result-release decision. The operator should see the next permitted action without manually connecting underlying records.

Receipt/accession, controlled protocols/workflows, materials and equipment remain supporting capabilities. Library prep becomes a preparation-batch workspace; specimen and job histories remain accessible throughout.

## Agreed product rules

- A preparation batch is distinct from a sequencing batch. One configurable tray belongs to each preparation batch.
- Tray formats define a name, rows/columns, position labels (such as A1–D6 or 1–24), optional unavailable positions, and active/retired status. Show a layout preview. Retiring or changing a format must not alter existing batch layouts or history.
- Partial trays are allowed. Every selected tube must have a confirmed position; empty positions are explicit.
- Tubes may come from different jobs when their pinned preparation workflow versions are compatible. First-release compatibility means the same approved workflow version; do not silently repin a job to make it fit.
- Select accepted, physically eligible tubes through barcode confirmation. Preserve the one-tube-per-specimen rule and exclusive source reservation across competing batches.
- Membership and positions may change before preparation starts. Starting locks membership, positions, the tray-layout snapshot and the workflow version. The batch stays together until completion; no splitting or transfer after start.
- A failed tube stays in the batch history. Its failure does not automatically fail the other tubes. A reserve enters a new preparation batch only after the previous attempt is explicitly failed; it never replaces a tube in a running batch.
- Reuse preparation-protocol QC for library eligibility. Do not require the same measurements or disposition to be entered again in a separate library form. Existing independent scientific-review requirements remain separate.

## Batch-first evidence and tube exceptions

The approved protocol defines scope for each capture rather than leaving the operator to invent its meaning:

| Scope | Operator entry | Evidence meaning |
| --- | --- | --- |
| Batch | Record once, for example incubation time, temperature, reagent lot or equipment | A shared observation for the explicitly covered tubes, not individual measurements |
| Tube | Record for each applicable tube when the method requires it, such as individual concentration or yield | An individual observation tied to that tube and attempt |
| Shared value with exceptions | Enter the common value once and record different values/outcomes against identified tubes | Shared evidence plus explicit tube exceptions; the effective value remains traceable to both |

Before saving a step, show which tubes it covers and require confirmation. Default coverage includes tubes still participating; failed or excluded tubes cannot inherit later successful steps or gain sequencing eligibility. Exception entry identifies the tube/position, reason and any differing value or outcome. Preserve prior records when a step is repeated or corrected. A change to shared evidence must trigger the appropriate downstream re-review for affected tubes.

QC must resolve for each tube from its applicable shared and individual evidence, following the pinned method. An exception must not be hidden by an overall batch Pass. An unresolved Hold blocks that tube's progression; a current batch-wide blocker affects all covered tubes. Do not treat a QC Hold as an automatic failed attempt or reserve start. Customer-requested holds remain blocked from implementation.

## Connected operator journey

1. **Assemble:** create a preparation batch, choose its workflow and tray format, find eligible tubes across jobs, and scan into positions. Show specimen/job identity, source eligibility and conflicts before Start.
2. **Start:** review the tray and membership, confirm identities and lock the batch. Establish or reuse compatible unstarted attempt/execution records without duplicating them; preserve explicit barcode checks.
3. **Prepare:** open ordered steps from the batch. Record shared data and resource use once, add tube-level values/exceptions as required, and keep the tray and current blockers visible.
4. **Create outputs:** create or select derived containers within the preparation context. Carry the known job, specimen, attempt, source parent and execution automatically. Confirm output identity and actual quantities; do not require users to reassemble these relationships in a separate library form.
5. **Assess QC and complete:** reuse recorded preparation evidence to determine individual library outcomes. Account for every member as successful or explicitly failed before closing the preparation batch. Holds and pending decisions prevent closure. Successful outputs can become eligible only when their required preparation and QC are complete.
6. **Handoff:** show eligible libraries and existing sequencing membership, with a direct route to Sequencing batches. No automatic pooling, dispatch, provider communication or result release. Results & review remains the later scientific-review entry point.

## Workflow disconnects explicitly in scope

| Walkthrough problem | Required improvement |
| --- | --- |
| Preparation starts by navigating individual jobs/specimens | Batch-first landing page and tray workspace with specimen drill-down |
| Operator leaves execution to create containers or record resources | Bounded actions inside the current batch/step, returning to the same context |
| Repeated entry of known specimen/source/execution references | Carry verified links forward and display them for review |
| Separate library creation after preparation | Establish the library from its prepared output and completed evidence without a second manual linkage exercise |
| Re-entering preparation QC as library QC | One authoritative evidence set, with traceable per-library eligibility |
| Unclear next action and generic errors | Specific next permitted action, affected tubes and actionable blocker explanations |
| Batch-wide work obscures individual outcomes | Per-position status, exception details and preserved specimen/attempt history |
| Disconnected sequencing handoff | Visible eligible outputs and membership; specific duplicate-membership feedback |

This is a workflow redesign, not only a tray view or a navigation rename.

## Delivery sequence

1. Produce a reviewable batch list, assembly/tray, step capture and completion/handoff design using these rules.
2. Implement tray configuration and draft assembly, including eligibility, reservations, position uniqueness and immutable start snapshots.
3. Implement batch execution, scoped evidence, shared resource references and tube exception handling without duplicating physical consumption records.
4. Integrate output/library creation, QC reuse and the sequencing handoff. Preserve approval, audit, concurrency and cross-job authorization boundaries.
5. Run the focused acceptance journey and update user help and living test plans. Apply verified model changes to local development only under existing migration rules; update the ERD with any persisted model changes.

Make technical decisions within this scope. Do not alter older approved definitions to infer capture scopes: new scopes need explicit versioned definitions. Historical executions retain their original evidence; existing unstarted work requires compatibility checks before reuse. Mixed-job batches must remain authorized for every member, and locking/reservation must be atomic.

## Acceptance and success measures

September 12 signed-in UAT: [LAB-14 run checkpoint](../testing/runs/2026-09-12-lab-14-preparation.md) records the saved tray format and isolated protocol, now Approved v1 through the separate test-reviewer account. A review-display defect omitted evidence/QC scopes; corrected and verified with three focused tests and live inspection. Administrator inspection found that the service selector exposes only the fixed PSeq service, so creating a separate catalog item cannot unblock setup. An isolated local UAT environment now runs at port 3014 with v2 approved by the separate reviewer account and promoted only in the isolated database. Immediate workflow approval under audit-only settings was withdrawn; see the run record. Full batch execution is not yet accepted.

- Assemble a partial tray using tubes from multiple jobs on the same workflow; reject incompatible versions, unavailable tubes, duplicate positions and competing reservations without partial saves.
- Edit draft membership/positions; after start, attempts to move, replace or split tubes are rejected. Later tray-format edits/retirement leave existing layout unchanged.
- Record a shared value once; record one tube exception; verify effective evidence and QC for each tube without presenting shared data as individual measurements.
- Require individual captures when prescribed. Preserve Hold/repeat and correction history, with affected downstream evidence requiring re-review.
- Fail one tube while others progress; prevent later success inheritance and sequencing eligibility for that failed tube. Reserve fallback starts a new batch/attempt from the required first stage.
- Create outputs and resource links without leaving batch context or retyping known identifiers. Count physical reagent consumption once, with traceability to all covered tubes.
- Reuse preparation QC without a second manual QC entry. Account for all member outcomes before completion; preserve separate scientific approval and release gates.
- Check cancellations, uncertain retries, stale versions, concurrent saves, authorization denial and batch membership errors. Keep physical/provider acceptance separate from synthetic tests.
- Success: no manual re-entry solely for linking records; no duplicate QC measurement entry; next action or blocker visible in the batch workspace; prior history unchanged.

## Boundaries and preserved walkthrough

The implemented navigation is Receipt & accession → Library prep → Sequencing batches → Results & review. Later groups remain PSeq kits / Data assembly, Materials / Equipment, then Lab configurations. Library prep retains the legacy work URL; Results & review opens the same jobs at Review with preserved return context. Neither queue's inclusion proves readiness.

### Lab configurations and shared tabs — September 11, 2026

The owner approved separating laboratory setup from bench work. Supervisors and Protocol Administrators manage preparation layouts in the last sidebar section, **Lab configurations**, with a cog icon and the existing divider. Its tabs are **Protocols**, **Workflows**, and **Tray formats**, in that order. Operators continue selecting active formats in Library prep; a missing format or compatible workflow links to the relevant configuration tab. Preparation-batch membership, immutable layout snapshots, permissions, workflow approval, and QC remain unchanged.

The existing `section=protocols` URL remains supported and defaults to Protocols. `configurationTab` preserves selection on refresh and browser history. Workflow-builder save, cancel and return navigation opens Workflows. Format management uses the existing bounded configuration dialog with a live tray preview; these reusable layouts are settings, not major operational records requiring a new record workspace. The tray list retains the shared shaded header and separate record rows.

The owner's application-wide tab consistency request is implemented in the shared Portal tabs: 36 px minimum triggers, 42 px single-line strips, common padding, typography, selected surface, focus and disabled states. Removed local sizing overrides in laboratory, CRM, account and Web Operations pages. Responsive grids and label wrapping may grow while retaining the minimum target size. The durable rule is recorded in [UI/UX principles](../ui-ux-principles.md).

Acceptance: confirm the three configuration tabs, direct links/refresh, correct builder return, role-gated format actions, no format-management actions in Library prep, and consistent tab geometry/keyboard access across representative workspaces. Refresh help and the LAB-14 manual journey. This navigation change does not authorize production deployment or operational writes.

Local verification completed: TypeScript, scoped lint, help generation/consistency and diff checks passed. Signed-in inspection confirmed the three tabs, direct Tray formats loading, preview/cancel, Library prep's single create action, keyboard setup-link navigation, and workflow-builder return to Workflows without saving. Receipt/configuration strips match at 42 px with 36 px triggers. The existing Web Operations fixture was inspected at 1440, 390 and 320 px with keyboard, dark and reduced-motion coverage; no overflow or runtime errors were observed. Wrapped labels increase the shared row height as needed. User guides, frontend/E2E plans and LAB-14 were updated. No full test suite or populated tray-format mutation was run for this follow-up.

Preserve TEST-008's successful Attempt 1, its two completed executions, output PH-L-U9QNAFGL5R-E and sole membership in draft PH-BAT-20260911-KNFHQ3Z8. Do not retrofit a fictional tray or recreate fixtures. Use separate synthetic preparation-batch fixtures for the new model.

PSeq kits acceptance and eventual hiding remain separate work. Partner Data assembly is not the laboratory sequencing-data pipeline. New data processing, customer-requested holds, run-all/subset policies, multi-tray preparation batches and post-start splitting/transfers are outside this scope. Deployment, shared-database migration, authentication and dependency changes retain their existing approval boundaries.

References: [Lab Operations](LAB-OPERATIONS-PLAN.md), [specimen attempts](SPECIMEN-TUBE-ATTEMPT-PLAN.md), [UAT record](../testing/runs/2026-09-11-protocol-preparation.md), [UI principles](../ui-ux-principles.md).

## Implementation decisions and reviewable screen design

- Library prep opens the preparation-batch list. Bounded creation uses a name, active tray format and compatible approved workflow. Existing jobs remain under a lookup disclosure; historical work is never assigned a retrospective tray.
- The batch detail page shows its name/status, next action, position map, per-tube disclosures, ordered stages, sequencing handoff and retained history. Draft position actions scan, move or remove; start locks the saved layout. A wide tray can scroll horizontally without making the entire page overflow.
- Step dialogs show exact coverage, shared observations, individual values and tube exceptions. Required individual captures stay individual. Repeats/corrections preserve prior entries and invalidate later review within that execution. Completed executions remain immutable.
- Output creation carries job/specimen/source/attempt links, allocates the library barcode, records quantity/storage, and requires a subsequent identity scan. Existing compatible outputs can also be selected in the tray with an identity scan and their recorded quantities carried forward. The final stage creates the library and references the existing QC records. Closing the tray is required before sequencing membership.
- Each tube retains its existing specimen attempt and per-stage execution. A preparation record stores one original command with shared values, exceptions, coverage, actor and time; effective execution records reference that original. Physical material/equipment use is stored once and linked to the same preparation record.
- Batch commands take a batch lock and sorted job locks, apply current job/Trial checks, and use optimistic versions on related work. Existing source-attempt uniqueness remains the reservation authority. A removed draft member retains history and cancels its unstarted attempt.
- Receipts use the command identifier plus actor and exact request hash. The client retains the identifier and original version after an uncertain response; a definite rejection permits a new reviewed command. No customer-requested hold workflow, provider dispatch or result release was added.
- Migration `20260911234552_AddLibraryPreparationBatches` adds four tables and nullable resource provenance references. Applied only to the verified local `localhost/phaeno_ops` database. ERD regenerated: 178 tables, 2,685 fields, 413 foreign keys.

## Verification checkpoint

- API build, frontend type checking and scoped lint passed. The local database migration is applied and the complete ERD is current. User guides and the generated 56-guide help corpus were updated.
- Ten preparation domain cases plus five existing attempt cases passed. Two PostgreSQL journeys passed: mixed jobs with a required final stage, and an optional final stage with a pre-existing output. Coverage includes true competing reservations, stale versions, Customer read/write denial, immutable start, command replay, one physical material consumption, tube Hold/failure isolation, output identity, QC reuse, sequencing duplicate rejection and reserve fallback. A fixture-query translation error in the optional-stage test was corrected and that journey rerun successfully.
- Five protocol-authoring tests passed, including explicit scope validation, scoped round-trip and preservation of older definitions.
- Ten browser checks passed: five journeys in desktop Chromium and mobile Chromium, including shared/exception payloads and automated accessibility, failed-tube exclusion, contextual output creation/selection, uncertain-response retry with original command/version, and nested material use with exact selected coverage and unfinished step retention. The shared-entry mobile case used dark theme and reduced motion. These deterministic browser fixtures do not constitute persisted or physical laboratory acceptance.
- Signed-in local POMS inspection confirmed the batch landing page, live tray preview and cancellation without a saved format. The updated select matched its 446 px field width. Historical HS5Y7DB7 work remains outside these fixtures; synthetic PostgreSQL records were independently created and cleaned.
- [LAB-14](../testing/06-laboratory.md#lab-14--preparation-trays-shared-evidence-and-sequencing-handoff) contains the complete manual acceptance journey. Held/closed Trial races, every staff-role combination, physical tray/scanner/label handling and owner sign-off remain manual acceptance gates. No provider processing, shared-database migration or production deployment was performed.

## September 12 — System-generated preparation identifiers

Approved: remove the operator-entered preparation batch name. On successful creation the API assigns `[service]-[yyyyMMdd-HHmmss]` using UTC; PSeq Lab Service uses `PSeq`. Same-second collisions receive `-02`, `-03`, etc. Allocation is serialized in the existing PostgreSQL transaction and checks existing names; the retained request ID returns the original batch on an uncertain retry. A new create intent receives a fresh request ID even if tray/workflow/notes match. Names remain immutable; historical batch names are preserved.

Optional notes (maximum 2,000 characters) are retained in the existing create-history JSON and shown on the batch workspace. No persisted model or migration changes. Older clients may still send Name, but new identifiers are server-owned. Sequencing-batch naming is outside this preparation-form change.

Acceptance: create without a name; service/timestamp heading appears; notes survive reload; distinct requests at the same timestamp stay unique; a same-request retry returns one identity; existing names and the saved LAB-14 walkthrough remain unchanged. Backend regression assertions were extended; automated execution is deferred for this code-change request. API build, frontend TypeScript, scoped lint, generated help consistency and whitespace checks passed. Tests were not executed for this code-change request.


September 12 LAB-14 follow-up: failed-output scan prompts removed while traceability links remain; terminal specimens use Processing outcome. Live saved-record inspection passed. Failed-output regression passed on desktop/mobile (2); all 11 preparation-domain tests passed, including new repeat reason/history coverage and existing correction invalidation. Manual correction/repeat remains separate and pending; see the active run record.

September 12 follow-up: signed-in correction/repeat now passed in isolated batch PSeq-20260912-155647, including missing reason, retained Hold history, later QC invalidation, fresh review and completion. Complete stage now displays batch/stage consequences instead of an empty form body; required legends depend on required fields. See active LAB-14 run for boundaries.

September 12 resource UAT: signed-in expired-lot and overdue-equipment saves rejected without usage or inventory changes. Preparation selectors now exclude those known-ineligible choices using inclusive UTC dates; server checks retained. Draft move, reason-required removal and same-source re-add passed. Active fixture and remaining gates recorded in LAB-14 run.

September 12 UI adjustment: stage Actions moved to the top-right of its card alongside the expandable title, outside the summary control. Title reserves space for the compact menu. Menu contents and processing rules unchanged.

September 12 job-label correction: work-order summaries now include an additive displayName derived from Commercial order number, then OpaqueSubmitterReference, then WO plus full work-order ID. Dashboard, work queue and detail use this label; original Commercial fields retain their meaning. No schema change. Dashboard Open Lab operations action moved to the card header. Verified distinct test names and matching detail heading as William on isolated UAT.

September 12 Operator acceptance: William's routine preparation/resource saves passed on PSeq-20260912-160957; correction controls withheld and Supervisor QC remains required. Premature stage completion rejected. Preserve the active batch at 12 history entries for separately signed-in Supervisor handoff. Full LAB-14 remains partial; evidence and remaining gates are recorded in the active run.

September 12 Supervisor follow-up supersedes the active-batch checkpoint: William returned with the Supervisor role and successfully recorded individual QC, completed the required stage, justified the optional skip and closed PSeq-20260912-160957. Reopened batch is Complete with 18 history entries, one successful tube and one eligible unassigned library using preparation QC. Preserve it as completed. Role-transition acceptance passed; different-person review and remaining LAB-14 gates remain open in the run record.

September 12 sequencing handoff: resource library now assigned to PH-BAT-20260912-67TYPTVD, retained in Draft with two libraries. Duplicate scan blocked; frontend feedback now distinguishes Batched from missing QC and directs users to the preparation assignment. Focused scanner tests and signed-in verification passed. No server rule, schema or provider action changed; remaining acceptance gates remain in the run record.

September 12 tray snapshot acceptance passed: temporary edit/retirement excluded the test format from new batch creation without altering the existing draft layout, membership or history. Original Active 2 × 3 format with B3 unavailable restored. See LAB-14 run; no product implementation changes.

September 12 linked-record acceptance: completed resource specimen and execution retain attempt history, named evidence and resource entries, direct tray work back to preparation, and expose no individual processing controls. Corrected the execution resource guidance to identify preparation as the entry point for tray-owned work. Signed-in verification and scoped lint passed; guide already matches this behavior. No operational records changed.

September 12 reviewer draft correction: Draft status messaging now distinguishes read-only access from closed preparation, and explains positions lock at start. Scientific Reviewer session confirmed absent operating controls and unchanged draft history. Resource job remains Processing; scientific-approval validation requires a suitable ScientificReview fixture. No workflow or authorization rule changed.
