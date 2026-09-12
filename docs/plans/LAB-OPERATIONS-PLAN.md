# Lab Operations Plan

## Specimen attempts implemented locally — September 11, 2026

The [specimen tube-attempt plan](SPECIMEN-TUBE-ATTEMPT-PLAN.md) is now implemented locally: versioned order policy, explicit source selection, attempt-scoped ordered execution, failure/reserve restart, confirmed exhaustion, output guards and specimen detail workspace. Customer-requested holds remain blocked. Existing Planned work is adopted only through explicit source selection; historical started work is not backfilled. Local migration AddSpecimenTubeAttempts is applied. Full persisted acceptance remains Not run; this supersedes the earlier proposed-status notes below.

## Tube review before execution - September 11, 2026

Implemented the approved navigation/prerequisite slice: Specimens → Tubes & lineage → Execution → Libraries → Exceptions → Review, preserving the existing lineage route value. Planned specimen executions expose a server-derived TubeAcceptanceRequired flag using the same accepted/available-tube predicate as Start. The page explains Tube acceptance required, disables Start for that blocker and links Review tubes directly to the job's tube tab. Returning reloads execution eligibility; no tube or execution decision is automatic. Help and acceptance coverage updated. Wider attempt/fallback implementation is now local; customer-requested holds remain blocked.

## Specimen failure and customer holds - September 11, 2026

Implemented attempt behavior: terminal attempt failure with confirmed exhaustion of material for further permitted analysis makes the specimen processing outcome Failed. Preserve its intake acceptance history. Temporarily unresolved material suitability or pending receipt requires a specific blocker and next action, not an exhaustion outcome. A held reserve does not undo acceptance of another tube. See the [tube-attempt plan](SPECIMEN-TUBE-ATTEMPT-PLAN.md).

The [customer-requested specimen hold plan](CUSTOMER-SPECIMEN-HOLD-PLAN.md) is **blocked from implementation by Product Owner direction**. Customer request, acknowledgment, safe pause and resumption need separate design and implementation authorization. Existing internal hold controls do not constitute that workflow.

## Tube-level intake acceptance - September 11, 2026

Owner clarified that acceptance belongs to tubes: a specimen is Accepted when at least one tube is Accepted. Tube accession records Accepted by default when receipt checks pass; exceptions require a predefined intake reason. Other requires notes; acceptance after hold/rejection requires resolution notes. Lineage offers Review tube; independent specimen disposition is removed and the old API rejects writes with guidance. Existing tubes remain unreviewed (no backfill). Tube decisions retain reviewer/time/code/notes with event history, and specimen aggregation does not reject a specimen just because a reserve is rejected. Started specimens have intake locked; execution start requires an available Accepted tube. Five nullable container columns added by AddTubeIntakeReview. Attempt/fallback is implemented in the checkpoint above.

## Specimen tube attempts - September 11, 2026

The [specimen tube selection and fallback plan](SPECIMEN-TUBE-ATTEMPT-PLAN.md) captures the owner's run-one/reserves-on-failure direction, order policy, attempt-scoped workflow enforcement and specimen-centered workspace. Implemented locally with AddSpecimenTubeAttempts; full lifecycle acceptance remains Not run.

## Work-order action menu - September 11, 2026

The menu fits its labels with a compact minimum width. Milestone uses a single full-width field and removes redundant body margins. Connected Edge verified the selector matches its parent width with zero extra grid margin; no milestone saved.

The work-order header groups Change milestone, New container, Assign protocol and eligible Record scientific approval in Actions. Existing capability checks, disabled assignment rules and dialogs are preserved.

## Work-order list presentation - September 11, 2026

All six work-order tab lists (Specimens, Execution, Lineage, Libraries, Exceptions and Review) now match the established Materials/Equipment pattern: shaded divided headers, padded bodies and separate bordered rows. Status, links, actions and saved records are unchanged. Added explicit empty states for container, library and exception lists. Help reviewed; no workflow instructions changed.

## Promotion after independent approval - September 11, 2026

Owner approved allowing any authorized Protocol Administrator to promote an independently approved workflow, including its author or a protocol author. Promotion checks recorded independent approvals for the workflow and every included protocol (including already Active versions), regardless of audit-only rollout settings. Author restrictions remain on approval. Role checks, stale-version handling, retirement checks, existing job pins and promotion audit stamping remain unchanged. No schema migration is needed.

## Workflow action menus - September 11, 2026

Multiple actions for Draft, Invalid and Approved workflow versions now use an Actions dropdown, preserving permissions and confirmation dialogs. Single actions remain direct controls. This follows the owner-approved shared UI convention.

## Discarded drafts as history only — September 11, 2026

Owner removed the Show discarded drafts filter from the working list. Discarded-only protocol identities are always hidden, including with Show retired checked. Discarded revisions remain in their associated protocol's read-only version history; their rows have no edit/create actions. New identities without saved versions remain visible as Setup incomplete, while historical fallback badges now use the actual version status. No stored protocol data was changed. This supersedes earlier notes about a conditional discarded-drafts filter. Updated Phaeno help and existing visibility regression expectations. Connected Edge confirmed the single Show retired filter, hidden Test 1-2-3 in both filter states, visible retired protocols when checked, and intact original walkthrough protocols. Automated tests were not run.

## Revised retirement policy — September 11, 2026

Owner superseded the initial dependency-blocking rule: in-process samples block retirement; queued but unstarted work only warns and permits Proceed anyway. Confirmed retirement removes the protocol in new Invalid workflow revisions and invalidates affected operational versions atomically. Historical stages/approvals and job pins are retained. Invalid revisions can be revalidated/approved with or without further edits, but require at least one eligible approved stage and subsequent production promotion. Queued work retaining an invalidated version is flagged and blocked from starting; no silent repinning. A fresh impact token binds confirmation to the affected workflows/jobs. Full test scope is LAB-07 in docs/testing/06-laboratory.md and the backend/frontend/E2E living plans. Implementation is complete locally. Migration 20260911174615_AddWorkflowInvalidation applied and ERD/help updated. Builds, TypeScript and lint passed; domain regression tests compile but were not run. Live Production workflow/no-job fixture verified named confirmation, retirement, historical Invalidated v1 with two preserved stages, and Invalid recovery v2 with only the retained stage; opened review without saving or approving. Active/queued-job and complete revalidation/concurrency acceptance remains Not run under LAB-07. Earlier manual retirement evidence applies to the superseded rule only.

## Manual protocol retirement — September 11, 2026

Implemented owner-approved protocol retirement for Protocol Administrators, with a required reason (1–1000 characters), retirement actor/time, preserved identity/version/approval/execution history, and no reactivation. Never-approved protocols continue to use deletion. An open protocol draft must be discarded first. Retirement blocks Draft/Approved/Production workflow dependencies and unfinished jobs referencing any historical workflow stage or protocol execution. Draft workflows must be edited/discarded, Approved candidates withdrawn then revised/discarded, and Production workflows replaced or retired. Completed/release-ready and cancelled work retain references. Blocker messages name workflows and job references. New workflow selection/approval/promotion, new executions, and provider job pinning reject retired protocols; participating writers update the protocol concurrency version atomically to conflict with concurrent retirement. Historical versions retain their original status and evidence rather than rewriting approvals.

UI adds Actions → Retire protocol (Archive icon), required-reason modal and unchecked-by-default Show retired. A conditional Show discarded drafts filter retains access to legacy discarded-only identities. Retired records retain reason/date and version history and expose no edit/delete/create-version actions. Phaeno help updated and generated corpus `df73f4c03659` verified. Applied local migration `20260911172654_AddProtocolRetirement` (three nullable columns); ERD regenerated. API/test-project build, frontend TypeScript, scoped ESLint and documentation checks passed. Domain regression tests added but not run under repository test policy.

Connected Edge as William verified blank-reason validation, blocked retirement naming a Draft workflow, preserved error input, subsequent success after discarding that test workflow, default hiding, filter inclusion, focus return, and retained reason/approval after Refresh. Separate fixture protocol `cbcb7e3f-d7bf-4f84-98b9-0ac58223e710` is retired version 2; DB readback confirmed actor `ec4b36b6-e143-4173-8c00-2319c5078cf3` and timestamp `2026-09-11T17:30:16.913671Z`. Fixture workflow `049f9d27-1300-44dd-aed0-c539f67a4d34` version `eba3fc9f-5f48-4b11-a33e-b77e15fab4f6` remains Discarded with its historical stage. Fixture creation used an explicitly synthetic temporary helper and null-human-actor audit context. No real laboratory use occurred. Cross-role denial, Approved/Production dependencies, populated unfinished jobs and concurrent-request scenarios are source-reviewed but not live-tested. Original RNA readiness v1 remains Approved; library-preparation v1 remains Draft. Updated local API process 4092 runs CodexProtocolRetirement on port 44399. No Git mutation or deployment.

## Protocol removal menu — September 11, 2026

The owner approved showing only Delete protocol for never-approved protocols, retaining the existing permanent-removal confirmation. Discard draft now appears only for draft revisions of a protocol with an approved version in its history, with a FileX icon. Existing backend deletion protections remain in force, including referenced-record restrictions. Updated Phaeno help to explain the menu distinction. This changes action presentation, not saved protocol data or approval state.

## Laboratory dashboard list presentation — September 11, 2026

Applied the owner's Materials/Equipment list template to the Laboratory work dashboard summary: shaded header with bottom divider, inset body, and individual bordered work-order rows with subtle shadows. Existing counts, ordering, links and actions are preserved. Connected Edge confirmed the shaded header, 1px divider and row borders, 16px row padding, and both existing work orders. Scoped ESLint passed; no automated suite was run. Reviewed user-documentation guidance: this presentation-only correction does not change the documented workflow. Protocol approval remains pending.

## Equipment retirement — September 11, 2026

Implemented and locally verified. Migration `20260911164357_AddEquipmentRetirement` was reviewed (three nullable metadata columns only) and applied to local `phaeno_ops` at the owner's explicit request; ERD regenerated. API and test-project builds, frontend TypeScript and scoped ESLint passed. Domain regressions were added but automated tests were not run. Connected Edge verified the reason-required error and successful retirement of a separate synthetic asset `PH-EQP-20260911-2NH6C3WJ`, default hiding, Show retired inclusion, and persistence after Refresh. Database readback confirmed reason, actor, timestamp and version 2; preparation asset `PH-EQP-20260911-SVDMBJUH` remains Active at version 1. Role denial and concurrent-use rejection were source-reviewed, not live-tested. The owner also requested a wider action menu; 192px width keeps Retire equipment on one line. Phaeno help corpus regenerated (`5db2af000a47`). No Git mutation or deployment occurred. The stopped local API was started from the updated CodexRetirement build on port 44399 for verification.

Authorized scope: Supervisors and Operations Administrators can retire an asset from its Actions menu after entering a reason. Retirement retains identity, calibration and execution-use records and stores the reason, actor and timestamp. Retired equipment is hidden by default with Show retired to include it, and cannot be selected or recorded for new use. Retirement is final in this scope; no deletion/reactivation is added. A version check prevents stale retirement, and equipment use participates in the same version check so a concurrent retirement cannot slip through. The local additive migration adds retirement metadata; existing Active assets are unchanged. Acceptance: reason required, retired visibility toggle, retained history, role/concurrency enforcement and rejection of retired use. Keep the walkthrough's preparation asset active; verify retirement on a separate synthetic fixture.

## Equipment retirement — September 11, 2026

Authorized scope: Supervisors and Operations Administrators can retire an asset from its Actions menu after entering a reason. Retirement retains identity, calibration and execution-use records and stores the reason, actor and timestamp. Retired equipment is hidden by default with Show retired to include it, and cannot be selected or recorded for new use. Retirement is final in this scope; no deletion/reactivation is added. A version check prevents stale retirement, and equipment use participates in the same version check so a concurrent retirement cannot slip through. The local additive migration adds retirement metadata; existing Active assets are unchanged. Acceptance: reason required, retired visibility toggle, retained history, role/concurrency enforcement and rejection of retired use. Keep the walkthrough's preparation asset active; verify retirement on a separate synthetic fixture.

## Equipment list presentation — September 11, 2026

The owner identified the Materials list as the template for Equipment. Equipment now uses the same shaded header and divider, 16px body inset, bordered rounded rows with subtle shadow, compact name/identifier and metadata lines, and trailing status. The list has an accessible name and an explicit empty state. Connected Edge verified the 1px header/row borders, 16px inset/padding and preserved asset details. Scoped ESLint passed; no automated suite was run. This is presentation only; existing help remains accurate and asset records/actions are unchanged.

## Equipment modal spacing — September 11, 2026

The owner also requested Equipment type and Location on separate rows. Both fields now span the form width; calibration dates retain their paired layout. Connected Edge confirmed separate rows at the same 478px width as Name, with all five entered values preserved. Scoped ESLint passed. Current reference behavior was clarified: types are inferred from equipment and all protocol versions; locations combine equipment names and active storage locations. Inline creation stores a string on the asset, not a separately managed type/location catalog record.

Removed the equipment form grid's extra 20px top/bottom margins because the shared dialog body already supplies 16px padding. Connected Edge measurements confirmed the body shrank by 40px while retaining standard padding, and all five unsaved equipment fields remained identical. Scoped ESLint passed. No behavior/help change or automated test was needed for this spacing correction.

## Material-lot date submission guard — September 11, 2026

The test lot's date was visible before creation but stored as NULL. The precise original event failure was not reproduced. The create form now reconciles the native expiration/retest control into form state before validation/submission, preventing a stale form-state snapshot from dropping a displayed date. Invalid or past native dates produce a field error instead of silently becoming absent. Blank dates remain optional. No API/schema contract changed; the existing guide remains accurate. The owner authorized correcting the one local synthetic lot: its expiration is now December 31, 2026, version 2, with quantity 100 mL and Pending QC preserved. Connected Edge confirmed the saved display. Lint and TypeScript passed; a targeted regression case was added but not run under the repository test policy.

## Protocol management tabs and discarded filter — September 11, 2026

The owner requested separate Protocols and Service workflows tabs. Protocols opens by default; each panel contains its corresponding creation action and list. Protocols with only Discarded versions are hidden by default and can be restored with Show discarded. Empty identities and any history with a non-discarded version remain visible. This supersedes the earlier working-list policy that retained discarded-only identities in the default view. Saved records, version history, approval and workflow rules are unchanged. Phaeno help was updated. Scoped lint and frontend TypeScript passed; connected Edge verified the default view, filter on/off, and ArrowRight/ArrowLeft tab navigation. Automated suites were not run.

## Protocol card action placement — September 11, 2026

At the owner's request, protocol cards reserve a trailing column for Actions, aligned with the title at the top. The text column can shrink and wrap long content without pushing Actions onto a later row. Scoped ESLint passed; connected Edge measurements confirmed top alignment and containment on all three current protocol cards. No automated suite was run. Existing help instructions remain accurate; action behavior and protocol data are unchanged.

## Role-neutral step confirmation wording — September 11, 2026

The owner identified ambiguity between the Operator role and the protocol builder's “Operator confirmation required” control when a step requires Supervisor. The builder and approval preview now use **Confirmation required**, with helper text identifying the person performing the step. Execution history uses **Step confirmation recorded**. Required-role enforcement, confirmation flags and saved evidence contracts remain unchanged. The Phaeno protocol guide explains the distinction and has a September 11 review date. The three-step readiness candidate is now saved/reopened as Draft v1 and remains unapproved; see the [run record](../testing/runs/2026-09-11-protocol-preparation.md) for live-refresh recovery and exact field preservation.

## Protocol capture spacing — September 11, 2026

The owner reported excessive vertical gaps and a detached trash button in the initial protocol builder. Each capture now groups its label/type in a responsive field row, keeps any unit/choices with the fields, and aligns Required and its named remove button on one compact footer row. The former unconditional checkbox padding and button top margin are removed. Scope is presentation; capture values/types, required validation, add/remove behavior and draft-save semantics are unchanged. Existing protocol help remains accurate. The [run record](../testing/runs/2026-09-11-protocol-preparation.md) records rendered, keyboard, static and unsaved-state checks.

## Work-record tab reflow — September 11, 2026

During test-protocol preparation the owner reported that the second row of Work tabs overlapped the panel. The shared TabsList's horizontal height variant overrode the page's plain `h-auto`. The Work page now overrides that same variant, gives each trigger a 36px minimum height and uses two/three/six columns across narrow/tablet/wide layouts. Scope is this record's tab layout and accessible group name; routes, selection, scientific actions and data are unchanged. The existing user guide remains accurate and needs no procedural change. Verification is recorded in the [September 11 run record](../testing/runs/2026-09-11-protocol-preparation.md).

## Receipt and accession update Job progress — September 10, 2026

The owner authorized fixing Jobs stranded between accession and Work and correcting the two reported local Jobs from saved evidence. Users are Phaeno receiving operators and Customer/Partner users tracking their Jobs. First shipment arrival advances awaiting Lab work to Received and the Commercial Job to In progress. Verified tube receipt updates the sample; Accessioned requires all expected tubes across active shipments. Holds, terminal/later states, scientific acceptance, turnaround targets and physical identities are preserved.

Receipt/accession publish a monotonic intake snapshot in the existing outbox within the physical action transaction. Its additive internal payload contains physical receipt presence, submitted-specimen IDs, receipt timestamps, completed accession IDs and the operator for audit. It excludes storage, receipt notes and scientific decisions. Commercial applies the snapshot under the authorization/organization boundary; projection, Job/sample status, timeline, receipt and acknowledgment commit atomically. Duplicate/older delivery cannot reapply progress. Shipment receipt refreshes Lab Work. No public provider milestone, persisted field or migration changes. Local correction and verification evidence belong in [the intake correction run record](../testing/runs/2026-09-10-intake-progress-correction.md).

## Container receipt and separate accession tab — September 10, 2026

The Product Owner superseded the read-only receiving workflow: Receive shipments now lists all expected physical containers (not dashboard work orders), with Customer/Job, carrier, tracking, destination and tube count. It excludes packing pools, empty placeholders, cancelled configurations and already-arrived containers. Prepared containers may appear before carrier handoff with their actual stage and missing-tracking text.

Submitting a valid current PH-P- insert in Receive shipments explicitly acknowledges physical container arrival. Other barcode kinds cannot write receipt. A separate Accession samples tab lists arrived containers with unaccessioned tubes, supports read-only insert lookup and tube comparison, and opens individual accession. Successful accession establishes the verified tube's intake and Lab container; the container scan does not bulk-receive, accession or accept any tubes. The existing printed shipping insert is unchanged.

Implementation uses existing DeliveredAt/Delivered for container arrival and ReceivedAt/Received for completed tube receipt. A ShipmentReceived Lab work event retains the actor, shipment, scanned revision and time. Receipt is serialized with shipment changes and tube receipt, repeats retain the first timestamp/event, and void/cancelled/preparing scans are rejected. Arrival without reported carrier handoff does not invent carrier, tracking or shipment time. Delivered shipments cannot be cancelled. No persisted model change, migration, backfill or production write is required.

The internal Lab API adds GET shipments/queue and POST shipments/receipt under /api/platform/lab-operations; existing GET packet scan remains read-only and adds optional containerReceivedAt. Reads retain assigned Lab-role access; receipt requires Operator/Supervisor. The source-only change includes updated backend receipt-to-accession and frontend queue/navigation/receipt regression coverage. Automated suites and physical scanner acceptance have not been requested. Local build/static checks and remaining browser/runtime gates are reported separately.

## Shipping and receiving tabs — September 10, 2026

Phaeno staff need to focus on one shipping or intake queue as request and kit
volumes grow. The owner approved splitting the stacked Receipt & accession
workspace into **Kit requests**, **Prepare kits**, **Kits sent** and
**Receive samples** tabs. Receive samples groups shipping-barcode lookup, tube
comparison and authorized work awaiting specimens. Other Lab operations areas
retain their current sidebar navigation.

The selected tab is URL-backed, supports Back/Forward and refresh, and preserves
both request and standard-kit searches, statuses and pages. Record return links
select their owning tab; existing shipment links open Kits sent and
old named queue anchors remain supported. Kit-management tabs retain their
existing configuration capability requirement; other operators start in Receive
samples. Hidden queues mount only on selection. Scanner drafts and comparison
results remain available when switching tabs during the same visit. Kits sent now provides an explicit empty state when opened as a tab.

Acceptance: one visible task panel; keyboard-operable tabs; narrow-screen tab
scrolling without whole-page overflow; preserved query filters and record return
context; no changed receipt, accession, dispatch, stock or permissions behavior.
Success is a focused queue with its existing bounded list presentation rather
than all operational sections rendered together. This changes frontend navigation
only; server-side paging of currently client-filtered queues remains separate.


## 2026-09-07 follow-up consistency review

Receipt links retain the scanned packet, shipment, exact tube when compared, and
receiving section. Work-order and execution returns preserve the originating
section/shipment even after laboratory status changes. An identity-check request
failure now offers retry separately from a confirmed tube mismatch; receipt and
accession remain explicit authorized decisions. Focused navigation regression
source was added in `LabReceiptAccessionPanel.test.tsx`; suites and physical
scanner/receipt acceptance were not run during this review.

## 2026-09-07 workspace consolidation

- Commercial kit/assembly order details retain decisions and status; execution/input-validation/fulfillment controls live only in the Lab workspace with reciprocal links.
- Packet/tube comparison carries validated identity into the receiving work order; explicit receipt continues to accession with known fields retained. Receipt and accession remain separate recorded decisions.
- Protocol assignment selects named active Lab operators. Library QC captures observations and named measurements without raw JSON. Scientific review selects the exact ready output package; the service workflow supplies the release definition and optional Customer-safe prose supplies the projection.
- Each ready sample package receives its own scientific approval, including packages reviewed after another package moved the work order to ReadyForRelease. Existing actor-separation and clean-artifact gates remain enforced.
- Assembly output review lists uploaded files, including prior-session uploads. The server derives manifest, pipeline and provenance from stored files/run facts. No persisted-model change or migration.
- Focused frontend regression cases added for package confirmation/retry, independent permissions and structured QC; automated suites intentionally not run under the repository verification policy. Root task batches build/type/lint/documentation checks. Physical scanner/printer and hosted populated acceptance remain outstanding.

## 2026-09-05 protocol completion scope

The Product Owner requested completion after a source review found that the
earlier feature-complete label did not cover guided execution or enforcement
of a protocol's required evidence. Guided protocol execution is now implemented
and locally verified. This completion record distinguishes software delivery
from the remaining hosted and physical acceptance gates.

- Users: Phaeno laboratory operators, supervisors, protocol administrators,
  and scientific reviewers acting under their existing additive Lab roles.
- Outcome: an operator opens an execution's exact pinned procedure, records
  each step with typed captures and explicit confirmation/QC decisions, and
  resumes from durable progress. No operator-authored results JSON is needed.
- Server rules: validate the structured definition on draft save and controlled
  approval/use; validate captures, applicable roles, required sequence,
  optional/conditional skip reasons, and Pass/Fail/Hold evidence. Completion
  uses persisted step records and rejects missing evidence or unresolved QC.
- History: record actors and timestamps on the server. Repeats are allowed
  only by the procedure; corrections require a supervisor, the step's role,
  and a reason. Both append history. Approved definitions and completed
  executions remain immutable. Unsupported historical definitions are retained
  and displayed with a recovery message; they are never silently rewritten.
- UI: execution identity opens a dedicated view-first page; a bounded modal
  records one step/attempt. Show instructions, units, permitted choices,
  resources, prior evidence, completion blockers, and concurrency recovery.
  Keep the existing work-order material/equipment actions and traceability.
- Engineering scope: use the existing definition/results JSON and audited
  work-event storage, with additive Lab-only endpoints. No schema, dependency,
  authentication-provider, Commercial-provider-contract, or deployment change.
- Acceptance: focused backend validation/controller tests and frontend tests
  cover empty-results rejection, typed evidence, sequence/QC/role denial,
  immutable/repeat/correction history, stale writes, and the approval lifecycle.
  Browser checks cover guided recording, return navigation, errors, keyboard,
  narrow layouts, and both themes. Track exact results in the living test plans.
- Success measures: all focused checks pass; routine execution needs no JSON
  entry; invalid or incomplete work cannot be completed through the API.
  Physical bench acceptance, hosted acceptance, and production activation
  retain their separate gates in `LAB-OPERATIONS-BENCH-VALIDATION.md`.

### Completion evidence

- The dedicated execution page replaces operator-authored results JSON with
  ordered step forms and durable, typed evidence. Fail/Hold QC blocks progress;
  required fields, roles, confirmations, skip decisions, repeats, supervisor
  corrections, and completion are checked against the pinned definition.
- Every attempt retains its actor, time, values, and reason. Earlier changes
  invalidate downstream evidence until reviewed again. Held or finished jobs
  cannot accept step, material, or equipment evidence. Stale writes reload the
  current version while preserving the operator's entered values.
- The shared definition validator rejects unsupported or empty procedures at
  authoring, approval, workflow use, and execution. Historical unsupported
  records remain preserved and show a recovery path instead of being rewritten.
- Local verification passed: 79 focused backend tests, including the isolated
  PostgreSQL operator journey; 15 frontend tests; six desktop/mobile browser
  scenarios; TypeScript, focused ESLint, and client/SSR production builds.
  Browser checks include Axe, keyboard/focus, saved-progress navigation, and
  mobile dark mode with reduced motion. See the three living test plans for
  sources, commands, and the distinction between fixtures and hosted proof.
- Updated the Phaeno execution guide and generated documentation corpus.
  The existing JSONB and work-event fields retain all evidence; no migration
  was needed. No Git mutation, deployment, or production activation occurred.

### Release authorization

On 2026-09-05, the Product Owner authorized committing, pushing, and deploying
this protocol completion. Release the API through `Deploy Portal Green` with
`apply_migrations=false` and `cutover_clerk_identity=false`, then build and
deploy the same committed revision to the existing Portal Vercel production
project. Verify the runtime revision, API health/database ping, frontend source
revision, production alias, and deployed route. Physical bench acceptance and
changes to production laboratory procedures remain separate from this software
release. Retain the deployment evidence under ignored
`artifacts/protocol-release-2026-09-05/`.

## 2026-08-29 governed-result and dual-control update

`PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md` closes the previously unresolved
PSeq final-output boundary. The provider-neutral pipeline integration now
registers an idempotent manifest and object-storage transfer targets for final
deliverables only. `ResultOutputPackage` and immutable artifacts carry
checksum and malware-scan evidence. Scientific approval requires a complete
clean package, pins its package identifier/version, and projects that identity
with `LabWorkReadyForRelease`. Corrections create a new package/approval/release
version; withdrawal and delivery/retention evidence remain historical.

Protocol authors cannot approve their own version. This separation is always
enforced at the formal protocol-approval boundary. A scientific
reviewer cannot approve work to which that actor contributed through receipt,
accessioning, execution, QC, library, batch, or sendout events. Lab Operations
Administrator is an access/resource role; bench, supervisory, protocol, and
scientific work require their explicit additive roles after enforcement.
Other dual-control checks launch in audit-only mode and become blocking only
after staffing and staging acceptance.

Keep this file updated as Phaeno's internal laboratory workflows are designed
and implemented.

This plan records the approved product direction, implemented application
scope, and remaining validation and activation gates. It does not authorize a
new schema migration, project reorganization, dependency change, deployment,
or production activation.

## Status

- Planning direction approved on 2026-07-16.
- Current status: feature-complete for the approved internal Lab Operations
  application scope. Database-backed controller/provider verification is
  complete; physical bench validation and production activation are
  incomplete.
  Customer quote acceptance atomically records commercial placement and opens
  exact sample-roster preparation. Finalizing the compliant roster atomically
  creates the Commercial authorization, Laboratory work order, specimens, and
  shipment records; approved cancellation reaches Lab before Commercial
  commits it. Additive Lab roles, the operator
  workspace, durable Lab-to-Commercial projections, receipt/accession and
  physical lineage, controlled protocols and execution, including the
  dedicated structured version builder, materials and equipment, libraries and
  cross-order batches, provider-neutral NGS sendouts
  and custody, exceptions, scientific approval, and the Ready-for-release
  handoff are implemented. Barcode completion includes POMS-allocated
  checksummed container identifiers, browser-rendered Code 39 labels,
  reasoned print/reprint/failure history, exact scan lookup, and scan-first
  QC-passed-library batch entry with duplicate and wrong-context rejection.
  Phaeno operators use **Receipt & accession** in Lab Operations to prepare
  return kits, identify shipments, compare tubes, and reach a roster-finalized
  placed order's existing work order. Order Operations retains only the
  Commercial source order and links to the same work order.
  The eight operational workspace sections now use the shared
  far-left sidebar beneath the toolbar, with a remembered pinned desktop rail
  and the same non-modal hover, keyboard, and click rail when narrow or
  unpinned. Laboratory role administration now lives in the durable Phaeno
  user record in User management, whose consolidated update preserves the
  existing audited Laboratory role assignments. Phaeno invitations also retain
  intended Laboratory roles and activate them only when the invitation is
  accepted. The POMS dashboard now includes a Phaeno-only Order Operations /
  Lab Operations / Accounts selector whose initial Lab panel is explicitly
  mock data for layout validation, not a connected Laboratory queue or
  production-readiness signal. Current Commercial file
  scanning, payment/credit, and publication remain separate.
- Architecture state: Phaeno operates a fit-for-purpose internal Lab Operations
  module behind a provider-neutral boundary. Commercial Operations remains
  customer-facing and can later replace the internal module with a third-party
  LIMS adapter without redesigning the customer or commercial workflows.
- Initial scientific scope: small-scale reagent preparation, specimen receipt,
  library preparation, outsourced NGS, and scientific readiness before the
  separately owned handoff to Phaeno's existing automated data pipeline.
- Phaeno will not initially run NGS in-house.
- The boundary from generated NGS files through Phaeno's automated pipeline,
  including raw/intermediate storage, retention, provenance, and output
  generation, is a major TBD. This plan assumes only that approved customer
  output files eventually become available for release through the Portal.
  `FILE-MANAGEMENT-PLAN.md` owns the settled post-release lifecycle: global
  30/5/5 defaults, Customer/Partner/Prospect organization overrides, release-
  time snapshot, undownloaded warnings, grace, and package-byte deletion.
- This plan supersedes the laboratory-execution direction in
  `ORDER-MANAGEMENT-PLAN.md`. That plan remains authoritative for commercial
  ordering, pricing, fulfillment, files, payment, and publication.
- Phase 0 Steps 1 and 2 are complete. The evidence-backed current-state
  inventory and ownership classification are recorded in
  `LAB-OPERATIONS-INVENTORY.md`. That file is a dated pre-implementation
  snapshot; the restructure and migrations were completed afterward.
- Phase 0 Step 3 is complete. The provider-neutral version 1
  Commercial-to-Lab Operations boundary is recorded in
  `LAB-OPERATIONS-CONTRACT.md`; its Commercial-owned core types and outbound
  provider port are implemented. The registered internal provider handles
  durable authorization/amendment/cancellation and projection lookup. Event
  delivery, the operator workspace, Laboratory roles, and the Customer
  workflow connection are now implemented. Five opt-in PostgreSQL conformance
  tests cover the provider's persistence, idempotency, amendment, cancellation,
  projection, and isolation behavior plus replay-safe, monotonic, customer-safe
  projection delivery. All five passed against the migrated local `phaeno_ops`
  database on 2026-07-16.
- Thirteen opt-in PostgreSQL controller test sources now cover Phaeno initiation,
  shared command idempotency, canonical Lab-service pricing, quote acceptance
  without premature Lab work, atomic roster-finalization authorization and
  shipping, rollback after intermediate provider persistence, accepted
  cancellation, started-work veto without a partial Commercial decision, and
  the rollback-isolated operator journey from assigned roles and accession
  through Ready for release, including replay-safe roster finalization. The original five-case handoff suite passed
  against the migrated local `phaeno_ops` database on 2026-07-16. The expanded
  sources compiled with zero warnings or errors on 2026-08-27; tests were not
  requested and the current thirteen-case suite was not run.
- Software-side bench preflight and the remaining physical acceptance protocol
  are recorded in `LAB-OPERATIONS-BENCH-VALIDATION.md`. Barcode allocation,
  Code 39 rendering, reasoned print outcomes, scan lookup, scan-first batching,
  lineage, and workflow evidence passed; real printer, scanner, label-stock,
  degraded-mode, and operator observations remain pending.
- `SAMPLE-SHIPPING-AND-INTAKE-PLAN.md` owns the separate pre-receipt
  shipment-packet barcode and scan handoff for accepted Prospect Trial Projects
  and future Customer promotional no-charge orders. Its shared configuration,
  return-kit and registered supplier-tube inventory, external crosswalk,
  immutable printable packet, and read-only packet-plus-tube comparison scan
  are implemented; the owning Trial/freebie issuance workflows remain later
  phases. A comparison scan does not record custody. At accession, a validated
  registered supplier barcode is adopted as the submitted container's
  authoritative identity without a second label; POMS continues to allocate
  its own authoritative barcodes for derived containers.
- Phase 0 Step 4 is complete in design and local execution. The approved clean
  development database and migration reset, solution/project restructure, and
  schema baseline sequence are recorded in
  `PSEQ-OPERATIONS-MIGRATION-PLAN.md`. The solution/project shell restructure
  and single-context schema target are implemented. The Accounts,
  Relationships, Data Provisioning, commercial configuration, Partner kit,
  integration, notification, workflow-support, request-revision, and quote
  slices plus the external download audit are extracted into Commercial.
  Commercial order, file, and release records remain Commercial-owned; the
  pipeline/file boundary remains deferred. The disposable
  Development reset, clean `InitialPSeqOperations` migration, database rebuild,
  bootstrap, Reference Journey, and baseline verification suites completed on
  2026-07-16. The additive `CompleteLabOperations` and `AddLabQcProjection`
  migrations plus `EnforceLabLibraryLineage` are applied to the local
  `phaeno_ops` database.

## Goal

Provide enough laboratory structure to run Phaeno's initial PSeq services
reliably without building a pharmaceutical-grade LIMS or burdening a small team
with unnecessary data entry. Preserve clean extension paths for additional
laboratory modules, in-house NGS, stricter controls if later justified, and
replacement by a third-party LIMS.

## Governing Product Principles

1. **Balance traceability with workload.** Capture information needed for
   scientific reproducibility, error investigation, customer accountability,
   and material lineage. Use scanning, defaults, batch entry, and automatic
   timestamps to reduce operator work.
2. **Keep workflows flexible where they actually evolve.** High-level service
   stages remain stable, while laboratory protocols and their detailed steps
   are controlled, versioned definitions that can change without a software
   deployment.
3. **Keep Commercial and Lab Operations replaceably separate.** Commercial
   Operations depends on provider-neutral requests, milestones, exceptions,
   and released outputs rather than internal Lab Operations tables or a vendor
   data model.
4. **Design for future modules without implementing them speculatively.** The
   initial implementation supports PSeq Lab Service and the limited PSeq Kit
   handoff. In-house sequencing and unrelated services remain future modules.
5. **Use fit-for-purpose controls.** Phaeno's internal laboratory will not
   process pharmaceutical samples requiring FDA-submission-oriented execution.
   The initial system will not claim GxP, 21 CFR Part 11, or equivalent
   readiness and will not impose those controls without a separately approved
   product and compliance decision.
6. **Publish deliberately.** Internal laboratory facts are private by default.
   Customers and Partners see only explicitly approved milestones, QC
   information, and deliverables through Commercial Operations.

## Product and Solution Identity

- `Phaeno Portal` remains the external customer- and partner-facing product
  name.
- `PSeq Operations Platform` is the working internal umbrella name for the
  combined Commercial Operations and Lab Operations solution. A naming change
  is not required to begin implementation.
- The implemented deployment shape remains a modular monolith, not separately
  deployed services.

## Target Technical Boundary

The target architecture is:

- one deployed API
- one PostgreSQL database
- one EF Core `DbContext`
- one migration history and transaction boundary
- two target database schemas: `commercial_ops` and `lab_ops`
- the single EF migration-history table in PostgreSQL `public`, which contains
  no business records
- feature-owned EF configurations and module-owned write paths

The implemented backend project boundaries are:

1. `PSeq.Operations.Api` - thin HTTP host and composition root
2. `PSeq.Operations.Commercial` - accounts, relationships, entitlements,
   commercial orders, customer-facing status, and release
3. `PSeq.Operations.Laboratory` - internal laboratory execution
4. `PSeq.Operations.Test` - contract, domain, integration, and architecture
   tests

The existing Reference Journey tool remains a non-product utility. The exact
target layout and implementation sequence are defined in
`PSEQ-OPERATIONS-MIGRATION-PLAN.md`.

The EF model maps Commercial/current-flow and projection records to
`commercial_ops`, Laboratory execution records to `lab_ops`, and migration
history to `public`; it does not use a default schema. The verified disposable
Development database and former migration chain were replaced on 2026-07-16 by
the clean `InitialPSeqOperations` baseline and five additive Lab migrations; no
legacy data backfill was needed.
That approval does not extend to staging, production, shared, or unexpectedly
valuable data. Two business schemas are an ownership and maintenance boundary,
not a security boundary. Authorization remains enforced by the API. The shared
context must not become permission for features to mutate each other's entities
directly.

## System Ownership

### Commercial Operations Owns

- Customer, Partner, and Prospect relationship state
- Organizations, users, memberships, invitations, and entitlements
- Quotes, pricing, commercial orders, order snapshots, and amendments
- first-party CRM, manual-accounting source and reconciliation workflows, plus
  any future external CRM or accounting adapter
- Customer and Partner submission experiences
- Authorization to begin paid or approved no-charge work
- Customer-facing milestones, expected timing, and exception communication
- The content and timing of result release
- Customer-facing activity history and permitted downloads

### Lab Operations Owns

- Physical PSeq kit preparation, substitution handling, shipping, and fulfillment
- Data Assembly input validation, processing, QC review, and output approval
- Laboratory work orders and laboratory execution state
- Physical receipt, accessioning, and intake disposition
- Specimen, container, aliquot, and derived-library lineage
- Phaeno barcodes and laboratory locations
- Controlled protocol definitions, versions, and executions
- Reagent materials, prepared lots, lot status, and consumption
- Equipment references and calibration status needed for execution
- Internal work queues, operational batches, and assignments
- NGS send-out manifests, custody, provider references, and exceptions
- Internal QC, holds, deviations, rework, and scientific approval
- The `Ready for release` handoff to Commercial Operations

### Deliberately Unassigned

Ownership and implementation remain TBD for:

- generated raw NGS files
- submission into and orchestration of Phaeno's automated data pipeline
- intermediate pipeline artifacts
- file provenance, checksums, and lineage across the pipeline
- scientific file storage and lifecycle
- raw and intermediate pipeline retention policy
The former final-output handoff TBD is closed by the governed PSeq manifest,
package, scientific-approval, and Commercial release implementation described
at the top of this plan. Its dedicated-staging/provider activation gates remain
open; this does not claim raw or intermediate pipeline ownership.

No initial Lab Operations design may silently claim this area or create a
competing scientific file-management system.

## Replaceable Lab Operations Contract

The planned version 1 commands, acknowledgments, projections, events,
idempotency rules, and prohibited data are authoritative in
`LAB-OPERATIONS-CONTRACT.md`.

Commercial Operations must communicate through a provider-neutral Lab
Operations application contract even while both modules run in the same
process and share one database.

```text
Commercial Operations
        |
        v
Lab Operations contract
        |
        +-- Internal Lab Operations provider (initial)
        |
        +-- Third-party LIMS adapter (future)
```

The contract should be no broader than proven workflows. It will eventually
cover capabilities such as:

- authorize laboratory work
- amend or cancel authorized work before prohibited execution points
- acknowledge receipt or rejection
- return stable milestones and expected timing
- raise an internal or customer-action-required exception
- report scientific approval and readiness; the minimum opaque output
  reference is deferred until the pipeline/file boundary is defined

Commands and events must have stable Phaeno identifiers, be idempotent, and be
safe to retry and reconcile. Vendor authentication, identifiers, statuses,
webhooks, mappings, and error handling belong in an external adapter. Direct
cross-schema writes and customer UI queries against `lab_ops` tables are not
allowed application boundaries.

One commercial order may authorize multiple laboratory work orders for
staggered receipt, replacement material, or separately scheduled processing.
Each paid laboratory work order belongs to exactly one commercial order. A
separately approved Trial Project may authorize bounded no-charge work without
being misrepresented as a commercial order.

## Organizations and External Users

- An organization may be a Customer, a Partner, or both.
- Customers and Partners may both purchase PSeq Lab Service and submit
  specimens for Phaeno to process.
- Once authorized work enters Lab Operations, Customer and Partner work follows
  the same workflow. Lab Operations does not branch on the submitting
  organization's commercial classification.
- A Partner is not required to identify or disclose its downstream customer.
  An optional Partner reference remains opaque Partner data.
- Partner-specific pricing, contracts, and permissions remain Commercial
  Operations concerns.
- Selling a PSeq Kit creates and preserves a Commercial order and pricing
  snapshot. Physical kit review, preparation, substitution handling, shipping,
  and fulfillment occur in the Lab Operations PSeq kits workflow. Kit
  fulfillment does not create a specimen accession or scientific Lab work order
  unless Phaeno is separately authorized to process specimens.
- Customers and Partners never receive direct access to the Lab Operations
  workspace. They interact through Portal submissions, approved milestones,
  customer-safe exceptions, selected QC information, and released outputs.

## Internal Roles

Laboratory permissions are additive. A person may hold one or more of:

- Lab Operator
- Lab Supervisor
- Protocol Administrator
- Scientific Reviewer
- Lab Operations Administrator

The model must support separation-of-duties rules, but the initial release will
not universally require two different people. A protocol or service may require
independent approval when scientifically or contractually justified. Every
approval and authorized override records its actor and timestamp.

## Initial End-to-End Workflow

```text
Commercial work authorized
        |
        v
Physical specimens received
        |
        v
Accession and intake disposition
        |
        v
Reagent preparation and library preparation
        |
        v
Internal cross-order operational batch
        |
        v
NGS provider send-out and returned NGS output
        |
        v
[ BIG TBD: pipeline and all scientific file management ]
        |
        v
Customer output files available to Phaeno
        |
        v
Scientific approval / Ready for release
        |
        v
Commercial release through Phaeno Portal
```

Phaeno may combine eligible work from multiple organizations and commercial
orders in one internal batch to economize operations. This never merges tenant
ownership, commercial orders, expected timing, customer files, or results, and
no external organization can discover another participant.

### PSeq Lab Service

The intended high-level workflow is:

1. specimen receipt and accession
2. intake acceptance, hold, or rejection
3. reagent preparation as required
4. library preparation
5. outsourced NGS
6. general `Data processing` status across the unresolved pipeline boundary
7. scientific review
8. ready-for-release handoff

PSeq Lab Service is one commercial product that includes processing and data
assembly. Its operational phases do not become separate sales.

### PSeq Kit

PSeq Kit is one commercial product combining the kit with its included data
assembly entitlement. The order and pricing snapshot remain Commercial;
physical kit fulfillment and the included Data Assembly execution are operated
from Lab Operations. If
Phaeno never receives a physical specimen, the workflow must not create a
fictitious accession. The detailed path from customer data submission through
the existing automated pipeline remains part of the major pipeline and file
management TBD.

## Accession and Physical Traceability Defaults

These are engineering defaults to refine with actual laboratory operators, not
additional Product Owner decisions:

- Accession first, then accept, hold, or reject, so every physically received
  specimen has a traceable receipt record.
- One accession represents one biological specimen.
- Physical containers, aliquots, prepared libraries, and other derived
  materials are child records with parent-child lineage.
- Each received or derived physical container receives a unique Phaeno barcode
  when the operational benefit justifies it.
- Customer and Partner labels remain searchable references but are not the
  authoritative physical identity.
- Barcode reprints retain history and require a reason.
- Failed, exhausted, replaced, or repeated material remains traceable rather
  than being silently overwritten.

The UI and operating procedures must minimize scanning and data-entry burden.
Batch actions and inherited values should be preferred whenever they preserve
unambiguous identity and scientific validity.

## Versioned Protocol and Service Workflow Builders

Workflow flexibility belongs inside controlled laboratory protocols and their
service-level composition, not in arbitrary changes to the commercial
lifecycle.

The bounded protocol builder supports:

- ordered and repeatable steps
- approved optional and conditional steps
- required operator confirmations
- typed data capture such as number, text, date, choice, file reference, and
  barcode
- input materials, prepared outputs, and container lineage
- reagent and lot recording
- equipment type requirements and actual equipment used
- QC gates with pass, fail, and hold outcomes
- role-based execution and approval
- Draft, Approved, Superseded, and Discarded user-facing protocol versions;
  the internal Active status remains an implementation detail for exact
  service-workflow pinning and is presented as Approved
- a POMS-generated immutable protocol key derived from the entered protocol
  name, with a stable suffix when the readable key is already in use

Each marketed laboratory service has one canonical controlled service workflow.
That stable workflow identity has ordered versions made from exact approved
protocol versions. Each workflow stage has a name, sequence, Required,
Optional, or Conditional requirement, a plain-language condition when
conditional, and optional handoff criteria. This stitches reusable protocols
into a complete service process without merging them into one unmaintainable
protocol.

Service workflow versions follow Draft, Approved, Production, Retired, and
Discarded states. Promoting an Approved workflow to Production pins its exact
Approved protocol versions, retires the previous Production workflow for that
service, and preserves every historical version. There is only one Production
workflow version for a marketed service at a time.

A Lab work order pins the Production service workflow version when Commercial
authorizes it. Work created before workflow control was introduced pins the
current Production workflow when its first protocol execution is assigned.
Each execution then pins both a workflow stage and that stage's exact protocol
version. Required prior stages must be completed in the same specimen or
work-order scope before a later stage can be assigned. A procedure or workflow
change does not rewrite active or historical work. A deviation is recorded
against an execution; it does not mutate either controlled definition.

Each protocol may have only one Draft. A Draft remains resumable and editable
until approval, or it may be discarded while remaining in history. Protocol
approval is an irreversible controlled release: an independent Protocol
Administrator reviews the exact ordered definition, explicitly attests that it
is ready, and POMS records the approver and timestamp. Approval locks the
version, makes it the current Approved version for future use, and marks the
previous Approved version Superseded. A later version starts from the current
Approved definition and is not in effect until it completes approval. Existing
work and service workflows remain pinned to their exact historical versions.

The product uses structured ordered editors rather than a generic drag-and-drop
workflow programming environment. Arbitrary graphs, parallel branches,
unrestricted formulas, general API calls, nested workflows, and other
programming-language capabilities are out of scope. The underlying model may
gain additional controlled step or stage types when proven laboratory needs
justify them.

Protocol and service-workflow identities remain bounded modal create actions.
Authoring either kind of version is a documented exception to the default
modal-edit pattern and uses a dedicated page because each contains ordered
children, validation, review, and unsaved-work protection. The protocol editor
also manages typed captures, resource requirements, and QC gates and keeps raw
JSON as a collapsed read-only preview rather than an authoring control.

The Protocols workspace presents a newly created protocol identity as **Setup
incomplete**, hides its system key from the working card, and uses **Edit
protocol** for the initial controlled definition.
Creating an identity continues directly to that structured builder. Version
language begins only after the initial definition exists; later controlled
changes use **Create new version**. The bounded name/description action is
explicitly labeled **Edit name and description** so it is not mistaken for the
procedure editor. These commands, **Review and approve**, Draft discard, and
eligible deletion are grouped in a labeled **Actions** menu to keep the list
compact.

Protocol Administrators may edit the protocol name and optional description in
a bounded modal only until its first approval. The POMS-generated protocol key
and every Approved or Superseded identity and version remain immutable. A
protocol that has never been approved may be deleted with destructive
confirmation after POMS verifies that no laboratory or workflow record
references it. Once any version has been approved, the protocol and its full
history are permanent controlled records.

## Controlled Operational Flexibility

- Work may be held, resumed, repeated, cancelled, or routed through an approved
  conditional protocol step.
- Required scientific or chain-of-custody steps cannot be silently skipped.
- An authorized Operations user may override an allowed control with a required
  reason; the original and revised state remain auditable.
- Workflow or protocol changes apply prospectively. Active work remains on its
  original version unless an explicit, validated migration process is later
  designed.
- The previously approved turnaround target, at-risk alert, and authorized
  expected-date override behavior remains owned by
  `ORDER-MANAGEMENT-PLAN.md`.

## Reagent and Material Management

Lab Operations tracks the laboratory facts needed for materials and internally
prepared reagents:

- material identity, supplier reference, and supplier lot
- Phaeno-prepared lot and container identity
- source component lots and preparation protocol version
- preparation quantities and calculations
- operator and preparation timestamp
- required QC and approval
- expiration or retest date
- storage location, current status, and available quantity
- QC disposition, laboratory QC date, and a required reason for failed QC
- protocol execution or batch consumption

A prepared reagent cannot be available for use until its required QC and
approval are complete.

POMS owns a reusable material definition with a system-assigned immutable key;
operators select that identity when receiving or preparing a lot rather than
typing a key per lot. Supplier and storage location are controlled, auditable
reference records. Supplier is required only for a supplier lot. Retired
references remain available to historical records but cannot be selected for
new work. A missing material, supplier, or storage reference can be named in a
focused related-record modal without abandoning the lot form; the draft name
returns as the selected option and the reference is created with the lot.

Expiration or retest is stored as a date and remains valid through the end of
that laboratory day. A future exact time-sensitive prepared-reagent use-by
control, if required by bench validation, will be a separate timestamp rather
than changing every lot to time-of-day expiration.

Prepared-reagent composition is structured lot lineage rather than free-form
JSON. Creation requires one or more QC-approved, unexpired source lots, records
the exact quantities and units, and atomically reduces source availability.

Lab Operations is not a purchasing, accounts-payable, or warehouse-management
system. QuickBooks remains authoritative for vendors, purchase orders, bills,
approvals, payments, and accounting value. Initially, purchasing is manual:

1. Lab Operations identifies a replenishment need.
2. A user creates and manages the purchase order in QuickBooks.
3. Lab Operations may store the QuickBooks purchase-order number or link.
4. QuickBooks records the financial receipt and bill.
5. Lab Operations records the laboratory material or lot received.

The design may reserve a small `IProcurementProvider` seam, but no QuickBooks
procurement API integration is approved. If volume later justifies automation,
the first candidate is one-way creation of a draft or approval-pending
QuickBooks purchase order from an approved replenishment request.

## Equipment

The initial release includes a lightweight equipment registry sufficient to:

- identify an equipment asset and type
- assign an immutable, scanner-safe asset code when the equipment is registered
- select equipment type and location from known laboratory values, with a
  focused create option when a value is missing
- record whether it is available for use
- record the most recent calibration and due dates as date-only laboratory
  facts
- let a protocol require an equipment type
- record the specific equipment used during execution

Automatic instrument control, telemetry ingestion, and detailed maintenance
management are out of scope. A future in-house NGS module may add instrument,
run, maintenance, and telemetry integrations without changing the commercial
boundary.

## Outsourced NGS

An NGS send-out is an external processing batch that may contain libraries from
multiple organizations and commercial orders. Lab Operations tracks:

- a human-friendly batch name, system-owned External sequencing type, and
  immutable POMS batch number
- draft, in-progress, or complete status with captured UTC start and completion
  timestamps, entered through the transition confirmation modal
- included libraries and Phaeno barcodes
- provider and requested service
- shipment and manifest identifiers
- chain-of-custody timestamps
- provider-assigned identifiers
- expected and actual turnaround
- receipt confirmation and exceptions

Provider contracts, invoices, and payment remain outside Lab Operations. Phaeno
does not initially model in-house instruments, sequencing-run scheduling, or
sequencer telemetry.

## Holds, Exceptions, Rework, and Corrections

Lab Operations exceptions are classified as:

- `Internal`: Phaeno can resolve the issue without external action.
- `Customer action required`: replacement material, missing information,
  authorization, unusable data, or another response is required.

Lab Operations owns the scientific issue and required action. Commercial
Operations owns the customer- or partner-facing message, recipient, deadline,
and follow-up.

Lab Operations may initiate documented rework under the same commercial order
when correcting a Phaeno processing or QC failure. Customer-requested repeats,
added specimens, or expanded scope require Commercial Operations authorization
and may require an amended or new order.

A released result is immutable. A scientific correction creates a new version
with its reason, approval, and release timestamp; the previous version remains
in history and the affected organization is notified through Commercial
Operations.

## Stable Milestones and Publication Boundary

Commercial Operations must not derive customer-visible state by querying
internal laboratory tables. Lab Operations publishes a small, stable milestone
vocabulary such as:

- Received
- On hold
- Processing
- Awaiting external sequencing
- Data processing
- Scientific review
- Ready for release
- Exception

Commercial Operations maps these milestones to customer-safe wording. Internal
stages, work queues, batch composition, provider detail, and laboratory notes
remain private.

Lab Operations ends at `Ready for release`. A Scientific Reviewer approves a
customer-facing release package containing only permitted QC, interpretation,
and available deliverables. Commercial Operations controls when that package
becomes visible.

Nothing becomes externally visible merely because it exists in Lab Operations.
For a multi-customer batch, only specimen-specific or appropriately sanitized
batch-level QC may be published. Another organization's identifiers, files, or
results must never be exposed. Permitted release content may vary by service
and evolve through versioned release definitions.

## Physical Retention and Disposition

The system should be capable of recording:

- current physical storage location
- retain-until date when known
- hold or preservation requirements
- exhausted, returned, transferred, or disposed status
- final disposition date, operator, method, and reason

Except for the confirmed Trial Project rule below, actual retention periods are
a policy TBD. The system must not automatically record physical material as
disposed merely because a date has passed; an authorized operator confirms the
disposition.

The Trial Project policy is the first service-specific exception to that TBD:

- remaining extracted RNA is retained for 30 calendar days after `Completed` or
  `Closed incomplete` by default;
- the exact duration and `Destroy` or pre-approved `Return` disposition are
  frozen on the Trial Project, and later configuration changes do not rewrite
  it;
- return is allowed only when approved before the first sample shipment, with
  destination, handling, and shipping payer frozen in the terms;
- a retain-until date creates due work but never an automatic disposition;
- an authorized operator records exhaustion, return, or destruction with date,
  method, reason, actor, and return tracking when applicable; and
- Trial material cannot be reused for research, training, validation, another
  project, or another organization without separate written authorization.

This Trial-specific rule does not settle retention periods for paid Customer or
Partner work. A controlled hold or incident-preservation requirement supersedes
the normal due date until authorized disposition.

## Initial Release Scope

Included:

- internal Lab Operations workspace and additive roles
- provider-neutral Commercial-to-Lab Operations contract
- receipt, accessioning, intake disposition, and physical lineage
- versioned bounded protocol builder and execution
- reagent materials, prepared lots, QC, and consumption
- lightweight equipment and calibration tracking
- library-preparation execution and operational batching
- outsourced NGS batches, manifests, custody, and provider references
- holds, exceptions, deviations, rework, and scientific approval
- stable milestone projection to Commercial Operations
- controlled projection of reviewer-permitted QC to Commercial Operations;
  customer deliverable availability remains at the existing Commercial/file
  boundary

Explicitly excluded or deferred:

- in-house NGS execution and instrument integration
- a generic workflow programming environment
- full procurement, accounting, or warehouse management
- QuickBooks procurement automation
- Partner-executed laboratory work
- direct Customer or Partner access to Lab Operations
- pharmaceutical-submission-oriented GxP or Part 11 controls
- raw NGS and intermediate file management
- automated data-pipeline orchestration
- raw/intermediate scientific file provenance, lifecycle, and retention policy
- the technical output-generation and handoff contract into an immutable
  customer-facing release; post-release retention is already assigned to File
  Management

## Future Extension Paths

### In-House NGS

Add an internal sequencing module with run planning, instrument association,
reagent and flow-cell tracking, run QC, telemetry, and maintenance only when
Phaeno decides to operate sequencing instruments. Commercial Operations should
continue consuming the same stable milestones and outputs.

### Additional Laboratory Modules

New service modules may contribute controlled protocol step types, records, and
milestones while preserving the same accession, authorization, publication,
and audit principles. Do not expand the initial PSeq workflow preemptively.

### Third-Party LIMS Replacement

A future LIMS may replace all or part of the internal Lab Operations provider.
Before cutover, Phaeno must map ownership at field and event level, prove the
provider contract against representative workflows, migrate or preserve
authoritative history, validate reconciliation and failure recovery, and
remove competing internal write paths. The durable strategy is recorded in
`docs/lims-integration-strategy.md`.

## Phased Delivery

### Phase 0 - Operator Discovery and Migration Design

- Completed inventory and ownership-classification evidence is maintained in
  `LAB-OPERATIONS-INVENTORY.md`.
- The completed version 1 provider contract is maintained in
  `LAB-OPERATIONS-CONTRACT.md`.
- The completed clean reset and restructuring design is maintained in
  `PSEQ-OPERATIONS-MIGRATION-PLAN.md`.
- Complete for development: document the evidence-backed receipt, accession,
  reagent-preparation, library-preparation, batching, send-out, exception, and
  review workflows. Representative bench observation remains a production
  activation gate.
- Complete: define the minimum data capture that protects scientific work
  without adding unnecessary operator burden.
- Complete: inventory existing `LabServiceOrder`, `LabSample`, accession, QC,
  and release records in Order Management.
- Production gate: validate barcode hardware, labels, scanning, and degraded-
  mode procedures with representative equipment using
  `LAB-OPERATIONS-BENCH-VALIDATION.md`.
- Preserved boundary: keep pipeline and scientific file-management ownership
  explicitly open.

### Phase 1 - Module and Contract Foundation

- Complete: the Commercial-owned provider-neutral v1 core contract, explicit
  schema guards, Laboratory persistence, registered idempotent internal
  provider, current-workflow connection, and local `phaeno_ops` database.
- Complete: establish Commercial and Laboratory module write boundaries.
- Complete: add the first Laboratory-owned work, immutable authorization,
  specimen/accession, execution-event, and scientific-approval entities through
  `AddLabOperationsFoundation`.
- Complete: add durable provider-command receipts through
  `AddLabProviderCommandReceipts` and implement authorization, safe
  amendment/cancellation, exact retry replay, and current milestone projection
  lookup.
- Complete: opt-in database-backed provider and projection-delivery conformance
  coverage passes against the migrated local reference database with
  run-specific cleanup.
- Complete: opt-in controller-path coverage passes for atomic quote
  authorization, the Commercial-to-Lab cancellation handoff,
  persisted-provider rollback, started-work veto, and the full
  rollback-isolated operator journey.
- Complete: implement internal laboratory roles and authorization, including
  active-Phaeno-member eligibility, disabled/offboarded-user denial, exact
  additive capabilities, session projection, and platform-admin bootstrap.
- Complete: persist Commercial-owned milestone/exception projections and add durable
  Lab-to-Commercial event delivery.
- Complete: extend the existing module-direction architecture tests to prevent direct
  cross-module persistence access as Laboratory entities are introduced.
- Complete: preserve current customer-facing behavior while adding the
  customer-safe Lab milestone, schedule, action, and permitted-QC projection.

### Phase 2 - Intake, Protocols, and Materials

- Complete: receipt, accession, containers, POMS-allocated checksummed
  barcodes, browser-rendered Code 39 labels, reasoned print outcomes,
  scan-first lookup, label history, optional retention, and intake disposition.
- Complete: structured protocol authoring with ordered steps, typed captures,
  resource requirements, QC gates, JSON preview, cloned version creation,
  resumable draft editing and discard history, one-Draft enforcement,
  independent irreversible approval, Approved/Superseded history, pinned
  versioning, guided execution with enforced evidence and QC, and system-owned
  readable protocol-key allocation. Production/Retired control belongs to
  service workflows; approved protocol versions cannot be withdrawn.
- Complete: one canonical controlled workflow per marketed laboratory service,
  ordered Required, Optional, and Conditional protocol stages, workflow
  Draft/Approved/Production/Retired/Discarded lifecycle, atomic protocol
  promotion, exact work-order and execution pinning, and prior-required-stage
  gating through `AddControlledLabServiceWorkflows`.
- Complete: controlled material definitions with POMS-assigned keys,
  supplier/storage references, supplier and prepared-reagent lots, structured
  component lineage, date-only expiration/retest, consumption, equipment,
  calibration, and QC records.
- Production gate: validate minimum fields, labels, scanners, and degraded-mode
  procedures with representative PSeq bench work before activation. The
  software preflight is complete; the physical scenarios and exposed gaps are
  tracked in `LAB-OPERATIONS-BENCH-VALIDATION.md`.

### Phase 3 - Library Preparation and NGS Send-Out

- Complete: library lineage and preparation execution.
- Complete: internal batching across authorized work orders, including
  scan-first QC-passed-library entry and duplicate/wrong-context rejection.
  POMS uses the library container barcode as the library key and allocates
  date-stamped, scanner-safe batch numbers.
- Complete: provider-neutral NGS send-out manifests, custody, provider identifiers, timing, and
  exception handling.
- Complete in the application boundary: projections contain only authorization,
  stable milestone/schedule, action count, customer-safe summary, expected
  timing, and reviewer-permitted QC; batch membership and other-organization
  identifiers remain Lab-only. Database-backed two-tenant proof remains a test
  execution gate.

### Phase 4 - Review and Customer Publication

- Complete: scientific review and Ready-for-release handoff.
- Complete on the Lab side: versioned release definitions and reviewer-
  whitelisted QC project to Commercial. No file or deliverable is created or
  published by the Lab transition.
- Complete for current scope: correction remains durable through exceptions,
  resolution, work events, projection receipts, and existing Commercial
  notification/release history.
- Preserved boundary: output availability is not connected until the future
  pipeline and file-management decision is approved.

The Product Owner authorized completion of the remaining phases on 2026-07-16.
The application scope is complete. Production activation still requires the
explicit physical bench-work, label/scanner, external-provider, authenticated
browser, deployment, and content gates recorded here; those gates do not
expand Lab into the unresolved pipeline or scientific file domain.

## Acceptance Outcomes

The initial Lab Operations capability is successful when:

- an authorized PSeq Lab Service can be traced from commercial authorization
  through receipt, protocol execution, outsourced NGS, scientific approval,
  and the existing Commercial release gates without exposing another
  organization
- protocol changes create controlled versions without rewriting active or
  historical executions
- operators can complete routine work without redundant entry of commercial,
  organization, repeated batch data, or system-owned protocol, library, and
  batch identifiers
- Phaeno can identify which specimens, materials, protocol versions, equipment,
  operators, batches, and exceptions contributed to an internal result when
  those facts are required by the approved protocol
- Commercial Operations depends only on the provider-neutral contract and
  stable projections, not the internal Lab Operations schema
- a Partner submitting specimens is processed identically to a Customer while
  retaining Partner ownership and optional opaque references
- the system does not claim ownership of the unresolved pipeline and
  scientific file-management domain

Baseline operator time, correction rate, turnaround performance, exception
rate, and support burden should be measured during pilot use before numerical
targets are imposed.

## Open Decisions and Major TBDs

1. **Pipeline and scientific file management:** ownership, storage,
   orchestration, raw/intermediate provenance and retention, security, output
   generation, and the technical handoff into the immutable released package.
   The post-release customer deliverable policy is settled under File
   Management with global 30/5/5 defaults and Customer/Partner/Prospect
   organization overrides.
2. **Physical retention policy:** paid Customer and Partner periods and other
   service-specific rules. The configurable Trial Project default is settled at
   30 calendar days after terminal operational closure, with operator-confirmed
   destruction or a return frozen before first shipment.
3. **Operator workflow validation:** software preflight is complete; minimum
   required fields, batch-entry behavior, labels, scanners, degraded mode, and
   exception paths still require the physical acceptance session in
   `LAB-OPERATIONS-BENCH-VALIDATION.md`.
4. **External NGS provider details:** services, identifiers, manifest formats,
   status access, and returned-output handshake.
5. **QuickBooks automation trigger:** revisit only when manual procurement
   volume and reconciliation burden justify integration.
6. **Stricter quality or regulatory controls:** require a separate intended-use,
   compliance, cost, and validation decision.

## Ongoing Planning and Documentation Maintenance

For future Lab Operations changes:

- keep `ORDER-MANAGEMENT-PLAN.md` aligned so commercial orders remain separate from
  laboratory work orders
- update `FILE-MANAGEMENT-PLAN.md` only after the scientific file boundary is
  approved
- update `BACKEND-TEST-PLAN.md`, `FRONTEND-TEST-PLAN.md`, and
  `E2E-TEST-PLAN.md` with each delivered slice
- update `docs/architecture.md`, `docs/business-rules.md`, and the appropriate
  Customer, Partner, and Phaeno user guides only as behavior becomes real
- keep `docs/lims-integration-strategy.md` provider-neutral and aligned with
  the internal-provider-first direction

## Trial parent integration (2026-09-05)

The distinct Trial workflow now invokes the existing PSeq Lab provider with a frozen approved workflow, creates shared shipments after Prospect acceptance and sample validation, and releases governed packages through the shared retention lifecycle. Complete packages freeze policy and close the Trial; partial packages do not start that clock. Trial holds serialize with scientific writes and byte cleanup. See `PROSPECT-TRIAL-PROJECT-PLAN.md` and `TRIAL-INTEGRATION-CLOSEOUT.md` for evidence and remaining production activation gates. Promotional Customer freebie issuance remains separate.

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

### Receiving barcode clarity — September 10, 2026

Receive samples now directs staff to the PH-P- barcode at the top right of the existing shipping insert. The field is labeled Shipping insert barcode, with an explicit complete-code instruction. Expandable guidance distinguishes PH-S- shipment barcodes from SHP shipment references, PH-O-/PH-M- lookups, and physical KIT-/tube barcodes. The printed insert and accepted barcode behavior remain unchanged. Existing receiving test selectors follow the new accessible label. Static checks cover this wording change; automated suites and physical scanner acceptance remain unrun.

Verification: solution build passed with zero warnings/errors using a separate output folder because Visual Studio/IIS Express held the normal output files. Frontend TypeScript, scoped ESLint, documentation freshness (56 guides) and whitespace passed. Read-only signed-in local browser inspection confirmed the separate tabs, two expected container rows with distinct tracking numbers for 69SJN4PA, and a received HS5Y7DB7 container showing 0/18 tubes accessioned. Desktop screenshot review passed. The agent did not submit receipt or accession. Automated suites, narrow/dark layouts, physical scanner and completed tube-accession acceptance remain unrun. The existing shipping insert files have no additional working-tree diff from this work.

## Container accession scan loop — 2026-09-10

- Users: Phaeno laboratory operators and supervisors. Goal: accession every physical tube in a received container without navigating between records.
- PH-P lookup opens a modal showing the complete expected crosswalk and saved tube count. Tube scan opens a nested freezer-box barcode form. Only saving that form accessions the matched tube; successful save returns focus to the tube scanner until every expected tube is complete. Closing preserves partial progress.
- Box barcode is required, trimmed, at most 255 characters, stored per tube in existing LabContainer.Location; no freezer registry, box position, model migration, or shipping-insert content change is introduced. Existing specimen accession numbers are retained; otherwise the server allocates a stable unique ACC-prefixed specimen identifier. Tubes remain separate containers under the same specimen.
- Additive Portal API scope: POST work-orders/{workOrderId}/shipments/{shipmentId}/tubes/accession receives packetBarcode, supplierTubeBarcode and freezerBoxBarcode. It reuses laboratory accession validation, role authorization, trial guards and serialized per-work writes. Same-tube/same-box replay returns the saved result; a different box conflicts instead of relocating. Container arrival is mandatory.
- Acceptance: correct container modal; wrong/void/unreceived rejection; no write before box submission; separate tube locations; repeated scan/retry without duplicate records; focus returns for the next tube; completion only at all expected tubes; reopen partial progress. Success is completing the container using barcode scans without leaving the modal.
- Verification: build, typecheck, scoped lint and generated-document checks at completion. Automated tests are maintained but not executed without request; physical scanner and populated save acceptance remain separate gates.

Verification checkpoint: solution build completed with zero warnings/errors; frontend typecheck and scoped lint passed; documentation corpus 07bbdca8fc5f passed docs:check. Read-only signed-in browser check opened a received 18-tube container with all expected rows and focus in the tube field. Browser input automation detached, so nested prompt interaction, physical scanning and saved-tube loop are not claimed as verified. No actual receipt/accession writes or test-suite execution were performed.

## Deferred: freezer-box location and movement history — 2026-09-10

Status: saved at the Product Owner's request for future implementation. This is
not part of the current accession change and does not authorize implementation.

Problem: accession currently records the freezer-box barcode against each tube
in LabContainer.Location, but does not identify where the box physically sits.
Laboratory staff need to locate a tube through its box and retain storage history.

Proposed scope for future discovery and implementation:

- Give each freezer box a record with its unique barcode, physical location
  (room, freezer, rack, and shelf/position), and contained tubes.
- During accession, scanning a known box displays its location for confirmation;
  scanning an unknown box prompts staff to register its location.
- Record each box movement with the previous location, new location, operator,
  and timestamp. Moving a box updates the effective location of its contents
  through their box association while preserving the movement history.
- Consider capturing each tube's position within the box, such as B4, separately
  from the box's physical location. Whether grid positions are needed, and the
  supported box layouts, remain product decisions for future discovery.

Future acceptance should demonstrate locating a tube, registering an unknown
box, confirming a known box during accession, moving a populated box without
editing every tube, and reviewing its movement history. Preserve existing tube
barcodes, specimen accessions, and saved box IDs when introducing box records.
Keep this proposed behavior out of current user guides until implemented.


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

## Product Owner workflow review — September 11, 2026

Receipt/accession, protocols/workflows, materials and equipment are accepted as broadly sound in the current walkthrough. Rename the sidebar Protocols to Protocols & workflows (implemented). Batches and Data assembly need clearer explanation and placement. PSeq kits should receive acceptance testing, then be hidden from the normal operating navigation when the owner is ready; do not hide or enable a rollout yet. Lab work needs workflow discovery and redesign around coherent specimen progression, reducing repeated entry and disconnected container/execution/library actions. These are product-review priorities, not authorization to replace existing scientific gates or change workflow contracts.

## Library prep and Results & review navigation — September 11, 2026

Implemented the first navigation slice: Library prep replaces the Lab work sidebar label (existing work URL retained); Results & review follows Sequencing batches and opens the existing job Review tab with section=results return context. Both queues retain received job visibility; no readiness is inferred from inclusion. Preserve the owner's three sidebar dividers and later groups. Shared job history and existing approval gates remain intact. This is not tray-based preparation or a new data-processing pipeline.

Manual verification: Results & review → HS5Y7DB7 opens Review, retains Processing and No scientific approval recorded, and its breadcrumb returns to section=results. Verify Library prep → Specimens and legacy work links, keyboard navigation and narrow layout. No operational writes for this change.

## Preparation batches and connected Library prep — scope recorded

See [Library preparation batches and connected workflow](LAB-WORK-JOURNEY-PLAN.md) for the agreed configurable single-tray model, mixed-job/partial batches, membership locked after start, batch-first evidence with tube exceptions, and reuse of preparation QC. The same implementation explicitly addresses disconnected container/resource entry, repeated identity linking, separate library creation/QC and sequencing handoff. This supersedes earlier open questions about tray continuity, mixed jobs, partial trays and duplicate QC in the journey plan. New preparation-batch behavior is planned, not implemented.
