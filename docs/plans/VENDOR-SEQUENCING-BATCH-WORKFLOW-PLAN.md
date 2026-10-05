# Vendor sequencing batch workflow

## Graphical send-out progress — October 5, 2026

The Owner requested graphical steps and checks for completed steps, using the
Customer shipping tracker as the visual reference. Phaeno operators and reviewers
need to recognize completed work and the next responsibility without reading six
numbered cards. Preserve the established six stages and the single Actions menu.

Use connected stage icons with a completion-check badge, explicit Complete /
In progress / Next step / Upcoming labels and one accessible current step.
Display horizontally on wide layouts and vertically below the large breakpoint.
Completion uses saved shipment/event evidence: preparation needs a saved sendout;
dispatch and receipt need their recorded timestamps; Sequencing completes when
its start and results receipt are recorded; the final decision needs an explicit
Success or Failure. Both outcomes complete the decision step. Historical Complete
does not invent absent event or outcome evidence, and closed records have no next
step. The tracker remains a read-only summary; it does not introduce navigation,
new commands, business rules, API changes or writes to existing fixtures.

Acceptance: each stage is recognizable by icon and label, completed steps show
checks, active sequencing remains in progress, Failure stays explicit, closed
historical gaps remain visible, and narrow layouts reflow without scrolling.
Use semantic theme tokens, decorative icons and an accessible ordered list.
The subsequent Customer shipping request reuses this presentation in the shared
WorkflowProgress component; sequencing keeps its own six-stage evidence mapping
and large-screen horizontal breakpoint. The Customer/Partner four-stage mapping
remains owned by phase shipping and uses its established next-step gates.
Verify source/types/lint, guide generation and read-only rendered desktop/mobile
states. Automated test execution remains request-only.

Completed presentation verification is recorded in the
[graphical progress review](../testing/runs/2026-10-05-graphical-workflow-progress.md).
The later Owner-requested smaller circles/icons apply through the shared
presentation without changing sequencing evidence or progression.

## Product discovery — October 5, 2026

The Product Owner requested a workflow for shipping sequencing batches to a
vendor, tracking their progress, recording final success/failure and capturing
returned data or storage metadata. Users are Phaeno laboratory operators and
supervisors. The batch remains the working record even when its libraries span
Customer Jobs; each tube retains its source library, specimen, purchased run and
Job lineage.

Status: implemented locally with an additive local migration, guide/ERD updates,
build/type/lint checks and read-only browser inspection. New end-to-end writes and
automated suites remain unexecuted; see the [evidence and acceptance boundary](../testing/runs/2026-10-05-vendor-sequencing-workflow.md).
Existing simulated batches must remain intact and must not become successful
vendor results merely because their earlier status is Complete.

## Existing foundation and gaps

- Sequencing batch detail already displays members/tube pairs, Catalog minimums,
  remaining library balances, the frozen sendout manifest, provider identity,
  custody history and a next-step message.
- Membership, physical aliquot transfers and provider sendout are separate saves.
  The saved manifest freezes the actual tubes, transferred amounts and library
  lineage. It must remain authoritative after dispatch.
- Sendout status now captures actual occurrence time, evidence, operator and
  separate recorded time. The offered sequence is Preparing, Shipped,
  Received by provider, Sequencing, Complete.
- There is no explicit vendor success/failure result or batch-level returned-data
  workspace. A generic Complete status cannot prove either.
- Existing scientific-file uploads are specimen-scoped and support verified,
  resumable files with a 1 GiB hard maximum and potentially lower configured
  scanning limits. They are not an implemented batch raw-data ingestion workflow.
- Existing sequencing outputs already link the sendout, source tube, preparation
  attempt, library and purchased run. Registration requires provider/run/mapping
  references, SHA-256 and a positive file size. The new batch result should use
  this existing lineage boundary rather than create an independent sample ledger.

## Proposed operator workflow

Use the dedicated batch detail as a view-first workspace. The list shows batch
number/name, vendor, shipment/tracking summary, current stage, final outcome and
returned-data readiness. Batch identifiers open details. Put contextual commands
in one Actions menu; the Next step provides the currently eligible action.

Use the immutable batch number as the list-card title and detail-page heading.
Show the saved descriptive name in secondary detail only when it differs from
the number, so a batch whose name equals its number does not repeat it.

| Step | Operator action | Saved evidence and gate |
| --- | --- | --- |
| Prepare shipment | Review the passing libraries, assigned sequencing tubes and actual aliquots; enter vendor/destination and vendor batch reference. | Require every included physical pair and Catalog minimum. Review a frozen tube manifest before handoff. |
| Record shipment | Record actual dispatch, carrier/tracking and handoff evidence after sending the physical package. | Save shipment/custody evidence and operator separately from actual time. Preparing a shipment does not imply dispatch. |
| Track vendor work | Record receipt, sequencing start and later updates with actual time and evidence; maintain the vendor's expected return date. | Show shipment and vendor references, stage history, library-exception count and overdue expected return. Tracking may be manual initially; no carrier or vendor integration is assumed. |
| Receive results | Record the vendor's completion/outcome report, actual result time and evidence; reconcile results against the frozen batch members. | Make missing/unmatched libraries visible and retain failure reasons. Do not infer success from receipt of files alone. |
| Capture returned data | Register external file, folder or manifest locations, as external storage references. | Identify each library/run's files and their provenance. Registration, physical byte receipt, verification and downstream availability are distinct facts. |
| Finalize outcome | Review final success/failure and required result evidence in a bounded confirmation. | Preserve the reviewed version, actor and time. Vendor completion is separate from assembly, scientific approval and Customer release. |

Shipping and vendor work are stages; final outcome and data readiness are separate
facts. A failed batch must remain visible with its reason and any returned files.
Success may be reported before returned data becomes available; the workspace
must still show the outstanding data handoff. No silent retry, replacement
sequencing run, scientific approval or Customer release follows finalization.

The shipment should provide a printable/downloadable tube manifest and clearly
show vendor/destination, carrier, tracking and actual dispatch/receipt. The same
carrier reference may identify several physically co-shipped batches; this must
not merge their immutable identities or member/result records. Label purchasing,
carrier booking and vendor messaging are not assumed by this request.

## Confirmed product decisions — October 5, 2026

The Owner selected a batch Success/Failure outcome with specific library exceptions,
and external storage references for the initial data handoff. The exact workflow is:

**Prepare shipment → Shipped → Vendor received (ETA) → Sequencing → Results received → Success / Failure**

The final batch outcome is the default for every frozen manifest member. Each
exception names one member, the opposite outcome and its required reason. Mixed
results remain explicit; neither the batch default nor library exceptions imply
scientific approval, source exhaustion, specimen failure or replacement runs.

Storage references are append-only declared file/folder/manifest locations, scoped
to the whole batch or one member. Label, permanent location, optional notes, actor
and entry time are retained. No byte upload, credentials, signed URLs, remote fetch,
checksum verification or automatic output registration is added. A correction can
be recorded as an additional reference with explanatory notes; the original stays
visible. Final outcome decisions are immutable in this initial scope; a separate
reasoned correction workflow would require a future product scope.

## Engineering decisions

- Extend the existing sendout, custody and frozen manifest foundation; do not
  create a parallel shipment or sequencing-output ledger. Manifest creation requires
  every confirmed tube and physical transfer to satisfy its captured Catalog minimum.
- Destination is required at preparation. Carrier/tracking are required for dispatch.
  Freeze destination after dispatch; preserve every tracking/ETA update with evidence.
  Require completion ETA at vendor receipt, and allow evidence-backed ETA updates.
- Retain actual dispatch, receipt, sequencing start, results receipt and final decision
  times in UTC. Actual times cannot be future or precede the prior stage; audit entry
  time and actor remain separate. Receipt/results can be recorded even if a subsequent
  hold prevents new shipment or sequencing work.
- ResultsReceived is a new sendout stage. Finalization records the default outcome,
  validated member exceptions and custody decision, and completes the operational
  batch atomically. The generic batch Complete action cannot bypass vendor results.
- Existing Complete is retained as its historical fact; new nullable outcome fields
  remain unrecorded on existing batches. Never infer vendor success from old completion.
- Operator/Supervisor writes and existing staff reads retain backend role checks.
  Lock the sendout for writes, check its version, and lock the batch for finalization.
  Stable request IDs protect result-reference and final-outcome retries from duplicates
  and reject changed replays. Membership cannot change after preparation begins.
- Outcomes and data handoff remain separate: a success can be recorded before data
  references arrive. Show the missing handoff and permit reference additions after
  finalization. References do not satisfy the existing sequencing-output contract;
  use Scientific evidence to register exact provider/run/sample mapping, file identity,
  checksum and size for downstream processing.
- Keep the list form-free, with vendor-stage/outcome filters, tracking and overdue ETA.
  Use the dedicated view-first batch workspace and one contextual Actions control.
  On wide cards, keep the status pill and Actions at the top-right, with the name
  and details wrapping in the remaining width. Below the small breakpoint, keep
  only Actions at the top-right beside the name, give details the full width below
  that row, and place the status pill below the details. Do not squeeze the name
  between the pill and menu on phones.
  Bounded forms use RHF/Zod and shared Field/Dialog controls, cancellation-first focus
  for final decisions, required legend and focus return. Export the frozen tube manifest
  as CSV for vendor handoff; no carrier booking or vendor messages are sent.

## Engineering and preservation scope

The confirmed decisions above define the implementation scope. Use feature-owned APIs/forms,
backend role checks, versioned writes, audited transitions and request replay
protection. Final evidence cannot be overwritten; a future correction must preserve the original decision. Keep preparation QC and vendor result
outcomes distinct; failed sequencing does not automatically exhaust the library
or fail the whole specimen.

Persisted changes require an additive EF migration and the corresponding ERD
update. Inspect existing batch/sendout/output records before applying it. Existing
Complete batches have no new vendor-outcome evidence and must show that absence,
without invented success, data references, checksums or provider results. If a
proposed model requires conversion/reset, warn the Owner and obtain the required
authorization before any destructive remedy. No reset, conversion or deployment
is authorized by this plan.

## Acceptance and success measures

- An operator can prepare and record physical dispatch from one batch workspace,
  with every tube and aliquot linked to the correct source library and Job.
- The list and details show receipt/vendor progress, references, expected return
  and the next responsibility without treating a shipment as sequencing success.
- Success and failure record named scope, actual time and required evidence;
  library exceptions override the batch default with a required reason.
- Returned storage references name only this batch or its frozen members. Exact
  purchased-run attribution remains in scientific output registration. Missing or unverified data remains visibly incomplete.
- Concurrent edits, repeated/uncertain saves, invalid transitions and corrections
  preserve evidence and prevent duplicate outcomes or data registrations.
- Existing demo records and library quantities remain unchanged. No automatic
  downstream scientific approval or Customer result release occurs.
- Guides, keyboard/focus behavior, required markers, confirmations, responsive
  layout and both themes follow the existing Portal rules. Update living test
  plans; automated execution remains request-only.

Success means every shipped batch has a traceable physical manifest, a visible
vendor progress record, an explicit final outcome and a clear returned-data
handoff state. Production/provider/physical/scientific acceptance and deployment
remain distinct from local implementation evidence.

## Purchasing vendor directory — October 5, 2026

Shipment preparation selects a Purchasing supplier, its **Sequencing service**
product and one of its named active shipment addresses. The supplier can have
multiple destinations. Reviewed catalog versions and readable snapshots are saved
with the manifest; later catalog changes do not rewrite the shipment. Pre-dispatch
address changes require explicit selection within the same vendor and custody
evidence. See [the vendor catalog plan](SEQUENCING-VENDOR-CATALOG-PLAN.md).

## Connected send-out walkthrough — October 5, 2026

The Owner requested a local batch send-out and UI/UX/workflow gap review. Resume
the existing six-library demo batch, use labeled synthetic vendor destinations and
pre-barcoded demo sequencing tubes, and keep every simulated event clearly identified.
No physical shipment, carrier booking, vendor message, scientific approval or
Customer release is implied. Preserve earlier completed demo records.

Confirmed blocker: an earlier batch already moved the shared Job to DataProcessing.
Dispatching the remaining libraries tried to regress the Job to AwaitingExternalSequencing
and failed with HTTP 500. Send-out facts must advance independently: only advance
the coarse Job milestone when appropriate, preserve later stages and holds, and
emit a fresh versioned progress event for every batch transition. Keep generic
milestone/repeat-run authorization rules intact; no database repair is needed.

UI corrections in this review: prevent preparation before all tube pairs are ready,
show the reviewed tube manifest in preparation, protect dirty vendor/status forms,
show saved vendor/destination/tracking during dispatch confirmation, retain the
existing ETA as the starting value at vendor receipt, and place shipment details
ahead of long tube evidence. Record precise next actions and bounded task-specific
save labels. Complete the walkthrough after the blocker is repaired and update
the guides and living test plans with the observed evidence.

Completion: the resumed six-library batch passed the full local workflow with
batch Success and one Failure exception, a whole-batch unverified storage reference,
and six-row manifest export. Shipment changes, receipt ETA and immutable final
actions were reviewed in the browser. Dirty drafts and mobile forms were exercised;
discard now restores focus after both dialogs close. Status confirmations pin the
reviewed shipment and concurrency version together. The reference field now names
the vendor reference separately from carrier tracking. Repeated identical library
key/barcode labels are omitted; distinct identities remain visible.

The old guide's Start/Complete batch wording disagreed with the implemented
Begin shipment preparation and final-outcome flow; the guide now matches the code.
No persisted model, migration, physical shipment, scientific result, deployment or
Git publishing changed in this review. See [the acceptance record](../testing/runs/2026-10-05-sequencing-sendout-walkthrough.md).

## October 5 controlled release verification

The owner separately authorized full tests, commit/push, deployment and the two
preserving EF migrations under [the hosted release plan](PORTAL-WORKFLOW-RELEASE-20261005-PLAN.md).
Final results and hosted activation are recorded in [the release receipt](../operations/portal-workflow-release-20261005.md).
This supersedes request-only execution statements in the earlier local checkpoints;
physical/scientific/provider and authenticated operator acceptance remain separate.

## Completed hosted release — October 5, 2026

This implementation batch is included in application
`c781988630ddfdb07f0d76dd7c3bb9753c15d660`, now deployed as matching API/UI with
the two preserving EF migrations. Full regression, fresh recovery verification,
hosted row/runtime preservation and public smoke checks pass under
[the completed release receipt](../operations/portal-workflow-release-20261005.md).
This supersedes earlier request-only test/release statements for this batch;
physical/scientific/provider and authenticated operator acceptance remain separate.
