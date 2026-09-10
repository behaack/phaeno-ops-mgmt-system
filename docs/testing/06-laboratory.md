# 06 — Laboratory operations

Use [shared prerequisites](TEST-DATA.md). A trained Lab owner supplies procedures and evaluates scientific criteria. Record browser, physical bench and provider evidence separately.

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
| 1 | Open **Receipt & accession → Receive shipments**. For a physically arrived container, scan its current PH-P- insert and submit **Receive shipment**. Repeat the same scan. Try a voided insert, wrong barcode type and unconfirmed-save retry on separate fixtures. | Arrival is recorded once with its original time/event. Retry is safe. Wrong/voided inserts cannot receive a container. Awaiting Lab work moves to Received and appears in Work; Commercial lifecycle becomes InProgress, while the Customer-facing stage is Received. Tubes are not bulk-accessioned or scientifically accepted. |
| 2 | Open **Accession samples**, select the received container or look up its current insert. Compare expected tube identities. Try opening accession before arrival on a separate fixture. | Read-only lookup identifies the exact container/manifest/crosswalk. Arrival is required before tube accession. Job/sample lookup can identify related manifests without receiving them. |
| 3 | Scan SAMPLE-B's first **Supplier tube barcode**. In **Accession tube**, enter its actual **Freezer box barcode** and save; leave its second container untouched. | The verified tube's receipt/accession is saved; its Lab container retains the permanent supplier identity and entered freezer-box value. Focus returns to the tube scanner. Only actual receipt counts increase; sample-wide accession is not complete while expected tubes remain. |
| 4 | Cancel another freezer-box entry, close with **Close — continue later**, and reopen. Later receive SAMPLE-B's other container and accession its second tube. | Cancel leaves that tube pending; earlier saves survive. The second tube reuses the specimen accession number with a distinct physical container/barcode. Only after all expected tubes across active shipments are accessioned does the Commercial sample show Accessioned. |
| 5 | Try another container's tube, unknown tube, already-accessioned tube, voided insert and packet-as-tube variants. Retry an unconfirmed save with the same box; try changing an already-accessioned tube's box. | Associations are enforced. Replays do not duplicate receipt, accession or containers; this flow does not relocate previously accessioned tubes. Invalid input keeps a recoverable scanner state. |
| 6 | Complete all tubes and revisit accession, Work and Customer views. On a separate fixture record actual arrival without previously recorded Customer dispatch. | Completed containers leave the accession queue, but the Job remains in Work. Shipment/sample/Job totals reconcile; missing carrier/tracking is not invented. Scientific acceptance and its turnaround target remain unchanged. |
| 7 | In the work record create a derived child container with its immediate parent; record a failed print and an actual successful print. | A distinct barcode retains parent lineage; failed print evidence persists and the print count advances only on **Label printed** confirmation. Adopted supplier tubes require no additional tube label. |
| 8 | Reprint with a reason and scan adopted/derived barcodes; try altered/unknown barcodes. | Existing identity and storage remain traceable; bad barcodes are rejected and scanner focus returns. |
| 9 | Record Accepted, On hold and Rejected intake on separate eligible specimens with required reasons. | Decisions persist independently of physical receipt/accession. Received Work visibility does not wait for scientific acceptance. Turnaround starts only from authoritative acceptance. Unsafe unmatched arrivals are escalated instead of attached to guessed work. |

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
