# Sample traceability and investigation

Status: locally implemented capture, personal/on-behalf performance, independent performer/time review, immutable scientific profiles, sample investigation/reports, staff scientific capture screens, commercial/Trial delivery and retention history, and indefinite internal-evidence preservation. Focused validation and a synthetic local restore are recorded below. The owner approved immediate enforcement on September 19, with all existing data confirmed as test data and no backfill. Hosted recovery, actual producer/bench acceptance and production deployment remain open.

The owner authorized phase 1, then the verified capture gaps, the personal-performance slice, and finally closure of remaining known gaps, including the previously unrun verification. This authorizes additive local implementation and focused tests. Three subsequent individual approvals settled indefinite preservation, required scientific evidence, and independent performance review; the governance contract records them. Production activation remains separate. Product direction confirmed in the conversation is recorded below; proposed new business rules remain identified for review.

The [sample investigation contract](LAB-SAMPLE-INVESTIGATION-CONTRACT.md) records the new UI, saved reports, optional scientific metadata, authorization boundaries, history limits, additive migrations and remaining decisions. The [September 18 verification record](../testing/runs/2026-09-18-sample-traceability.md) supersedes earlier authored-but-unrun test notes in this plan. A timestamp precision mismatch between JSON step evidence and PostgreSQL receipts found during this verification was fixed by using microsecond precision at both command boundaries.

The continuation closes the direct supporting-report access and unchecked-download-integrity gaps. It also supplies a native local backup/restore rehearsal for the exact result-to-tube chain, saved manifest and private PDF. Final continuation evidence is **43 focused regression checks plus one restore test and four investigation browser cases, all passing**. The [recovery record](../testing/runs/2026-09-18-investigation-restore.md) distinguishes this synthetic proof from hosted backup, scheduled cleanup/holds and scientific acceptance. No retention duration or approval rule was inferred, and no additional migration is required.

### Phase 1 engineering scope

Persist immutable sequencing-output records (library, sendout membership, actual provider run, sample mapping, external file identity and checksum) and analysis runs with typed input links. A run belongs to one specimen and one producing attempt; paired inputs and multiple libraries from that attempt are supported, combining attempts is not. Bind each result package/release to its analysis run at creation. Each governed artifact records an explicit whole-file or contained-result locator. Corrections create new records with predecessor and reason; nothing guesses the latest attempt.

Existing receipt, attempt, preparation, library, custody and correction records remain authoritative. Freeze material/equipment facts at their existing capture boundaries. Add restricted Lab capture/read APIs and compatible trusted-pipeline capture APIs using existing authorization. No new authentication, dependencies, external storage ownership, or provider execution is introduced. The actual external run identity is distinct from the existing transfer submission identifier.

`PSeqOrderToCash:RequireResultTraceability` and `RequireScientificEvidence` default on following the September 19 immediate-enforcement decision. Subsequent approvals/releases also recheck current policy for existing test packages; there is no grandfathering or backfill. When enabled, newly registered/uploaded results require validated lineage. Supplying lineage voluntarily also pins the requirement on that result; disabling the switch cannot remove it. Existing unknown results retain null links. No migration infers or backfills scientific evidence. Internal evidence APIs precede the investigation UI in phase 4.

The implemented [capture contract and handoff matrix](LAB-RESULT-LINEAGE-CONTRACT.md) identify each writer, minimum field, scope/concurrency guard, immutable record and remaining evidence boundary. Migration `20260919015602_AddLabResultLineage` was applied to verified local `phaeno_ops` and the isolated reference/rehearsal databases. Backend regression and PostgreSQL execution are recorded above. The full solution build, schema consistency and documentation checks form the local implementation checkpoint; they do not prove provider/physical/scientific acceptance.

### Next slice — personal step performance evidence

The September 18 request to do the next slice covers the bounded [step performance contract](LAB-STEP-PERFORMANCE-CONTRACT.md): personal performance confirmation, Now/Earlier capture, offset/minute precision and late-entry reason, distinct performer/recorder history, shared preparation timestamps, and correction links that preserve original attribution. Both individual and preparation UI paths use this capture. Historical and compatible-client omissions remain unknown; no new mandatory release gate is activated. Performance amendments, on-behalf entry, multiple performers, late-entry review policy and full scientific profiles remain pending. Existing JSON storage is extended without an EF model change or migration. Focused backend, frontend and browser execution is recorded above.

## 1. Product outcome and confirmed workflow

When a customer questions a result, authorized Phaeno staff must be able to open the laboratory job, select the sample, identify the exact delivered result version, and reconstruct the evidence that produced it. They must also see uncertainty, missing evidence, failed attempts, corrections, and subsequent changes.

**Highest-priority confirmed requirement: capture and retain all necessary data so that a specific result can be traced back to the exact physical sample tube that produced it.** The history screen is a way to inspect that evidence; it is not the primary deliverable and cannot compensate for missing capture. Implement and prove the data chain before treating the investigation UI as complete.

For each new result/version in the enabled workflow, the system must answer from persisted evidence, without an operator's memory or a name-based guess:

**Specific result/version → analysis run and exact inputs → sequencing output/run and sample mapping → library/derived material → processing attempt → source tube ID/barcode → customer sample and accession.**

The current one-tube-per-attempt policy remains authoritative. Multiple tubes for a sample, reserve attempts, shared preparation trays and sequencing pools must not make the producing tube ambiguous. A package-level sample label is insufficient if the package contains several files or sample results: retain per-artifact or per-contained-result attribution at the granularity of the actual scientific output, including a stable record identifier/locator when multiple sample results share one file.

Confirmed entry point:

**Lab ops → Closed jobs → Job → Sample → Sample history**

Use the same sample workspace from Active jobs. Closing or cancelling a job must not remove access to its historical evidence. Preserve the current Active/Closed definitions; this feature does not introduce a whole-job Failed outcome. A sample can have unsuccessful attempts and still have a successful delivered result.

Primary users are existing authorized laboratory operators, supervisors, scientific reviewers, and staff investigating a customer inquiry. Existing backend capabilities determine access; this plan does not grant CRM users or external customers access to internal laboratory evidence.

The primary questions are:

1. Which customer sample, physical tube, and processing attempt produced this exact delivered result?
2. What happened, when, who performed it, and who recorded or reviewed it?
3. Which procedure versions, reagent lots, instruments, libraries, sequencing runs, and analysis inputs were used?
4. What failed, changed, was repeated, skipped, held, corrected, approved, withdrawn, or reissued, and why?
5. Which evidence remains available, what was deliberately deleted, and what was never captured?
6. If a lot, instrument run, or batch is suspect, which other authorized samples share that exposure?

## 2. Current foundation and verified gaps

Current source takes precedence over older planning prose. The earlier gap discussion described file references generally; current preparation workflows already support optional scanned PDF QC and preparation reports. Similarly, retained package receipts already preserve some file/sample/accession/tube lineage after byte deletion. Extend these capabilities rather than creating parallel storage or receipts.

| Area | Existing foundation | Work required |
| --- | --- | --- |
| Navigation | `JobsList` opens the laboratory job; its Specimens tab links to `LabSpecimenPage`. | Turn the existing sample detail into the investigation workspace; preserve Closed/Active filters and return context. |
| Source and attempts | Specimen, submitted/derived containers, source selection, previous attempts, pinned workflows, stage executions, preparation membership and attempt history. | Assemble the full lineage; show all attempts and relevant shared work, with exact sample membership and no inferred edges. |
| Step evidence | Versioned protocol captures, actor/recorded time, QC outcomes, skips, repeats, corrections, and preparation records. | Show one navigable history; distinguish performed time/person from recording time/person and system-generated actions. |
| Resources and custody | Consumption and equipment-use records link to executions/preparation records; containers, storage, sendouts and custody records exist. | Audit capture completeness, retain historical resource facts, expose movements and shared resource attribution precisely. |
| Results | Sample/version-linked releases, package corrections, manifests, checksums, scientific approval, publication and delivery/retention evidence. | Add explicit immutable links from a result version to the producing attempt(s), library/input(s), sequencing run(s), and analysis run(s). A sample identifier alone is insufficient. |
| Scientific processing | Provider sendout references and result pipeline/provider/version/provenance fields exist in different workflows. | Establish a required, versioned evidence contract; consistently link external raw/intermediate input identities, parameters and reference versions. External files remain outside POMS storage ownership. |
| Attachments | Authorized private preparation PDF upload/download, clean scans, hashes, and optional legacy file references. | Broaden controlled evidence attachment coverage where needed; distinguish preserved attachments from external references and unavailable evidence. |
| Retention | Released-deliverable policies, holds, retained metadata/receipts and frozen lineage already exist. | Prove preservation of the entire investigation chain, including bench reports and historical resource/configuration facts. Define its separate retention policy. |
| Completeness/export | No consolidated sample-level evidence coverage assessment or full investigation export. | Add rule-based coverage with honest unknowns, and an authorized reproducible internal report. |

Source map:

- UI: `frontend/src/features/lab-operations/{JobsList,LabWorkOrderPage,LabSpecimenPage,LabTubePage}.tsx`.
- Laboratory records: `backend/modules/PSeq.Operations.Laboratory/Domain/{LabSpecimenAttempt,LabPreparationBatch,LabProtocolEvidence,LabExecutionRecords,LabOperationsDomain}.cs`.
- Results: `backend/modules/PSeq.Operations.Commercial/OrderManagement/Domain/PSeqResultDelivery.cs`, `backend/app/Features/OrderManagement/Domain/LabServiceModels.cs`, and the existing result pipeline adapter contract.
- Retention: `backend/app/Features/FileManagement/Services/` and the existing released-package receipt/lineage implementation.
- Owning rules: [Lab Operations](LAB-OPERATIONS-PLAN.md), [Lab contract](LAB-OPERATIONS-CONTRACT.md), [Sample shipping](SAMPLE-SHIPPING-AND-INTAKE-PLAN.md), [Order management](ORDER-MANAGEMENT-PLAN.md), [File management](FILE-MANAGEMENT-PLAN.md), and [PSeq result delivery](PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md).

## 3. Sample investigation workspace

Extend the stable `/lab-operations/$workOrderId/specimens/$specimenId` route. Do not add an unrelated top-level investigation application or duplicate sample identity.

- Header: job and organization, customer sample identifier, accession, current outcome, selected delivered result version, and evidence-coverage status. Keep customer sample, specimen, physical tube, attempt, and result identifiers distinct.
- Default to the latest valid delivered result when one exists; show earlier, corrected, withdrawn, and reissued versions explicitly. A withdrawn-only sample must not appear to have a valid current delivery. Before delivery, show the current attempt while retaining history.
- Overview: summarize the selected result's exact producing chain and unresolved gaps. Include separate contextual history occurring after the selected release; never imply later evidence was known at approval time.
- History: a unified chronological view with filters for attempt, stage, evidence category, date, and person. Every event links to its authoritative source. Batch evidence identifies the sample's participation and applicable portion rather than copying unrelated samples' facts.
- Supporting sections: tubes/custody and derived lineage; processing attempts and step evidence; materials/equipment; sequencing/analysis; QC/review/results; documents and delivery. Use progressive disclosure and a small number of substantial tabs or sections, not one tab per entity.
- Display measurements with units, pinned instructions and criteria, deviations, original/corrected values, actor, event time, recording time, and time precision. Provide both human-readable names and stable identifiers.
- Links to underlying execution, tube, batch, resource, or package details preserve the sample and Closed/Active list return context. Direct reload and browser Back must work.
- Show an explicit section error/retry when a source cannot load. A failed query is never equivalent to no evidence or complete coverage.
- Add an internal investigation report action. Group multiple contextual actions in one Actions dropdown; one available action remains directly labeled. No embedded edit forms on the history page.
- Use shaded semantic list headers, existing typography, light/dark themes, keyboard-accessible expansion, focus restoration, mobile reflow and accessible descriptions. Avoid color-only coverage or outcome labels.

Reading history never changes status, creates evidence, approves work, or reopens a closed job. Permitted corrections continue through their owning workflow with existing guards.

## 4. Evidence identity, relationships and historical integrity

### 4.1 Canonical evidence graph

Keep authoritative feature-owned records. Implement a Lab-owned query/assembly service over them; do not duplicate all facts into a second editable history database. A rebuildable read projection may be added only if measured query performance requires it.

Every displayed evidence item exposes a stable source identity/type/version, specimen and attempt membership where known, event kind, actor identity, occurred/performed time, recorded time, and links to related evidence. Distinguish explicitly verified relationships, evidenced historical recovery, and unknown relationships. Never match solely by names, time proximity, or a currently assigned batch.

Required relationship chain for new fully traceable results:

`commercial sample ↔ lab specimen → source tube → attempt → workflow/stage/step records → derived library/container → sequencing run/input files → analysis run → output package/version → scientific approval → release/delivery`

Use typed foreign keys/join records for durable relationships, restrictive deletion, and tenant/job/sample consistency checks. Shared batches and pooled libraries can have multiple contributing samples; allow multiple producing inputs only when explicitly recorded and scientifically supported. Require the per-sample demultiplexing/mapping evidence where a shared run produces individual outputs. Do not invent pooling support merely to populate a relationship.

### 4.2 Capture contract at every handoff

Build a field-level capture matrix for every supported producer, not merely a history query. Each mandatory relationship must identify its authoritative writer, capture moment, validation, transaction boundary and immutable record. Persist machine-supplied IDs automatically; use barcode confirmation and controlled selection for physical handoffs. Do not ask staff to reconstruct these links at release time.

| Capture moment | Minimum persisted relationship/evidence |
| --- | --- |
| Receipt and accession | Commercial sample and lab specimen IDs, registered physical tube identity/barcode and any supplier crosswalk, receipt/intake decision and its actor/time. |
| Source selection/start | Exact source container ID and barcode confirmation, attempt ID/sequence, selected workflow version and predecessor attempt where relevant. |
| Each processing step | Exact attempt/execution and protocol-step version, covered members, performed/recorded identity/time, required measurements/QC/resources and any exception/correction. |
| Derived material/library creation | Output container/library ID and barcode, exact parent material/source and producing attempt/step; preserve any scientifically supported multi-parent relationship explicitly. |
| Sequencing handoff/output receipt | Exact library membership and submitted identifiers, provider/run/output identities, and index/lane/demultiplexing mapping where applicable. |
| Analysis start/completion | Stable run identity, exact input identities/checksums and their sample/library mapping, pinned software/configuration/reference versions, execution/QC evidence and output identities. |
| Result finalization/release | Specific result/artifact/record and version, exact producing analysis and tube chain, approval and delivery identity; freeze the binding with the approved package. |

Reconcile manifests against the submitted physical/library membership: reject unknown, duplicated, conflicting or unmapped identities instead of selecting a match. Expected outputs that never arrive must remain visible as missing/failed outcomes. IDs and barcodes do not replace proof of the physical handoff; retain required scan/confirmation evidence.

For the prospective enabled workflow, missing or ambiguous mandatory tube lineage blocks finalization for scientific review and release. Apply this to manual/API/provider paths as well as the UI. A free-text explanation cannot substitute for the producing tube relationship. Historical unknown records stay accessible and visibly incomplete; activation cutoff and treatment of existing in-flight work require the rollout decision below.

### 4.3 Result provenance binding

- Freeze the producing attempt/input/run links and scientific configuration snapshot when an output package is finalized for review; approval pins that exact package revision.
- Validate that inputs belong to the correct sample/job, were eligible, and support the reported workflow. A failed/superseded attempt cannot silently become the source of a successful result.
- Keep the existing one-tube-per-attempt behavior. Combining contributions from multiple attempts/tubes is outside current scientific scope; if a future approved workflow supports it, every contributing source must be explicitly linked and reviewed, never selected through an implicit latest-attempt fallback.
- Corrections or reanalysis produce a new analysis/output/release version with an explicit predecessor and reason. Preserve earlier input links and delivered versions.
- Retain both legacy `LabResultRelease` and governed `ResultOutputPackage` paths in the inventory and rollout. Provide one read representation while preserving each path's authoritative semantics.
- Existing records receive recovered links only when deterministic stored evidence proves them. Ambiguous records remain unknown with a reviewed gap record; never bind them to the latest attempt automatically.

### 4.4 Resource and custody facts at the time of work

Inventory and, where absent, capture container movement/from/to location, receipt/condition, handoff, quantity changes, disposition, depletion, failure, and derived-output creation with actor and time. Do not represent a current-location field as proof of all past movements or temperature control.

Resource evidence must preserve the actual lot/product/supplier identity, quantity/unit, relevant expiration/retest/QC state, equipment identity, and applicable calibration/maintenance status at use. Reference immutable versions or retain bounded snapshots; later renaming, deactivation, QC changes, or calibration must not rewrite history. Structured prepared-reagent component lineage must remain traversable.

For shared material/equipment use, retain the actual recorded quantity and applicable members. Do not fabricate equal per-sample consumption from a batch total. Unknown historical allocation is explicit.

Provide authorized reverse lookup from a lot, instrument run, library pool, preparation or sequencing batch to affected samples and jobs. Enforce scope before returning counts, names, exports, or links.

## 5. Capture when work happened and who performed it

- Store server-generated `recordedAtUtc` and authenticated recorder for every new evidence record. The client cannot rewrite these fields.
- Capture `performedAtUtc`, or start/end when duration is scientifically meaningful, plus actual performer(s) separately. Preserve timezone/offset and precision for entered local timestamps; handle ambiguous/nonexistent daylight-saving times explicitly.
- A normal real-time action may default performed time to now and performer to the signed-in operator, but the UI must make the confirmation explicit. Do not equate save time with measured step duration.
- Late entry requires an explanation. Corrections append a new record with reason and reference to the original; retain both times and identities. Apply appropriate laboratory roles, concurrency and dual-control checks to actual performers and recorders.
- On-behalf-of entry must not bypass step role requirements or scientific-review separation. If performer identity cannot be verified, record it as unverified and fail the applicable coverage rule rather than assigning the recorder's identity.
- Automatic skips, imports and other system events identify their system source and causal request. They do not claim an operator physically performed the step.
- Validate impossible chronology and unexpected future times; define acceptable tolerances and late-entry review with laboratory sign-off. Preserve historical date-only or unknown values without synthesizing precision.
- Upgrade both standalone protocol execution and preparation/batch pathways; no pathway can bypass the new contract when the new rules are activated.

## 6. Sequencing and analysis provenance

Define a versioned scientific evidence contract for each supported service/workflow. The following are proposed fields for laboratory review, not invented historical facts:

| Boundary | Required evidence to agree and enforce |
| --- | --- |
| Library and sequencing | Library/output barcode and source membership; provider and submission/run identifiers; instrument/run/flow-cell/lane where applicable; pool/index and demultiplexing mapping; submitted/received/run times; sequencing QC and source report. |
| Analysis inputs | Stable external object/file identifiers, sizes and checksums; input role; exact sequencing output and sample mapping; source system and availability state. |
| Analysis execution | Stable run identity; workflow/software/container version or digest; parameters/configuration; reference genome/annotation/database identifiers and versions/digests where applicable; start/end/status; QC metrics, logs/report references, retry/reanalysis relationship. |
| Outputs and release | Output manifest/checksum, artifact identities/roles, producing run and attempt chain, scientific reviewer/decision/time, release version, correction/withdrawal and delivery evidence. |

Reuse existing pipeline-version/provenance fields and final-output package contracts. Add compatible structured evidence fields and validation; do not treat a free-text provenance string or an adapter-generated submission identifier as proof that the pipeline ran.

POMS stores compact provenance metadata and approved supporting evidence. External systems continue to own raw/intermediate bytes. Retain stable references and integrity metadata rather than expiring signed URLs or credentials. Label external data as available, unavailable, deleted, or availability not checked. A file hash identifies content; it does not prove scientific correctness.

Provider imports must be authenticated, authorized, schema-versioned, idempotent, replay-safe and attributable. Reject cross-sample mappings and contradictory terminal updates; retain rejected-input diagnostics safely. Review provider capability/contract changes before implementation; do not introduce a new provider integration or transfer large datasets under this plan alone.

## 7. Supporting documents and evidence preservation

- Reuse the existing private file, malware-scan and preparation-report mechanisms. Extend typed attachment associations to the required step, QC, custody, sequencing, analysis, deviation or review record.
- Store file name/type/size/checksum, uploader, recorded time, evidence role, scan status, source record, and availability/deletion state. Enforce private authorized downloads and permitted formats/sizes using the owning policy.
- Support multiple evidence documents where the scientific procedure requires them. Distinguish uploaded preserved files, external references, and legacy text references in both UI and export.
- Referenced evidence that is unavailable or not verified cannot satisfy a rule requiring preserved evidence. Do not automatically fetch arbitrary user-entered URLs or expose storage keys.
- Corrections append a replacement association and explanation; preserve original metadata and any bytes subject to retention/hold. No silent attachment replacement.
- Evidence required for an investigation is a different retention class from customer downloadable result bytes. Audit every cleanup path, shared-file reference and cascade before rollout.
- Existing package metadata and receipts remain retained according to current rules. Result-file expiration must not remove sample identity, producing links, manifest/hashes, decisions, correction history, delivery receipts, or evidence-availability explanations.
- Extend the existing preservation-hold model to the relevant investigation scope without creating a competing hold mechanism. Hold application/release is authorized and audited; concurrent cleanup must respect it. A hold cannot restore bytes already deleted.
- Approved policy: retain internal sample/traceability records, investigation reports and private supporting reports indefinitely for now, independently of customer download expiry. No new deletion schedule applies. Hosted operational preservation/restore still needs acceptance.

## 8. Evidence coverage and investigation reports

### Coverage

Pin a versioned evidence requirement profile to new work at the appropriate service/workflow commitment boundary; retain the profile governing each attempt and result review. Later configuration changes do not retroactively mark historical work compliant or alter its original requirements. Show a separate assessment under newer rules only when requested and clearly identified.

For each required item distinguish **Recorded**, **Pending work**, **Missing**, **Unavailable**, **Legacy unknown**, and **Not applicable**. Not applicable must be supported by the pinned rule or an authorized reason. Keep integrity errors and load failures explicit. The aggregate may state **Required evidence recorded** only when every applicable requirement is satisfied and all sources were successfully read. Avoid an unconditional Complete label and never equate coverage with scientifically valid results.

Track gap ownership, explanation, resolution evidence and reviewer where needed. Corrections can resolve a gap without erasing that it existed. Cancellation and allowed skips change applicable requirements only through explicit rules; do not demand sequencing evidence for an attempt cancelled before processing.

Initial historical coverage is informational. The enabled prospective workflow must enforce the mandatory result-to-tube chain described in section 4.2; the approved scientific profile and immediate cutoff now apply without historical backfill. Additional coverage gates follow the approved profile. An authorized exception to other evidence requirements remains visible and cannot masquerade as recorded evidence or waive an unknown producing tube. Closed legacy jobs remain readable without being silently reopened or re-released.

### Internal investigation report

Generate an internal, permission-checked report for an exact sample and selected result/attempt scope. Include identities, lineage, timeline, pinned versions, original/corrected evidence, measurements, resources, documents and their availability, decisions, delivery, coverage gaps, generation time, authorizing user, and report/schema version. Include an immutable source-version manifest and content checksum so the report's contents are reproducible at its captured point in time.

Provide a printable report and structured evidence manifest using existing facilities where possible. Raw/intermediate files and large result bytes are not embedded by default. Later corrections must not silently alter a previously captured report. Reauthorize generation/download and audit it; apply the agreed investigation retention policy to generated reports. Filtered reports must clearly declare scope and omissions.

The initial report is Phaeno-internal. No automatic customer sharing, email, public URL, or broadening of external receipt contents. A customer-safe report is separate product scope requiring disclosure rules.

## 9. Engineering and compatibility approach

- Preserve feature ownership: Lab owns specimen/attempt/history queries and execution evidence; Commercial owns order, result release and customer delivery; File Management owns authorized storage and retention. Use application services/contracts across module boundaries rather than merging models.
- Add narrow authorized sample-history, lineage, coverage and report endpoints under existing Lab routes. Validate work-order/specimen/tenant relationships on every request and nested fetch. No raw database IDs alone confer access.
- Keep route components thin; use TanStack Query for paginated/filterable history and related evidence, existing form validation for writes, and stable query keys. Server-derived permissions and coverage are authoritative.
- Persist operational changes and their evidence atomically. Preserve optimistic concurrency, audit stamping, unique command receipts and replay behavior. Save/report failures must not leave orphaned blobs or falsely complete history.
- Migrations are additive initially. Update `docs/database-erd.md` with every schema change. Use nullable legacy fields and explicit availability states; separate schema migration from reviewed evidence recovery.
- Run a read-only inventory before backfill. Report proposed exact matches, ambiguities, duplicates and conflicts. Recovery is idempotent, audited, source-supported and separately approved for shared/production data. Never invent timestamps, performers, run IDs, links, or documents.
- Deliver compatible producer/consumer changes in order: schema/readers, optional writers/import adapters, UI/coverage, then approved enforcement for new work. Do not rewrite accepted commercial or scientific snapshots.
- Keep old route links valid. Preserve authorization, current supported scientific scope, release permissions, delivery semantics, and legacy incomplete records.
- History and coverage should update from committed records at read time; they do not need a cron job. Reuse existing background facilities only for lengthy exports, provider ingestion or retention when needed. Any cached projection must declare freshness, preserve source identities and be rebuildable.
- Use bounded joins and cursor pagination with deterministic event ordering. Avoid per-event queries and full-job payloads for every sample. Load testing must include shared batches, long histories and multiple result versions.

## 10. Implementation sequence and exit criteria

The local slices now cover durable capture, actual performance and independent review, scientific requirement profiles, preserved internal evidence, the connected sample view and reports, staff scientific-entry screens, and commercial/Trial delivery and retention history. The [staff capture/history contract](LAB-SCIENTIFIC-CAPTURE-AND-HISTORY-CONTRACT.md) and its verification record describe the latest software closure. Phase 5 production activation, actual producer/bench acceptance and hosted recovery remain open; local verification does not establish those outcomes.

| Phase | Work | Exit criterion |
| --- | --- | --- |
| 0 — Inventory and decisions | Map every evidence source/write path, identity link, current retention/deletion path and historical gap. Review section 11. Add source-to-requirement matrix and fixture inventory. | Each of the six identified gaps and retention concern has an owner, source, change, test and acceptance criterion; unresolved decisions have explicit gates. |
| 1 — Capture and durable lineage | Implement the handoff capture matrix, result/artifact-to-attempt/input/run/tube bindings, immutable resource/custody facts and correction relationships. | Every supported writer persists the required chain; wrong-sample, conflicting, missing and ambiguous lineage cannot produce a releasable new result once enabled. |
| 2 — Complete scientific evidence | Add performed/recorded identity/time, approved sequencing/analysis metadata, supporting attachments, requirement profiles and reviewed legacy recovery tools. | Required evidence is captured atomically; a specific result can be reconstructed from stored records without inference. Historical unknowns remain explicit. |
| 3 — Investigation preservation | Extend retention/holds as approved and prove cleanup, backup and restore boundaries for the complete chain and supporting evidence. | Result-byte cleanup, configuration changes and resource retirement cannot erase the approved retained traceability evidence. |
| 4 — Connected sample view and reports | Extend the current sample page with existing and new evidence, coverage/gap review, reverse lookup and internal reports; preserve Closed/Active navigation. | Staff can inspect and export the proven chain; source links, captured report snapshots and partial/error/legacy states remain accurate and scoped. |
| 5 — Validation and rollout | Complete automated and manual journeys, documentation, measured performance, migration/recovery rehearsal and provider/bench acceptance. Enable approved prospective rules gradually. | Evidence in section 12 is recorded, release approvals are explicit, and no unresolved mandatory decision is represented as completed. |

## 11. Product/scientific decisions to settle before dependent implementation

Update: the owner has now approved indefinite internal evidence retention, the mandatory scientific minimum with explained applicable exceptions, and separate-supervisor approval for on-behalf entry and performer/time changes, one question at a time. These decisions supersede the first three pending recommendations below and are recorded in the [governance contract](LAB-EVIDENCE-GOVERNANCE-CONTRACT.md). Activation cutoff/in-flight policy is settled: immediate enforcement, no backfill, and no exemption for subsequent approvals/releases of existing test jobs. Production deployment is unchanged. The approved decisions are implemented locally; see the governance verification record.

All four product decisions below are settled. The owner explicitly approved immediate enforcement and no backfill on September 19. Deployment and operational verification remain separate.

| Decision | Recommendation | Gate |
| --- | --- | --- |
| Investigation retention duration and clock | Approved: indefinite internal record/report preservation for now, separate from customer download expiry. | Implemented locally; hosted recovery remains an acceptance gate. |
| Required scientific evidence | Approved: source tube/sample/run, QC, analysis software/settings/references, times, input checksums and output attribution; meaningful explained exceptions only. | Profile 1 implemented locally; real producer acceptance and activation remain. |
| Performed-by and late-entry rules | Approved: on-behalf entries and performer/time changes require a reason and a different Supervisor; originals remain. | Implemented locally with immutable proposals/decisions and release checks. |
| Activation cutoff and existing in-flight work | Approved: enforcement starts now; all current data are test data. No backfill or grandfathered future approval/release. Existing records stay readable and unchanged; capture a compliant replacement before continuing. | Defaults and runtime boundaries implemented locally; production deployment remains. |

Engineering choices, table layout, APIs, indexes and query mechanics remain Codex responsibilities. New dependencies, authentication changes, cross-app contract changes and shared-database operations retain the repository's explicit-scope/approval requirements.

## 12. Acceptance and verification matrix

Tests are planned, not executed by creation of this document. Add/update the owning living test plans when tests are implemented. Use disposable local fixtures; never replay an existing production specimen workflow to manufacture evidence.

| ID | Required proof |
| --- | --- |
| ST-01 | Closed jobs → job → sample → evidence, direct reload, Back, filters/page/scroll restoration; equivalent Active entry; cancelled and withdrawn-only histories remain accessible. |
| ST-02 | One successful attempt: receipt/tube, every required step, resource use, library, sequencing/analysis, approval and exact delivered version form a complete verified chain. |
| ST-03 | Failed first attempt plus reserve success: both remain visible and the delivered version binds only to its actual inputs. Mixed-attempt evidence cannot silently satisfy requirements. |
| ST-04 | Repeat, correction, reanalysis, withdrawal and reissue retain original values, reasons, actors/times and original result bindings. A report captured before correction remains reproducible. |
| ST-05 | Shared batch/pool/run across jobs: exact membership and authorized reverse lookup; no invented per-sample quantities, duplicated evidence, or other-tenant identity leakage. |
| ST-06 | Real-time, late, on-behalf-of, automatic, date-only, unknown and daylight-saving timestamps; future/contradictory times and missing reasons reject correctly. Dual control includes actual contributors. |
| ST-07 | Resource renamed/retired, lot QC changed or equipment recalibrated after use: historical facts stay unchanged. Movement, failed/exhausted material and derived lineage remain visible. |
| ST-08 | Valid/missing/duplicate/out-of-order provider messages, conflicting checksums and wrong-sample run mappings. No provider acknowledgement is misrepresented as completed analysis. |
| ST-09 | Uploaded versus external evidence; clean/malicious/invalid/oversized files; failed upload/save and exact retry; private authorized download and preserved original replacement history. |
| ST-10 | Required/pending/missing/unavailable/legacy/not-applicable states, pinned rule changes, approved exceptions, partial query failure and stale reads. Coverage never implies scientific validity. |
| ST-11 | Actual result-byte cleanup leaves the approved investigation chain/receipts available; holds beat concurrent deletion; hold release follows policy; already-deleted bytes stay explicitly unavailable. Test all supported result pathways and shared blob references. |
| ST-12 | No membership, wrong role, mismatched job/sample/attempt, deactivated account, cross-organization batch and expired session: endpoints, evidence downloads, report jobs and exports all deny unauthorized data. |
| ST-13 | Concurrent corrections, package finalization, snapshot report generation and command retry: atomic evidence, reproducible report boundary, no duplicate records or orphaned files. |
| ST-14 | Historical recovery dry-run and repeat application: only proven relationships are added; ambiguity and unknown performer/time remain; existing snapshots and releases do not change. Migration/restore rehearsal verifies counts, links and cleanup behavior. |
| ST-15 | Desktop/mobile, light/dark, keyboard, focus, screen-reader critical journey, 200% zoom/400% reflow, reduced motion and long identifiers. No automatic accessibility claim from unit checks alone. |
| ST-16 | Internal report scope, source versions/checksum, clear omissions/availability, repeatable captured snapshot, safe print layout, generation/download audit and no customer distribution. |
| ST-17 | Representative long-history fixture (at least 10,000 events across paginated histories), concurrent updates and shared batch fan-out: bounded payload/query count and no missing/duplicated events. Proposed target: first usable page within two seconds in the agreed test environment; record actual measurements. |
| ST-18 | Laboratory owner walks a representative questioned-result investigation using actual bench/provider evidence and confirms it is sufficient to explain the result. Simulated provider and physical evidence remain explicitly separate. |
| ST-19 | Starting with a specific delivered result identifier/version alone, resolve its exact physical source tube from persisted relationships. Cover multi-file packages, multi-sample files with stable result locators, shared runs, identical display names, relabelled supplier crosswalks and a failed first tube/reserve second tube. Each supported writer rejects missing/conflicting lineage; no latest-attempt/name/time inference is permitted. |
| ST-20 | Remove each mandatory handoff field/link in turn from otherwise valid new-work requests across manual/API/provider paths: capture or finalization/release blocks at the correct boundary with an actionable error. Restore valid evidence and retry idempotently. Verify no route or legacy endpoint bypasses the enabled prospective contract. |

Backend unit/PostgreSQL coverage must prove relationships, immutable history, validation, authorization, concurrency, replay, cleanup and migration recovery. UI component tests cover rendering, coverage states and safe forms. E2E covers full navigation and investigation journeys, including true backend-connected acceptance separately from mocked fixtures. Run tests only when requested at the implementation checkpoint under repository policy.

The primary success measure is **100% of specific released results in the enabled prospective workflow resolve unambiguously to their actual source tube through captured, validated relationships; zero newly released results have a missing producing-tube chain**. Prove this through ST-19/ST-20 before investing completion claims in the history UI. Every additional required field/edge must be attributable and verified, all ambiguous legacy evidence marked, and cross-sample/tenant leakage absent. The laboratory owner must be able to complete the investigation without assembling facts from unrelated screens. Do not measure success by hiding gaps or inventing backfill.

## 13. Documentation, release and completion checklist

- [x] Keep this plan and the source-to-requirement matrix current as decisions are approved.
- [ ] Prove every mandatory result-to-tube relationship is captured by its actual writer and retained; pass missing-link rejection tests before declaring the workflow traceable.
- [ ] Update the Lab contract, Order/File/Shipping plans and complete ERD alongside implemented changes; do not describe planned behavior as already shipped.
- [x] Update Phaeno lab/job, protocol, results and retention guides with the actual navigation, performer/time meanings, gap states, correction rules, reports and limits. Update registry summaries/review dates, links and searchable corpus. External guides change only if external behavior changes; retain separate audiences and safe static content.
- [x] Record backend, frontend and E2E results in their living plans; distinguish simulated tests, signed-in provider acceptance, physical evidence and business sign-off.
- [ ] Rehearse additive migrations and reviewed recovery on an isolated copy with representative legacy data. Verify backup/restore, evidence counts/links and rollback-compatible readers before a shared deployment.
- [ ] Obtain explicit implementation/release/migration authorization at the relevant stage. A prior release authorization does not activate this new feature or retention policy.
- [ ] Deploy schema/API and compatible producers before UI/enforcement; record exact source revisions, migration/backup identity, runtime health and read-only signed-in smoke evidence.
- [ ] Do not roll back by deleting evidence or dropping populated new tables. Disable new enforcement/writers or forward-fix while preserving captured history if rollout must pause.
- [ ] Complete the laboratory-owner investigation walkthrough and resolve all mandatory decisions. Only then mark the full plan complete.
