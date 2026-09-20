# Managed scientific files release — September 20, 2026

## Authorized release
The owner requested commit, push and deployment of the managed scientific file change. This release replaces staff file-reference/hash/size entry with uploads for sequencing output, supporting evidence and analysis settings. It adds specimen-scoped verified downloads and preserves old references and correction history.

## Reviewed database change
Migration 20260920041907_AddManagedScientificFiles creates lab_ops.lab_scientific_files, its primary key, two restrictive specimen/work foreign keys, a unique storage-key index and specimen/work/time lookup indexes. No existing table, scientific record or stored file is removed or rewritten. It is applied to verified localhost development. The owner separately approved this production migration in the current task. It was applied during the release below; the earlier repeated-sequencing approval covered the earlier three migrations.

The existing deployment procedure creates an encrypted backup and verifies a disposable restore before migration. Preserve the existing migration recovery recipient at /opt/phaeno.portal-green/reset-20260919/rebase-backup-public.pem. Never automatically run the Down migration after new file receipts exist.

## Targets and boundaries
- API: existing /opt/phaeno.portal-green host/container and deploy-release.sh; preserve runtime configuration and blank bootstrap email.
- Portal: Vercel phaeno-ops-mgmt-system, project prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R, team cadexgenomics, root frontend.
- Production currently uses persistent Local storage and ClamAV with a 100 MiB complete-scan limit. This release preserves these values; it does not provision S3 or move existing bytes.
- Test sources were added and compiled in the implementation turn; automated tests have not been requested or run for this change. Build/type/lint and schema/diff checks are distinct from test results.
- The local authenticated workspace had no active or closed jobs, so an actual specimen upload/download browser walkthrough remains unverified.
- Real sequencing/provider acceptance and large/resumable imports remain separate boundaries.

## Release status
Completed production activation after the owner explicitly approved migration 20260920041907_AddManagedScientificFiles.

- Matching application source: `70a50afd5890ac3a9bc542936e654972b14cab1c`, pushed to `codex/portal-documentation-search-release`.
- API activation: **2026-09-20 12:59:35 UTC**, image `phaeno-portal-green-api:sha-70a50afd5890-managed-files`; active image ID `sha256:2e185cd03844e81d4226cc93349c748a04639a5e516c445e21bb74bc36e3b955`. The deployment procedure checked the image source label against the requested commit.
- Production migration history ends in `20260920041907_AddManagedScientificFiles`. The new receipt table exists and initially contains zero rows. Existing records were not rewritten.
- API and scanner are healthy. Public API health returned HTTP 200, database ping HTTP 204, and Portal root HTTP 200. Website intake counts remained unchanged at 12 contacts and 5 orders during the deployment probes. Bootstrap email remains blank; Local storage, ClamAV, and the 100 MiB scan limit are preserved.
- Vercel Production deployment `dpl_GcwrWU2vsn6xgRa5sVWbdvLt9xEs` is Ready, reports the same application source SHA, and owns `portal.phaenobiotech.com`. Deployment URL: https://phaeno-ops-mgmt-system-ge64pndj9-cadexgenomics.vercel.app.
- A fresh Edge page rendered the production sign-in form. An authenticated specimen upload/download walkthrough remains unverified; no synthetic scientific records were inserted into production. Browser console collection was unavailable in this verification session.
- Frontend production build and API Release build passed before publication. Automated regression sources were compiled but not executed, as documented above.
- Pre-migration backup `pre-migration-20260920T125915Z-70a50afd5890` passed the disposable restore and cleanup checks. Encrypted database/key envelopes and their checksum receipt were retained off-host in the ignored `artifacts/managed-scientific-files-release-20260920` directory; both envelope hashes matched. No plaintext recovery data or private key entered source control.

## Release finalization correction
The deployment reached healthy API activation and wrote its verified manifest, then stopped because the storage configuration helper was tracked without execute permission. Both finalization helpers were given execute permission in the exact release directory, and their `Complete` operations succeeded. Migration and API activation were not repeated. The repository follow-up records executable modes for both helpers and this release evidence; it changes no application behavior. Production application source remains `70a50afd5890ac3a9bc542936e654972b14cab1c`.
