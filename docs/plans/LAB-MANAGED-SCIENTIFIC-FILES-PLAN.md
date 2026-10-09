# Managed scientific files

## Original scientific S3 objects — discovery, October 9, 2026

The Owner additionally selected in-place access to existing S3 scientific objects,
alongside S3-backed Portal uploads, organized Customer -> Job -> Sample -> Library
-> Sequencing run. Reuse existing sample/library/run identities. The
[S3 integration plan](S3-STORAGE-AND-SCIENTIFIC-ACCESS-PLAN.md) owns source discovery,
immutable locators, verification/mapping, source-preservation requirements and
local/hosted activation. The Owner confirmed no scientific S3 files exist yet;
establish the agreed hierarchy for future original-object registration.
This is planned scope: current managed receipts are not
proof of original-object custody, and no existing source objects were changed.

## FASTQ library-result intake extension — discovery, October 6, 2026

The Owner requested local FASTQ uploads as the vendor-result handoff, followed
by assembly, QC and Customer release. Successful vendor results must not save
until required files finish upload and verification. The planned file-set identity, generated
names, completeness checks, tentative configurable sizes/layouts and current 1 GiB hard limit
are recorded in the [delivery plan](SEQUENCING-RESULTS-TO-CUSTOMER-DELIVERY-PLAN.md).
Reuse managed-file custody while implementing explicitly current-model bindings;
do not infer or automatically import historical location declarations. This
extension is proposed and does not claim current large-file/provider support.

Status: implemented and deployed to production; authenticated specimen upload/download walkthrough remains unverified.

## Approved behavior
Replace staff-entered external file references, hashes and byte counts with uploads for sequencing output and supporting documents. Preserve specimen/library/run/analysis attribution and immutable corrections. Reuse private local/S3 storage with automatic metadata, scan admission and verified scoped retrieval. Keep historical external references readable and pipeline contracts compatible.

## Implementation
Add immutable specimen-scoped file receipts. Existing lineage fields carry a reserved managed-file identity validated against the receipt for scope, checksum and size. Reuse operational storage/scanning, bounded by its complete-scan limit (default 100 MiB, maximum 1 GiB). Stream uploads; verify stored bytes and downloads with bounded temporary disk files. Display the configured limit before selection. Large resumable/provider imports remain a follow-up.

Preserve receipts and bytes indefinitely under the approved internal-evidence policy, including uploads not yet attached to a run. Customer expiry cannot delete them. Retain a managed file for corrections or upload its replacement; never claim old reference-only records are managed. Existing Operator/Supervisor and reader permissions remain unchanged.

Add an additive migration and ERD documentation; initially apply to the verified local development database. The owner subsequently authorized commit/push/deployment and explicitly approved the production migration; activation is recorded below. No new storage infrastructure was provisioned. Update Phaeno guide and test plans. Build/type/lint checks at the checkpoint; tests only when requested per AGENTS.md.

## Acceptance
No manual file path/hash/size entry. Visible upload progress and failures; saving cannot race uploads; a failed replacement keeps the prior file. Recognizable names and scoped downloads on saved evidence. Source attribution and scientific review remain required.

## Verification checkpoint
- API Release build: passed with zero warnings/errors. Debug output was held by the running Visual Studio/IIS Express process; that process was not stopped.
- Added backend regression sources compile; automated tests have not been executed.
- Additive migration 20260920041907_AddManagedScientificFiles applied only to localhost:5432 / phaeno_ops_clean_20260919 after confirming it was the sole pending migration.
- Frontend type/lint checks and browser acceptance status are recorded below when final verification completes.
- Uses the existing configured storage provider. No S3 bucket, lifecycle or Object Lock policy was provisioned or changed. The application prevents replacement/deletion of retained evidence; administrative storage operations remain an operational boundary.

- Frontend typecheck and targeted ESLint passed; regression sources are added but not executed per repository request-only testing rule.
- Signed-in Edge verification reached Lab Operations. Both Active jobs and Closed jobs reported zero jobs, so no existing specimen was available for the new form/upload/download walkthrough. No synthetic scientific record was inserted into the operating database.
- At the local checkpoint, Visual Studio rebuild/restart was requested but not confirmed. The subsequent approved production deployment and migration are complete; see [release evidence](../operations/managed-scientific-files-release-20260920.md).

## September 20 gap-closure follow-up

Resumable upload sessions now stage private 4 MiB portions through the configured Local or S3 adapter, with actor/specimen ownership, a 24-hour expiry and a maximum of 20 pending sessions per actor. Complete-file SHA-256, size, malware scanning and read-back verification precede an immutable scientific receipt. Cleanup removes staging only; existing one-request integrations remain supported. The 100 MiB default is unchanged. A simulated S3 adapter test and a 50 MiB connected controller test cover exact-byte storage; an actual production S3 bucket rehearsal remains a cutover gate. The earlier unexecuted-test checkpoint is superseded by the current [gap closure evidence](OPERATIONAL-GAP-CLOSURE-20260920.md).
