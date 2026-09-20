# Operational gap closure release — September 20, 2026

## Scope

The owner authorized completion, documentation, successful tests, commit, push and deployment. This release adds resumable scientific uploads, customer-requested specimen holds, verified scientific-file recovery and online Local backups. Customer, Partner and Phaeno guides describe the implemented behavior. The [gap-closure plan](../plans/OPERATIONAL-GAP-CLOSURE-20260920.md) records the acceptance rules and isolated evidence.

The additive migration `20260920141548_AddScientificUploadsAndCustomerHolds` creates upload-session and hold records. It does not rewrite existing scientific evidence. The deployment creates an encrypted database backup and verifies an isolated restore before applying it. Do not automatically reverse the migration after new records exist.

## Release sequence

Deploy the tested API and migration using the existing Hetzner release procedure. Preserve Local storage, ClamAV, the 100 MiB complete-file limit, the recovery recipient and the blank bootstrap email. Deploy the Portal to Vercel from the same application commit. After the lease-aware API is healthy, set the protected online-backup acknowledgement, install the revision-pinned helper, verify a manual backup and activate its daily timer.

The S3 switch remains a separate production cutover under the [S3 runbook](s3-production-cutover.md). No AWS infrastructure, credentials, lifecycle policy or file migration is changed here.

## Validation and activation

Release validation passed before publication:

- API: 968 passed, zero failed; one Unix-only symlink test skipped on Windows. Disposable database cleanup verified.
- Frontend: 1,102 tests across 177 files passed; full lint, types, production build and 56-guide documentation consistency passed.
- Browser: 180 desktop/mobile cases passed in one full rerun; two mobile duplicates of desktop print checks intentionally skipped.
- Backup: 28 archive/envelope/failure checks passed, plus actual isolated Linux database restoration and deletion-lease/file-capture rehearsal.

Activation is pending. Record the application commit, API image, migration, Vercel deployment, backup receipt and public health checks below after activation.

## Acceptance boundaries

Synthetic laboratory journeys and mocked provider calls verify software behavior; they do not certify physical laboratory procedures, actual AWS policies or scientific decisions. Production verification must not insert synthetic customer/scientific records. A manually verified backup does not establish that the next scheduled invocation succeeded; record the timer activation and next genuine scheduled run separately.

## Activation checkpoint

Application commit `63725485b616becfd12200af4ec4d9d26f89aeae` is pushed and active. API image `sha-63725485b616-gap-closure` is healthy, migration `20260920141548_AddScientificUploadsAndCustomerHolds` applied, and Vercel deployment `dpl_5gSzzP4FH3hy3jAof6LEv1ZvvmiY` is Ready with the matching source and production domain. Public probes returned API 200, database ping 204 and Portal 200. Pre-migration recovery point `pre-migration-20260920T145630Z-63725485b616` passed isolated restoration; encrypted envelopes were copied off-host and both hashes verified.

The first online production backup correctly failed before publication: the synthetic restore proof ran on a 16 MiB temporary volume while the capacity check reserves 64 MiB. The helper temporary volume is now bounded at 128 MiB under the unchanged 256 MiB container memory limit. Referenced-only capture also needs to accept a zero-entry tar when no files are referenced; a regression now covers that exact archive. All 29 backup tests passed after these corrections. The application remained healthy and the prior timer was retained. Record the corrected helper revision and successful activation below.
