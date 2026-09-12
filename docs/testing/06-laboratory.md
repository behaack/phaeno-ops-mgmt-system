# 06 — Laboratory operations

Use [shared prerequisites](TEST-DATA.md). A trained Lab owner supplies procedures and evaluates scientific criteria. Record browser, physical bench and provider evidence separately.

For the resumed local walkthrough, use the [TEST ONLY library-preparation protocol draft](fixtures/test-library-preparation-protocol.md) and [September 11 preparation record](runs/2026-09-11-protocol-preparation.md). These supply a candidate fixture for LAB-01/03/04, not an approved scientific procedure or completed acceptance evidence.

## LAB-01 — Controlled protocols, independent approval and workflow pinning

**Setup:** P-PROTOCOL-A/B, approved test definition and service identity; old pinned work order plus new-work fixture.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create protocol identity and structured Draft with required/conditional steps, captures, resource requirements and QC criteria. Save/resume. | One Draft, stable key and ordered definition; missing conditional condition/choice values/QC criteria rejected. |
| 2 | Author attempts Review and approve; independent Protocol Administrator then attests/approves. | Author self-approval rejected; independent approval freezes exact version and actor/time. |
| 3 | Create service workflow stages using approved protocol versions; approve and Promote to production. | One current Production workflow for service; unapproved protocol stages cannot become valid production workflow. |
| 4 | Create/approve newer protocol/workflow version; compare old/new authorized work. | New work uses current Production version; existing work remains pinned to original versions. |
| 5 | Attempt ordinary edits/deletion of approved version; discard only a separate draft. | Controlled history immutable; draft discard retained. Permanent never-approved deletion is unnecessary for main acceptance. |

**Handoff:** Pinned operational work goes to LAB-02–04; preserve author/approver identities for reviewer separation.

## LAB-02 — Receipt, multi-tube accession and physical lineage

**Execution status:** Not run as a full manual case. The [local correction record](runs/2026-09-10-intake-progress-correction.md) establishes narrower database and signed-in evidence; it does not pass physical scanner/bench acceptance. Do not repeat that completed correction.

**Setup:** Current manifests from ORD-05/SHP-01–14, P-LAB, approved physical fixtures, SAMPLE-A with one tube and SAMPLE-B with two tubes. Include SAMPLE-B split across two containers and record expected shipment/sample/Job totals. Empty-kit Customer acknowledgment is distinct from returned-sample Lab receipt. Use separate hold, rejected, duplicate and no-recorded-dispatch variants.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open **Receipt & accession → Receive shipments**. For a physically arrived container, scan its current PH-P- insert and submit **Receive shipment**. Repeat the same scan. Try a voided insert, wrong barcode type and unconfirmed-save retry on separate fixtures. | Arrival is recorded once with its original time/event. Retry is safe. Wrong/voided inserts cannot receive a container. Awaiting Lab work moves to Received and is available in the Library prep job history lookup; Commercial lifecycle becomes InProgress, while the Customer-facing stage is Received. Tubes are not bulk-accessioned or scientifically accepted. |
| 2 | Open **Accession samples**, select the received container or look up its current insert. Compare expected tube identities. Try opening accession before arrival on a separate fixture. | Read-only lookup identifies the exact container/manifest/crosswalk. Arrival is required before tube accession. Job/sample lookup can identify related manifests without receiving them. |
| 3 | Identify SAMPLE-B's first **Supplier tube barcode** and inspect it. Record any exception against its expected row; otherwise choose **Accept all remaining (1)**, enter its actual **Freezer box barcode**, confirm inspection and save. Leave its second container untouched. | The verified tube's receipt/accession is saved; its Lab container retains the permanent supplier identity and entered freezer-box value. Focus returns to the tube scanner. Only actual receipt counts increase; sample-wide accession is not complete while expected tubes remain. |
| 4 | Cancel an unsaved bulk-storage entry, clear the unsaved selection or confirm its discard with **Close — continue later**, and reopen. Later receive SAMPLE-B's other container and accession its second tube. | Cancel leaves that tube pending; earlier saves survive. The second tube reuses the specimen accession number with a distinct physical container/barcode. Only after all expected tubes across active shipments are accessioned does the Commercial sample show Accessioned. |
| 5 | Try another container's tube, unknown tube, already-accessioned tube, voided insert and packet-as-tube variants. Retry an unconfirmed save with the same box; try changing an already-accessioned tube's box. | Associations are enforced. Replays do not duplicate receipt, accession or containers; this flow does not relocate previously accessioned tubes. Invalid input keeps a recoverable scanner state. |
| 6 | Complete all tubes and revisit accession, Work and Customer views. On a separate fixture record actual arrival without previously recorded Customer dispatch. | Completed containers leave the accession queue, but the Job remains in Work. Shipment/sample/Job totals reconcile; missing carrier/tracking is not invented. Scientific acceptance and its turnaround target remain unchanged. |
| 7 | In the work record create a derived child container with its immediate parent; record a failed print and an actual successful print. | A distinct barcode retains parent lineage; failed print evidence persists and the print count advances only on **Label printed** confirmation. Adopted supplier tubes require no additional tube label. |
| 8 | Reprint with a reason and scan adopted/derived barcodes; try altered/unknown barcodes. | Existing identity and storage remain traceable; bad barcodes are rejected and scanner focus returns. |
| 9 | During accessioning, record Accepted, On hold and Rejected on separate identified tubes with the appropriate reason requirements; include a rejected tube with no storage. See LAB-13 for bulk and correction cases. | Decisions persist independently of physical receipt/accession. Received Lab work visibility does not wait for scientific acceptance. Turnaround starts only from authoritative acceptance. Unsafe unmatched arrivals are escalated instead of attached to guessed work. |

**Handoff:** Continue accepted specimens through LAB-03–06 and [ORD-07](04-lab-orders.md#ord-07--customer-laboratory-stages-and-mixed-sample-progress). Record tube/manifest → receipt → accession/container → freezer-box associations and before/after totals. Physical qualification follows the [bench plan](../plans/LAB-OPERATIONS-BENCH-VALIDATION.md); absent hardware/operator evidence is Blocked. Existing owner Jobs are read-only regression references, not new receipt fixtures.

## LAB-03 — Material QC, prepared lots, consumption and equipment

**Setup:** Qualified/failed/expired lot fixtures, available quantities/units, calibrated/overdue equipment, started execution.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create supplier lot using controlled material/supplier/location; supervisor records QC. | New lot starts Pending; Fail requires reason; only approved eligible lot can be consumed. |
| 2 | Prepare reagent from exact qualified component lots and quantities. | Component quantities deducted atomically and lineage retained; insufficient/expired/wrong-unit component blocks whole operation. |
| 3 | Record consumption against started execution; try exceeding availability, incompatible unit and failed/expired lot. | Valid consumption persists once; invalid usage blocked without changing inventory. |
| 4 | Register equipment with calibration dates; try due-before-last and future-last-calibration variants. | Invalid dates rejected; stable assigned asset identity retained. |
| 5 | Record qualified equipment use, then attempt inactive/overdue equipment. | Valid use links execution; unsuitable equipment blocked; original consumption/use history retained. |

**Handoff:** Capture lots/quantities/equipment IDs in execution traceability, not in CRM.

## LAB-04 — Guided evidence, QC blockers, correction and completion

**Setup:** P-LAB/P-SUP, role-restricted and repeatable steps, specimen-pinned workflow, test required/optional/conditional steps.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Assign eligible workflow stage/operator; attempt later required stage before predecessor completion. | Only pinned eligible stages/active operators allowed; ordering applies to matching specimen/work-order scope. |
| 2 | Start execution and record required typed captures/confirmation/resources; try wrong type/choice/missing required capture and insufficient role. | Definition-driven validation and server role enforcement reject bad evidence; file reference captures do not pretend to upload files. |
| 3 | Resolve optional/conditional steps with supported skip and reason; try skipping required/performed work. | Required/performed work cannot be turned into skipped work; explicit allowed skips are retained. |
| 4 | Record QC Fail/Hold with reason and try next step/complete. | Blocked state persists and prevents progress. Approved scientific criteria remain operator-assessed. |
| 5 | Use allowed Repeat or supervisor Correct with required role/reason and fresh confirmations. | Original evidence remains in Step history; earlier-step changes require later evidence review/re-recording. |
| 6 | Leave/reopen, satisfy all blockers and Complete execution; attempt further evidence. | Progress persists, server rechecks saved evidence, completion locks it. Held/finished jobs reject new evidence. |

**Handoff:** Completed execution supports library creation and independent scientific review; preserve correction history.

## LAB-05 — Libraries, scan-first batches and external sequencing custody

**Setup:** Completed preparation, source and derived library containers, QC-passed/failed libraries, P-LAB and real or explicitly simulated provider events.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create library linked to source/specimen/library container/completed execution; record named QC measurements and decision. | Immutable library key is container barcode; QC evidence/units and lineage retained. |
| 2 | Create draft batch and scan passed libraries; try duplicate, failed library and non-library barcode. | Only eligible unique libraries added; failed scan changes no membership; successful scan refocuses. |
| 3 | Confirm membership and Start batch with observed start time. | Batch becomes In progress, prerequisite for sendout; UTC event and separate audit time retained. Do not complete batch before creating sendout. |
| 4 | Create sendout while batch is In progress, check frozen membership/library barcodes and progress Shipped → Received by provider → Sequencing → Complete using known events. | Manifest/custody/event facts retain provider/reference/timing; no fabricated provider receipt from merely clicking a status. |
| 5 | Complete batch with actual observed completion time when appropriate to the approved procedure. | Completion and audit timestamps retained; original membership/history not silently rewritten. |
| 6 | Review mixed-organization batch from external order views. | Only safe own-work progress projected; no other Company's identity, commercial price or batch membership leaks. |

**Handoff:** Final output from the actual upstream owner must meet approved package contract. Raw ingestion/pipeline orchestration is outside POMS.

## LAB-06 — Exceptions, independent scientific approval and release candidate

**Setup:** Complete lineage/package fixture; P-LAB/P-SUP/P-REVIEW/P-RELEASE; missing-artifact and blocking-exception variants.

September 12 setup caveat: the isolated LAB-14 preparation runtime explicitly disables governed result-package validation, and its completed preparation job remains Processing. It cannot establish LAB-06 package-validation acceptance. Use a separate review-ready synthetic fixture/runtime with governed result-package validation and dual-control enforcement confirmed, plus an independent reviewer. Preserve existing preparation/sequence fixtures; do not fabricate provider events or force their review milestone. See the [active run](runs/2026-09-12-lab-14-preparation.md).


September 12 follow-up: separate 3016/7116 runtime and cloned database on an owned commit-tracking-enabled cluster now provide bounded signed-in evidence. Missing package blocks Save; a synthetic ready package saved by Independent Reviewer reaches ReadyForRelease with one approval and no release timestamp/user. This legacy-compatible fixture omits tube lineage and uses synthetic package readiness; it does not close full LAB-06 setup, real ingestion/scanning or publication gates. See the active run for exact fixtures and preserved environments.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Record Internal exception and separate Customer-action exception with safe summary. | Internal investigation remains Lab-only; only safe required action projects externally. |
| 2 | Try scientific review/approval with open blocking exception, unfinished execution or incomplete/unclean package. | Each scientific gate blocks approval; exception resolution/rework retains failed original facts. |
| 3 | Contributor attempts approval, then independent reviewer inspects complete sample package/manifest/checksum and approves. | Contributor fails separation; authorized independent approval pins exact immutable package. |
| 4 | Open Order operations → Result release as release manager; inspect before publication. | Ready for release creates candidate but grants no download; package identity and scientific evidence are connected. |
| 5 | Publish as authorized release manager with unpaid Customer Lab invoice; compare Trial no-charge release. | PSeq scientific publication is independent of payment/credit; external files visible only after release. Trial aggregate completion still uses TRI-05. |
| 6 | Simulate failed safe projection and retry original event. | Candidate/milestone recovers without duplicated work, approval or release; record transfer delivery separately. |

**Handoff:** Use FIN-01 for Customer completion invoice and DAT-04–06 for downloads/retention; keep reviewer independence evidence.

**Sources:** [Lab guides](../../frontend/src/content/docs/phaeno/lab-operations.mdx), [receipt/accession guide](../../frontend/src/content/docs/phaeno/lab-receipt-accession.mdx), [protocol guide](../../frontend/src/content/docs/phaeno/lab-protocol-execution.mdx), [approval guide](../../frontend/src/content/docs/phaeno/lab-scientific-approval.mdx), [Lab contract](../plans/LAB-OPERATIONS-CONTRACT.md), [tube receipt/accession controller](../../backend/app/Features/LabOperations/Controllers/LabOperationsController.Work.cs), [split-shipment receipt tests](../../backend/test/SampleShippingPackingPostgresTests.cs), [Lab provider tests](../../backend/test/LabOperationsProviderPostgresTests.cs), [execution E2E](../../frontend/e2e/lab-protocol-execution.spec.ts).


Receiving-insert acceptance for LAB-02: print the current insert on Letter and
A4 at actual size. Confirm a single receiving sheet for representative content,
large square PH-P QR code under **Scan to receive this shipment**, an isolated container
code below it, correct container totals, and legible handling notes. Scan each
code deliberately and confirm the exact displayed value; only PH-P submits
shipment arrival. Open the Portal disclosure to recover the full manifest and
instructions. Test keyboard access and an unavailable network without recording
another receipt. Mark physical printer/scanner checks Blocked until performed.

## LAB-07 — Protocol retirement, workflow invalidation and revalidation

**Status:** Partial local evidence only. Step 6 passed for a separate Production workflow with no assigned jobs: warning/confirmation, retirement, Invalidated historical v1, and clean Invalid recovery v2. Step 9 has review/removal UI evidence only; no revalidation approval/promotion was submitted. Active/queued-work, concurrency, full revalidation and other branches remain Not run. See the [preparation run record](runs/2026-09-11-protocol-preparation.md). Earlier retirement verification used the superseded dependency-blocking rule and does not prove these scenarios.

**Setup:** Separate synthetic protocols A and B; independently approved versions; a two-stage service workflow using A then B; Protocol Administrator, independent approver, and Operator accounts. Prepare separate workflow/job fixtures for no assigned work, queued work with no started execution, active processing, and completed/cancelled history. Preserve existing acceptance fixtures. Record protocol/workflow/version/job IDs and before/after states in the run record.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Retire protocol for an approved, unreferenced protocol. Try a blank/whitespace reason, then cancel. | Reason required; cancellation leaves protocol unchanged. No workflow warning when no workflow is affected. |
| 2 | Retire that protocol with a reason. Refresh; toggle Show retired. Also inspect discarded-only and mixed approved/discarded histories. | Retired protocol hidden by default and included when checked, with reason/time/actor retained. No Show discarded drafts filter; discarded-only records stay hidden in both states. Discarded revisions remain read-only within associated protocol history, labeled Discarded and without revision actions. Versions, approvals and history persist; retired protocols have no edit, delete or new-version action. |
| 3 | Try retirement when A is used by a workflow with samples actively processing, including a job whose earlier stage completed but workflow is unfinished. | Hard block names affected jobs. Neither warning confirmation nor a direct API request bypasses it; protocol/workflow/job states remain unchanged. |
| 4 | Repeat with an on-hold job with started work, then a queued/on-hold job with no started work. | Started work blocks; unstarted queued work produces the warning rather than a hard block. |
| 5 | Open retirement when the affected workflow has no in-process or queued work. Cancel the invalidation warning. | Warns that the workflow will change and become invalid; Cancel changes nothing. |
| 6 | Confirm retirement with no in-process work. Cover Draft, Approved and Production workflow sources, and multiple affected workflows. | Atomic retirement and invalidation. A is removed from new Invalid recovery revisions; B and its metadata/order remain. Earlier versions, stages and approval records remain historical. No affected workflow is available for new production use. |
| 7 | Open retirement with work assigned but no execution started. Check the listed jobs and cancel. Reopen and choose Proceed anyway. | Warning explains potentially stranded work and names the jobs. Cancel preserves everything. Confirm retires/invalidate as above and retains original queued job pins; each affected job is flagged and cannot start. |
| 8 | Attempt to assign/start work against an invalidated workflow through both UI and direct API; try a manually set processing milestone. | All paths reject new processing; merely knowing old version IDs cannot bypass invalidation. Receipt/history lookup remains available. |
| 9 | Open the new Invalid revision. Verify the retired protocol is absent; revalidate and approve without further modification using the independent reviewer. Promote it. | If at least one eligible stage remains, unchanged remaining stages can pass validation and approval. Only explicit promotion restores new production use. Original queued jobs are not silently repinned. |
| 10 | Edit an Invalid revision: add/replace/reorder retained stages, save/resume, then revalidate/approve/promote. | Correct stage order/requirements/captures and normal independent approval rules. Saving alone does not make workflow valid or Production. |
| 11 | Retire the only protocol in a workflow, leaving an empty Invalid revision. Attempt revalidation; then add an eligible protocol and repeat. | Empty workflow cannot be approved. A valid remaining procedure is required before approval/promotion. |
| 12 | Try including retired or unapproved protocols in a recovery revision; access a retired protocol's old edit/create-version route. | UI excludes unavailable protocols; API rejects stale or crafted requests. Historical definitions remain immutable. |
| 13 | Change workflow stages, add queued work, or start processing after the retirement impact preview but before confirmation. | Changed impact requires fresh review/confirmation; started processing blocks. Stale protocol/workflow versions cannot overwrite current state. |
| 14 | Race retirement against execution start, assignment, workflow save/approval/promotion and job authorization. | One consistent transaction wins; no newly admitted work starts under an invalidated workflow, no partial retirement/invalidation, no duplicate recovery revisions. Retried requests do not duplicate audit events. |
| 15 | Attempt retirement as an Operator/non-authorized user. Inspect completed/cancelled job history and audit records after authorized retirement. | Role enforced by API. Historical definitions/approvals/results preserved; actor/time/reason and queued-work warning consequences auditable. |
| 16 | Navigate warnings and recovery UI by keyboard at narrow width and in both themes. | Clear focus, readable named workflows/jobs, actionable errors, no overflow; required legend and reason validation remain accessible. |

**Evidence:** Capture impact warnings, blocked attempts, consent/cancel outcomes, removed-stage recovery definition, invalid/approved/production transitions, queued-job banner, history and audit identities. Record unexecuted scenarios as Not run or Blocked, never Passed. Reassignment of stranded queued work is a separate product workflow; do not repair database pins to complete this test.


## LAB-08 - Promotion after independent approval

Use synthetic local fixtures. Local walkthrough verified case 1 promotion as protocol author Bill on September 11, 2026, with workflow Production and both protocols Active; independent approvals were preserved. Existing two jobs retained Received/version 2/NULL workflow pins. Remaining cases, including new-job assignment, are Not run.

1. Author protocols as user A and independently approve them as user B. Author their workflow as B and approve it as A. As A with ProtocolAdministrator, promote the workflow; expect success with protocol approvals preserved and A recorded as the promotion actor.
2. On a separate approved fixture, promote as the workflow author after another user approved it; expect success. Verify the same path using the Actions menu and Cancel before confirming.
3. Attempt self-approval with enforcement enabled; expect rejection. For a legacy self-approved audit-only fixture, attempt promotion as a different user; expect rejection for either a self-approved workflow or included protocol, including an already Active protocol. Previous production versions and job pins must remain unchanged.
4. Reject promotion without ProtocolAdministrator, with stale workflow concurrency, after approval withdrawal, or with retired/ineligible protocols. No partial protocol activation or previous-version retirement may persist.
5. Confirm both original approvals and promotion actor/time are retained. New eligible jobs use the promoted version; existing jobs retain their saved pins, including existing unpinned jobs. Do not repair their assignments as part of this case.


## LAB-09 - Specimen tube attempts and reserve fallback

Implementation is local; the persisted journeys below remain **Not run**. Use separate synthetic fixtures. Preserve HS5Y7DB7's current Planned execution until the owner resumes the walkthrough. Record exact specimen, tube, workflow, attempt and execution identities, actor/time and expected denial alongside each result.

1. Create an order with a one-tube specimen and a three-tube specimen. Review the explicit run-one/failure-fallback instruction, confirm the exact roster and inspect the Lab job's matching policy. Extra tubes must not create extra analyses. Repeat finalization of an older, unfinalized order with explicit policy confirmation; preserve original snapshots. Check new Trial submission and replay of a historical V1 authorization independently.
2. Receive/accession tubes independently. Accept one, hold/reject a reserve with controlled reasons and leave one pending. Confirm one Accepted tube makes the specimen intake Accepted; the workspace names each tube's eligibility and received/expected counts.
3. Select an eligible source with the wrong barcode: reject without attempt or assignment. Correct it and save: exactly one Planned attempt and first-stage execution. Retry the identical request after simulated response loss: no duplicate. Cancel before start and reselect: retained cancelled history and released reservation.
4. Have two eligible Operators compete to select the same specimen, then to start it; exactly one selection/start persists. A stale page must show a useful conflict and preserve entered values. Source hold/unavailability racing with start must never permit an invalid source to start.
5. Scan the selected source to start. Attempt a different source, foreign container, invalid role or job-level/specimen direct assignment: deny. Once started, source identity is immutable; the source's intake cannot be rewritten. Unused reserves remain reviewable.
6. Record a repeatable QC Hold/Fail. The same attempt remains unresolved and no reserve can start. A permitted repeat may resolve QC. An explicit operational hold records responsible owner, reason and next action; it must be resolved before evidence continues. No customer hold-request workflow should appear.
7. Complete Stage 1, assign Stage 2 within the same attempt, then explicitly close the attempt as failed using a predefined reason and a started execution's evidence. Retain completed Stage 1, equipment/material use and output lineage. Ordinary Abandon cannot substitute for this failure action.
8. Choose Use reserve tube. Confirmation names the failed source/reason and first restart stage. Select a different eligible tube; save a linked next attempt at Stage 1. Prior completion must not unlock Stage 2. Failed source/output reuse, wrong parents, another specimen's material, batching or release must be rejected.
9. Complete all required stages and explicit optional/conditional decisions with resolved QC. A successful attempt blocks further source selection. Verify eligible library/batch/review paths and independent scientific approval without treating attempt success as release approval.
10. Fail with no eligible reserve. Expected receipt or a potentially usable held/unreviewed tube keeps processing On hold with owner/next action and one material-resolution exception. Resolve receipt/intake and verify no automatic restart. Confirm material exhausted only after terminal failure and no remaining usable/unresolved/expected material: specimen processing Failed, original intake Accepted preserved.
11. Retire a protocol during the gap between completed and unassigned stages: block because the attempt is in process. Verify existing queued-work warnings remain. Job hold/cancellation must prevent further progression or automatic fallback; policy changes cannot replace the recorded instruction.
12. On an unstarted legacy fixture, a Supervisor explicitly confirms the policy and selects a source. Adopt its matching first-stage Planned execution without duplication. Started/completed legacy fixtures retain historical evidence and show unresolved source identity without fabricated linkage.
13. Verify keyboard-only modal use, required-field errors, focus return, stale-value preservation, narrow layout and light/dark readability. Customer/Partner/Prospect guides show their order instruction without internal laboratory failure evidence.

Capture both permitted and rejected persisted actions. Full acceptance requires the success, fallback and exhaustion journeys and concurrent-client evidence; a build or read-only view does not pass these cases.

## LAB-10 - Tube intake acceptance and controlled reasons

Tube intake is implemented independently of LAB-09. Local UI checks passed for routine acceptance without reason, predefined hold/rejection reasons and Other requiring an explanation; no existing tube decision was saved. Complete the following on separate synthetic fixtures; persisted transition and concurrency cases remain Not run:

1. Accession a tube with Accepted after receipt checks: tube reviewer/time retained, no reason required, parent specimen Accepted and first acceptance target established.
2. Hold or reject another tube of that specimen with a predefined reason: accepted tube and specimen acceptance remain intact; failed reserve is not automatically disposed.
3. Reject unknown/free-text reason codes through the API; reject Other without notes; accept valid Other plus explanation.
4. As Supervisor, correct an unused held/rejected tube from its detail page: explanation and real retained storage required, prior decision retained in event history, original first specimen acceptance time unchanged.
5. With no accepted tube, show the specimen as Received or On hold; do not automatically reject a whole specimen from a rejected tube. Unknown/unreceived legacy tubes cannot become accepted through migration.
6. Confirm old specimen-level write endpoint rejects independent acceptance and directs to accessioning; block processing without an available accepted tube.
7. Race two reviews and review versus start; stale callers must conflict without partial specimen aggregation. Once a source is used, its intake is locked; unused reserves remain independently eligible for intake/correction. Historical processing without a source link retains the specimen-wide lock.
8. Validate role/job/specimen/container identity, audit history and internal-note privacy. Repeat same-tube accession without another container or acceptance event.
9. Open a Planned specimen execution before accepting any tube: Tube acceptance required and Open tubes are visible before any Start request, and Start is disabled. Follow Open tubes to the same job's Tubes tab; verify it precedes Execution and supports keyboard navigation. On a separate synthetic fixture, accept an available tube, return to the execution and verify eligibility refreshes without automatic start. Accepted-but-unavailable and another specimen's accepted tube must not unlock Start. Job-level and historical executions must not show this intake prerequisite.


## LAB-13 — Inspect at accession; record damaged tubes and accept the remainder

Status: Not run. Use a new isolated TEST ONLY shipment and synthetic evidence. Do not change the paused HS5Y7DB7 walkthrough.

1. Prepare and receive a shipment containing at least five registered expected tubes. Retain one as missing, one as an internal intake hold, one as destroyed, and two suitable for acceptance.
2. Open Accession samples with the current insert. Confirm that looking up the insert and identifying tubes does not save acceptance or storage.
3. Use the destroyed tube's expected row → Record exception. Choose Rejected / Damaged container, record synthetic condition evidence and confirm its identity. Leave storage empty. Save. Verify the registered expected-tube receipt and immutable barcode link, reviewer/time/reason, physical Rejected status, no location and no asserted material quantity. It must not appear as a selectable processing source.
4. Record an internal On hold exception for the retained questionable tube. Saving without actual storage must fail; provide real fixture storage and save. The missing tube remains outstanding with no receipt or rejection.
5. Identify only the two suitable tubes. Choose Accept all remaining (2). Confirm the rejected/held/missing tubes are absent. Empty storage or unchecked inspection must block saving. Enter each real fixture box and confirm inspection. Save once; verify two separate intake histories and one batch receipt, correct specimen acceptance, and no automatic source selection or execution start.
6. Reopen the shipment and confirm saved decisions and storage survive. Re-scan an already decided tube: no duplicate acceptance and no new bulk candidate. Close with an unsaved selection: a discard prompt must appear; saved exceptions remain.
7. In two operator sessions prepare overlapping acceptance selections. Save an exception or competing batch in one; the other must fail with an explanation and no partial acceptance. Entries remain for review. Verify stale version, voided insert, wrong shipment tube, duplicate tube, unavailable source and absent receipt are rejected server-side.
8. Retry an identical batch after an uncertain response. Assert no duplicate container, intake or batch event. Reusing the request identity with different contents must fail.
9. Open the job's Tubes tab. Confirm Received tubes has a distinct header, per-row statuses and storage, and no routine Review tube action. Open a barcode: inspect receipt evidence and parent/child lineage. Rejected without storage displays Not stored, never Available.
10. As Supervisor, correct an unused tube's intake with a required explanation. A non-stored record requires real retained-material storage before Accepted/On hold; a destroyed tube must not be falsely restored. An Operator cannot make the correction. Start an isolated source attempt and verify its intake cannot then be changed; use the existing attempt hold/failure path for later problems.
11. Check keyboard-only use, visible focus, dialog scroll and 390px layout in both themes. Both long required checkbox labels must keep their asterisk beside the final word, with a full-size checkbox aligned to the first line. Verify the sidebar says **Library prep**, opens preparation batches with the job/specimen history lookup, and preserves existing `section=work` links and navigation. Confirm unsaved forms are guarded during navigation and saving cannot be submitted twice.

Customer-requested hold management: Blocked by Product Owner instruction; this case does not authorize it. Physical inspection, scanner/printer use and persisted race/failure injection require separate recorded acceptance evidence.
## LAB-14 — Preparation trays, shared evidence and sequencing handoff

Current signed-in checkpoint: [September 12 run record](runs/2026-09-12-lab-14-preparation.md). Reuse its Approved v1 protocol and designated fixtures. The isolated UAT environment is running at https://localhost:3014 with workflow v2 independently approved and promoted. Mixed, reserve, correction and resource preparation batches are now complete; preserve them. The resource library joined the designated LAB-14 draft sequencing batch, which now contains two libraries; duplicate scanning was rejected. William's Operator-to-Supervisor role transition passed, but independent-person review and the full staff-account matrix remain open. Role visibility and keyboard automated checks supplement signed-in evidence. Remaining variants and resumable draft identities are recorded in the run checkpoint. Use that environment for further LAB-14 writes; see the run record for exact identities and the withdrawn author-approval finding.

Scope: [connected Library prep plan](../plans/LAB-WORK-JOURNEY-PLAN.md). Use designated **TEST ONLY** jobs and software-only protocol criteria; do not infer laboratory method validation from these tests. Keep the completed TEST-008 walkthrough, its output PH-L-U9QNAFGL5R-E and sole draft sequencing membership unchanged. Never dispatch, contact a provider or release results to finish this test.

**Setup:** two authorized jobs pinned to the same approved preparation-enabled workflow, one incompatible job, at least two specimens and an accepted reserve for one specimen. Define a repeatable shared observation/QC step, a required tube capture, a later review step and an optional stage. Have an in-date released material lot, available equipment, a draft sequencing batch, Operator and Supervisor accounts, and an unauthorized Customer account. Mark every fixture and all observations TEST ONLY. Source barcodes and specimen identities must remain distinct.

**Naming follow-up (partial, September 12 run):** UI field removal, distinct separate creates, retained notes/historical names and automated retry passed. Forced simultaneous collision coverage remains open. Create a preparation batch without entering a name. Verify the server-generated service/UTC timestamp identifier, optional notes after reload, unique identifiers for simultaneous creates, stable identity on retry, and unchanged historical batch names. Two intentionally separate creates with identical choices must produce two batches.

**Preparation setup sequence (complete before step 2):**

1. Complete step 1 below in **Lab configurations → Tray formats**. Reuse an existing suitable test format when its identity and layout are recorded.
2. In **Lab configurations → Protocols**, follow LAB-01 to prepare designated TEST ONLY versions. Enable preparation-batch use and explicitly set each capture/QC scope, including a shared observation with tube exceptions and a required individual capture. Identity barcodes use Tube scope. Verify the approval dialog shows preparation eligibility, all evidence/QC scopes and the selected-source matching constraint before attestation. Use software-only test criteria and obtain independent protocol approval. Preserve older approved versions.
3. In **Lab configurations → Workflows**, follow LAB-01 and LAB-08 to arrange those approved versions in order, obtain independent workflow approval, and promote the designated test service's workflow. Record the exact version; do not replace a live service's configuration to run this test.
4. Prepare or verify the setup jobs pinned to that same workflow version, with confirmed tube-use instructions and accepted, available sources/reserves through LAB-02/13. Preserve existing fixtures; never repin historical work or repeat receipt/accession merely to create a new test state. Record reused and newly prepared fixture identities, then continue at step 2.

| Step | Operator action | Expected result |
| --- | --- | --- |
| 1 | Open Lab configurations → Tray formats. Create a tray format with two rows, three columns and B3 unavailable. Preview numeric labels too; cancel once before saving. | Preview matches configuration; full-width fields, required legend, no save on cancel. An all-unavailable layout is rejected. Configuration appears last in the sidebar with a cog icon, after its divider. |
| 2 | Return to Library prep and create a preparation batch with the format and compatible workflow. Inspect the workflow choices. | Only active formats and approved, explicitly scoped workflows with a QC gate are offered. Missing-setup links open the relevant Lab configurations tab. Old approved definitions are unchanged. Preparation and sequencing batches are clearly separate. |
| 3 | Search by job or barcode. Scan accepted tubes from both jobs into A1/A2; leave the remaining usable positions empty. | Partial mixed-job tray is valid. Known specimen/job/source relationships are displayed and carried forward. A scan is required; lookup alone does not reserve. |
| 4 | Try a rejected/unreviewed/unavailable tube, an incompatible workflow, a second source for the same specimen, an occupied/unavailable position and a source reserved in another batch. | Specific rejection, no partial membership or attempt. Two simultaneous reservations yield exactly one owner. |
| 5 | Move a draft member, remove it with a reason and add it again. On a separate draft, cancel with a reason. | Positions update only in Draft; removed/cancelled attempts retain history and release the reservation. Compatible unstarted selections may be reused without duplicate execution. |
| 6 | In Lab configurations → Tray formats, edit or retire the source tray format after batch creation. | Existing batch layout stays unchanged; retired format is unavailable for new batches. Library prep offers batch creation and format selection; format management stays in Lab configurations. |
| 7 | Confirm and Start preparation. Try move, remove, replacement and individual execution writes afterward. | Identities, membership, positions and pinned workflow are locked. Legacy job/execution views direct the operator back to the preparation batch. |
| 8 | Open a shared step, select its covered tubes and record one shared observation and Pass; enter a differing value and Hold for A2 with a reason. Confirm coverage and performed work. | Shared input is retained once, effective evidence remains traceable, and A2’s Hold cannot be hidden by the shared Pass. Required tube measurements cannot be supplied by a batch value. |
| 9 | Leave a required tube field or confirmation blank; attempt a batch-field override and an exception without a reason. | Save is blocked; field errors are identified and associated with controls. Barcode fields remain per tube. |
| 10 | From the unfinished step, deselect A2 and record material use for A1. Return to the step. Repeat with equipment. | Coverage is named before saving, one physical use is recorded, inventory decreases once, and the unfinished step values remain. Failed tubes are excluded. Expired lots/unavailable equipment cannot be used. |
| 11 | Attempt a later step while an earlier step/QC is unresolved; attempt a role-restricted step without its role. | Prerequisite/role is visible; backend rejects bypasses. An authorized repeat may resolve Hold without starting a reserve. |
| 12 | Complete later review, then correct earlier shared evidence as Supervisor. | Original entries remain. Every affected tube needs fresh downstream review. A performed step cannot be rewritten as a skip. |
| 13 | Explicitly close A2’s attempt as failed with a controlled reason and evidence. Continue A1. | A2 remains in the locked tray and history; it inherits no later success and cannot enter sequencing. Failure does not automatically start another tube. |
| 14 | Put A2’s eligible reserve in a new preparation batch. | Linked next attempt starts at the first workflow stage; it cannot replace A2’s position or reuse failed output. |
| 15 | For A1, create a library output inside the batch. Record actual quantity, unit and storage; scan the resulting barcode. Also test selecting a compatible existing output on a separate fixture. | Known identity/parent/attempt relationships are carried forward. Wrong barcode blocks confirmation. Existing output quantities are shown and reused; unrelated outputs are rejected. |
| 16 | Complete the final required stage; on the alternate fixture explicitly skip an unperformed optional final stage with a reason. | Required work/QC and output identity must be resolved. A library is established from the output using references to the existing QC evidence; no second QC measurement entry. Skipped QC alone never grants eligibility. |
| 17 | Try closing with unresolved members; then account for every member and close. | Pending/Hold/unidentified outputs block closure. Successful and explicitly failed members are retained. Passing libraries cannot be assigned to sequencing before preparation closes. |
| 18 | Add the passing library to a draft sequencing batch, then repeat the scan/action. | Exactly one membership. Existing membership is visible and duplicate feedback names the conflict. Results & review retains its separate scientific approval and release gates. |
| 19 | Simulate response loss after a save, then retry unchanged. In another session create a stale version conflict. | Uncertain retry reuses the original command/version and does not duplicate consumption/output/history; definite conflict reloads current state and preserves entered values for review. |
| 20 | Attempt reads and writes as the unauthorized Customer; make a job/Trial held or closed before a command. | Backend denies access or progression atomically for all affected jobs. No customer-requested hold workflow is introduced. |
| 21 | Repeat representative forms with keyboard only, narrow viewport, dark theme and reduced motion. Cancel a nested action and return. | Readable rows/header contrast, aligned required markers, full-width selects, visible focus, no page-wide overflow; wide trays scroll within their region. One visible action is a button, multiple actions use Actions. |

**Evidence and boundaries:** record batch/job/tube/attempt/output identifiers, versions, actor/time, before/after resource counts, exact coverage, errors, QC references and sequencing membership. The automated PostgreSQL journeys use separate generated fixtures and clean only those records. Browser fixture checks prove interaction/accessibility, not persisted laboratory completion. A real tray/scanner/label trial, owner sign-off, provider processing and production deployment are separate acceptance gates; mark them **Blocked** or **Not run** until actually performed.
