# Result lineage capture contract — phase 1

Implemented locally September 18, 2026 under the [sample traceability plan](SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md). Production activation remains pending. This extends capture APIs without changing authentication or the Commercial-to-Lab authorization contract.

## Capture endpoints

September 23 material-transfer extension: new sendouts freeze `schemaVersion: 2`. Their member retains `memberId`, `libraryId`, `libraryKey`, `libraryContainerId`, `libraryContainerBarcode`, `sequencingContainerId`, actual sequencing `containerBarcode`, `materialTransferId`, `quantity` and `quantityUnit`. Capture verifies the exact member's transfer from the producing library into that sequencing tube, including specimen/attempt ancestry and aliquot amount/unit. The frozen lineage includes the sequencing tube and transfer before following the library back to its source. A manifest with no schema version or version 1 retains the earlier library-container barcode semantics; unknown versions fail explicitly. New per-tube custody entries reference the actual submitted sequencing tube. See [material tracking](SAMPLE-MATERIAL-TRANSFER-PLAN.md) for implementation and validation status.

Both routes use the same validation service and append-only records:

- `POST /api/platform/lab-operations/pseq-results/sequencing-outputs` and `analysis-runs`: existing active Lab Operator/Supervisor authorization.
- `POST /api/integrations/pseq-results/sequencing-outputs` and `analysis-runs`: existing configured pipeline authentication and governed-results configuration.

Trial writes retain the existing parent hold/acceptance transaction guard. Internal role authorization does not grant customers/prospects access. The API envelope and domain error conventions remain unchanged.

### Sequencing output

Request fields: `id` (producer-generated retry UUID), `labWorkOrderId`, `labSpecimenId`, `labLibraryId`, `labNgsSendoutId`, `providerKey` (100 characters), `providerRunReference` (255), `sampleMappingReference` (1000), `externalFileReference` (1000), `sha256` (64 hexadecimal characters), and positive `sizeBytes`. Optional corrections require both `correctsOutputId` and `correctionReason` (2000).

The provider run is the actual sequencing execution, not a transfer/submission acknowledgement. The mapping identifies the relevant demultiplexed sample/index/lane/record in that output; the external file reference must identify the exact file/version. POMS stores identity/checksum evidence, not raw/intermediate file bytes, and does not fetch arbitrary external references. These are producer declarations, not proof of their contents or scientific accuracy.

Capture requires the selected library's completed preparation execution, its started successful attempt and pinned workflow stage/protocol, a QC-eligible library, complete preparation membership, and exact parent-container paths back to the selected submitted tube. Library ID, library key and container barcode must match exactly one member of the **saved sendout manifest**. Current batch membership cannot substitute for missing historical membership. Preparing/exception sendouts reject output capture. The record freezes accession, submitted sample, tube/library IDs and barcodes, container parents, and the matching sendout member.

Request and external-file locks serialize identical retries and conflicting checksums. Replay with the same normalized content/source returns the original row; changed evidence conflicts. A different checksum for an existing file/mapping requires an explicit correction. The record, contribution event and source concurrency updates save atomically. No inferred recovery or latest-attempt fallback exists.

### Completed analysis

Request fields: `id`, `labWorkOrderId`, `labSpecimenId`, `providerKey` (100), `runReference` (255), and `sequencingOutputIds` (1–256 distinct registered IDs). Optional reanalysis requires both `previousAnalysisRunId` and `reanalysisReason` (2000).

Inputs must all belong to the exact specimen/job, one producing attempt/source tube and one purchased sequencing-run allocation. Multiple files and libraries from that attempt and allocation are supported; combining different attempts or purchased runs is outside the current scientific scope. Reanalysis retains its predecessor's purchased-run allocation. The shared result guard rechecks this boundary before subsequent result registration, review and release; mixed-run historical analyses remain unchanged but cannot advance or count toward run completion. Input ordering is normalized for replay. Run and typed inputs save together; the input set cannot later be extended or reassigned. Reanalysis creates a new run. This records a completed-analysis declaration and recording time; actual performed times and software/settings/reference/QC metadata are now implemented by the scientific-evidence and governance slices. Staff capture and record-detail screens are described in LAB-SCIENTIFIC-CAPTURE-AND-HISTORY-CONTRACT.md. The September 22 [assembly runner implementation](SEQUENCING-DATA-ASSEMBLY-PLAN.md) separately records live job lifecycle and links successful attempts to exact completed analyses; provider connectivity remains pending.

## Result binding and enforcement

`PSeqOrderToCash:RequireResultTraceability` and `RequireScientificEvidence` default **true** under the owner's September 19 immediate-enforcement decision. All existing data are test data; no backfill or grandfathered future approval/release is required. Stored historical records stay unchanged, but current requirements are rechecked before any subsequent result registration, scan finalization, scientific approval or release. Supplying `labAnalysisRunId` also pins `traceabilityRequired=true` on that result. Once pinned, later configuration changes cannot waive that lineage binding. See the [governance contract](LAB-EVIDENCE-GOVERNANCE-CONTRACT.md#immediate-enforcement-decision--september-19-2026).

Governed package registration accepts optional `labAnalysisRunId`. When required, it must resolve to a complete input chain for the exact organization/job/commercial-or-Trial sample. Artifact registration accepts `resultLocator`: use `*` only for an entire file belonging to that sample and analysis; otherwise provide the stable identifier/selector locating that result within the file. A traceable correction retains `correctsPackageId` and requires a nonempty top-level `correctionReason` (maximum 2000 characters) in the original checksummed manifest. Manifest, correction target and producing analysis cannot be reassigned.

Legacy result upload accepts optional form fields `labAnalysisRunId` and `resultLocator`. Enabled requests must supply both before file storage. The release keeps this binding; governed publication also copies it to the legacy release projection. Original version/reissue history remains authoritative.

The shared guard covers registration, scan finalization, scientific approval, normal publication, Trial publication, legacy manual release and automatic legacy payment-hold release. Required artifact attribution is checked before review/release. Unlinked legacy results remain readable but cannot advance through these boundaries under the current policy; no guessed links are added.

## Handoff and writer matrix

| Handoff | Writer / immutable facts | Save/validation boundary |
| --- | --- | --- |
| Receipt and source selection | Existing receipt/accession, tube, attempt, barcode-confirmed start and work events. Intake corrections additionally retain before/after decision/location facts. | Existing packet/tube, specimen, inspection, version and transaction guards; no duplicate identity/history store. |
| Processing and derived library | Existing pinned execution/protocol evidence, preparation member and library/container chain. | Reused; sequencing capture verifies the attempt, pinned stage/protocol and exact container ancestry. |
| Sequencing | `LabResultLineageService.RegisterOutputAsync` → `LabSequencingOutput`. | Actual provider/file/mapping, frozen sendout member and tube ancestry; atomic append plus work event and optimistic concurrency. |
| Analysis | `RegisterAnalysisAsync` → `LabAnalysisRun` + `LabAnalysisInput`. | Same-specimen, same-attempt exact inputs; atomic immutable input set; predecessor/reason and replay guards. |
| Governed and Trial result | `PSeqResultPipelineController`, Lab scientific approval, normal release, `TrialResultService`. | Required analysis binding and per-artifact locators; checksummed correction reason; existing reviewer/publication authority retained. |
| Legacy result | `PlatformLabServiceOrdersController`, `OrderIntegrationDispatcher`. | Shared lineage validation before new upload and release, including automatic payment-hold release. |
| Resource use | Standalone material/equipment writers and `PreparationResourceAsync`; inline step fields delegate to the latter. | `resourceSnapshotJson` retains recording time, stable identities, names, lot QC/expiry/component references or equipment status/calibration. Existing preparation records retain exact covered members. No invented per-tube quantity for shared use. |
| Custody | Existing sendout custody events and intake work events. | Actor/time/location and exact references remain append-only; intake corrections preserve original and revised facts. |

Usage snapshots describe facts available **when recorded**, not reconstructed facts at a backdated physical-use time. Unknown historical resource snapshots remain null. Tracked application writes cannot overwrite/delete recorded sequencing/analysis/input/resource/custody evidence; corrections use new records. Restrictive foreign keys preserve referenced identities. No new deletion policy or external-storage ownership is introduced.

## Internal read contract

`GET /api/platform/lab-operations/work-orders/{workOrderId}/specimens/{specimenId}/results/{resultId}/lineage` uses existing Lab Operator/Supervisor/Scientific Reviewer/Operations Administrator roles. It validates the exact job/specimen/result/organization scope and joins either governed packages (including Trials) or legacy releases to the saved analysis/inputs/tube barcode. Cross-scope and conflicting relations fail explicitly.

Response includes result kind, analysis/attempt/source IDs, frozen source barcode, analysis, input records and file/locator metadata. `coverage` is `LegacyUnknown` (no saved link), `PendingArtifacts` (tube chain captured but file attribution incomplete), or `Captured` (structural chain and attribution recorded). These values do **not** assert scientific validity, external byte availability or full phase-2 evidence coverage. Reads do not create evidence or reopen jobs. The later investigation/governance slices implement the UI, immutable reports, scientific profile checks and performer/time review; their contracts supersede this initial phase description.

## Persistence and validation status

Local implementation checkpoint: full solution build passed with zero warnings/errors; EF reports no pending model changes and the new migration is applied; the 56-guide documentation corpus was regenerated and `docs:check` passed; `git diff --check` passed. The initial unrun-test checkpoint is superseded by the September 18 traceability, restore and governance verification records. These checks do not replace software test execution or provider/bench acceptance.

Migration `20260919015602_AddLabResultLineage` adds three Lab tables and nullable legacy lineage/resource fields; it was applied only to verified `localhost:5432/phaeno_ops`. Historical stored bindings and requirement flags remain unchanged; the current policy now blocks subsequent approval/release when evidence is incomplete. The complete ERD was regenerated. No backfill, shared migration, commit/push or deployment occurred.

Backend unit/model and opt-in PostgreSQL cases are authored in `LabResultLineageTests.cs`, `LabResultLineagePostgresTests.cs` and the complete-model assertion. They cover compatibility, required identity, immutable binding/input sets, correction reasons, failed-first/reserve-second lineage, paired inputs, retries/checksum conflicts, organization/sample mismatch and a persisted result-to-tube read. They have been executed following the owner's request to close the remaining known gaps; see the governance and earlier verification records. Independent-connection races, external provider content, physical handoffs, full retention/restore and business acceptance remain rollout verification gates.

## Managed scientific-file follow-up

See [managed scientific files](LAB-MANAGED-SCIENTIFIC-FILES-PLAN.md) for the subsequent staff-upload implementation. POMS now has a managed custody path with automatic actual-byte checksums, scoped file receipts, scan admission, verified retrieval and internal preservation. The external-file limitations above still apply to historical and provider-declared references; those records are never silently represented as uploaded files. Runtime activation and larger-file imports remain explicit boundaries.
