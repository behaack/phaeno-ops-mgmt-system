# Assembly Operations reconciliation

Status: implemented and locally verified, October 22, 2026. The Owner subsequently authorized committing, pushing and deploying to the existing hosted test environment, verifying quiet refresh, then reconciling `SIMULATED-ASM-20261020` and running one linked Simulated repeat after independent confirmation that the original execution cannot resume. Preserve both receipts and all original execution history. See the [preserving release plan](../operations/assembly-reconciliation-test-release-20261022.md).

## Product scope

Operations Administrators and Laboratory Supervisors need to close reviewed conflicts on an ended, unsuccessful assembly so an operator can explicitly repeat the same specimen/purchased run. The motivating attempt is `41e26472-16b3-41d2-9130-c041216a3da4` for `SIMULATED-ASM-20261020`: two Failed receipts disagree about execution times and missing DPS ledger files. The original execution projection and every receipt must remain unchanged.

The review records a decision to retain the saved Failed, Terminated or CancelledBeforeStart outcome, a reason, independent verification evidence and explicit confirmation that the original execution has stopped and cannot resume. A missing provider ledger or NotAccepted reply alone is insufficient evidence. Successful and active attempts remain outside this bounded resolution workflow. Reconciliation never approves scientific results or dispatches a repeat.

## Engineering decision and safeguards

- Use the existing immutable assembly event journal for an appended `ConflictReconciled` decision, including actor/time, request identity, reviewed evidence fingerprint and original execution facts. No persisted-model change, migration, compatibility adapter or new dependency is needed.
- Show retained lifecycle receipt facts and reconciliation decisions in the existing attempt detail. Use a bounded shared confirmation form, required fields, a cancel-first focus target and the existing contextual Actions pattern.
- Use existing Supervisor/OperationsAdministrator authorization on the backend; expose the server-derived permission separately from ordinary operator access. Preserve existing organization and parent-workflow guards.
- Serialize review, lifecycle receipt application and repeat admission with the attempt advisory lock. Check both optimistic version and the exact conflict evidence fingerprint. Repeated identical submissions return the original decision; changed reuse rejects.
- Cover only the exact conflict evidence reviewed. Replays of covered evidence remain idempotent and can be acknowledged after the committed review. Any new receipt conflict or changed payload reopens attention without rewriting original receipt/history facts.
- Keep all current input, parent hold, authorization, purchased-run allocation, latest-attempt linkage and repeat-reason checks. The resolution only releases the reviewed conflict block.
- Existing input sets open the latest attempt rather than offering an unlinked new start. Repeat admission checks every earlier attempt for reopened conflicts, under the same sample/run admission lock.
- Record an independent no-resumption confirmation; reject a fresh provider observation of accepted/running work. An unavailable or missing provider history cannot establish that confirmation.
- Background refresh preserves loaded records without inserting a loading row. Poll active attempts every five seconds and ended attention states every thirty seconds; keep notification-driven invalidation and truthful initial/error feedback.

## Acceptance and verification

Verify preservation of receipt payloads/hashes/outcomes and original start/stop/disposition; authorized review and operator denial; stale evidence/version rejection; identical replay and changed reuse; restart/replay stability; new-conflict reopening; no automatic dispatch; safe linked repeat admission and unchanged scientific gates. Verify the form's evidence review, retained failed submission, required confirmation, three dialog regions, keyboard focus and narrow layout. Focused backend/frontend tests are authorized by the Owner. Update the three living test plans and the Phaeno guide. Hosted release, actual reconciliation of the retained attempt and any repeat execution remain separate actions.

Local verification passes 87 backend, 20 frontend and four actual-component Chromium cases, with no skipped cases in the focused selections. Lint/UI drift, type checking, generated help and the no-pending-model-change check pass. See [the verification record](../testing/runs/2026-10-22-assembly-operations-reconciliation.md).

The separately authorized hosted-test release is complete. Actual quiet thirty-second refresh preserves row geometry. The original attempt is reconciled through the signed-in workflow with all eight receipts, six original events, original Run command and execution facts unchanged; one review decision was appended. One linked, Portal-classified Simulated repeat was dispatched exactly once and ended Failed because DPS invokes a missing Phaeno-Runner executable. Successful simulation/output acceptance remains blocked by the provider's current implementation/classification mismatch. No second attempt or DPS change was made. Exact identities, recovery and evidence are in the [release receipt](../operations/assembly-reconciliation-test-release-20261022.md).
