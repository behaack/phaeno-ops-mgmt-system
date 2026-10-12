# Website operations hosted-test release — October 12, 2026

The Owner requested **commit, push, deploy** for the completed Website operations
slice. This authorizes a bounded matched Portal API/frontend release to the
existing hosted test environment, including the previously approved temporary
Deploy Portal Green enable/run/disable sequence. Automatic deployments and
commercial activation remain held. Customer-only i18n and en-US remain unchanged.

## Target and preservation

Reuse Portal Green at `/opt/phaeno.portal-green`, API
`https://api.phaenobiotech.com`, Portal `https://portal.phaenobiotech.com`,
PostgreSQL 18 container `phaeno-portal-green-db`, database `phaeno_portal_green`
and volume `phaeno-portal-green-postgres18-data`. Vercel target is Cadexgenomics
project `phaeno-ops-mgmt-system`, ID `prj_wbE9S9mT46sJxlM3ev0EcaAWJ20R`,
team `team_DbkKTfQmQz9atu435ZBugMDD`, root `frontend`. Its production environment
names the existing hosted test runtime, not a commercial production launch.

Preserve all hosted accounts, memberships, configuration, commercial and Lab
records, audit history and file/object versions. Preserve S3, retained Local
bytes, ClamAV, identity mappings, runtime secrets and worker/bootstrap settings.
No local data import, reset, replacement, storage/identity cutover or provider
activation is authorized. The September 29 replacement preparation is complete;
this release reuses that preserved database without rewriting migration history.
The public Website frontend is not part of this release.

## Recovery and migration

Follow the [preceding preserving release](PORTAL-GAP-CLOSURE-TEST-RELEASE-20261011-PLAN.md)
and [hosted replacement plan](HOSTED-CLEAN-DATABASE-20260929-PLAN.md). The Owner's
[hosted-test S3 recovery deferral](S3-HOSTED-CUTOVER-PLAN.md) remains applicable.
The retained October 9 encrypted database/Local recovery artifact is unexpired
through November 13; its current GitHub archive digest matches the private
restore-verified receipt. Preserve it. This does not claim current S3-aware
backup coverage; do not run the Local-only coordinated backup against S3.

The only API source change since the prior application release is the matching
help corpus. No migration, snapshot or persisted model changes. Verify the EF
model with the freshly built Release output; use `apply_migrations=false`.
The protected workflow retains PostgreSQL/database-volume and storage/scanner
preflight. Any unexpected model/history/target drift stops activation for review;
no destructive remedy or baseline reset is implied by deployment authorization.

## Exact source, cutover and rollback

1. Commit and push the reviewed slice and this preserving plan from main.
   Freeze its full SHA and `git archive` SHA-256; exclude ignored credentials,
   test data, artifacts and output. Source changes and local checks are in the
   [slice receipt](../testing/runs/2026-10-12-website-operations.md).
2. Stage an exact-archive Vercel production build with `--skip-domain`, verified
   project/team and source metadata. Validate rendering and proxied API access
   using existing Vercel authentication. Preserve Deployment Protection and Git
   deployment holds; the canonical Portal alias stays on the prior build.
3. Temporarily enable the protected manual Deploy Portal Green workflow and run
   the verified main SHA. Storage, scanning and bootstrap inputs are Preserve;
   migrations, Clerk cutover and hosted-test S3 configuration are false. Restore
   the workflow hold once the scoped run is underway. The API release reloads
   the matching help corpus/search index without changing the model.
4. After API run/source/image/health verification, promote the staged frontend
   without rebuilding. Verify the canonical alias targets that exact deployment.

Prior matched application source is `97da7807c1de86f6d60492a1d2ad825ee533eb7c`;
prior Portal deployment is `dpl_JB7682hbDJvSkCvZjCDCjafAWo7x`. Pin the actual
current API image/release during protected host preflight. The no-migration
release script restores the prior API image on failed health. Later rollback
restores the prior matched API and Vercel build while preserving newer database
rows and object versions. Never restore an old database over new activity without
a separate reconciliation decision.

## Acceptance and limits

API Release build passes with zero warnings/errors. Pre-release API health,
database ping, Portal and public Website dial tone pass. Relevant frontend
types/lint, help consistency, Customer message references, whitespace and local
desktop/phone inspection pass; automated regression execution remains deferred
under the request-only policy, as recorded in the slice receipt.

Release acceptance requires matching source/corpus metadata, successful protected
API/scanner checks, health/database ping, Portal/help/public Website rendering,
anonymous protected-route rejection, and read-only authenticated Phaeno menu,
both Website queues and updated help/search when the existing session is available.
Do not unsubscribe, complete real intake, resend email, change worker settings,
create orders or perform scientific writes as smoke. Check bounded frontend
runtime errors and restored manual/Git holds. Record actual IDs and outcomes in
the completion receipt; mock browser checks are not provider or tenant acceptance.

## Completed release

Source `dedae5d23909fdf540dff2786bfdad308a8ae261` is committed, pushed and live on
both API and Portal frontend. Protected run `38255085546` succeeds; staged
deployment `dpl_753tSeojqisXXoP8dhn3GYXFDaYg` is promoted after API verification.
EF model check reports no change; no migration ran. Storage, scanning, data and
settings are preserved. The authenticated menu/both queues, health/rendering,
anonymous authorization and bounded runtime errors pass. Manual/Git holds remain.
See the [completion receipt](../operations/portal-website-operations-test-release-20261012.md).
