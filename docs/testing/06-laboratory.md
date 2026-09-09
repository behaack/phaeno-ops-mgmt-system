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

**Execution status:** Not run. A prior screen review or synthetic barcode check does not establish physical receipt, accession, printing or the full manual journey.

**Setup:** Current manifests from ORD-05 with SAMPLE-A one tube/SAMPLE-B two tubes; P-LAB; approved physical/scan fixtures. Prepare a separate split-shipment variant with SAMPLE-B's tubes in different containers and record its expected per-shipment and Job-wide tube counts. Use [SHP-01–14 in the transportation-kit module](11-transportation-kits.md) for kit delivery, container allocation, Customer scans and manifest preparation. Customer acknowledgment of delivered empty kits is not Lab receipt of returned samples.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open **Receipt & accession** and look up the printed Job or sample barcode. Choose the manifest for the physically arrived container; compare its permanent supplier tube barcode. | The correct related shipments and current manifests are identifiable. The frozen crosswalk shows one row per physical tube, so a multi-tube sample ID may repeat with distinct ordinals/barcodes. References to other containers are not treated as this package's contents. Lookup/comparison alone does not record custody, receipt or accession. |
| 2 | Choose **Continue to receipt and accession** and review the carried packet/tube/sample/work identity. Record receipt condition, arrival time and location for the physical tube; attempt initial accession on a separate wholly unreceived specimen. | Current identity is rechecked before the action. Receipt establishes custody for the recorded tube; initial accession of the wholly unreceived specimen is blocked. The packet barcode is not entered as a specimen/container barcode. Network failures keep a retry path distinct from an identity mismatch. |
| 3 | On the split variant receive only SAMPLE-B's first tube, leaving its other container untouched. Refresh the Lab and Customer shipment views. | The arrived shipment, Job total and sample-wide tube counts increase only for the received tube. SAMPLE-B remains partly received and the untouched shipment stays unchanged; one package does not mark the whole sample received. |
| 4 | Accession the received SAMPLE-B tube, then later scan/receive/accession its second tube from its own current manifest. Review quantity/unit/location and accession identity each time. | Received tubes may be accessioned individually before all sample tubes arrive. SAMPLE-B keeps one accession number; its two permanent supplier barcodes become separate submitted containers linked to that specimen. No second POMS label is generated for adopted supplier tubes. Additional tubes cannot change the existing accession number. |
| 5 | Try a tube from the other shipment against this manifest, duplicate/already-accessioned tube, voided packet and packet-barcode-as-container variants. | Exact shipment/sample/tube association is enforced. A rejected/repeated operation does not increment unrelated receipt counts or create another container/accession. Use the replacement manifest after a controlled correction. |
| 6 | Complete the remaining physical tube receipts and revisit all related shipment/sample/Job totals. On a separate authorized fixture, record actual Lab arrival when Customer dispatch was not previously entered. | Completion reconciles only the physically received contents; split-sample completion requires every expected tube. An arrived ready shipment can reconcile receipt without inventing missing Customer carrier/tracking facts. Physical receipt totals remain distinct from the later scientific intake decision. |
| 7 | Create a derived child container with its immediate parent; print its POMS label, recording one failed print and one actual successful print. | The child has a distinct barcode and traceable parent. Failed print evidence is retained; print count increases only after actual **Label printed** confirmation. |
| 8 | Reprint with a reason and scan adopted/derived barcodes; try unknown/altered barcode variants. | Reprint preserves the current identity; valid scans locate precise lineage, unknown/altered scans are rejected, and the scan field refocuses. |
| 9 | Record **Accepted**, **On hold** and **Rejected** intake on separate variants with required reasons. | Scientific decisions persist independently of receipt. All expected specimen decisions govern the Lab work order's **Received** milestone. Unsafe early/unmatched arrivals are quarantined/escalated rather than associated with guessed work. |

**Handoff:** Accepted main specimens go to LAB-03/04. Record each manifest/tube → receipt → accession/container association and before/after per-shipment, per-sample and Job tube counts. Preserve the distinction between kit delivery, returned-tube custody and scientific acceptance. Physical label/scanner acceptance requires the [bench plan](../plans/LAB-OPERATIONS-BENCH-VALIDATION.md); new manual steps remain Not run until executed and recorded.

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
