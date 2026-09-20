# Managed scientific files
Status: implemented locally; authenticated upload walkthrough and production activation pending.

## Approved behavior
Replace staff-entered external file references, hashes and byte counts with uploads for sequencing output and supporting documents. Preserve specimen/library/run/analysis attribution and immutable corrections. Reuse private local/S3 storage with automatic metadata, scan admission and verified scoped retrieval. Keep historical external references readable and pipeline contracts compatible.

## Implementation
Add immutable specimen-scoped file receipts. Existing lineage fields carry a reserved managed-file identity validated against the receipt for scope, checksum and size. Reuse operational storage/scanning, bounded by its complete-scan limit (default 100 MiB, maximum 1 GiB). Stream uploads; verify stored bytes and downloads with bounded temporary disk files. Display the configured limit before selection. Large resumable/provider imports remain a follow-up.

Preserve receipts and bytes indefinitely under the approved internal-evidence policy, including uploads not yet attached to a run. Customer expiry cannot delete them. Retain a managed file for corrections or upload its replacement; never claim old reference-only records are managed. Existing Operator/Supervisor and reader permissions remain unchanged.

Add an additive migration and ERD documentation; apply only to the verified local development database. No production storage provisioning, deployment or migration in this change. Update Phaeno guide and test plans. Build/type/lint checks at the checkpoint; tests only when requested per AGENTS.md.

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
- Visual Studio rebuild/restart was requested for the local API; no confirmation received at this checkpoint. No production deployment or shared-database migration performed.
