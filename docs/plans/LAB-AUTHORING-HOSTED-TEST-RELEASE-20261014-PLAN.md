# Lab procedure authoring: preserving hosted-test release

The Owner requested bug/edge-case review, documentation, commit and push, and
explicitly confirmed deployment to the existing hosted test environment on
October 14, 2026. Scope is the [approved authoring plan](LAB-SETUP-VISUAL-AUTHORING-PLAN.md),
its review fixes, paired API/UI and help corpus. This is not commercial activation.

## Target, data and recovery

Keep the existing PostgreSQL 18 `phaeno_portal_green` database and verified
`phaeno-portal-green-postgres18-data` volume on the current Green server. The
baseline API/UI source is `10e0dc9e5c6b0b739fd7efd3d570451e7194cbad`; baseline
frontend is `dpl_8zVMVFGDMKG3Ui3pNt3VzP9oYbUd`. Verify again before cutover.
The only pending migration is `20261014234438_ProtocolFirstLabProcedures`.

Preserve all accounts, memberships, Commercial/Lab/Finance/scientific data,
audit, approved procedures and active/past run pins. Explicitly preserve all
`website.web_contacts` and `website.web_orders` IDs, contents, actors, timestamps,
locale, unsubscribe and completion history. Initial inventory has 12 contacts
and 6 demo requests; compare full-record fingerprints, not counts alone.
No reset, purge, reactivation, historical email replay or file deletion is allowed.

The private server recovery directory is
`/var/backups/phaeno-portal-deploy/lab-authoring-20261014`: retain baseline
deployment/migration identities, whole-table fingerprints and a checksummed
private runtime archive. The controlled deploy creates an encrypted custom-format
database recovery archive, verifies checksums and rehearses restoration in an
isolated container before the migration. No live volume is mounted by that
rehearsal. Retain the prior image/release for diagnosis and recovery.

S3 is the current hosted-test provider. Preserve its bucket, prefixes, credentials,
objects/versions and retained Local volume. This release does not replace storage
or modify existing file bytes. Preserve the Owner-approved hosted-test S3 recovery
deferral: the existing Local-only timer is not activated and no populated S3
recovery qualification is claimed. New illustration references participate in
file-recovery enumeration. Commercial populated-file recovery remains a gate.

## Preparation, cutover and rollback

No live replacement database is required: this is an incremental preserving
conversion. The isolated restored database is the recovery-preparation check.
Freeze reviewed source, verify ordinary remote equality, and stage the exact
committed frontend through the existing GitHub/Vercel connection with automatic
domain assignment disabled. Require ready build and matching source metadata.

Use the scoped enable/manual-run/disable sequence for Deploy Portal Green, with
migrations selected and other provider/bootstrap/identity inputs preserved.
Build before pausing. Stop the old API before the recovery snapshot, restore
rehearsal and column/JSON conversion, so old-model writers cannot overlap it.
Restart the new API and verify source, health, database, anonymous authorization,
packaged help corpus and conversion invariants before frontend promotion.
The API pause includes the recovery rehearsal; no fixed short outage is promised.

If preparation fails before migration execution, resume the baseline API. Once
execution starts, fail closed and inspect actual database state; never restart
the old model automatically. EF downgrade intentionally refuses to delete retained
history. Prefer preserving forward repair. Any live recovery replacement that
would discard subsequent records needs a separately reviewed manifest and Owner
authorization; the backup alone does not authorize destructive restoration.

Promote the verified frontend without rebuilding. Advance only its existing skew
protection version boundary after API compatibility/preservation checks, then
verify clean and previous-pin document routing plus the available signed-in
browser. Before the model cutover, frontend rollback uses the retained prior build;
afterward, restore compatible API/UI together through preserving repair/recovery.
Keep both Vercel Git deployment holds and disable Deploy Portal Green again.

## Review and acceptance

Review fixes address incomplete pinned documents, stale draft concurrency tokens,
upload/selection races, instruction-copy limits, latest-editor independent approval,
master-mix retirement concurrency/case-sensitive searches, malformed/null image
metadata and excessive raster dimensions. Run focused regression checks and
build/type/lint/docs/model/whitespace checks at the release checkpoint.

Verify retained kit JSON content/order/source IDs, every recorded occurrence and
unaffected table fingerprints. Distinguish live changes from conversion effects.
Verify canonical procedure/help routes, current assets, 401 authorization, API
error logs and actual authenticated rendering without approving or performing
laboratory work. Preserve local fictional authoring fixtures; do not create
operational hosted fixtures for smoke checks.

Full suites, authenticated image upload, native PDF pagination/export, touch,
200% zoom and full assistive-technology acceptance remain explicitly unqualified.
The browser extension blocks local-file upload; its permissions are not changed.
Record exact release, backup, migration, deployment and verification identities in
the completion receipt. Physical/scientific and final business acceptance remain
separate from this hosted-test software release.

## Completed release

Source `573843a1e3cb40bbc207c865aace4c8d7debf727` is live in both API run
`38668224349` and frontend `dpl_72xTuemmuELHyQeujcZhJPqU9KDy`. The isolated
restore rehearsal, encrypted/off-server checksum checks, preserving migration,
242 unaffected inventory comparisons, Website full-content checks and actual
signed-in procedure rendering pass. The API pause was approximately 21 seconds.
Release controls are restored. See the [completion receipt](../operations/lab-authoring-hosted-test-release-20261014.md)
for exact evidence and remaining qualification gates.
