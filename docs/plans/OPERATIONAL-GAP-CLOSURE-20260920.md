# Operational gap closure — September 20, 2026

Status: software implementation and focused verification complete locally; deployment and new scheduled-backup evidence pending. Owner authorized closing all five findings, including the outstanding automated and connected verification. This supersedes the earlier implementation deferral for customer-requested specimen holds; the owner approved the proposed hold rules and identified 50 MB as a candidate scientific file size. Keep the current 100 MiB complete-scan limit and verify 50 MB with resumable transfers. Future production uses S3; upload staging must use the injected provider and the S3 cutover must verify recovery before activation. No AWS provisioning is requested.

## Outcomes and acceptance
1. Recovery: every managed scientific receipt participates in restored database/file reference checks. Missing bytes, wrong size/hash and damaged lineage fail recovery verification. Preserve all immutable receipts.
2. Capacity: replace pilot backup limits with an explicit, capacity-aware supported envelope, observable failures and recovery tests. Remove API downtime from normal backup by making a database snapshot plus immutable referenced-file capture coherent; never claim success for missing referenced bytes. Preserve existing encrypted backups and recovery recipients.
3. Files: resumable private scientific uploads with complete-file integrity/format/scanning admission before evidence can reference them; retain exact specimen/run provenance. Set the supported size/formats from representative requirements, not an arbitrary raised scanner limit.
4. Verification: execute the new regressions and an isolated populated journey covering repeated sequencing, corrections, review/release, downloads and database/file recovery. Keep simulated scientific/provider events separate from real bench and business acceptance. Do not insert fixtures into the user's operating database or production.
5. Customer holds: request, acknowledgment/safe pause, declined pause and explicit staff-controlled resumption, audited and scoped to affected specimens. Approved: block new work/release on request, preserve in-progress physical truth, no automatic price/retention changes.

## Boundaries
Reuse existing authorization, storage, controller and UI patterns. Document changes and update test plans/help. New local EF migrations are in scope where required. Shared/production migrations still require approval of the exact reviewed change. This request does not itself require replaying the earlier completed Git/deployment release. Real provider delivery, physical bench evidence and final scientific approval cannot be fabricated by software tests.

## Progress
- Current source and production scheduled backup helper reviewed. Scheduled September 20 backup passed with an empty file store. The helper excludes lab_scientific_files reference checks and enforces pilot database/file size limits.
- Completed implementation and verification are recorded below.

## Implementation and evidence checkpoint

- Additive migration `20260920141548_AddScientificUploadsAndCustomerHolds`: resumable sessions and specimen hold records, optimistic versions, one active hold per specimen, and confirmed physical-pause time. Reviewed/generated and applied to disposable verification databases; applied to verified `localhost:5432/phaeno_ops_clean_20260919` after the passing isolated checks; shared deployment not yet authorized for this migration.
- Scientific files: complete 50 MiB upload with interrupted chunk/retry, duplicate content comparison, exact owner/specimen checks, unavailable scan retry, immutable receipt, idempotent completion and expired-stage cleanup passed. Existing single-request integrations remain supported. Browser resume hints contain no file bytes or storage keys.
- Holds: customer tenant scope, duplicate request, stale decision, confirmed safe boundary, new attempts/analysis/release guards and explicit resumption passed. Confirmed physical pause is separate from a pending resumption request. Existing in-flight work is not represented as stopped by an unconfirmed request.
- Recovery: populated PostgreSQL/private-file restoration passed, including tube/preparation/library/sequencing/analysis/result attribution, immutable scientific receipt bytes, preserved evidence after customer-artifact cleanup, and tampered investigation-report rejection. The production SQL manifest includes scientific receipts and resumable chunks, with backward-compatible handling of older schemas.
- Current focused suite: 84 backend tests passed; one Unix-only symlink test skipped on Windows. Eight focused UI/API tests passed. Ten Chromium desktop/mobile scenarios passed in light/dark themes with accessibility and no-overflow checks. Browser scenarios use synthetic routes; laboratory actions and S3 calls in automated tests are simulated.
- Linux isolated restore: actual `verify-database-backup.sh` restored the synthetic populated dump in a network-disabled, resource-limited PostgreSQL 18.6 container; row/migration counts, scientific reference manifest and owned-container cleanup passed. No application database was used for that rehearsal.
- S3 remains the real-production target. [Cutover runbook](../operations/s3-production-cutover.md) requires a verified copy, independent database/object recovery and actual-bucket rehearsal before switching. No AWS provisioning or storage migration performed.

## Online Local backup behavior

New helper keeps the API running. PostgreSQL provides the database snapshot. An exclusive session lease temporarily blocks application file deletions while the helper restores the snapshot, enumerates its immutable referenced objects, and captures verified bytes. Uploads/new immutable files can continue; uncommitted/unreferenced objects are not advertised as recoverable snapshot data. Normal application deletions use shared leases in both Local and S3 providers. A failed lease, missing reference, changed hash, interrupted restore, capacity limit or lost container identity prevents a successful receipt.

Pilot byte caps are removed. Free-space preflight reserves conservative multiples for copies/restores/encryption; isolated database verification uses a disposable disk volume rather than a 512 MiB data tmpfs. Memory/CPU, file-count/manifest bounds and phase timeouts remain explicit. Capture helpers expire after four hours; the deletion lease expires after 150 idle minutes and its loss fails verification; the timer has a four-hour timeout. Large/slow datasets can fail safely and require capacity review rather than generating an unverified backup.

Installation order matters: deploy the lease-aware API, then install the revised helper/timer and explicitly acknowledge it with `FileStorage__OnlineBackupDeletionLease=true` in the protected runtime environment. The new helper refuses to proceed without that marker. The previously installed helper is unchanged until release approval and installation. A new genuine scheduled successful backup still needs to be observed after activation; manual/synthetic evidence does not substitute for it.

- Final Linux rehearsal also passed the exact session lease acquisition/release, concurrent read access, deletion exclusion, referenced-only capture and restoration of all three synthetic scientific/result/supporting files. Early broken-pipe cleanup was corrected and regression-covered. The isolated PostgreSQL container was removed by its ownership-checked cleanup. This rehearsal did not install the helper or change the running API/database.

## Final local verification

- API Release build: passed, zero warnings/errors; no EF model drift after the local migration.
- Connected regression suite: 84 passed, one Unix-only filesystem test skipped on Windows. Includes repeated sequencing with library reuse/new preparation, corrections/reanalysis and the restored-file journey.
- Frontend: type check, changed-file lint, eight focused tests and documentation consistency passed; 56-guide corpus regenerated. Ten browser scenarios passed.
- Backup: 28 synthetic archive/envelope/failure tests passed. Actual isolated Linux database restore, session lease and three-file capture/restore passed. Rehearsal containers and the private remote fixture directory were removed; the operating deployment was not changed.
- No commit, push, new shared migration, scheduled-helper installation or production deployment performed for this batch. Restart/rebuild the local API to load the new endpoints; the already-running process was not replaced.

## Release authorization

The owner subsequently requested documentation (including user help), successful tests, commit, push and deployment of these changes. This authorizes this release, including the reviewed additive `20260920141548_AddScientificUploadsAndCustomerHolds` migration and installation of the verified online Local backup helper. No S3 infrastructure or byte migration is part of this release. The previous no-publication checkpoint above is historical; record actual release identities after activation.

## Release verification

Full final reruns passed: 968 backend tests (one Unix-only skip), 1,102 frontend tests, and 180 browser cases (two intentional mobile print skips). API Release build, frontend production build, full lint, types, documentation consistency and staged diff checks passed. The 28 backup archive/envelope/failure cases and isolated Linux restore/lease rehearsal remain the backup evidence. Initial stale schema/fixture assertions and the scratch-name mismatch were corrected; the final full runs have zero failures.
