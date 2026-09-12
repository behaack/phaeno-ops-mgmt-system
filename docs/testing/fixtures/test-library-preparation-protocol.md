# TEST ONLY — Two-protocol library-preparation workflow

Prepared September 11, 2026. **Both protocol versions approved locally for synthetic software acceptance only.** The owner requested a two-protocol process and a slow, step-by-step authoring walkthrough. Both **TEST ONLY — Extracted RNA readiness** and **TEST ONLY — Library preparation and QC** are Approved v1, with all three steps saved. Approval was submitted through the synthetic William Agnew account and verified after Refresh; this demonstrates distinct-account workflow behavior, not independent human or scientific validation. No unsaved edits remain. Service-workflow setup is next. The builder labels the role-neutral setting **Confirmation required**. See the [run record](../runs/2026-09-11-protocol-preparation.md) before resuming.

This fixture adapts the Portal's [built-in library-preparation example](../../../frontend/src/features/lab-operations/protocol-definition.ts). It is not a laboratory SOP. All measurements, material use and preparation below are simulated on explicitly identified local test records. It provides no wet-lab recipe or scientifically validated acceptance thresholds.

## Purpose and first checkpoint

Exercise [LAB-01, LAB-03 and LAB-04](../06-laboratory.md): controlled authoring, typed evidence, ordering within and between protocols, explicit QC, role restrictions, resources, save/resume, and retained correction history. No new acceptance-case IDs are introduced.

## Two controlled protocols, one service workflow

| Workflow stage | Protocol identity | Steps | Handoff |
| --- | --- | --- | --- |
| 1 — Required, specimen scoped | TEST ONLY — Extracted RNA readiness | Verify identity; simulated input QC; conditional review of prior QC hold | Complete this specimen's readiness execution, including resolved QC and explicit conditional-step resolution |
| 2 — Required, same specimen scope | TEST ONLY — Library preparation and QC | Simulated preparation/traceability; optional observation; simulated library QC | Complete preparation execution before the separate library-record/batch workflow |

Each protocol has its own Draft, independent approval, version and execution history. The service workflow pins the exact approved version of each. For the same specimen, the first Required stage must be complete before the second can be assigned. Completing one specimen's first stage does not satisfy another specimen's prerequisite. This supplements, rather than replaces, the step-order rules within each protocol.

The intended Job is **HS5Y7DB7**, last verified on September 10 as Received with nine accessioned samples and 18 tubes. This is historical evidence, not a fresh September 11 observation. Receipt/accession is not scientific acceptance. Preserve existing shipment, tube, accession and freezer-box records.

The first execution checkpoint is **one eligible specimen, step 1 saved and reopened with its exact source identity**. Leave the execution unfinished at that checkpoint. Do not advance every specimen or record preparation, sequencing, library approval or result release merely to make a progress indicator change.

## Before entering the draft

1. Open the local Portal and verify its API/database environment. Read the current Job, scientific intake disposition, holds, specimens, containers, existing executions and pinned service workflow.
2. Record one explicitly selected synthetic specimen and its existing source-container barcode. Do not invent or reuse another specimen's barcode. If scientific intake is still pending, resolve that separate decision using the test fixture's agreed facts before preparation.
3. Inspect existing protocol identities/drafts to avoid duplicates. If a real procedure is available, the Lab owner should review how this software fixture relates to it; do not infer its scientific criteria from this document.
4. Both protocol identities have all three steps saved and are now Approved v1. Protocol 1's identity rename is complete and its generated key remains unchanged. Use these exact approved versions in the next service-workflow checkpoint. Do not recreate the identities or steps or change their definitions.
5. Approval requires a different Protocol Administrator from the draft author and an explicit attestation. A document draft is not an Approved POMS protocol.
6. Verify workflow eligibility before execution. A Job with a pinned workflow can use only its existing stages and exact protocol versions. Promoting a new workflow does not retrofit an existing Job. If the test protocol is incompatible with HS5Y7DB7's pin, record the blocker and use a separately agreed test-work fixture rather than rewriting the pin or duplicating its order. Legacy unpinned work requires an eligible current Production workflow at first assignment; verify the actual state.

Workflow promotion affects new work for that service even in the local environment. Keep the candidate Draft until its effect on other local test work has been reviewed. Never promote this mock procedure in a shared or production environment.

## Definitions to enter slowly

All captures listed below are required unless explicitly marked optional. All steps require operator confirmation when performed. All QC gates use the supported **Pass / Fail / Hold** choices. Resource lists are empty except where stated. Required roles are exactly the editor's Operator or Supervisor choices; confirm effective roles before the session.

### Protocol 1, step 1. Verify existing specimen and source identity

- Requirement: Required. Role: Operator. Repeatable: No. QC gate: None.
- Instructions: “TEST ONLY. Open the assigned specimen and compare its existing accession, source container and storage record. Capture the existing source-container barcode and specimen reference. Confirm that these belong to this execution. Do not receive, accession, relocate or relabel the tube.”
- Captures: **Source container barcode** (barcode); **Specimen reference** (text); **Identity checked on** (date, actual session date).
- Evidence: the selected source barcode and specimen reference agree with the saved Job. Capturing a barcode is not, by itself, proof that POMS automatically checks specimen membership; the operator comparison and separate source record establish it.
- First checkpoint: save, leave, reopen, and verify one retained record, actor/time and unchanged receipt/accession identities. Do not complete the execution.

### Protocol 1, step 2. Record simulated input QC

- Requirement: Required. Role: Operator. Repeatable: Yes.
- Instructions: “TEST ONLY. Enter the selected synthetic QC fixture. The values are software test data, not instrument measurements. Compare the values with the fixture rules below and explicitly select the matching QC decision. Retain the reason for Fail or Hold.”
- Captures: **Synthetic RNA concentration** (number, ng/µL); **QC fixture condition** (choice: Clear, Review needed, Unsuitable); **Synthetic QC record reference** (file reference).
- QC criteria: “Software fixture only: Pass when concentration is 20 and condition is Clear; Hold when concentration is 20 and condition is Review needed; Fail when concentration is 2 and condition is Unsuitable. Any other combination requires Hold and investigation of the test fixture. These are arbitrary test values, not scientific limits.”
- Main-path values: 20; Clear; TEST-QC-INPUT-001; Pass.
- The file reference is an identifier only and does not upload a report. POMS validates the value types and explicit outcome; the operator assesses these prose criteria. Do not claim automatic numeric-threshold enforcement.

### Protocol 1, step 3. Review a prior input QC hold

- Requirement: Conditional. Condition: “Perform when step 2 history contains a Hold or Fail, even if a permitted repeat now passes; otherwise skip with a reason.” Role: Supervisor. Repeatable: No. QC gate: None.
- Instructions: “TEST ONLY. Review retained input QC history and the successful repeat. Record why the synthetic issue is resolved. A current Fail or Hold must be resolved at step 2 before this step can be performed; this review does not override a blocker.”
- Capture: **Review rationale** (text).
- Main path: Skip with reason “No Hold or Fail in this execution's input QC history.” This plain-language condition is assessed explicitly by the operator, not automatically evaluated from history.
- The Supervisor role applies to the skip assessment as well as performed review; an Operator-only user cannot resolve this step by skipping it.

### Protocol 2, step 1. Record simulated library preparation and traceability

- Requirement: Required. Role: Operator. Repeatable: Yes. QC gate: None.
- Instructions: “TEST ONLY. Use the agreed synthetic material lot and equipment records. Record material consumption and equipment use through the Job's supported actions, then confirm their execution links. Use an existing eligible derived test container, or create one through the supported container action with this specimen's exact source parent. Capture its assigned barcode. No physical preparation or print success is asserted.”
- Input materials: Source test specimen; Qualified TEST ONLY library-preparation reagent lot.
- Prepared outputs: Derived TEST ONLY library container.
- Equipment types: TEST ONLY preparation equipment.
- Captures: **Derived library container barcode** (barcode); **Preparation mode** (choice: Simulated); **Preparation record reference** (text).
- Main-path preparation reference: TEST-PREP-001. The derived barcode must come from POMS, not a fabricated text value.
- Prerequisites for this later step: a dedicated qualified, unexpired synthetic lot with agreed available quantity/unit; eligible test equipment and calibration record; explicit source/child lineage. Record actual synthetic quantity and unit in the run before using it. Missing resources block the step. Free-text resource requirements do not automatically match inventory; review the saved traceability before confirming resources.

### Protocol 2, step 2. Record an optional test observation

- Requirement: Optional. Role: Operator. Repeatable: No. QC gate: None.
- Instructions: “Record any additional software-test observation that helps explain this execution. If none is needed, explicitly skip with a reason.”
- Capture: **Test observation** (text; required if this step is performed).
- Main path: Skip with reason “No additional test observation.”

### Protocol 2, step 3. Review simulated library QC

- Requirement: Required. Role: Supervisor. Repeatable: Yes.
- Instructions: “TEST ONLY. Review the synthetic preparation traceability and recorded output-container identity. Enter the selected simulated library QC values and explicitly choose the outcome. This is execution QC, not independent scientific approval or permission to release Customer results.”
- Captures: **Synthetic library concentration** (number, ng/µL); **Library QC fixture condition** (choice: Clear, Review needed, Unsuitable); **Synthetic library QC record reference** (file reference).
- QC criteria: “Software fixture only: Pass when concentration is 12, condition is Clear and the test preparation traceability has been reviewed; Hold when concentration is 12 and condition is Review needed, or traceability needs review; Fail when concentration is 1 and condition is Unsuitable. Other combinations require Hold. These values are arbitrary software fixtures, not sequencing suitability thresholds.”
- Main-path values: 12; Clear; TEST-QC-LIBRARY-001; Pass.
- Only after every required step, allowed skip, resource confirmation and QC blocker is resolved may a later test session complete the execution. Library creation/QC, provider custody, independent scientific approval and publication are separate subsequent workflow actions.

## Controlled variants for later sessions

Use separate agreed executions/test specimens for negative variants; preserve the main checkpoint. All variants below are **Not run**.

| Variant | Exercise | Expected evidence |
| --- | --- | --- |
| Between-protocol ordering | Attempt Required workflow stage 2 before the same specimen completes stage 1; then complete stage 1 on a dedicated fixture and retry | Earlier assignment blocked; later assignment offered only for the eligible specimen, with exact pinned protocol versions |
| Required evidence | Omit a required capture or confirmation; try the next step early | No incomplete step save or out-of-order progression |
| Types and choices | Enter nonnumeric concentration or omit a required choice/date | Recoverable validation, retained draft values, no invalid saved record |
| Hold and recovery | Step 2: 20 / Review needed / Hold with reason; try later step and completion; Repeat as 20 / Clear / Pass with reason and fresh confirmation | Hold blocks progression; repeat retains original history; conditional Supervisor review is then performed |
| Fail and recovery | Step 2: 2 / Unsuitable / Fail with reason, followed by an allowed simulated repeat | Failure persists in history and never disappears when the repeat passes |
| Role boundary | Operator-only user attempts a Supervisor step or correction | Restricted action denied; no role changes made to obtain a pass |
| Correct a value | Supervisor with the step's required role corrects a deliberate data-entry error with reason | Prior evidence retained; fresh confirmations required; later evidence needs review/re-recording |
| Optional/conditional skip | Resolve Protocol 1 step 3 and Protocol 2 step 2 explicitly on main path; try skipping required/performed work separately | Allowed skip reason retained; required/performed work cannot become skipped |
| Resources | Try insufficient/expired/failed lot or overdue/inactive equipment on dedicated fixtures | Invalid resource operation rejected without consumption; valid links remain |
| Persistence/conflict | Reopen after each checkpoint; two operators edit a dedicated execution | Saved evidence persists; stale save preserves entered values and requires review |
| Completion lock | Finish a separate fully resolved execution, then attempt new evidence | Completed evidence locked; completion does not publish files or assert provider receipt |

## Evidence and ownership

Record protocol identity/version, author and independent approver, workflow/version/stage, specimen and source/derived container references, execution/version, before/after state, actual results and evidence links in the [September 11 preparation record](../runs/2026-09-11-protocol-preparation.md). Do not put private specimen data in browser-bundled help.

Lab owner: confirm the intended laboratory meaning before replacing this fixture with a scientific procedure. Test operator: attest only to simulated work actually performed in the test application. Protocol approver: review and attest independently. Engineering: assess validation and persistence evidence without treating synthetic data as bench acceptance.

Sources: [protocol guide](../../../frontend/src/content/docs/phaeno/lab-protocol-execution.mdx), [definition contract](../../../backend/modules/PSeq.Operations.Laboratory/Domain/LabProtocolDefinition.cs), [workflow pinning rules](../../plans/LAB-OPERATIONS-PLAN.md), [bench validation](../../plans/LAB-OPERATIONS-BENCH-VALIDATION.md).
