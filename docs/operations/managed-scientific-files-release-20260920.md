# Managed scientific files release — September 20, 2026

## Authorized release
The owner requested commit, push and deployment of the managed scientific file change. This release replaces staff file-reference/hash/size entry with uploads for sequencing output, supporting evidence and analysis settings. It adds specimen-scoped verified downloads and preserves old references and correction history.

## Reviewed database change
Migration 20260920041907_AddManagedScientificFiles creates lab_ops.lab_scientific_files, its primary key, two restrictive specimen/work foreign keys, a unique storage-key index and specimen/work/time lookup indexes. No existing table, scientific record or stored file is removed or rewritten. It is applied to verified localhost development. Production activation requires the separate explicit shared-database migration approval required by AGENTS.md; the earlier repeated-sequencing approval covered the earlier three migrations.

The existing deployment procedure creates an encrypted backup and verifies a disposable restore before migration. Preserve the existing migration recovery recipient at /opt/phaeno.portal-green/reset-20260919/rebase-backup-public.pem. Never automatically run the Down migration after new file receipts exist.

## Targets and boundaries
- API: existing /opt/phaeno.portal-green host/container and deploy-release.sh; preserve runtime configuration and blank bootstrap email.
- Portal: Vercel phaeno-ops-mgmt-system, project prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R, team cadexgenomics, root frontend.
- Production currently uses persistent Local storage and ClamAV with a 100 MiB complete-scan limit. This release preserves these values; it does not provision S3 or move existing bytes.
- Test sources were added and compiled in the implementation turn; automated tests have not been requested or run for this change. Build/type/lint and schema/diff checks are distinct from test results.
- The local authenticated workspace had no active or closed jobs, so an actual specimen upload/download browser walkthrough remains unverified.
- Real sequencing/provider acceptance and large/resumable imports remain separate boundaries.

## Release status
Preparation in progress. Exact commit, image, Vercel identity and activation evidence will be recorded after publishing.
