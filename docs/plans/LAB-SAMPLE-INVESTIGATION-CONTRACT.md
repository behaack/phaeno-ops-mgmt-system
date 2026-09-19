# Sample investigation implementation contract

Status: implemented locally September 18–19, 2026. Retention, scientific minimums and independent review are now approved and implemented in the governance contract. Production activation remains open. This extends the [owning plan](SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md), [result lineage contract](LAB-RESULT-LINEAGE-CONTRACT.md) and [step performance contract](LAB-STEP-PERFORMANCE-CONTRACT.md).

## User workflow

Lab operations → Active jobs or Closed jobs → job → specimen → **Sample history**. The same existing specimen route remains the entry point. Staff can select an exact result version and read its saved producing analysis, explicit sequencing inputs and frozen source barcode. Unknown historical results remain unknown. The view exposes original step performers/times separately from recording actors/times, resource snapshots, libraries, output attribution, exceptions, scoped custody, preparation/QC report metadata, and paged events.

Coverage is descriptive, not a scientific-validity certification. Incomplete source loads fail visibly; no empty success or complete badge substitutes for an error. A source chain is assessed by the existing result-lineage endpoint and scientific coverage by the pinned requirements assessment. No guessed timestamp, latest-attempt link or legacy backfill is created.

The [staff capture and history contract](LAB-SCIENTIFIC-CAPTURE-AND-HISTORY-CONTRACT.md) adds sample-scoped scientific record detail/entry pages and commercial/Trial delivery events, download attempts/commit observations, retention policies/checkpoints, preservation holds and reissues to both the live view and saved reports. Shared Trial release metadata is explicitly package-wide; files and downloads remain sample-specific. These reads reuse existing persisted sources and exclude storage keys, IP addresses, user agents and raw receipt/notification payloads.

## Read boundaries

All endpoints use the existing active internal Lab Operator, Supervisor, Scientific Reviewer or Operations Administrator authorization. Work-order/specimen identity is checked before access. Result/artifact reads also check the work's submitting organization and exact submitted sample. The specimen view does not expose another member's records from a shared preparation batch or sendout. Preparation attachment projections exclude private storage keys and do not claim that a metadata record proves current file availability.

Reverse lookup supports exact tube barcode, material lot number, equipment asset code, sequencing run reference, library key and preparation-tray barcode. It is explicitly limited to the current job's submitting organization **before projection and paging**. These matches establish shared recorded resources, not shared causation. Cross-organization impact analysis is not exposed by this endpoint. Provider run references are not globally unique; use the provider identity retained on the corresponding output when interpreting matches.

Live evidence sections are bounded to 1,000 rows with an explicit limitation state. Events use 50-row timestamp-and-ID cursor pages; the upper time boundary stays fixed through navigation. Reload starts a new live view. Saved reports use a repeatable database transaction and support 10,000 rows per section and an 8 MB manifest; excess history is rejected instead of silently generating a partial report. Long-history investigation remains available through event pages even when a report exceeds its supported size.

## Saved reports

`lab_ops.lab_investigation_reports` stores the exact UTF-8 manifest text, SHA-256, report ID, work/specimen IDs, author, generation time and format version. Source identities, pinned versions and historical facts are embedded in the snapshot. Customer result-file expiry does not remove this table. There is no automated deletion job for investigation reports. The owner subsequently approved indefinite internal evidence preservation for now, implemented by the governance slice.

Generation and downloads append work events. Creation uses a request ID; an unchanged replay returns the original report. A request ID belonging to another author or scope is rejected. Concurrent duplicate creation cannot create two reports. EF guards reject report update/delete; restrictive parent references prevent cascading deletion. Downloads reauthorize the current actor and exact specimen/report scope, use `no-store`, and serve either the exact JSON manifest or escaped, printable standalone HTML. The readable report includes the evidence-manifest checksum; it is not itself the bytes represented by that checksum. No raw result or QC file bytes are embedded.

Downloads also recompute the manifest checksum before rendering or returning it. A mismatch blocks both formats with `report_integrity_failed`; no successful download event is recorded for corrupt bytes.

## Supporting report downloads

**Supporting reports** in sample history lists the exact preparation/QC attachments associated with that specimen's execution records. Its single **Download report** action calls the specimen-scoped `GET work-orders/{workOrderId}/specimens/{specimenId}/investigation/attachments/{recordId}/{role}` endpoint. Only `qcReport` and `preparationReport` roles are supported. Existing Lab authorization, work/specimen validation and the exact execution-to-preparation-record reference are required. Merely belonging to the same preparation batch is insufficient. Lookup is bounded to 10,000 executions and rejects excess history rather than guessing coverage.

Both this endpoint and the existing preparation download now verify the recorded clean scan, bounded size (at most 10 MB), PDF signature and SHA-256 against the exact bytes before returning anything. Missing storage remains an explicit `managed_file_missing` failure; truncated, oversized or altered bytes fail integrity checks. This reuses private operational storage and does not fetch external scientific references, replace files, or rescan them. Responses use `no-store`, `nosniff` and the content checksum. The sample endpoint appends `InvestigationAttachmentDownloadRequested` only after verification and before delivery; this is authorization/download-admission evidence, not proof of browser completion. Storage keys are absent from the UI and audit payload.

The UI preserves attachment metadata when a download fails, explains the error and permits a retry. PDF bytes remain separate from generated investigation manifests. Referenced private preparation/QC bytes are now protected from deletion under the approved indefinite internal-preservation policy; no new deletion worker is introduced.

## Scientific evidence capture

Sequencing-output and analysis declarations accept an optional, immutable `scientificEvidence` object with `schemaVersion: 1`. Supported facts are instrument, flowcell, lane, pool, index mapping, workflow version, software/container versions and digests, reference-data versions and digests, parameter/configuration checksum, exact input roles, actual UTC run/submission/receipt times, QC summary and named values/units, and source-document references with roles, SHA-256 and size. A configuration or log document can be referenced in `documents`; only its external immutable identity and checksum are stored here. The API never fetches an arbitrary external reference.

Collections and text are bounded and normalized before request hashing. Times must be UTC, non-future, and chronological where both endpoints are supplied. An analysis input-role list, when supplied, must map its entire explicit input set once. Changes to evidence require the existing correction/reanalysis path. Omitted metadata remains null; serialization omits the new optional request property so historical replay hashes are preserved. Producer-declared metadata does not prove external bytes, a real instrument run or scientific validity.

`20260919033608_AddLabInvestigationReports` adds the report table; `20260919034706_AddScientificLineageEvidence` adds two nullable JSON columns. Both are additive and were applied only to verified local development and the isolated reference database. The ERD includes all fields and relationships. No shared/production schema or rollout switch was changed.

## Remaining gates

- Owner approved indefinite internal preservation, mandatory scientific profile 1 and different-Supervisor approval of on-behalf entry/performer-time corrections.
- These profiles and the governed timing-amendment workflow are implemented locally; see [governance](LAB-EVIDENCE-GOVERNANCE-CONTRACT.md) and its verification record.
- Real sequencing/analysis producer integration, actual external-file availability, bench/scientific acceptance and production deployment are not proven by synthetic fixtures. The owner settled the cutoff/in-flight policy on September 19: immediate enforcement, all data are test data, no backfill or grandfathered future approval/release.
- The storage deletion boundary now protects referenced internal preparation/QC reports. A synthetic local database/private-file restore proves the result-to-tube chain, manifest and supporting PDF survive result-byte deletion. Hosted backup/restore, real storage/cleanup scheduling and operational acceptance remain open; see [restore rehearsal](../testing/runs/2026-09-18-investigation-restore.md).

Verification is recorded in [the test run](../testing/runs/2026-09-18-sample-traceability.md). Do not mark the owning plan complete while these gates remain open.
