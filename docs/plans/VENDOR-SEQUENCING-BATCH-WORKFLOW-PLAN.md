# Vendor sequencing batch workflow

## FASTQ upload and downstream handoff — discovery, October 6, 2026

The Owner requested replacing declared locations with local managed FASTQ
uploads and completing assembly, QC and Customer-download handoffs. The Owner
confirmed uploads must complete before successful results save, tentative
configurable FASTQ limits/layouts and first-version QC decision/report capture. See
[Sequencing results to Customer delivery](SEQUENCING-RESULTS-TO-CUSTOMER-DELIVERY-PLAN.md)
for the accepted direction, planned workflow, naming/identity contract, current
foundations and data boundaries. Required-location capture
remains implemented until the replacement is built. No current results,
files or history were converted during discovery.

## Numbered results versions — October 6, 2026

The Owner authorized numbered, immutable results snapshots. Initial capture saves
v1; every edit saves the next number with a required note. The batch list/detail
show the current number and current values. Results versions appears after record
details; each link opens that exact version at its own read-only URL and never
redirects to a newer one. Editing the current result explains which version is
being reviewed and which version will be created. No pending draft or approval
lifecycle is introduced for this operational evidence; scientific approval and
release remain separate.

Engineering: `LabVendorResultsVersion` stores the complete immutable metadata,
library decisions, applicable declared locations and frozen manifest, plus author,
recording time and note. A unique sendout/number index and the existing family
lock/version guard serialize numbering and replay. Current sendout fields are an
atomic current-value projection for operational reads; the saved snapshots are
the version history. No application-side legacy backfill is added. Scientific
capture includes the exact saved result-version identity/number in its immutable
lineage snapshot when one exists.

The additive migration creates only the new history table and indexes/FKs. Apply
only to the configured local development database, update the complete ERD, and
preserve the existing valid local test result as v1 with a one-time scoped copy.
This copy changes no current result values or earlier custody entries. Reset or
reseed would lose the Owner's entered result and notes and was not selected.
The unrelated incomplete test record remains untouched. Production migration,
publishing and Git mutations are not authorized.

## Combined results receipt — October 6, 2026

This Owner-approved scope supersedes the separate Sequencing, Results received
and Success/Failure workflow steps. The public workflow is Prepare shipment →
Shipped → Vendor received → Results received. Record results replaces Add data
location and the separate final-outcome action. One atomic command captures vendor
job reference, actual run start/completion, actual results receipt, the default
library Success/Fail outcome with explicit member exceptions, notes and optional
whole-batch/per-library permanent data locations. Success/Fail is library evidence,
not a workflow status or scientific approval. Locations may arrive later and remain
unverified; missing successful-library handoffs remain visible.

The Owner confirmed Run not performed with a required reason and no run times
when all submitted libraries failed. Record this explicitly; do not manufacture
run times. Add nullable sequencing completion and run-not-performed fields so
existing data stays unchanged/unknown. Generate an additive EF migration and ERD,
verify the target and apply only to the configured local development database.
The schema change performs no reset or conversion. Production migration,
publishing and deployment are not authorized. The subsequent local fixture rollback
is scoped separately below.

The Owner confirmed the no-run terminal status is Run not performed. Do not save
run or results-receipt timestamps for this path; closure and disposition use the
server recording time. No-run members must not count as sequenced or advance the
work order to DataProcessing. The summary exposes the saved run-not-performed fact
for consistent list/filter/detail/final-step presentation. No migration is needed:
the existing timestamp fields already permit null.

Reason run not performed appears as a required textarea directly below its
checkbox, before Results received and the library list. It uses the existing
results-note evidence, without a duplicate notes field for initial no-run capture.
On a recorded no-run job, show the previous reason as context and allow a fresh
required explanation for the correction in that same location;
hide receipt time, library outcomes, exceptions, locations and result notes while
selected. The no-run form contains only vendor reference, checkbox and reason.
Keep Run not performed visible from the outset. Selecting it sets the default
outcome to Fail and removes draft Success exceptions; disable outcome/exception
changes while selected, with a visible whole-batch explanation. Unchecking it
restores run-time entry and normal outcome choices without discarding the reason.

The visible outcome label is Batch outcome. Fail hides all following fields except
Results notes and supplies no exceptions or references. Success permits only
Failure exceptions. Keep failed libraries identified in Per library locations;
disable their location input, explain that no location is required and exclude
any retained draft path from validation and the command. The API also rejects
Success exceptions/locations for failed batches and locations for failed members.
The Owner requested more room: the results modal now uses a 44rem desktop maximum
(704px), retaining the shared phone margins and scrolling regions.

Data locations are required for every successful library. Whole batch requires
one covering location; Per library requires every successful member's location.
Failed members and no-run batches are exempt. Existing recorded references count
toward coverage when appending handoff notes or further locations. Enforce coverage
in the form and API, and never send hidden/disabled location drafts.
Per-library rows retain the Owner's hidden location labels and show a visible
shared required marker beside the library/tube identity when a location is still
required. Failed rows have neither a required marker nor a required/active input.

Results are captured atomically only after vendor receipt. The Owner subsequently
authorized modification of current recorded results with a required explanatory
note. No completed-record backfill or
legacy repair path is supported. Stable command IDs/hash, staff authorization,
sendout/batch locks and optimistic concurrency protect the atomic save and replay.
Keep four-stage presentation consistent in list/detail/filter/next step.

Current recorded results are editable: vendor reference, run/receipt times, batch
outcome, member exceptions and the no-run decision. Require a fresh note for every
save of an existing result. Save the previous complete result/exception/completion
snapshot, the new request, actor, entry time and note in an appended correction
event; exact replay remains idempotent and changed replay conflicts. Preserve
declared location history and ordinary role/lock/version controls. Correct batch
completion when the receipt/no-run disposition changes. A no-run-to-performed
correction advances the work milestone; never roll back a shared work order or
alter scientific approval/release. No-run selection is prohibited when scientific
outputs reference the sendout, and a no-run sendout cannot supply a new output.
The detail history exposes a Result changes comparison. This current-record edit
flow supersedes the earlier immutability rule and is not a legacy repair path.
Once a result exists, the action and modal title are Edit results with a pencil
icon. Initial capture retains Record results with the folder-plus icon; completed
forms use Save changes and require the correction note.

The Owner requested a direct Record results button at the trailing end of the
Next step description row. The description omits Choose Actions and wraps in the
remaining width; narrow layouts may wrap the button to the trailing end below.
While that primary next-step control is present, omit its duplicate header-menu
item. Lists and fully recorded details retain Record results in Actions for later
handoffs. Dialog close returns focus to its actual invoking control, falling back
to header Actions after the next-step button disappears on successful recording.

## Owner-directed rollback and removal of legacy repair — October 6, 2026

The Owner explicitly requested removal of code intended to fix legacy records,
and a one-time local data patch reversing the preceding workflow for the six-library
batch PH-BAT-20261004-TAHDCRV5. Remove the retrospective completed-outcome method,
superseded outcome/storage controller methods, DTOs and clients, completed-results
gap filling, the completeness flag and historical UI/filter special cases.
Keep the current atomic workflow and immutable later data-location additions.
No persisted model change or migration is needed for this removal.

Return only this batch to Vendor received / InProgress, preserving shipment,
vendor receipt, Catalog snapshots, physical tube transfers, membership and vendor
reference. Clear its simulated run/receipt/outcome and batch completion fields;
remove the three superseded simulated custody events, one exception and one
reference. Preserve an exact pre-patch recovery snapshot, use reviewed identities
and version guards in one transaction, increment batch/sendout versions and audit
the authorized rollback. Leave the shared work order/projection and other batch
unchanged. Verify the configured local database and updated modal, without
recording new vendor results. See the [rollback checkpoint](../testing/runs/2026-10-06-vendor-results-rollback.md).

## Earlier batch detail checkpoint — recovery behavior withdrawn by Owner

The Owner identified a completed list record whose workflow appeared to stop at
vendor receipt, a redundant list card inside its single-record detail page, and
an informational Next step with no available outcome action. The detail header
now owns the batch identity, status, recorded start/completion times and one
shared Actions control. The list and detail use the same action component; remove
the nested list card. Draft library scanning remains available in its own
collapsed control.

The temporary missing-outcome recovery behavior was withdrawn by the Owner.
The shared detail header, removed duplicate list card and draft scanner remain.

## Approved batch actions and storage entry — October 6, 2026

The Owner approved **Prepare sequencing tubes** while an Operator can prepare
the physical pairs, and **View libraries** with an eye icon when the records are
read-only. The view retains library identity, source and sequencing tube barcodes,
transferred volume and transfer evidence. Remove the manual **Custody event**
menu action and form; preserve recorded history and automatic stage evidence.

External storage omits **Data description** from the dialog, as the Owner requested.
The API continues assigning **Sequencing results** automatically. The dialog uses
the shared pill toggle for **Whole batch / Per library**. The Owner explicitly
requested the toggle instead of the rectangular tab-like control. Whole batch records one
sequencing data location. Per library presents every member with its library and
sequencing-tube identity and its own location. Blank rows remain pending and do
not block saving available locations; at least one location is required.
Additional references and correction notes remain append-only.
The Owner also requested an approximately 15% wider storage modal. Its desktop
maximum increases from 32rem to 36.8rem; the shared narrow-screen margins remain.
This width applies to external storage only.

Owner-approved visible-label exception: each identified Per library row has one
location input, so repeating its visible label adds unnecessary clutter. Show
**Sequencing data location** as the placeholder and retain a persistent hidden
label naming that library, error association and the surrounding library/tube
context. The Whole batch field retains its visible label. This bounded exception
does not change the application-wide visible-label default for other forms.

The storage action and dialog use the shorter **Add data location** title with
a decorative folder-plus icon on the action. The whole-batch save label matches;
Per library retains **Add library locations**. Permissions, scope and save behavior
are unchanged.

The Portal/API contract changes to one atomic storage-reference command containing
the selected scope, reviewed sendout version, notes and stable per-row request IDs.
Validate the entire command before saving, enforce membership and permanent
locations, and accept identical retries without duplicates. New descriptions are
assigned by the API. Reuse existing reference rows; no persisted-model change,
migration, data conversion or deletion is needed. Keep Operator/Supervisor
authorization, audit actor/time and finalization gates. This scope does not
authorize Git publishing, deployment or scientific/data-provider operations.

Verification: compile the solution, frontend typecheck and scoped lint,
documentation generation and whitespace checks; inspect desktop/narrow and
light/dark rendering, scope switching, validation, preserved drafts and focus.
Update existing regressions for the command and labels. Automated execution
remains deferred under the request-only test policy.

Implementation and local review are complete. The solution compiles without
warnings/errors; frontend typecheck, scoped lint and documentation checks pass.
Connected browser inspection covers the storage form, scope drafts,
validation, library identities, read-only view, removed custody action,
keyboard/focus, light/dark and desktop/tablet/320-pixel rendering. Preview entries
were discarded without a valid storage save. Multi-row database save/replay
acceptance and automated execution remain deferred. See the
[verification record](../testing/runs/2026-10-06-sequencing-batch-actions-storage.md).
The isolated solution build passes. Activation in the existing local API session
is pending a Visual Studio debug restart: IIS Express/Visual Studio lock the
development assemblies, so the normal-output build cannot replace them. Preserve
that session and distinguish the rendered UI evidence from active API save support.

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
